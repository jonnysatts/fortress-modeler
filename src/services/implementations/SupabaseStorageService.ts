import { IStorageService } from '../interfaces/IStorageService';
import { Project, FinancialModel, SpecialEventForecast, SpecialEventActual, SpecialEventMilestone } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors';
type SupabaseProject = Database['public']['Tables']['projects']['Row'];
type SupabaseModel = Database['public']['Tables']['financial_models']['Row'];
type SupabaseActualEntry = Database['public']['Tables']['actuals_period_entries']['Row'];
type SupabaseSpecialEventForecast = Database['public']['Tables']['special_event_forecasts']['Row'];
type SupabaseSpecialEventActual = Database['public']['Tables']['special_event_actuals']['Row'];
type SupabaseSpecialEventMilestone = Database['public']['Tables']['special_event_milestones']['Row'];

// Type for the get_user_projects() function return value
type GetUserProjectsResult = Omit<SupabaseProject, 'id'> & {
  project_id: string;
};

/**
 * Supabase-based implementation of the storage service
 * This implementation provides cloud storage with real-time capabilities
 * while maintaining the exact same interface as DexieStorageService
 */
export class SupabaseStorageService implements IStorageService {
  constructor() {
    console.log('SupabaseStorageService constructor called');
  }

  // ==================================================
  // PROJECT METHODS
  // ==================================================

  async getProject(projectId: string): Promise<Project | undefined> {
    try {
      console.log(`Fetching project ${projectId} from Supabase`);

      if (!projectId?.trim()) {
        throw new ValidationError('Project ID is required');
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined; // Not found
        }
        throw handleSupabaseError(error);
      }

      return this.mapSupabaseProjectToProject(data);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.getProject error:', error);
      throw new DatabaseError(`Failed to fetch project with ID ${projectId}`, error);
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      console.log('🔍 [SupabaseStorageService] Fetching all projects using get_user_projects()');

      // Check current user first
      const user = await this.getCurrentUser();
      console.log('🔍 [SupabaseStorageService] Current user for project fetch:', {
        id: user.id,
        email: user.email
      });

      // Use the new RLS-safe function instead of direct table query
      console.log('🔍 [SupabaseStorageService] Calling get_user_projects() function...');
      const { data, error } = await supabase
        .rpc('get_user_projects' as any) as { data: GetUserProjectsResult[] | null, error: any };

      console.log('🔍 [SupabaseStorageService] Project fetch result:', {
        dataCount: data?.length || 0,
        error: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint
      });

      if (error) {
        console.error('❌ [SupabaseStorageService] Detailed error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          stack: error.stack
        });
        throw handleSupabaseError(error);
      }

