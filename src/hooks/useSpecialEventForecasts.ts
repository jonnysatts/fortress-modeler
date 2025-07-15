import { useState, useEffect } from 'react';
import { SpecialEventService } from '@/services/SpecialEventService';
import { 
  SpecialEventApiResponse, 
  SpecialEventForecast, 
  SpecialEventActual,
  SpecialEventForecastFormData,
  SpecialEventActualFormData 
} from '@/types/specialEvents';

interface UseSpecialEventForecastsReturn {
  forecast: SpecialEventForecast | undefined;
  actual: SpecialEventActual | undefined;
  isLoading: boolean;
  error: string | null;
  createForecast: (data: SpecialEventForecastFormData) => Promise<void>;
  updateForecast: (data: SpecialEventForecastFormData) => Promise<void>;
  createActual: (data: SpecialEventActualFormData) => Promise<void>;
  updateActual: (data: SpecialEventActualFormData) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSpecialEventForecasts(projectId: string): UseSpecialEventForecastsReturn {
  const [forecast, setForecast] = useState<SpecialEventForecast | undefined>();
  const [actual, setActual] = useState<SpecialEventActual | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response: SpecialEventApiResponse = await SpecialEventService.getSpecialEvent(projectId);
      setForecast(response.forecast);
      setActual(response.actual);
    } catch (err) {
      console.error('Error fetching special event data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch special event data');
    } finally {
      setIsLoading(false);
    }
  };

  const createForecast = async (data: SpecialEventForecastFormData) => {
    try {
      setError(null);
      const newForecast = await SpecialEventService.createForecast(projectId, data);
      setForecast(newForecast);
    } catch (err) {
      console.error('Error creating forecast:', err);
      setError(err instanceof Error ? err.message : 'Failed to create forecast');
      throw err;
    }
  };

  const updateForecast = async (data: SpecialEventForecastFormData) => {
    try {
      setError(null);
      const updatedForecast = await SpecialEventService.updateForecast(projectId, data);
      setForecast(updatedForecast);
    } catch (err) {
      console.error('Error updating forecast:', err);
      setError(err instanceof Error ? err.message : 'Failed to update forecast');
      throw err;
    }
  };

  const createActual = async (data: SpecialEventActualFormData) => {
    try {
      setError(null);
      const newActual = await SpecialEventService.createActual(projectId, data);
      setActual(newActual);
    } catch (err) {
      console.error('Error creating actual:', err);
      setError(err instanceof Error ? err.message : 'Failed to create actual');
      throw err;
    }
  };

  const updateActual = async (data: SpecialEventActualFormData) => {
    try {
      setError(null);
      const updatedActual = await SpecialEventService.updateActual(projectId, data);
      setActual(updatedActual);
    } catch (err) {
      console.error('Error updating actual:', err);
      setError(err instanceof Error ? err.message : 'Failed to update actual');
      throw err;
    }
  };

  const refetch = async () => {
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  return {
    forecast,
    actual,
    isLoading,
    error,
    createForecast,
    updateForecast,
    createActual,
    updateActual,
    refetch
  };
}
