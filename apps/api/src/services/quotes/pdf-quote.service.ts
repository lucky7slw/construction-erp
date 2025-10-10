import { PrismaClient, Quote, QuoteItem } from '@prisma/client';
import puppeteer, { Browser, Page } from 'puppeteer';
import { mkdir, writeFile, readFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

type QuoteWithDetails = Quote & {
  items: QuoteItem[];
  company: {
    name: string;
    legalName: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
  };
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
  };
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type PDFGenerationResult = {
  pdfPath: string;
  pdfUrl: string;
};

type GroupedItems = {
  [category: string]: QuoteItem[];
};

export class PDFQuoteService {
  private storagePath: string;
  private baseUrl: string;

  constructor(
    private prisma: PrismaClient,
    storagePath?: string,
    baseUrl?: string
  ) {
    this.storagePath = storagePath || process.env.STORAGE_PATH || './uploads/quotes';
    this.baseUrl = baseUrl || process.env.API_BASE_URL || 'http://localhost:3001';
  }

  async generateQuotePDF(quoteId: string): Promise<PDFGenerationResult> {
    const quote = await this.getQuoteWithDetails(quoteId);

    if (!quote) {
      throw new Error('Quote not found');
    }

    // Ensure storage directory exists
    await this.ensureStorageDirectory();

    // Generate HTML content
    const html = this.generateQuoteHTML(quote);

    // Generate PDF using Puppeteer
    const pdfPath = await this.generatePDFFromHTML(html, quote.quoteNumber);

    // Generate public URL
    const pdfUrl = this.generatePDFUrl(quote.quoteNumber);

    return {
      pdfPath,
      pdfUrl,
    };
  }

  async getQuotePDFPath(quoteId: string): Promise<string | null> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: { quoteNumber: true },
    });

    if (!quote) {
      return null;
    }

    const pdfPath = this.getPDFFilePath(quote.quoteNumber);

    try {
      await access(pdfPath, constants.F_OK);
      return pdfPath;
    } catch {
      return null;
    }
  }

  private async getQuoteWithDetails(quoteId: string): Promise<QuoteWithDetails | null> {
    return this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        company: {
          select: {
            name: true,
            legalName: true,
            address: true,
            city: true,
            postalCode: true,
            phone: true,
            email: true,
            logo: true,
          },
        },
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            postalCode: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  private async ensureStorageDirectory(): Promise<void> {
    await mkdir(this.storagePath, { recursive: true });
  }

  private getPDFFilePath(quoteNumber: string): string {
    return path.join(this.storagePath, `${quoteNumber}.pdf`);
  }

  private generatePDFUrl(quoteNumber: string): string {
    return `${this.baseUrl}/api/v1/quotes/pdf/${quoteNumber}.pdf`;
  }

  private groupItemsByCategory(items: QuoteItem[]): GroupedItems {
    return items.reduce((acc: GroupedItems, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});
  }

  private formatCurrency(amount: number | bigint | { valueOf(): bigint }): string {
    const numValue = typeof amount === 'bigint'
      ? Number(amount)
      : typeof amount === 'object' && 'valueOf' in amount
      ? Number(amount.valueOf())
      : Number(amount);

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numValue);
  }

  private formatDate(date: Date | null): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  private generateQuoteHTML(quote: QuoteWithDetails): string {
    const groupedItems = this.groupItemsByCategory(quote.items);
    const categories = Object.keys(groupedItems).sort();

    const companyInfo = `
      <div class="company-info">
        ${quote.company.logo ? `<img src="${quote.company.logo}" alt="Company Logo" class="logo" />` : ''}
        <h1>${quote.company.name}</h1>
        ${quote.company.legalName ? `<p class="legal-name">${quote.company.legalName}</p>` : ''}
        ${quote.company.address ? `<p>${quote.company.address}</p>` : ''}
        ${quote.company.city || quote.company.postalCode ? `<p>${quote.company.city || ''} ${quote.company.postalCode || ''}</p>` : ''}
        ${quote.company.phone ? `<p>Phone: ${quote.company.phone}</p>` : ''}
        ${quote.company.email ? `<p>Email: ${quote.company.email}</p>` : ''}
      </div>
    `;

    const customerInfo = `
      <div class="customer-info">
        <h3>Bill To:</h3>
        <p><strong>${quote.customer.name}</strong></p>
        ${quote.customer.address ? `<p>${quote.customer.address}</p>` : ''}
        ${quote.customer.city || quote.customer.postalCode ? `<p>${quote.customer.city || ''} ${quote.customer.postalCode || ''}</p>` : ''}
        ${quote.customer.phone ? `<p>Phone: ${quote.customer.phone}</p>` : ''}
        ${quote.customer.email ? `<p>Email: ${quote.customer.email}</p>` : ''}
      </div>
    `;

    const quoteHeader = `
      <div class="quote-header">
        <h2>QUOTATION</h2>
        <table class="header-table">
          <tr>
            <td><strong>Quote Number:</strong></td>
            <td>${quote.quoteNumber}</td>
          </tr>
          <tr>
            <td><strong>Date:</strong></td>
            <td>${this.formatDate(quote.createdAt)}</td>
          </tr>
          <tr>
            <td><strong>Valid Until:</strong></td>
            <td>${this.formatDate(quote.validUntil)}</td>
          </tr>
          <tr>
            <td><strong>Project:</strong></td>
            <td>${quote.title}</td>
          </tr>
        </table>
      </div>
    `;

    const itemsHTML = categories.map(category => {
      const categoryItems = groupedItems[category];
      const categoryTotal = categoryItems.reduce((sum, item) => sum + Number(item.total), 0);

      const itemRows = categoryItems.map(item => `
        <tr>
          <td class="description">${item.description}</td>
          <td class="quantity">${Number(item.quantity)}</td>
          <td class="unit-price">${this.formatCurrency(item.unitPrice)}</td>
          <td class="total">${this.formatCurrency(item.total)}</td>
        </tr>
      `).join('');

      return `
        <div class="category-section">
          <h3>${category}</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th class="description">Description</th>
                <th class="quantity">Quantity</th>
                <th class="unit-price">Unit Price</th>
                <th class="total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
            <tfoot>
              <tr class="category-total">
                <td colspan="3"><strong>${category} Subtotal:</strong></td>
                <td class="total"><strong>${this.formatCurrency(categoryTotal)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }).join('');

    const totalsSection = `
      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td><strong>Subtotal:</strong></td>
            <td>${this.formatCurrency(quote.subtotal)}</td>
          </tr>
          <tr>
            <td><strong>Tax (${Number(quote.taxRate) * 100}%):</strong></td>
            <td>${this.formatCurrency(quote.taxAmount)}</td>
          </tr>
          <tr class="grand-total">
            <td><strong>Total:</strong></td>
            <td><strong>${this.formatCurrency(quote.total)}</strong></td>
          </tr>
        </table>
      </div>
    `;

    const notesSection = quote.notes ? `
      <div class="notes-section">
        <h3>Terms & Conditions</h3>
        <p>${quote.notes.replace(/\n/g, '<br>')}</p>
      </div>
    ` : '';

    const footer = `
      <div class="footer">
        <div class="signature-section">
          <div class="signature-box">
            <p>Prepared by: ${quote.createdBy.firstName} ${quote.createdBy.lastName}</p>
            <p>Email: ${quote.createdBy.email}</p>
          </div>
          <div class="signature-box">
            <p>Customer Signature:</p>
            <div class="signature-line"></div>
            <p>Date: _______________</p>
          </div>
        </div>
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quote ${quote.quoteNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            padding: 40px;
          }

          .company-info {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2c3e50;
          }

          .company-info .logo {
            max-width: 150px;
            max-height: 80px;
            margin-bottom: 10px;
          }

          .company-info h1 {
            font-size: 24px;
            color: #2c3e50;
            margin-bottom: 5px;
          }

          .company-info .legal-name {
            font-size: 10px;
            color: #666;
            margin-bottom: 10px;
          }

          .company-info p {
            margin: 2px 0;
          }

          .customer-info {
            margin-bottom: 30px;
          }

          .customer-info h3 {
            font-size: 14px;
            margin-bottom: 10px;
            color: #2c3e50;
          }

          .quote-header {
            margin-bottom: 30px;
          }

          .quote-header h2 {
            font-size: 20px;
            color: #2c3e50;
            margin-bottom: 15px;
          }

          .header-table {
            width: 100%;
            max-width: 400px;
          }

          .header-table td {
            padding: 5px;
          }

          .header-table td:first-child {
            width: 140px;
          }

          .category-section {
            margin-bottom: 25px;
          }

          .category-section h3 {
            font-size: 16px;
            color: #2c3e50;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #ecf0f1;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }

          .items-table th {
            background-color: #34495e;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
          }

          .items-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #ecf0f1;
          }

          .items-table tbody tr:hover {
            background-color: #f8f9fa;
          }

          .items-table .description {
            width: 50%;
          }

          .items-table .quantity {
            width: 15%;
            text-align: center;
          }

          .items-table .unit-price {
            width: 17.5%;
            text-align: right;
          }

          .items-table .total {
            width: 17.5%;
            text-align: right;
          }

          .items-table tfoot tr.category-total {
            background-color: #ecf0f1;
          }

          .items-table tfoot td {
            padding: 10px;
            border-top: 2px solid #34495e;
          }

          .totals-section {
            margin-top: 30px;
            margin-bottom: 30px;
          }

          .totals-table {
            width: 100%;
            max-width: 400px;
            margin-left: auto;
          }

          .totals-table td {
            padding: 8px;
          }

          .totals-table td:first-child {
            text-align: right;
            width: 60%;
          }

          .totals-table td:last-child {
            text-align: right;
            width: 40%;
          }

          .totals-table tr.grand-total {
            border-top: 2px solid #2c3e50;
            background-color: #ecf0f1;
            font-size: 16px;
          }

          .totals-table tr.grand-total td {
            padding: 12px 8px;
          }

          .notes-section {
            margin-top: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-left: 4px solid #3498db;
          }

          .notes-section h3 {
            font-size: 14px;
            color: #2c3e50;
            margin-bottom: 10px;
          }

          .notes-section p {
            line-height: 1.8;
          }

          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #ecf0f1;
          }

          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
          }

          .signature-box {
            width: 45%;
          }

          .signature-line {
            border-top: 1px solid #333;
            margin-top: 40px;
            margin-bottom: 5px;
          }

          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        ${companyInfo}

        <div class="main-content">
          ${customerInfo}
          ${quoteHeader}

          ${quote.description ? `<p style="margin-bottom: 20px;">${quote.description}</p>` : ''}

          ${itemsHTML}

          ${totalsSection}

          ${notesSection}
        </div>

        ${footer}
      </body>
      </html>
    `;
  }

  private async generatePDFFromHTML(html: string, quoteNumber: string): Promise<string> {
    let browser: Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page: Page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      const pdfPath = this.getPDFFilePath(quoteNumber);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      return pdfPath;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}