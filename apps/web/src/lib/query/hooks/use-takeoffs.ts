import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

// Types
export type MeasurementType = 'AREA' | 'LINEAR' | 'VOLUME' | 'COUNT';
export type TakeoffStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';

export type TakeoffMeasurement = {
  id: string;
  takeoffId: string;
  layerId?: string;
  measurementType: MeasurementType;
  description: string;
  quantity: number;
  unit: string;
  length?: number;
  width?: number;
  height?: number;
  diameter?: number;
  area?: number;
  volume?: number;
  notes?: string;
  coordinates?: any;
  sortOrder: number;
  linkedEstimateLineId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TakeoffLayer = {
  id: string;
  takeoffId: string;
  name: string;
  color?: string;
  isVisible: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Takeoff = {
  id: string;
  name: string;
  projectId: string;
  estimateId?: string;
  description?: string;
  status: TakeoffStatus;
  drawingReference?: string;
  scale?: number;
  unit?: string;
  totalQuantity?: number;
  layers: TakeoffLayer[];
  measurements: TakeoffMeasurement[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

// List takeoffs for a project
export function useTakeoffs(params: {
  projectId: string;
  status?: TakeoffStatus;
  estimateId?: string;
}) {
  return useQuery({
    queryKey: ['takeoffs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        projectId: params.projectId,
      });

      if (params.status) {
        searchParams.append('status', params.status);
      }
      if (params.estimateId) {
        searchParams.append('estimateId', params.estimateId);
      }

      const response = await apiClient.get(`/takeoffs?${searchParams.toString()}`);
      return response.data.takeoffs as Takeoff[];
    },
  });
}

// Get single takeoff
export function useTakeoff(id: string) {
  return useQuery({
    queryKey: ['takeoff', id],
    queryFn: async () => {
      const response = await apiClient.get(`/takeoffs/${id}`);
      return response.data.takeoff as Takeoff;
    },
    enabled: !!id,
  });
}

// Create takeoff
export function useCreateTakeoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      projectId: string;
      estimateId?: string;
      description?: string;
      drawingReference?: string;
      scale?: number;
      unit?: string;
    }) => {
      const response = await apiClient.post('/takeoffs', data);
      return response.data.takeoff as Takeoff;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['takeoffs', { projectId: variables.projectId }] });
    },
  });
}

// Update takeoff
export function useUpdateTakeoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        description?: string;
        status?: TakeoffStatus;
        drawingReference?: string;
        scale?: number;
        unit?: string;
      };
    }) => {
      const response = await apiClient.put(`/takeoffs/${id}`, data);
      return response.data.takeoff as Takeoff;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['takeoff', data.id] });
      queryClient.invalidateQueries({ queryKey: ['takeoffs', { projectId: data.projectId }] });
    },
  });
}

// Delete takeoff
export function useDeleteTakeoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/takeoffs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoffs'] });
    },
  });
}

// Create layer
export function useCreateLayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      takeoffId,
      data,
    }: {
      takeoffId: string;
      data: {
        name: string;
        color?: string;
        isVisible?: boolean;
        sortOrder?: number;
      };
    }) => {
      const response = await apiClient.post(`/takeoffs/${takeoffId}/layers`, data);
      return response.data.layer as TakeoffLayer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['takeoff', variables.takeoffId] });
    },
  });
}

// Update layer
export function useUpdateLayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      layerId,
      data,
    }: {
      layerId: string;
      data: {
        name?: string;
        color?: string;
        isVisible?: boolean;
        sortOrder?: number;
      };
    }) => {
      const response = await apiClient.put(`/takeoffs/layers/${layerId}`, data);
      return response.data.layer as TakeoffLayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoff'] });
    },
  });
}

