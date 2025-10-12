import OAuthClient from 'intuit-oauth';
import axios from 'axios';
import { PrismaClient } from '../../generated/prisma';

export class QuickBooksIntegrationService {
  private oauthClient;
  private baseUrl = 'https://quickbooks.api.intuit.com/v3/company';

  constructor(private prisma: PrismaClient) {
    this.oauthClient = new OAuthClient({
      clientId: process.env.QUICKBOOKS_CLIENT_ID!,
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI!,
    });
  }

  getAuthUrl(userId: string) {
    return this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.Payment],
      state: userId,
    });
  }

  async handleCallback(url: string, userId: string) {
    const authResponse = await this.oauthClient.createToken(url);
    const tokens = authResponse.getJson();

    await this.prisma.integration.upsert({
      where: { userId_provider: { userId, provider: 'QUICKBOOKS' } },
      create: {
        userId,
        provider: 'QUICKBOOKS',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        metadata: { realmId: authResponse.token.realmId },
        isActive: true,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        metadata: { realmId: authResponse.token.realmId },
        isActive: true,
      },
    });

    return tokens;
  }

  async getTokens(userId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { userId_provider: { userId, provider: 'QUICKBOOKS' } },
    });

    if (!integration) throw new Error('QuickBooks not connected');

    // Refresh if expired
    if (integration.expiresAt && integration.expiresAt < new Date()) {
      this.oauthClient.setToken({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
      });
      
      const refreshed = await this.oauthClient.refresh();
      const tokens = refreshed.getJson();

      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      return { token: tokens.access_token, realmId: (integration.metadata as any).realmId };
    }

    return { token: integration.accessToken, realmId: (integration.metadata as any).realmId };
  }

  // Create Customer
  async createCustomer(userId: string, customer: {
    displayName: string;
    email?: string;
    phone?: string;
    address?: string;
  }) {
    const { token, realmId } = await this.getTokens(userId);

    const response = await axios.post(
      `${this.baseUrl}/${realmId}/customer`,
      {
        DisplayName: customer.displayName,
        PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
        PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.Customer;
  }

  // Create Invoice
  async createInvoice(userId: string, invoice: {
    customerId: string;
    lineItems: Array<{
      description: string;
      amount: number;
      quantity: number;
    }>;
    dueDate?: Date;
  }) {
    const { token, realmId } = await this.getTokens(userId);

    const response = await axios.post(
      `${this.baseUrl}/${realmId}/invoice`,
      {
        CustomerRef: { value: invoice.customerId },
        Line: invoice.lineItems.map((item, idx) => ({
          DetailType: 'SalesItemLineDetail',
          Amount: item.amount * item.quantity,
          Description: item.description,
          SalesItemLineDetail: {
            Qty: item.quantity,
            UnitPrice: item.amount,
          },
        })),
        DueDate: invoice.dueDate?.toISOString().split('T')[0],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.Invoice;
  }

  // Create Expense
  async createExpense(userId: string, expense: {
    accountId: string;
    amount: number;
    description: string;
    date: Date;
    paymentType?: string;
  }) {
    const { token, realmId } = await this.getTokens(userId);

    const response = await axios.post(
      `${this.baseUrl}/${realmId}/purchase`,
      {
        AccountRef: { value: expense.accountId },
        PaymentType: expense.paymentType || 'Cash',
        TxnDate: expense.date.toISOString().split('T')[0],
        Line: [{
          Amount: expense.amount,
          DetailType: 'AccountBasedExpenseLineDetail',
          Description: expense.description,
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: expense.accountId },
          },
        }],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.Purchase;
  }

  // Sync Expenses
  async syncExpenses(userId: string, companyId: string) {
    const { token, realmId } = await this.getTokens(userId);

    // Get expenses from ERP
    const expenses = await this.prisma.expense.findMany({
      where: { companyId, syncedToQuickBooks: false },
      take: 50,
    });

    const synced = [];
    for (const expense of expenses) {
      try {
        const qbExpense = await this.createExpense(userId, {
          accountId: '1', // Default expense account
          amount: Number(expense.amount),
          description: expense.description || 'Expense',
          date: expense.date,
        });

        await this.prisma.expense.update({
          where: { id: expense.id },
          data: { 
            syncedToQuickBooks: true,
            quickBooksId: qbExpense.Id,
          },
        });

        synced.push(expense.id);
      } catch (error) {
        console.error(`Failed to sync expense ${expense.id}:`, error);
      }
    }

    return { synced: synced.length, total: expenses.length };
  }
}
