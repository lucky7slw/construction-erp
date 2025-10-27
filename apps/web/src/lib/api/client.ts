import { z } from 'zod';

// Types for API responses
type ApiResponse<T = unknown> = T;

type ApiError = {
  error: string;
  message?: string;
  statusCode: number;
};

// User types matching backend AuthUser
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string().optional(),
  isEmailVerified: z.boolean(),
  lastLoginAt: z.string().optional(),
  companies: z.array(z.object({
    id: z.string(),
    name: z.string(),
    isOwner: z.boolean(),
    logo: z.string().optional(),
  })),
  roles: z.array(z.object({
    id: z.string(),
    name: z.string(),
    companyId: z.string().optional(),
    permissions: z.array(z.object({
      resource: z.string(),
      action: z.string(),
    })),
  })),
});

export type User = z.infer<typeof UserSchema>;

// Auth types matching backend
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
  phoneNumber: z.string().optional(),
  companyName: z.string(),
});

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().optional(),
});

export const LoginResponseSchema = z.object({
  user: UserSchema,
  tokens: AuthTokensSchema,
});

export const RegisterResponseSchema = z.object({
  user: UserSchema,
  tokens: AuthTokensSchema,
  message: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

// Project types
export const ProjectStatusSchema = z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']);

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  companyId: z.string(),
  customerId: z.string().optional(),
  status: ProjectStatusSchema,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  actualCost: z.number().optional(),
  actualHours: z.number().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateProjectRequestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  companyId: z.string(),
  customerId: z.string().optional(),
  status: ProjectStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

// Estimate types
export const EstimateStatusSchema = z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']);

export const EstimateSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: EstimateStatusSchema,
  projectId: z.string().optional(),
  customerId: z.string().optional(),
  validUntil: z.string().optional(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateEstimateRequestSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  projectId: z.string().optional(),
  customerId: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

export type Estimate = z.infer<typeof EstimateSchema>;
export type EstimateStatus = z.infer<typeof EstimateStatusSchema>;
export type CreateEstimateRequest = z.infer<typeof CreateEstimateRequestSchema>;

// Budget types
export const BudgetCategorySchema = z.enum([
  'LABOR',
  'MATERIALS',
  'EQUIPMENT',
  'SUBCONTRACTORS',
  'PERMITS',
  'OVERHEAD',
  'CONTINGENCY',
  'OTHER'
]);

export const BudgetLineItemSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  category: BudgetCategorySchema,
  name: z.string(),
  description: z.string().optional(),
  costCode: z.string().optional(),
  budgetedAmount: z.number(),
  actualAmount: z.number(),
  committedAmount: z.number(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const BudgetSummarySchema = z.object({
  summary: z.object({
    totalBudget: z.number(),
    totalActual: z.number(),
    totalCommitted: z.number(),
    variance: z.number(),
    percentageUsed: z.number(),
  }),
  categoryBreakdown: z.record(z.object({
    budgeted: z.number(),
    actual: z.number(),
    committed: z.number(),
  })),
});

export const CreateBudgetLineItemRequestSchema = z.object({
  projectId: z.string(),
  category: BudgetCategorySchema,
  name: z.string(),
  description: z.string().optional(),
  costCode: z.string().optional(),
  budgetedAmount: z.number(),
  notes: z.string().optional(),
});

export const UpdateBudgetLineItemRequestSchema = z.object({
  category: BudgetCategorySchema.optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  costCode: z.string().optional(),
  budgetedAmount: z.number().optional(),
  actualAmount: z.number().optional(),
  committedAmount: z.number().optional(),
  notes: z.string().optional(),
});

export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;
export type BudgetLineItem = z.infer<typeof BudgetLineItemSchema>;
export type BudgetSummary = z.infer<typeof BudgetSummarySchema>;
export type CreateBudgetLineItemRequest = z.infer<typeof CreateBudgetLineItemRequestSchema>;
export type UpdateBudgetLineItemRequest = z.infer<typeof UpdateBudgetLineItemRequestSchema>;

// API Client
class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  setRefreshToken(token: string | null): void {
    this.refreshToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipRefresh: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;

    const headers = new Headers({
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    });

    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && !skipRefresh && this.refreshToken) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry the request with new token
          return this.request<T>(endpoint, options, true);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Unknown error',
          message: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        })) as ApiError;

        throw new Error(errorData.message || errorData.error || 'Request failed');
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async performTokenRefresh(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      this.setAccessToken(data.accessToken);

      // Update refresh token if provided
      if (data.refreshToken) {
        this.setRefreshToken(data.refreshToken);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Generic HTTP methods
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<LoginResponse> {
    const validatedData = LoginRequestSchema.parse(data);
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(validatedData),
    }, true); // Skip refresh on login

    // Set tokens in client
    this.setAccessToken(response.tokens.accessToken);
    this.setRefreshToken(response.tokens.refreshToken);

    return LoginResponseSchema.parse(response);
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const validatedData = RegisterRequestSchema.parse(data);
    const response = await this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(validatedData),
    }, true); // Skip refresh on register

    // Set tokens in client
    this.setAccessToken(response.tokens.accessToken);
    this.setRefreshToken(response.tokens.refreshToken);

    return RegisterResponseSchema.parse(response);
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('/auth/logout', {
        method: 'POST',
      });
    } finally {
      // Clear tokens even if logout fails
      this.setAccessToken(null);
      this.setRefreshToken(null);
    }
  }

  async get<T = any>(endpoint: string): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint);
    return { data: result };
  }

  async post<T = any>(endpoint: string, data?: any): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { data: result };
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/me');
  }

  async refreshAccessToken(): Promise<AuthTokens> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    }, true); // Skip refresh on refresh endpoint

    this.setAccessToken(response.accessToken);
    if (response.refreshToken) {
      this.setRefreshToken(response.refreshToken);
    }

    return response;
  }

  // Project endpoints
  async getProjects(): Promise<{ projects: Project[] }> {
    return this.request<{ projects: Project[] }>('/projects');
  }

  async getProject(id: string): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/projects/${id}`);
  }

  async createProject(data: CreateProjectRequest): Promise<{ project: Project }> {
    const validatedData = CreateProjectRequestSchema.parse(data);
    return this.request<{ project: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify(validatedData),
    });
  }

  async updateProject(id: string, data: Partial<CreateProjectRequest>): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Estimates API
  // ============================================================================

  async getEstimates(): Promise<{ estimates: any[] }> {
    return this.request('/estimates');
  }

  async getEstimate(id: string): Promise<{ estimate: any }> {
    return this.request(`/estimates/${id}`);
  }

  async createEstimate(data: any): Promise<{ estimate: any }> {
    return this.request('/estimates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEstimate(id: string, data: any): Promise<{ estimate: any }> {
    return this.request(`/estimates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEstimate(id: string): Promise<void> {
    return this.request(`/estimates/${id}`, {
      method: 'DELETE',
    });
  }

  async approveEstimate(id: string): Promise<{ estimate: any }> {
    return this.request(`/estimates/${id}/approve`, {
      method: 'POST',
    });
  }

  async addLineItem(estimateId: string, data: any): Promise<{ lineItem: any }> {
    return this.request(`/estimates/${estimateId}/line-items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async exportEstimateCsv(id: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/v1/estimates/${id}/export-csv`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
    return response.blob();
  }

  // ============================================================================
  // Budget API
  // ============================================================================

  async getBudgetSummary(projectId: string): Promise<BudgetSummary> {
    return this.request<BudgetSummary>(`/projects/${projectId}/budget/summary`);
  }

  async getBudgetLineItems(projectId: string): Promise<{ budgetLines: BudgetLineItem[] }> {
    return this.request<{ budgetLines: BudgetLineItem[] }>(`/projects/${projectId}/budget/line-items`);
  }

  async createBudgetLineItem(data: CreateBudgetLineItemRequest): Promise<{ budgetLine: BudgetLineItem }> {
    return this.request<{ budgetLine: BudgetLineItem }>('/budget/line-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBudgetLineItem(id: string, data: UpdateBudgetLineItemRequest): Promise<{ budgetLine: BudgetLineItem }> {
    return this.request<{ budgetLine: BudgetLineItem }>(`/budget/line-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBudgetLineItem(id: string): Promise<void> {
    return this.request<void>(`/budget/line-items/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Time Entries API
  // ============================================================================

  async getTimeEntries(params?: { projectId?: string; userId?: string; startDate?: string; endDate?: string }): Promise<{ timeEntries: any[] }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/time-entries${query ? `?${query}` : ''}`);
  }

  async getTimeEntry(id: string): Promise<{ timeEntry: any }> {
    return this.request(`/time-entries/${id}`);
  }

  async createTimeEntry(data: any): Promise<{ timeEntry: any }> {
    return this.request('/time-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTimeEntry(id: string, data: any): Promise<{ timeEntry: any }> {
    return this.request(`/time-entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTimeEntry(id: string): Promise<void> {
    return this.request(`/time-entries/${id}`, {
      method: 'DELETE',
    });
  }

  async approveTimeEntry(id: string): Promise<{ timeEntry: any }> {
    return this.request(`/time-entries/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectTimeEntry(id: string): Promise<{ timeEntry: any }> {
    return this.request(`/time-entries/${id}/reject`, {
      method: 'POST',
    });
  }

  // ============================================================================
  // Tasks API
  // ============================================================================

  async getTasks(params?: { projectId?: string; assignedToId?: string; status?: string }): Promise<{ tasks: any[] }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/tasks${query ? `?${query}` : ''}`);
  }

  async getTask(id: string): Promise<{ task: any }> {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data: any): Promise<{ task: any }> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: any): Promise<{ task: any }> {
    return this.request(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string): Promise<void> {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // CRM API
  // ============================================================================

  async getLeads(params: { companyId: string; status?: string }): Promise<{ leads: any[] }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/crm/leads?${query}`);
  }

  async getLead(id: string): Promise<{ lead: any }> {
    return this.request(`/crm/leads/${id}`);
  }

  async createLead(data: any): Promise<{ lead: any }> {
    return this.request('/crm/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLead(id: string, data: any): Promise<{ lead: any }> {
    return this.request(`/crm/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteLead(id: string): Promise<void> {
    return this.request(`/crm/leads/${id}`, {
      method: 'DELETE',
    });
  }

  async convertLead(id: string): Promise<{ lead: any }> {
    return this.request(`/crm/leads/${id}/convert`, {
      method: 'POST',
    });
  }

  // ============================================================================
  // Quotes API
  // ============================================================================

  async getQuotes(params: { companyId: string }): Promise<{ quotes: any[] }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/quotes/companies/${params.companyId}/quotes`);
  }

  async getQuote(id: string): Promise<{ quote: any }> {
    return this.request(`/quotes/${id}`);
  }

  async generateQuote(data: any): Promise<{ quote: any; generationTime: number }> {
    return this.request('/quotes/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuoteStatus(id: string, status: string): Promise<{ quote: any }> {
    return this.request(`/quotes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ============================================================================
  // Expenses API
  // ============================================================================

  async getExpenses(params?: { projectId?: string; userId?: string }): Promise<{ expenses: any[] }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/expenses${query ? `?${query}` : ''}`);
  }

  async getExpense(id: string): Promise<{ expense: any }> {
    return this.request(`/expenses/${id}`);
  }

  async createExpense(data: any): Promise<{ expense: any }> {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async categorizeExpense(id: string): Promise<{ expense: any; suggestion: any }> {
    return this.request(`/expenses/${id}/categorize`, {
      method: 'POST',
    });
  }

  async updateExpense(id: string, data: any): Promise<{ expense: any }> {
    return this.request(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string): Promise<void> {
    return this.request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // AI API
  // ============================================================================

  async analyzeExpenseReceipt(data: { image: string; projectId?: string }): Promise<any> {
    return this.request('/ai/analyze-receipt', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async suggestTimeAllocation(data: { projectId: string; description: string }): Promise<any> {
    return this.request('/ai/suggest-time-allocation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // User Profile & Settings API
  // ============================================================================

  async updateProfile(data: { firstName?: string; lastName?: string; phoneNumber?: string }): Promise<{ user: User }> {
    return this.request('/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: string, data: { name?: string; address?: string; phone?: string; email?: string; website?: string }): Promise<{ company: any }> {
    return this.request(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // Documents API
  // ============================================================================

  async getProjectFiles(projectId: string): Promise<{ files: any[] }> {
    return this.request(`/projects/${projectId}/files`);
  }

  async uploadFile(projectId: string, file: File, metadata?: { category?: string; description?: string; tags?: string[] }): Promise<{ file: any }> {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata?.category) {
      formData.append('category', metadata.category);
    }
    if (metadata?.description) {
      formData.append('description', metadata.description);
    }
    if (metadata?.tags) {
      formData.append('tags', JSON.stringify(metadata.tags));
    }

    const url = `${this.baseUrl}/api/v1/projects/${projectId}/files`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Unknown error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.message || 'Failed to upload file');
    }

    return response.json();
  }

  async deleteFile(fileId: string): Promise<{ message: string }> {
    return this.request(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  getFileUrl(projectId: string, filename: string): string {
    return `${this.baseUrl}/api/v1/files/${projectId}/${filename}`;
  }

  // ============================================================================
  // Invoices API
  // ============================================================================

  async getInvoices(params?: { companyId?: string; projectId?: string; customerId?: string; status?: string }): Promise<{ invoices: any[] }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/invoices${query ? `?${query}` : ''}`);
  }

  async getInvoice(id: string): Promise<{ invoice: any }> {
    return this.request(`/invoices/${id}`);
  }

  async createInvoice(data: any): Promise<{ invoice: any }> {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string, data: any): Promise<{ invoice: any }> {
    return this.request(`/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string): Promise<void> {
    return this.request(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async sendInvoice(id: string): Promise<{ invoice: any }> {
    return this.request(`/invoices/${id}/send`, {
      method: 'POST',
    });
  }

  async recordPayment(id: string, data: { amount: number; paymentMethod?: string; reference?: string; notes?: string }): Promise<{ invoice: any }> {
    return this.request(`/invoices/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Hook for accessing the API client
export function useApiClient() {
  return apiClient;
}