// Delete layer
export function useDeleteLayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (layerId: string) => {
      await apiClient.delete(`/takeoffs/layers/${layerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoff'] });
    },
  });
}

// Toggle layer visibility
export function useToggleLayerVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (layerId: string) => {
      const response = await apiClient.post(`/takeoffs/layers/${layerId}/toggle`);
      return response.data.layer as TakeoffLayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoff'] });
    },
  });
}

// Add measurement
export function useAddMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      takeoffId,
      data,
    }: {
      takeoffId: string;
      data: {
        layerId?: string;
        measurementType: MeasurementType;
        description: string;
        quantity: number;
        unit: string;
        length?: number;
        width?: number;
        height?: number;
        diameter?: number;
        notes?: string;
        coordinates?: any;
        sortOrder?: number;
      };
    }) => {
      const response = await apiClient.post(`/takeoffs/${takeoffId}/measurements`, data);
      return response.data.measurement as TakeoffMeasurement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['takeoff', variables.takeoffId] });
    },
  });
}

// Add area measurement
export function useAddAreaMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      takeoffId,
      data,
    }: {
      takeoffId: string;
      data: {
        description: string;
        length: number;
        width: number;
        unit: string;
        layerId?: string;
        notes?: string;
      };
    }) => {
      const response = await apiClient.post(`/takeoffs/${takeoffId}/measurements/area`, data);
      return response.data.measurement as TakeoffMeasurement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['takeoff', variables.takeoffId] });
    },
  });
}

// Add linear measurement
export function useAddLinearMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      takeoffId,
      data,
    }: {
      takeoffId: string;
      data: {
        description: string;
        length: number;
        unit: string;
        layerId?: string;
        notes?: string;
      };
    }) => {
      const response = await apiClient.post(`/takeoffs/${takeoffId}/measurements/linear`, data);
      return response.data.measurement as TakeoffMeasurement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['takeoff', variables.takeoffId] });
    },
  });
}

// Add volume measurement
export function useAddVolumeMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      takeoffId,
      data,
    }: {
      takeoffId: string;
      data: {
        description: string;
        length: number;
        width: number;
        height: number;
        unit: string;
        layerId?: string;
        notes?: string;
      };
    }) => {
      const response = await apiClient.post(`/takeoffs/${takeoffId}/measurements/volume`, data);
      return response.data.measurement as TakeoffMeasurement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['takeoff', variables.takeoffId] });
    },
  });
}

// Add count measurement
export function useAddCountMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      takeoffId,
      data,
    }: {
      takeoffId: string;
      data: {
        description: string;
        quantity: number;
        unit: string;
        layerId?: string;
        notes?: string;
      };
    }) => {
      const response = await apiClient.post(`/takeoffs/${takeoffId}/measurements/count`, data);
      return response.data.measurement as TakeoffMeasurement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['takeoff', variables.takeoffId] });
    },
  });
}

// Update measurement
export function useUpdateMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      measurementId,
      data,
    }: {
      measurementId: string;
      data: any;
    }) => {
      const response = await apiClient.put(`/takeoffs/measurements/${measurementId}`, data);
      return response.data.measurement as TakeoffMeasurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoff'] });
    },
  });
}

// Delete measurement
export function useDeleteMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (measurementId: string) => {
      await apiClient.delete(`/takeoffs/measurements/${measurementId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoff'] });
    },
  });
}

// Get takeoff summary
export function useTakeoffSummary(takeoffId: string) {
  return useQuery({
    queryKey: ['takeoff-summary', takeoffId],
    queryFn: async () => {
      const response = await apiClient.get(`/takeoffs/${takeoffId}/summary`);
      return response.data;
    },
    enabled: !!takeoffId,
  });
}

// Export takeoff to CSV
export function useExportTakeoff() {
  return useMutation({
    mutationFn: async (takeoffId: string) => {
      const response = await apiClient.get(`/takeoffs/${takeoffId}/export`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `takeoff-${takeoffId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      return response.data;
    },
  });
}

// Duplicate takeoff
export function useDuplicateTakeoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      takeoffId,
      name,
    }: {
      takeoffId: string;
      name: string;
    }) => {
      const response = await apiClient.post(`/takeoffs/${takeoffId}/duplicate`, { name });
      return response.data.takeoff as Takeoff;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['takeoffs', { projectId: data.projectId }] });
    },
  });
}

// Link measurement to estimate line
export function useLinkMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      measurementId,
      estimateLineId,
    }: {
      measurementId: string;
      estimateLineId: string;
    }) => {
      const response = await apiClient.post(`/takeoffs/measurements/${measurementId}/link`, {
        estimateLineId,
      });
      return response.data.measurement as TakeoffMeasurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoff'] });
    },
  });
}

// Unlink measurement from estimate line
export function useUnlinkMeasurement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (measurementId: string) => {
      const response = await apiClient.post(`/takeoffs/measurements/${measurementId}/unlink`);
      return response.data.measurement as TakeoffMeasurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoff'] });
    },
  });
}

// Convert measurement units
export function useConvertMeasurementUnits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      measurementId,
      targetUnit,
      conversionFactor,
    }: {
      measurementId: string;
      targetUnit: string;
      conversionFactor: number;
    }) => {
      const response = await apiClient.post(`/takeoffs/measurements/${measurementId}/convert`, {
        targetUnit,
        conversionFactor,
      });
      return response.data.measurement as TakeoffMeasurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['takeoff'] });
    },
  });
}
