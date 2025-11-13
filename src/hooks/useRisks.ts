import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { riskService, Risk, CreateRiskData, UpdateRiskData, RiskAnalytics, RiskNotification } from '@/services/RiskService';
import { toast } from 'sonner';

// Hook to get risks for a project
export const useRisks = (projectId: string) => {
  return useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => riskService.getRisksByProject(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to get risk analytics for a project
export const useRiskAnalytics = (projectId: string) => {
  return useQuery({
    queryKey: ['risk-analytics', projectId],
    queryFn: () => riskService.getRiskAnalytics(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to get risk summary for dashboard
export const useRiskSummary = (projectId: string) => {
  return useQuery({
    queryKey: ['risk-summary', projectId],
    queryFn: () => riskService.getRiskSummary(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to get automatic risk indicators
export const useAutomaticRiskIndicators = (projectId: string) => {
  return useQuery({
    queryKey: ['automatic-risk-indicators', projectId],
    queryFn: () => riskService.getAutomaticRiskIndicators(projectId),
    enabled: !!projectId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Hook to get risk notifications
export const useRiskNotifications = () => {
  return useQuery({
    queryKey: ['risk-notifications'],
    queryFn: () => riskService.getRiskNotifications(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook to create a risk
export const useCreateRisk = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateRiskData) => riskService.createRisk(data),
    onSuccess: (newRisk) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['risks', newRisk.project_id] });
      queryClient.invalidateQueries({ queryKey: ['risk-analytics', newRisk.project_id] });
      queryClient.invalidateQueries({ queryKey: ['risk-summary', newRisk.project_id] });
      queryClient.invalidateQueries({ queryKey: ['risk-notifications'] });
      
      toast.success('Risk created successfully');
    },
    onError: (error) => {
      console.error('Error creating risk:', error);
      toast.error('Failed to create risk');
    }
  });
};

// Hook to update a risk
export const useUpdateRisk = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ riskId, data }: { riskId: string; data: UpdateRiskData }) => 
      riskService.updateRisk(riskId, data),
    onSuccess: (updatedRisk) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['risks', updatedRisk.project_id] });
      queryClient.invalidateQueries({ queryKey: ['risk-analytics', updatedRisk.project_id] });
      queryClient.invalidateQueries({ queryKey: ['risk-summary', updatedRisk.project_id] });
      queryClient.invalidateQueries({ queryKey: ['risk-notifications'] });
      
      toast.success('Risk updated successfully');
    },
    onError: (error) => {
      console.error('Error updating risk:', error);
      toast.error('Failed to update risk');
    }
  });
};

// Hook to delete a risk
export const useDeleteRisk = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ riskId, projectId }: { riskId: string; projectId: string }) => 
      riskService.deleteRisk(riskId),
    onSuccess: (_, { projectId }) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['risks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['risk-analytics', projectId] });
      queryClient.invalidateQueries({ queryKey: ['risk-summary', projectId] });
      
      toast.success('Risk deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting risk:', error);
      toast.error('Failed to delete risk');
    }
  });
};

// Hook to convert automatic risk to manual risk
export const useConvertAutomaticRisk = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ automaticRisk, projectId }: { automaticRisk: any; projectId: string }) => 
      riskService.convertAutomaticToManualRisk(automaticRisk, projectId),
    onSuccess: (newRisk) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['risks', newRisk.project_id] });
      queryClient.invalidateQueries({ queryKey: ['risk-analytics', newRisk.project_id] });
      queryClient.invalidateQueries({ queryKey: ['risk-summary', newRisk.project_id] });
      queryClient.invalidateQueries({ queryKey: ['automatic-risk-indicators', newRisk.project_id] });
      queryClient.invalidateQueries({ queryKey: ['risk-notifications'] });
      
      toast.success('Automatic risk converted to manual risk');
    },
    onError: (error) => {
      console.error('Error converting automatic risk:', error);
      toast.error('Failed to convert risk');
    }
  });
};

// Hook to mark notification as read
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => 
      riskService.markNotificationAsRead(notificationId),
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['risk-notifications'] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
    }
  });
};

// Hook to get risk statistics for multiple projects (for main dashboard)
export const usePortfolioRiskStats = (projectIds: string[]) => {
  return useQuery({
    queryKey: ['portfolio-risk-stats', projectIds],
    queryFn: async () => {
      const promises = projectIds.map(id => riskService.getRiskSummary(id));
      const results = await Promise.all(promises);
      
      return results.reduce((acc, summary) => {
        acc.totalRisks += summary.totalRisks;
        acc.criticalRisks += summary.criticalRisks;
        acc.highRisks += summary.highRisks;
        acc.recentRisks += summary.recentRisks.length;
        acc.urgentActions += summary.urgentActions.length;
        
        // Set overall risk level to highest across all projects
        const riskLevels = ['low', 'medium', 'high', 'critical'];
        const currentLevel = riskLevels.indexOf(acc.overallRiskLevel);
        const projectLevel = riskLevels.indexOf(summary.overallRiskLevel);
        if (projectLevel > currentLevel) {
          acc.overallRiskLevel = summary.overallRiskLevel;
        }
        
        return acc;
      }, {
        totalRisks: 0,
        criticalRisks: 0,
        highRisks: 0,
        recentRisks: 0,
        urgentActions: 0,
        overallRiskLevel: 'low' as 'low' | 'medium' | 'high' | 'critical'
      });
    },
    enabled: projectIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