      const projects = (data || []).map((project) => {
        // The get_user_projects function returns project_id instead of id
        // Map it back to id for consistent interface
        const mappedProject = { ...project, id: project.project_id };
        return this.mapSupabaseProjectToProject(mappedProject);
      });
      console.log('✅ [SupabaseStorageService] Successfully mapped projects:', projects.length);
      return projects;
    } catch (error) {
      console.error('❌ [SupabaseStorageService] getAllProjects error:', error);
      throw new DatabaseError('Failed to fetch projects', error);
    }
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    console.log('🚀 [SupabaseStorageService] createProject called with:', projectData);
    try {
      console.log('🚀 [SupabaseStorageService] Step 1: Validating project data');

      if (!projectData.name?.trim()) {
        throw new ValidationError('Project name is required');
      }
      if (!projectData.productType?.trim()) {
        throw new ValidationError('Product type is required');
      }

      console.log('🚀 [SupabaseStorageService] Step 2: Getting current user...');
      const user = await this.getCurrentUser();
      console.log('🚀 [SupabaseStorageService] Step 3: Current user received:', user?.id || 'null');
      
      console.log('🚀 [SupabaseStorageService] Step 3.5: Ensuring user profile exists...');
      await this.ensureProfileExists(user);

      console.log('🚀 [SupabaseStorageService] Step 4: Building project object...');
      const newProject = {
        user_id: user.id,
        name: projectData.name,
        description: projectData.description || null,
        product_type: projectData.productType,
        target_audience: projectData.targetAudience || null,
        data: this.mapProjectDataToSupabase(projectData),
        timeline: this.mapTimelineToSupabase(projectData.timeline),
        avatar_image: projectData.avatarImage || null,
        is_public: projectData.is_public || false,
        owner_email: user.email || null,
        share_count: 0,
        event_type: projectData.event_type || 'weekly',
        event_date: projectData.event_date?.toISOString() || null,
        event_end_date: projectData.event_end_date?.toISOString() || null,
      };

      console.log('🚀 [SupabaseStorageService] Step 5: Inserting project into Supabase...');
      const { data, error } = await supabase
        .from('projects')
        .insert(newProject)
        .select()
        .single();

      console.log('🚀 [SupabaseStorageService] Step 6: Supabase insert completed');

      if (error) {
        throw handleSupabaseError(error);
      }

      const createdProject = this.mapSupabaseProjectToProject(data);
      console.log('Project created successfully:', createdProject.id);
      return createdProject;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.createProject error:', error);
      throw new DatabaseError('Failed to create project', error);
    }
  }

  async updateProject(projectId: string, projectData: Partial<Project>): Promise<Project> {
    try {
      console.log(`Updating project ${projectId}`, { projectData });

      const existingProject = await this.getProject(projectId);
      if (!existingProject) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      const updateData: any = {};
      
      if (projectData.name !== undefined) updateData.name = projectData.name;
      if (projectData.description !== undefined) updateData.description = projectData.description;
      if (projectData.productType !== undefined) updateData.product_type = projectData.productType;
      if (projectData.targetAudience !== undefined) updateData.target_audience = projectData.targetAudience;
      if (projectData.avatarImage !== undefined) updateData.avatar_image = projectData.avatarImage;
      if (projectData.is_public !== undefined) updateData.is_public = projectData.is_public;
      if (projectData.timeline !== undefined) updateData.timeline = this.mapTimelineToSupabase(projectData.timeline);
      
      // Merge additional data
      if (Object.keys(projectData).some(key => !['id', 'createdAt', 'updatedAt', 'name', 'description', 'productType', 'targetAudience', 'avatarImage', 'is_public', 'timeline'].includes(key))) {
        updateData.data = this.mapProjectDataToSupabase(projectData);
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      const updatedProject = this.mapSupabaseProjectToProject(data);
      console.log('Project updated successfully', { projectId });
      return updatedProject;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      console.error('SupabaseStorageService.updateProjecterror:', error);
      throw new DatabaseError(`Failed to update project with ID ${projectId}`, error);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      console.log(`Deleting project ${projectId}`);

      const existingProject = await this.getProject(projectId);
      if (!existingProject) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      // Soft delete by setting deleted_at timestamp
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) {
        throw handleSupabaseError(error);
      }

      console.log('Project deleted successfully', { projectId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('SupabaseStorageService.deleteProjecterror:', error);
      throw new DatabaseError(`Failed to delete project with ID ${projectId}`, error);
    }
  }

  // ==================================================
  // MODEL METHODS
  // ==================================================

  async getModelsForProject(projectId: string): Promise<FinancialModel[]> {
    try {
      console.log(`Fetching models for project ${projectId}`);

      if (!projectId?.trim()) {
        throw new ValidationError('Project ID is required');
      }

      const { data, error } = await supabase
        .from('financial_models')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        throw handleSupabaseError(error);
      }

      return (data || []).map((model) => this.mapSupabaseModelToModel(model));
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.getModelsForProjecterror:', error);
      throw new DatabaseError(`Failed to get models for project ${projectId}`, error);
    }
  }

  async getModel(modelId: string): Promise<FinancialModel | undefined> {
    try {
      console.log(`Fetching model ${modelId}`);

      if (!modelId?.trim()) {
        throw new ValidationError('Model ID is required');
      }

      const { data, error } = await supabase
        .from('financial_models')
        .select('*')
        .eq('id', modelId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return undefined; // Not found
        }
        throw handleSupabaseError(error);
      }

      return this.mapSupabaseModelToModel(data);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.getModelerror:', error);
      throw new DatabaseError(`Failed to fetch model with ID ${modelId}`, error);
    }
  }

  async createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    try {
      console.log('Creating financial model in Supabase', { modelData });

      if (!modelData.projectId?.trim()) {
        throw new ValidationError('Project ID is required');
      }
      if (!modelData.name?.trim()) {
        throw new ValidationError('Model name is required');
      }

      // Get current user
      const user = await this.getCurrentUser();

      const newModel = {
        project_id: modelData.projectId,
        user_id: user.id,
        name: modelData.name,
        assumptions: modelData.assumptions || {},
        results_cache: {},
      };

      const { data, error } = await supabase
        .from('financial_models')
        .insert(newModel)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      const createdModel = this.mapSupabaseModelToModel(data);
      console.log('Financial model created successfully', { modelId: createdModel.id });
      return createdModel;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.createModelerror:', error);
      throw new DatabaseError('Failed to create financial model', error);
    }
  }

  async updateModel(modelId: string, modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    try {
      console.log(`Updating model ${modelId}`, { modelData });

      const existingModel = await this.getModel(modelId);
      if (!existingModel) {
        throw new NotFoundError(`Financial model with ID ${modelId} not found`);
      }

      const updateData: any = {};
      
      if (modelData.name !== undefined) updateData.name = modelData.name;
      if (modelData.assumptions !== undefined) updateData.assumptions = modelData.assumptions;
      if (modelData.isPrimary !== undefined) updateData.is_primary = modelData.isPrimary;

      const { data, error } = await supabase
        .from('financial_models')
        .update(updateData)
        .eq('id', modelId)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      const updatedModel = this.mapSupabaseModelToModel(data);
      console.log('Financial model updated successfully', { modelId });
      return updatedModel;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      console.error('SupabaseStorageService.updateModelerror:', error);
      throw new DatabaseError(`Failed to update financial model with ID ${modelId}`, error);
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    try {
      console.log(`Deleting model ${modelId}`);

      const existingModel = await this.getModel(modelId);
      if (!existingModel) {
        throw new NotFoundError(`Financial model with ID ${modelId} not found`);
      }

      // Soft delete by setting deleted_at timestamp
      const { error } = await supabase
        .from('financial_models')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', modelId);

      if (error) {
        throw handleSupabaseError(error);
      }

      console.log('Financial model deleted successfully', { modelId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('SupabaseStorageService.deleteModelerror:', error);
      throw new DatabaseError(`Failed to delete financial model with ID ${modelId}`, error);
    }
  }

  // ==================================================
  // ACTUALS METHODS
  // ==================================================

  async getActualsForProject(projectId: string): Promise<ActualsPeriodEntry[]> {
    try {
      console.log(`Fetching actuals for project ${projectId}`);

      if (!projectId?.trim()) {
        throw new ValidationError('Project ID is required');
      }

      const { data, error } = await supabase
        .from('actuals_period_entries')
        .select('*')
        .eq('project_id', projectId)
        .order('period', { ascending: false });

      if (error) {
        throw handleSupabaseError(error);
      }

      return (data || []).map((actual) => this.mapSupabaseActualToActual(actual));
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.getActualsForProjecterror:', error);
      throw new DatabaseError(`Failed to get actuals for project ${projectId}`, error);
    }
  }

  async upsertActualsPeriod(actualData: Omit<ActualsPeriodEntry, 'id'>): Promise<ActualsPeriodEntry> {
    try {
      console.log('Upserting actuals period', { actualData });

      if (!actualData.projectId?.trim()) {
        throw new ValidationError('Project ID is required');
      }
      if (!actualData.period || actualData.period <= 0) {
        throw new ValidationError('Period is required and must be a positive number');
      }

      // Get current user
      const user = await this.getCurrentUser();

      const upsertData = {
        project_id: actualData.projectId,
        user_id: user.id,
        period: actualData.period,
        data: actualData,
      };

      const { data, error } = await supabase
        .from('actuals_period_entries')
        .upsert(upsertData, { onConflict: 'project_id,period' })
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      const result = this.mapSupabaseActualToActual(data);
      console.log('Actuals period upserted successfully', { period: actualData.period });
      return result;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.upsertActualsPerioderror:', error);
      throw new DatabaseError('Failed to upsert actuals period', error);
    }
  }

  // ==================================================
  // SPECIAL EVENT FORECAST METHODS
  // ==================================================

  async getSpecialEventForecast(forecastId: string): Promise<SpecialEventForecast | undefined> {
    try {
      console.log(`Fetching special event forecast ${forecastId}`);
      if (!forecastId?.trim()) {
        throw new ValidationError('Forecast ID is required');
      }
      const { data, error } = await supabase
        .from('special_event_forecasts')
        .select('*')
        .eq('id', forecastId)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw handleSupabaseError(error);
      }
      return this.mapSupabaseSpecialEventForecastToSpecialEventForecast(data);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.getSpecialEventForecast error:', error);
      throw new DatabaseError(`Failed to fetch special event forecast with ID ${forecastId}`, error);
    }
  }

  async getSpecialEventForecastsForProject(projectId: string): Promise<SpecialEventForecast[]> {
    try {
      console.log(`Fetching special event forecasts for project ${projectId}`);
      if (!projectId?.trim()) {
        throw new ValidationError('Project ID is required');
      }
      const { data, error } = await supabase
        .from('special_event_forecasts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) {
        throw handleSupabaseError(error);
      }
      return (data || []).map(this.mapSupabaseSpecialEventForecastToSpecialEventForecast);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.getSpecialEventForecastsForProject error:', error);
      throw new DatabaseError(`Failed to fetch special event forecasts for project ${projectId}`, error);
    }
  }

  async createSpecialEventForecast(forecastData: Partial<SpecialEventForecast>): Promise<SpecialEventForecast> {
    try {
      console.log('Creating special event forecast', { forecastData });
      if (!forecastData.project_id?.trim()) {
        throw new ValidationError('Project ID is required');
      }
      const newForecast = {
        project_id: forecastData.project_id,
        forecast_fnb_revenue: forecastData.forecast_fnb_revenue || null,
        forecast_fnb_cogs_pct: forecastData.forecast_fnb_cogs_pct || null,
        forecast_merch_revenue: forecastData.forecast_merch_revenue || null,
        forecast_merch_cogs_pct: forecastData.forecast_merch_cogs_pct || null,
        forecast_sponsorship_income: forecastData.forecast_sponsorship_income || null,
        forecast_ticket_sales: forecastData.forecast_ticket_sales || null,
        forecast_other_income: forecastData.forecast_other_income || null,
        forecast_total_costs: forecastData.forecast_total_costs || null,
        notes: forecastData.notes || null,
      };
      const { data, error } = await supabase
        .from('special_event_forecasts')
        .insert(newForecast)
        .select()
        .single();
      if (error) throw handleSupabaseError(error);
      return this.mapSupabaseSpecialEventForecastToSpecialEventForecast(data);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.createSpecialEventForecast error:', error);
      throw new DatabaseError('Failed to create special event forecast', error);
    }
  }

  async updateSpecialEventForecast(forecastId: string, forecastData: Partial<SpecialEventForecast>): Promise<SpecialEventForecast> {
    try {
      console.log(`Updating special event forecast ${forecastId}`, { forecastData });
      const existingForecast = await this.getSpecialEventForecast(forecastId);
      if (!existingForecast) {
        throw new NotFoundError(`Special event forecast with ID ${forecastId} not found`);
      }
      const updateData: any = {
        forecast_fnb_revenue: forecastData.forecast_fnb_revenue,
        forecast_fnb_cogs_pct: forecastData.forecast_fnb_cogs_pct,
        forecast_merch_revenue: forecastData.forecast_merch_revenue,
        forecast_merch_cogs_pct: forecastData.forecast_merch_cogs_pct,
        forecast_sponsorship_income: forecastData.forecast_sponsorship_income,
        forecast_ticket_sales: forecastData.forecast_ticket_sales,
        forecast_other_income: forecastData.forecast_other_income,
        forecast_total_costs: forecastData.forecast_total_costs,
        notes: forecastData.notes,
      };
      const { data, error } = await supabase
        .from('special_event_forecasts')
        .update(updateData)
        .eq('id', forecastId)
        .select()
        .single();
      if (error) throw handleSupabaseError(error);
      return this.mapSupabaseSpecialEventForecastToSpecialEventForecast(data);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      console.error('SupabaseStorageService.updateSpecialEventForecast error:', error);
      throw new DatabaseError(`Failed to update special event forecast with ID ${forecastId}`, error);
    }
  }

  async deleteSpecialEventForecast(forecastId: string): Promise<void> {
    try {
      console.log(`Deleting special event forecast ${forecastId}`);
      const existingForecast = await this.getSpecialEventForecast(forecastId);
      if (!existingForecast) {
        throw new NotFoundError(`Special event forecast with ID ${forecastId} not found`);
      }
      const { error } = await supabase
        .from('special_event_forecasts')
        .delete()
        .eq('id', forecastId);
      if (error) throw handleSupabaseError(error);
      console.log('Special event forecast deleted successfully', { forecastId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('SupabaseStorageService.deleteSpecialEventForecast error:', error);
      throw new DatabaseError(`Failed to delete special event forecast with ID ${forecastId}`, error);
    }
  }

  // ==================================================
  // SPECIAL EVENT ACTUALS METHODS
  // ==================================================

  async getSpecialEventActual(actualId: string): Promise<SpecialEventActual | undefined> {
    try {
      console.log(`Fetching special event actual ${actualId}`);
      if (!actualId?.trim()) {
        throw new ValidationError('Actual ID is required');
      }
      const { data, error } = await supabase
        .from('special_event_actuals')
        .select('*')
        .eq('id', actualId)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw handleSupabaseError(error);
      }
      return this.mapSupabaseSpecialEventActualToSpecialEventActual(data);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.getSpecialEventActual error:', error);
      throw new DatabaseError(`Failed to fetch special event actual with ID ${actualId}`, error);
    }
  }

  async getSpecialEventActualsForProject(projectId: string): Promise<SpecialEventActual[]> {
    try {
      console.log(`Fetching special event actuals for project ${projectId}`);
      if (!projectId?.trim()) {
        throw new ValidationError('Project ID is required');
      }
      const { data, error } = await supabase
        .from('special_event_actuals')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) {
        throw handleSupabaseError(error);
      }
      return (data || []).map(this.mapSupabaseSpecialEventActualToSpecialEventActual);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.getSpecialEventActualsForProject error:', error);
      throw new DatabaseError(`Failed to fetch special event actuals for project ${projectId}`, error);
    }
  }

  async createSpecialEventActual(actualData: Partial<SpecialEventActual>): Promise<SpecialEventActual> {
    try {
      console.log('Creating special event actual', { actualData });
      if (!actualData.project_id?.trim()) {
        throw new ValidationError('Project ID is required');
      }
      if (
        actualData.success_rating !== undefined &&
        actualData.success_rating !== null &&
        (actualData.success_rating < 1 || actualData.success_rating > 5)
      ) {
        throw new ValidationError('Success rating must be between 1 and 5');
      }
      const newActual = {
        project_id: actualData.project_id,
        actual_fnb_revenue: actualData.actual_fnb_revenue || null,
        actual_fnb_cogs: actualData.actual_fnb_cogs || null,
        actual_merch_revenue: actualData.actual_merch_revenue || null,
        actual_merch_cogs: actualData.actual_merch_cogs || null,
        actual_sponsorship_income: actualData.actual_sponsorship_income || null,
        actual_ticket_sales: actualData.actual_ticket_sales || null,
        actual_other_income: actualData.actual_other_income || null,
        actual_total_costs: actualData.actual_total_costs || null,
        attendance: actualData.attendance || null,
        notes: actualData.notes || null,
        success_rating: actualData.success_rating || null,
      };
      const { data, error } = await supabase
        .from('special_event_actuals')
        .insert(newActual)
        .select()
        .single();
      if (error) throw handleSupabaseError(error);
      return this.mapSupabaseSpecialEventActualToSpecialEventActual(data);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.createSpecialEventActual error:', error);
      throw new DatabaseError('Failed to create special event actual', error);
    }
  }

  async updateSpecialEventActual(actualId: string, actualData: Partial<SpecialEventActual>): Promise<SpecialEventActual> {
    try {
      console.log(`Updating special event actual ${actualId}`, { actualData });
      const existingActual = await this.getSpecialEventActual(actualId);
      if (!existingActual) {
        throw new NotFoundError(`Special event actual with ID ${actualId} not found`);
      }
      if (
        actualData.success_rating !== undefined &&
        actualData.success_rating !== null &&
        (actualData.success_rating < 1 || actualData.success_rating > 5)
      ) {
        throw new ValidationError('Success rating must be between 1 and 5');
      }
      const updateData: any = {
        actual_fnb_revenue: actualData.actual_fnb_revenue,
        actual_fnb_cogs: actualData.actual_fnb_cogs,
        actual_merch_revenue: actualData.actual_merch_revenue,
        actual_merch_cogs: actualData.actual_merch_cogs,
        actual_sponsorship_income: actualData.actual_sponsorship_income,
        actual_ticket_sales: actualData.actual_ticket_sales,
        actual_other_income: actualData.actual_other_income,
        actual_total_costs: actualData.actual_total_costs,
        attendance: actualData.attendance,
        notes: actualData.notes,
        success_rating: actualData.success_rating,
      };
      const { data, error } = await supabase
        .from('special_event_actuals')
        .update(updateData)
        .eq('id', actualId)
        .select()
        .single();
      if (error) throw handleSupabaseError(error);
      return this.mapSupabaseSpecialEventActualToSpecialEventActual(data);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      console.error('SupabaseStorageService.updateSpecialEventActual error:', error);
      throw new DatabaseError(`Failed to update special event actual with ID ${actualId}`, error);
    }
  }

  async deleteSpecialEventActual(actualId: string): Promise<void> {
    try {
      console.log(`Deleting special event actual ${actualId}`);
      const existingActual = await this.getSpecialEventActual(actualId);
      if (!existingActual) {
        throw new NotFoundError(`Special event actual with ID ${actualId} not found`);
      }
      const { error } = await supabase
        .from('special_event_actuals')
        .delete()
        .eq('id', actualId);
      if (error) throw handleSupabaseError(error);
      console.log('Special event actual deleted successfully', { actualId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('SupabaseStorageService.deleteSpecialEventActual error:', error);
      throw new DatabaseError(`Failed to delete special event actual with ID ${actualId}`, error);
    }
  }

  // ==================================================
  // SPECIAL EVENT MILESTONE METHODS
  // ==================================================

  async getSpecialEventMilestone(milestoneId: string): Promise<SpecialEventMilestone | undefined> {
    try {
      console.log(`Fetching special event milestone ${milestoneId}`);
      if (!milestoneId?.trim()) {
        throw new ValidationError('Milestone ID is required');
      }
      const { data, error } = await supabase
        .from('special_event_milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw handleSupabaseError(error);
      }
      return this.mapSupabaseSpecialEventMilestoneToSpecialEventMilestone(data);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.getSpecialEventMilestone error:', error);
      throw new DatabaseError(`Failed to fetch special event milestone with ID ${milestoneId}`, error);
    }
  }

  async getSpecialEventMilestonesForProject(projectId: string): Promise<SpecialEventMilestone[]> {
    try {
      console.log(`Fetching special event milestones for project ${projectId}`);
      if (!projectId?.trim()) {
        throw new ValidationError('Project ID is required');
      }
      const { data, error } = await supabase
        .from('special_event_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('target_date', { ascending: true });
      if (error) {
        throw handleSupabaseError(error);
      }
      return (data || []).map(this.mapSupabaseSpecialEventMilestoneToSpecialEventMilestone);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.getSpecialEventMilestonesForProject error:', error);
      throw new DatabaseError(`Failed to fetch special event milestones for project ${projectId}`, error);
    }
  }

  async createSpecialEventMilestone(milestoneData: Partial<SpecialEventMilestone>): Promise<SpecialEventMilestone> {
    try {
      console.log('Creating special event milestone', { milestoneData });
      if (!milestoneData.project_id?.trim()) {
        throw new ValidationError('Project ID is required');
      }
      const newMilestone = {
        project_id: milestoneData.project_id,
        milestone_label: milestoneData.milestone_label || null,
        target_date: milestoneData.target_date?.toISOString() || null,
        completed: milestoneData.completed || false,
        assignee: milestoneData.assignee || null,
        notes: milestoneData.notes || null,
      };
      const { data, error } = await supabase
        .from('special_event_milestones')
        .insert(newMilestone)
        .select()
        .single();
      if (error) throw handleSupabaseError(error);
      return this.mapSupabaseSpecialEventMilestoneToSpecialEventMilestone(data);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.error('SupabaseStorageService.createSpecialEventMilestone error:', error);
      throw new DatabaseError('Failed to create special event milestone', error);
    }
  }

  async updateSpecialEventMilestone(milestoneId: string, milestoneData: Partial<SpecialEventMilestone>): Promise<SpecialEventMilestone> {
    try {
      console.log(`Updating special event milestone ${milestoneId}`, { milestoneData });
      const existingMilestone = await this.getSpecialEventMilestone(milestoneId);
      if (!existingMilestone) {
        throw new NotFoundError(`Special event milestone with ID ${milestoneId} not found`);
      }
      const updateData: any = {
        milestone_label: milestoneData.milestone_label,
        target_date: milestoneData.target_date?.toISOString(),
        completed: milestoneData.completed,
        assignee: milestoneData.assignee,
        notes: milestoneData.notes,
      };
      const { data, error } = await supabase
        .from('special_event_milestones')
        .update(updateData)
        .eq('id', milestoneId)
        .select()
        .single();
      if (error) throw handleSupabaseError(error);
      return this.mapSupabaseSpecialEventMilestoneToSpecialEventMilestone(data);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      console.error('SupabaseStorageService.updateSpecialEventMilestone error:', error);
      throw new DatabaseError(`Failed to update special event milestone with ID ${milestoneId}`, error);
    }
  }

  async deleteSpecialEventMilestone(milestoneId: string): Promise<void> {
    try {
      console.log(`Deleting special event milestone ${milestoneId}`);
      const existingMilestone = await this.getSpecialEventMilestone(milestoneId);
      if (!existingMilestone) {
        throw new NotFoundError(`Special event milestone with ID ${milestoneId} not found`);
      }
      const { error } = await supabase
        .from('special_event_milestones')
        .delete()
        .eq('id', milestoneId);
      if (error) throw handleSupabaseError(error);
      console.log('Special event milestone deleted successfully', { milestoneId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('SupabaseStorageService.deleteSpecialEventMilestone error:', error);
      throw new DatabaseError(`Failed to delete special event milestone with ID ${milestoneId}`, error);
    }
  }

  // ==================================================
  // UTILITY METHODS
  // ==================================================


  /**
   * Ensure a profile exists for the user (create if missing)
   */
  private async ensureProfileExists(user: any): Promise<void> {
    try {
      console.log('🔍 [ensureProfileExists] Checking if profile exists for user:', user.id);
      
      // Check if profile already exists
      const { data: existingProfile, error: getError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (existingProfile) {
        console.log('✅ [ensureProfileExists] Profile already exists');
        return;
      }
      
      if (getError && getError.code !== 'PGRST116') {
        console.error('❌ [ensureProfileExists] Error checking profile:', getError);
        throw getError;
      }
      
      // Create profile
      console.log('🔧 [ensureProfileExists] Creating profile for user');
      const newProfile = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        company_domain: user.user_metadata?.custom_claims?.hd || null,
        preferences: {}
      };
      
      const { error: createError } = await supabase
        .from('profiles')
        .insert(newProfile);
      
      if (createError) {
        console.error('❌ [ensureProfileExists] Failed to create profile:', createError);
        throw createError;
      }
      
      console.log('✅ [ensureProfileExists] Profile created successfully');
    } catch (error) {
      console.error('❌ [ensureProfileExists] Profile creation failed:', error);
      throw error; // Throw so project creation fails if we can't create profile
    }
  }

  /**
   * Get the current authenticated user with enhanced debugging
   */
  private async getCurrentUser(): Promise<any> {
    console.log('🚀 [SupabaseStorageService] getCurrentUser called');
    
    try {
      // First check the session
      console.log('🔍 [SupabaseStorageService] Checking session first...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('🔍 [SupabaseStorageService] Session check:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        expiresAt: session?.expires_at,
        sessionError: sessionError?.message,
        isExpired: session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : 'unknown'
      });

      if (sessionError) {
        console.error('❌ [SupabaseStorageService] Session error:', sessionError);
        throw new ValidationError('Session error: ' + sessionError.message);
      }

      if (!session) {
        console.error('❌ [SupabaseStorageService] No active session found');
        throw new ValidationError('No active authentication session. Please log in first.');
      }

      if (!session.user) {
        console.error('❌ [SupabaseStorageService] Session exists but no user found');
        throw new ValidationError('Invalid session: no user data found');
      }

      console.log('✅ [SupabaseStorageService] Successfully retrieved current user:', {
        id: session.user.id,
        email: session.user.email
      });
      
      return session.user;
    } catch (error) {
      console.error('❌ [SupabaseStorageService] getCurrentUser failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has access to a project
   */
  private async checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (error) return false;
      return data.user_id === userId;
    } catch {
      return false;
    }
  }

  /**
   * Validate environment setup
   */
  public static validateEnvironment(): void {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new ValidationError('Supabase environment variables are not configured properly');
    }
  }

  /**
   * Test the connection to Supabase
   */
  public async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('projects').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================================================
  // MAPPING FUNCTIONS
  // ==================================================

  private mapSupabaseProjectToProject(supabaseProject: SupabaseProject): Project {
    return {
      id: supabaseProject.id,
      name: supabaseProject.name,
      description: supabaseProject.description || undefined,
      productType: supabaseProject.product_type,
      targetAudience: supabaseProject.target_audience || undefined,
      createdAt: new Date(supabaseProject.created_at),
      updatedAt: new Date(supabaseProject.updated_at),
      timeline: this.mapSupabaseTimelineToTimeline(supabaseProject.timeline),
      avatarImage: supabaseProject.avatar_image || undefined,
      is_public: supabaseProject.is_public,
      shared_by: supabaseProject.owner_email || undefined,
      owner_email: supabaseProject.owner_email || undefined,
      share_count: supabaseProject.share_count,
      permission: 'owner', // Default for owner, will be overridden for shared projects
      event_type: (supabaseProject.event_type || 'weekly') as 'weekly' | 'special',
      event_date: supabaseProject.event_date ? new Date(supabaseProject.event_date) : undefined,
      event_end_date: supabaseProject.event_end_date ? new Date(supabaseProject.event_end_date) : undefined,
    };
  }

  private mapSupabaseModelToModel(supabaseModel: SupabaseModel): FinancialModel {
    return {
      id: supabaseModel.id,
      projectId: supabaseModel.project_id,
      name: supabaseModel.name,
      isPrimary: supabaseModel.is_primary || false,
      assumptions: supabaseModel.assumptions as any,
      createdAt: new Date(supabaseModel.created_at),
      updatedAt: new Date(supabaseModel.updated_at),
    };
  }

  private mapSupabaseActualToActual(supabaseActual: SupabaseActualEntry): ActualsPeriodEntry {
    return {
      id: supabaseActual.id,
      projectId: supabaseActual.project_id,
      period: supabaseActual.period,
      ...(supabaseActual.data as any),
    };
  }

  private mapSupabaseSpecialEventForecastToSpecialEventForecast(supabaseForecast: SupabaseSpecialEventForecast): SpecialEventForecast {
    return {
      id: supabaseForecast.id,
      project_id: supabaseForecast.project_id,
      forecast_fnb_revenue: supabaseForecast.forecast_fnb_revenue || undefined,
      forecast_fnb_cogs_pct: supabaseForecast.forecast_fnb_cogs_pct || undefined,
      forecast_merch_revenue: supabaseForecast.forecast_merch_revenue || undefined,
      forecast_merch_cogs_pct: supabaseForecast.forecast_merch_cogs_pct || undefined,
      forecast_sponsorship_income: supabaseForecast.forecast_sponsorship_income || undefined,
      forecast_ticket_sales: supabaseForecast.forecast_ticket_sales || undefined,
      forecast_other_income: supabaseForecast.forecast_other_income || undefined,
      forecast_total_costs: supabaseForecast.forecast_total_costs || undefined,
      notes: supabaseForecast.notes || undefined,
      created_at: new Date(supabaseForecast.created_at),
    };
  }

  private mapSupabaseSpecialEventActualToSpecialEventActual(supabaseActual: SupabaseSpecialEventActual): SpecialEventActual {
    return {
      id: supabaseActual.id,
      project_id: supabaseActual.project_id,
      actual_fnb_revenue: supabaseActual.actual_fnb_revenue || undefined,
      actual_fnb_cogs: supabaseActual.actual_fnb_cogs || undefined,
      actual_merch_revenue: supabaseActual.actual_merch_revenue || undefined,
      actual_merch_cogs: supabaseActual.actual_merch_cogs || undefined,
      actual_sponsorship_income: supabaseActual.actual_sponsorship_income || undefined,
      actual_ticket_sales: supabaseActual.actual_ticket_sales || undefined,
      actual_other_income: supabaseActual.actual_other_income || undefined,
      actual_total_costs: supabaseActual.actual_total_costs || undefined,
      attendance: supabaseActual.attendance || undefined,
      notes: supabaseActual.notes || undefined,
      success_rating: supabaseActual.success_rating || undefined,
      created_at: new Date(supabaseActual.created_at),
    };
  }

  private mapSupabaseSpecialEventMilestoneToSpecialEventMilestone(supabaseMilestone: SupabaseSpecialEventMilestone): SpecialEventMilestone {
    return {
      id: supabaseMilestone.id,
      project_id: supabaseMilestone.project_id,
      milestone_label: supabaseMilestone.milestone_label || undefined,
      target_date: supabaseMilestone.target_date ? new Date(supabaseMilestone.target_date) : undefined,
      completed: supabaseMilestone.completed || undefined,
      assignee: supabaseMilestone.assignee || undefined,
      notes: supabaseMilestone.notes || undefined,
    };
  }

  private mapProjectDataToSupabase(projectData: any): any {
    // Extract known fields and put everything else in data JSONB
    const { id, name, description, productType, targetAudience, createdAt, updatedAt, timeline, avatarImage, is_public, shared_by, owner_email, share_count, permission, ...extraData } = projectData;
    return extraData;
  }

  private mapTimelineToSupabase(timeline: any): any {
    if (!timeline) return {};
    return {
      startDate: timeline.startDate?.toISOString?.() || timeline.startDate,
      endDate: timeline.endDate?.toISOString?.() || timeline.endDate,
    };
  }

  private mapSupabaseTimelineToTimeline(timeline: any): any {
    if (!timeline || typeof timeline !== 'object') return undefined;
    
    const result: any = {};
    if (timeline.startDate) {
      result.startDate = new Date(timeline.startDate);
    }
    if (timeline.endDate) {
      result.endDate = new Date(timeline.endDate);
    }
    
    return Object.keys(result).length > 0 ? result : undefined;
  }

  // ==================================================
  // SHARING METHODS
  // ==================================================

  async getPublicProjects(): Promise<Project[]> {
    try {
      console.log('🔍 [SupabaseStorageService] Fetching public projects from Supabase');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_public', true)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ [SupabaseStorageService] Public projects fetch error:', error);
        throw handleSupabaseError(error);
      }

      const projects = (data || []).map((project) => this.mapSupabaseProjectToProject(project));
      console.log('✅ [SupabaseStorageService] Successfully fetched public projects:', projects.length);
      return projects;
    } catch (error) {
      console.error('❌ [SupabaseStorageService] getPublicProjects error:', error);
      throw new DatabaseError('Failed to fetch public projects', error);
    }
  }

  async getSharedProjects(): Promise<Project[]> {
    try {
      console.log('🔍 [SupabaseStorageService] Fetching shared projects from Supabase');

      const user = await this.getCurrentUser();
      if (!user.email) {
        console.log('User has no email, cannot fetch shared projects');
        return [];
      }

      // Use the new get_shared_projects() function to avoid RLS issues
      const { data, error } = await supabase
        .rpc('get_shared_projects' as any) as { data: any[] | null, error: any };

      if (error) {
        console.error('❌ [SupabaseStorageService] Shared projects fetch error:', error);
        throw handleSupabaseError(error);
      }

      const projects = (data || []).map((project) => {
        const mappedProject = this.mapSupabaseProjectToProject(project);
        // Add permission from the function result
        if (project.permission) {
          mappedProject.permission = project.permission as 'owner' | 'view' | 'edit';
        }
        return mappedProject;
      });
      
      console.log('✅ [SupabaseStorageService] Successfully fetched shared projects:', projects.length);
      return projects;
    } catch (error) {
      console.error('❌ [SupabaseStorageService] getSharedProjects error:', error);
      throw new DatabaseError('Failed to fetch shared projects', error);
    }
  }
}
