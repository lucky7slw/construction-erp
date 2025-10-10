import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

// Types
export type BidStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'AWARDED' | 'DECLINED' | 'EXPIRED';
export type BidType = 'GENERAL_CONTRACTOR' | 'SUBCONTRACTOR' | 'MATERIAL_SUPPLIER' | 'EQUIPMENT_RENTAL' | 'CONSULTANT';

export type BidLineItem = {
  id: string;
  bidId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  notes?: string;
  linkedEstimateLineId?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Bid = {
  id: string;
  bidNumber: string;
  projectId: string;
  supplierId?: string;
  bidType: BidType;
  scopeOfWork: string;
  status: BidStatus;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  dueDate?: Date;
  validUntil?: Date;
  bondRequired: boolean;
  bondAmount?: number;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  attachmentUrls?: any;
  submittedDate?: Date;
  awardedDate?: Date;
  declinedReason?: string;
  comparisonScore?: number;
  lineItems: BidLineItem[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BidPackage = {
  id: string;
  name: string;
  projectId: string;
  description?: string;
  scopeDocument?: string;
  dueDate?: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

// List bids for a project
export function useBids(params: {
  projectId: string;
  status?: BidStatus;
  bidType?: BidType;
  supplierId?: string;
}) {
  return useQuery({
    queryKey: ['bids', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        projectId: params.projectId,
      });

      if (params.status) {
        searchParams.append('status', params.status);
      }
      if (params.bidType) {
        searchParams.append('bidType', params.bidType);
      }
      if (params.supplierId) {
        searchParams.append('supplierId', params.supplierId);
      }

      const response = await apiClient.get(`/bids?${searchParams.toString()}`);
      return response.data.bids as Bid[];
    },
  });
}

// Get single bid
export function useBid(id: string) {
  return useQuery({
    queryKey: ['bid', id],
    queryFn: async () => {
      const response = await apiClient.get(`/bids/${id}`);
      return response.data.bid as Bid;
    },
    enabled: !!id,
  });
}

// Create bid
export function useCreateBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      supplierId?: string;
      bidType: BidType;
      scopeOfWork: string;
      dueDate?: Date;
      validUntil?: Date;
      bondRequired?: boolean;
      bondAmount?: number;
      taxPercent?: number;
      notes?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
    }) => {
      const response = await apiClient.post('/bids', {
        ...data,
        dueDate: data.dueDate?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
      return response.data.bid as Bid;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bids', { projectId: variables.projectId }] });
    },
  });
}

// Update bid
export function useUpdateBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        status?: BidStatus;
        dueDate?: Date;
        validUntil?: Date;
        notes?: string;
        contactName?: string;
        contactEmail?: string;
        contactPhone?: string;
        attachmentUrls?: any;
      };
    }) => {
      const response = await apiClient.put(`/bids/${id}`, {
        ...data,
        dueDate: data.dueDate?.toISOString(),
        validUntil: data.validUntil?.toISOString(),
      });
      return response.data.bid as Bid;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bid', data.id] });
      queryClient.invalidateQueries({ queryKey: ['bids', { projectId: data.projectId }] });
    },
  });
}

// Delete bid
export function useDeleteBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/bids/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
  });
}

// Add line item
export function useAddBidLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bidId,
      data,
    }: {
      bidId: string;
      data: {
        description: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        notes?: string;
        linkedEstimateLineId?: string;
        sortOrder?: number;
      };
    }) => {
      const response = await apiClient.post(`/bids/${bidId}/line-items`, data);
      return response.data.lineItem as BidLineItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bid', variables.bidId] });
    },
  });
}

// Update line item
export function useUpdateBidLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lineItemId,
      data,
    }: {
      lineItemId: string;
      data: {
        description?: string;
        quantity?: number;
        unit?: string;
        unitPrice?: number;
        notes?: string;
        linkedEstimateLineId?: string;
        sortOrder?: number;
      };
    }) => {
      const response = await apiClient.put(`/bids/line-items/${lineItemId}`, data);
      return response.data.lineItem as BidLineItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid'] });
    },
  });
}

