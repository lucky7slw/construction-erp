import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

// Types
export type DailyLog = {
  id: string;
  projectId: string;
  date: Date;
  weather: {
    temp?: number;
    conditions?: string;
    rain?: boolean;
    wind?: string;
  };
  workCompleted?: string;
  notes?: string;
  photos: string[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    crewPresent: number;
    deliveries: number;
    equipmentUsed: number;
    incidents: number;
  };
};

export type CrewAttendance = {
  id: string;
  dailyLogId: string;
  workerId: string;
  workerName: string;
  hoursWorked: number;
  trade: string;
  notes?: string;
};

export type Delivery = {
  id: string;
  dailyLogId: string;
  supplier: string;
  material: string;
  quantity: string;
  poNumber?: string;
  receivedBy: string;
  notes?: string;
};

export type EquipmentUsage = {
  id: string;
  dailyLogId: string;
  equipment: string;
  hours: number;
  operator?: string;
  notes?: string;
};

export type SafetyIncident = {
  id: string;
  dailyLogId: string;
  type: string;
  severity: string;
  description: string;
  personInvolved?: string;
  actionTaken: string;
  photos: string[];
  reportedTo?: string;
  followUpRequired: boolean;
};

// Hooks
export function useDailyLogs(params: {
  projectId: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return useQuery({
    queryKey: ['daily-logs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        projectId: params.projectId,
      });

      if (params.startDate) {
        searchParams.append('startDate', params.startDate.toISOString().split('T')[0]);
      }
      if (params.endDate) {
        searchParams.append('endDate', params.endDate.toISOString().split('T')[0]);
      }

      const response = await apiClient.get(`/daily-logs?${searchParams.toString()}`);
      return response.data.logs as DailyLog[];
    },
  });
}

export function useDailyLog(id: string) {
  return useQuery({
    queryKey: ['daily-log', id],
    queryFn: async () => {
      const response = await apiClient.get(`/daily-logs/${id}`);
      return response.data.log as DailyLog;
    },
  });
}

export function useCreateDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectId: string;
      date: Date;
      weather?: {
        temp?: number;
        conditions?: string;
        rain?: boolean;
        wind?: string;
      };
      workCompleted?: string;
      notes?: string;
      photos?: string[];
    }) => {
      const response = await apiClient.post('/daily-logs', {
        ...data,
        date: data.date.toISOString().split('T')[0],
      });
      return response.data.log as DailyLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs', { projectId: variables.projectId }] });
    },
  });
}

export function useUpdateDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        weather?: {
          temp?: number;
          conditions?: string;
          rain?: boolean;
          wind?: string;
        };
        workCompleted?: string;
        notes?: string;
        photos?: string[];
      };
    }) => {
      const response = await apiClient.patch(`/daily-logs/${id}`, data);
      return response.data.log as DailyLog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', data.id] });
      queryClient.invalidateQueries({ queryKey: ['daily-logs', { projectId: data.projectId }] });
    },
  });
}

export function useDeleteDailyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/daily-logs/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
    },
  });
}

export function useAddCrewAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dailyLogId,
      data,
    }: {
      dailyLogId: string;
      data: {
        workerId: string;
        workerName: string;
        hoursWorked: number;
        trade: string;
        notes?: string;
      };
    }) => {
      const response = await apiClient.post(`/daily-logs/${dailyLogId}/crew`, data);
      return response.data.crew as CrewAttendance;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', variables.dailyLogId] });
    },
  });
}

export function useAddDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dailyLogId,
      data,
    }: {
      dailyLogId: string;
      data: {
        supplier: string;
        material: string;
        quantity: string;
        poNumber?: string;
        receivedBy: string;
        notes?: string;
      };
    }) => {
      const response = await apiClient.post(`/daily-logs/${dailyLogId}/deliveries`, data);
      return response.data.delivery as Delivery;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', variables.dailyLogId] });
    },
  });
}

export function useAddEquipmentUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dailyLogId,
      data,
    }: {
      dailyLogId: string;
      data: {
        equipment: string;
        hours: number;
        operator?: string;
        notes?: string;
      };
    }) => {
      const response = await apiClient.post(`/daily-logs/${dailyLogId}/equipment`, data);
      return response.data.equipment as EquipmentUsage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', variables.dailyLogId] });
    },
  });
}

export function useAddSafetyIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dailyLogId,
      data,
    }: {
      dailyLogId: string;
      data: {
        type: string;
        severity: string;
        description: string;
        personInvolved?: string;
        actionTaken: string;
        photos?: string[];
        reportedTo?: string;
        followUpRequired?: boolean;
      };
    }) => {
      const response = await apiClient.post(`/daily-logs/${dailyLogId}/incidents`, data);
      return response.data.incident as SafetyIncident;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', variables.dailyLogId] });
    },
  });
}