// Delete line item
export function useDeleteBidLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineItemId: string) => {
      await apiClient.delete(`/bids/line-items/${lineItemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid'] });
    },
  });
}

// Submit bid
export function useSubmitBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bidId: string) => {
      const response = await apiClient.post(`/bids/${bidId}/submit`);
      return response.data.bid as Bid;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bid', data.id] });
      queryClient.invalidateQueries({ queryKey: ['bids', { projectId: data.projectId }] });
    },
  });
}

// Award bid
export function useAwardBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bidId: string) => {
      const response = await apiClient.post(`/bids/${bidId}/award`);
      return response.data.bid as Bid;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bid', data.id] });
      queryClient.invalidateQueries({ queryKey: ['bids', { projectId: data.projectId }] });
    },
  });
}

// Decline bid
export function useDeclineBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bidId,
      reason,
    }: {
      bidId: string;
      reason: string;
    }) => {
      const response = await apiClient.post(`/bids/${bidId}/decline`, { reason });
      return response.data.bid as Bid;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bid', data.id] });
      queryClient.invalidateQueries({ queryKey: ['bids', { projectId: data.projectId }] });
    },
  });
}

// Create bid package
export function useCreateBidPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      projectId: string;
      description?: string;
      scopeDocument?: string;
      dueDate?: Date;
    }) => {
      const response = await apiClient.post('/bid-packages', {
        ...data,
        dueDate: data.dueDate?.toISOString(),
      });
      return response.data.bidPackage as BidPackage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bid-packages', { projectId: variables.projectId }] });
    },
  });
}

// Get bid package
export function useBidPackage(id: string) {
  return useQuery({
    queryKey: ['bid-package', id],
    queryFn: async () => {
      const response = await apiClient.get(`/bid-packages/${id}`);
      return response.data.bidPackage as BidPackage;
    },
    enabled: !!id,
  });
}

// List bid packages
export function useBidPackages(projectId: string) {
  return useQuery({
    queryKey: ['bid-packages', { projectId }],
    queryFn: async () => {
      const response = await apiClient.get(`/bid-packages?projectId=${projectId}`);
      return response.data.bidPackages as BidPackage[];
    },
    enabled: !!projectId,
  });
}

// Invite supplier to bid package
export function useInviteSupplierToBidPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packageId,
      supplierId,
      notes,
    }: {
      packageId: string;
      supplierId: string;
      notes?: string;
    }) => {
      const response = await apiClient.post(`/bid-packages/${packageId}/invite`, {
        supplierId,
        notes,
      });
      return response.data.invitation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bid-package', variables.packageId] });
    },
  });
}

// Compare bids
export function useBidsComparison(params: {
  projectId: string;
  scopeFilter?: string;
}) {
  return useQuery({
    queryKey: ['bids-comparison', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        projectId: params.projectId,
      });

      if (params.scopeFilter) {
        searchParams.append('scopeFilter', params.scopeFilter);
      }

      const response = await apiClient.get(`/bids-comparison?${searchParams.toString()}`);
      return response.data;
    },
  });
}

// Score bid
export function useScoreBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bidId,
      criteria,
      scores,
    }: {
      bidId: string;
      criteria: {
        priceWeight: number;
        timelineWeight: number;
        experienceWeight: number;
        qualityWeight: number;
      };
      scores: {
        priceScore: number;
        timelineScore: number;
        experienceScore: number;
        qualityScore: number;
      };
    }) => {
      const response = await apiClient.post(`/bids/${bidId}/score`, {
        criteria,
        scores,
      });
      return response.data.bid as Bid;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bid', data.id] });
      queryClient.invalidateQueries({ queryKey: ['bids', { projectId: data.projectId }] });
      queryClient.invalidateQueries({ queryKey: ['bids-ranked'] });
    },
  });
}

// Get ranked bids
export function useRankedBids(projectId: string) {
  return useQuery({
    queryKey: ['bids-ranked', { projectId }],
    queryFn: async () => {
      const response = await apiClient.get(`/bids-ranked?projectId=${projectId}`);
      return response.data.rankedBids;
    },
    enabled: !!projectId,
  });
}

// Get bid statistics
export function useBidStatistics(projectId: string) {
  return useQuery({
    queryKey: ['bids-statistics', { projectId }],
    queryFn: async () => {
      const response = await apiClient.get(`/bids-statistics?projectId=${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
  });
}

// Export bid comparison to CSV
export function useExportBidComparison() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiClient.get(`/bids-comparison-export?projectId=${projectId}`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bid-comparison-${projectId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      return response.data;
    },
  });
}
