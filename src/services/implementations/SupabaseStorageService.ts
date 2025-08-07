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

      // Use the RPC function which now exists
      console.log('🔍 [SupabaseStorageService] Calling get_user_projects() function...');
      const { data, error } = await supabase
        .rpc('get_user_projects');

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
        // RPC function returns the project directly
        return this.mapSupabaseProjectToProject(project);
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
      if (projectData.event_type !== undefined) updateData.event_type = projectData.event_type;
      if (projectData.event_date !== undefined) updateData.event_date = projectData.event_date?.toISOString() || null;
      if (projectData.event_end_date !== undefined) updateData.event_end_date = projectData.event_end_date?.toISOString() || null;
      
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
        // Revenue streams
        forecast_ticket_sales: forecastData.forecast_ticket_sales || null,
        forecast_fnb_revenue: forecastData.forecast_fnb_revenue || null,
        forecast_fnb_cogs_pct: forecastData.forecast_fnb_cogs_pct || null,
        forecast_merch_revenue: forecastData.forecast_merch_revenue || null,
        forecast_merch_cogs_pct: forecastData.forecast_merch_cogs_pct || null,
        forecast_sponsorship_income: forecastData.forecast_sponsorship_income || null,
        forecast_other_income: forecastData.forecast_other_income || null,
        // Cost breakdown
        forecast_staffing_costs: forecastData.forecast_staffing_costs || null,
        forecast_venue_costs: forecastData.forecast_venue_costs || null,
        forecast_vendor_costs: forecastData.forecast_vendor_costs || null,
        forecast_marketing_costs: forecastData.forecast_marketing_costs || null,
        forecast_production_costs: forecastData.forecast_production_costs || null,
        forecast_other_costs: forecastData.forecast_other_costs || null,
        // Marketing details
        marketing_email_budget: forecastData.marketing_email_budget || null,
        marketing_social_budget: forecastData.marketing_social_budget || null,
        marketing_influencer_budget: forecastData.marketing_influencer_budget || null,
        marketing_paid_ads_budget: forecastData.marketing_paid_ads_budget || null,
        marketing_content_budget: forecastData.marketing_content_budget || null,
        marketing_strategy: forecastData.marketing_strategy || null,
        // Event details
        estimated_attendance: forecastData.estimated_attendance || null,
        ticket_price: forecastData.ticket_price || null,
        // Notes
        revenue_notes: forecastData.revenue_notes || null,
        cost_notes: forecastData.cost_notes || null,
        marketing_notes: forecastData.marketing_notes || null,
        general_notes: forecastData.general_notes || null,
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
      
      // Only include fields that are actually being updated (not undefined)
      const updateData: any = {};
      
      // Revenue streams - only update if value provided
      if (forecastData.forecast_ticket_sales !== undefined) updateData.forecast_ticket_sales = forecastData.forecast_ticket_sales;
      if (forecastData.forecast_fnb_revenue !== undefined) updateData.forecast_fnb_revenue = forecastData.forecast_fnb_revenue;
      if (forecastData.forecast_fnb_cogs_pct !== undefined) updateData.forecast_fnb_cogs_pct = forecastData.forecast_fnb_cogs_pct;
      if (forecastData.forecast_merch_revenue !== undefined) updateData.forecast_merch_revenue = forecastData.forecast_merch_revenue;
      if (forecastData.forecast_merch_cogs_pct !== undefined) updateData.forecast_merch_cogs_pct = forecastData.forecast_merch_cogs_pct;
      if (forecastData.forecast_sponsorship_income !== undefined) updateData.forecast_sponsorship_income = forecastData.forecast_sponsorship_income;
      if (forecastData.forecast_other_income !== undefined) updateData.forecast_other_income = forecastData.forecast_other_income;
      
      // Cost breakdown - only update if value provided
      if (forecastData.forecast_staffing_costs !== undefined) updateData.forecast_staffing_costs = forecastData.forecast_staffing_costs;
      if (forecastData.forecast_venue_costs !== undefined) updateData.forecast_venue_costs = forecastData.forecast_venue_costs;
      if (forecastData.forecast_vendor_costs !== undefined) updateData.forecast_vendor_costs = forecastData.forecast_vendor_costs;
      if (forecastData.forecast_marketing_costs !== undefined) updateData.forecast_marketing_costs = forecastData.forecast_marketing_costs;
      if (forecastData.forecast_production_costs !== undefined) updateData.forecast_production_costs = forecastData.forecast_production_costs;
      if (forecastData.forecast_other_costs !== undefined) updateData.forecast_other_costs = forecastData.forecast_other_costs;
      
      // Marketing details - only update if value provided
      if (forecastData.marketing_email_budget !== undefined) updateData.marketing_email_budget = forecastData.marketing_email_budget;
      if (forecastData.marketing_social_budget !== undefined) updateData.marketing_social_budget = forecastData.marketing_social_budget;
      if (forecastData.marketing_influencer_budget !== undefined) updateData.marketing_influencer_budget = forecastData.marketing_influencer_budget;
      if (forecastData.marketing_paid_ads_budget !== undefined) updateData.marketing_paid_ads_budget = forecastData.marketing_paid_ads_budget;
      if (forecastData.marketing_content_budget !== undefined) updateData.marketing_content_budget = forecastData.marketing_content_budget;
      if (forecastData.marketing_strategy !== undefined) updateData.marketing_strategy = forecastData.marketing_strategy;
      
      // Event details - only update if value provided
      if (forecastData.estimated_attendance !== undefined) updateData.estimated_attendance = forecastData.estimated_attendance;
      if (forecastData.ticket_price !== undefined) updateData.ticket_price = forecastData.ticket_price;
      
      // Notes - only update if value provided
      if (forecastData.revenue_notes !== undefined) updateData.revenue_notes = forecastData.revenue_notes;
      if (forecastData.cost_notes !== undefined) updateData.cost_notes = forecastData.cost_notes;
      if (forecastData.marketing_notes !== undefined) updateData.marketing_notes = forecastData.marketing_notes;
      if (forecastData.general_notes !== undefined) updateData.general_notes = forecastData.general_notes;
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
        (actualData.success_rating < 1 || actualData.success_rating > 10)
      ) {
        throw new ValidationError('Success rating must be between 1 and 10');
      }
      const newActual = {
        project_id: actualData.project_id,
        // Actual revenue streams
        actual_ticket_sales: actualData.actual_ticket_sales || null,
        actual_fnb_revenue: actualData.actual_fnb_revenue || null,
        actual_fnb_cogs: actualData.actual_fnb_cogs || null,
        actual_merch_revenue: actualData.actual_merch_revenue || null,
        actual_merch_cogs: actualData.actual_merch_cogs || null,
        actual_sponsorship_income: actualData.actual_sponsorship_income || null,
        actual_other_income: actualData.actual_other_income || null,
        // Actual cost breakdown
        actual_staffing_costs: actualData.actual_staffing_costs || null,
        actual_venue_costs: actualData.actual_venue_costs || null,
        actual_vendor_costs: actualData.actual_vendor_costs || null,
        actual_marketing_costs: actualData.actual_marketing_costs || null,
        actual_production_costs: actualData.actual_production_costs || null,
        actual_other_costs: actualData.actual_other_costs || null,
        // Marketing performance
        marketing_email_performance: actualData.marketing_email_performance || null,
        marketing_social_performance: actualData.marketing_social_performance || null,
        marketing_influencer_performance: actualData.marketing_influencer_performance || null,
        marketing_paid_ads_performance: actualData.marketing_paid_ads_performance || null,
        marketing_content_performance: actualData.marketing_content_performance || null,
        marketing_roi_notes: actualData.marketing_roi_notes || null,
        // Event metrics
        actual_attendance: actualData.actual_attendance || null,
        attendance_breakdown: actualData.attendance_breakdown || null,
        average_ticket_price: actualData.average_ticket_price || null,
        // Success indicators
        success_rating: actualData.success_rating || null,
        event_success_indicators: actualData.event_success_indicators || null,
        challenges_faced: actualData.challenges_faced || null,
        lessons_learned: actualData.lessons_learned || null,
        recommendations_future: actualData.recommendations_future || null,
        // Post-event analysis
        customer_feedback_summary: actualData.customer_feedback_summary || null,
        team_feedback: actualData.team_feedback || null,
        vendor_feedback: actualData.vendor_feedback || null,
        // Additional metrics
        social_media_engagement: actualData.social_media_engagement || null,
        press_coverage: actualData.press_coverage || null,
        brand_impact_assessment: actualData.brand_impact_assessment || null,
        // Notes
        revenue_variance_notes: actualData.revenue_variance_notes || null,
        cost_variance_notes: actualData.cost_variance_notes || null,
        general_notes: actualData.general_notes || null,
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
      
      if (
        actualData.success_rating !== undefined &&
        actualData.success_rating !== null &&
        (actualData.success_rating < 1 || actualData.success_rating > 10)
      ) {
        throw new ValidationError('Success rating must be between 1 and 10');
      }
      // Only include fields that are actually being updated (not undefined)
      const updateData: any = {};
      
      // Actual revenue streams - only update if value provided
      if (actualData.actual_ticket_sales !== undefined) updateData.actual_ticket_sales = actualData.actual_ticket_sales;
      if (actualData.actual_fnb_revenue !== undefined) updateData.actual_fnb_revenue = actualData.actual_fnb_revenue;
      if (actualData.actual_fnb_cogs !== undefined) updateData.actual_fnb_cogs = actualData.actual_fnb_cogs;
      if (actualData.actual_merch_revenue !== undefined) updateData.actual_merch_revenue = actualData.actual_merch_revenue;
      if (actualData.actual_merch_cogs !== undefined) updateData.actual_merch_cogs = actualData.actual_merch_cogs;
      if (actualData.actual_sponsorship_income !== undefined) updateData.actual_sponsorship_income = actualData.actual_sponsorship_income;
      if (actualData.actual_other_income !== undefined) updateData.actual_other_income = actualData.actual_other_income;
      
      // Actual cost breakdown - only update if value provided
      if (actualData.actual_staffing_costs !== undefined) updateData.actual_staffing_costs = actualData.actual_staffing_costs;
      if (actualData.actual_venue_costs !== undefined) updateData.actual_venue_costs = actualData.actual_venue_costs;
      if (actualData.actual_vendor_costs !== undefined) updateData.actual_vendor_costs = actualData.actual_vendor_costs;
      if (actualData.actual_marketing_costs !== undefined) updateData.actual_marketing_costs = actualData.actual_marketing_costs;
      if (actualData.actual_production_costs !== undefined) updateData.actual_production_costs = actualData.actual_production_costs;
      if (actualData.actual_other_costs !== undefined) updateData.actual_other_costs = actualData.actual_other_costs;
      
      // Marketing performance - only update if value provided
      if (actualData.marketing_email_performance !== undefined) updateData.marketing_email_performance = actualData.marketing_email_performance;
      if (actualData.marketing_social_performance !== undefined) updateData.marketing_social_performance = actualData.marketing_social_performance;
      if (actualData.marketing_influencer_performance !== undefined) updateData.marketing_influencer_performance = actualData.marketing_influencer_performance;
      if (actualData.marketing_paid_ads_performance !== undefined) updateData.marketing_paid_ads_performance = actualData.marketing_paid_ads_performance;
      if (actualData.marketing_content_performance !== undefined) updateData.marketing_content_performance = actualData.marketing_content_performance;
      if (actualData.marketing_roi_notes !== undefined) updateData.marketing_roi_notes = actualData.marketing_roi_notes;
      
      // Event metrics - only update if value provided
      if (actualData.actual_attendance !== undefined) updateData.actual_attendance = actualData.actual_attendance;
      if (actualData.attendance_breakdown !== undefined) updateData.attendance_breakdown = actualData.attendance_breakdown;
      if (actualData.average_ticket_price !== undefined) updateData.average_ticket_price = actualData.average_ticket_price;
      
      // Success indicators - only update if value provided
      if (actualData.success_rating !== undefined) updateData.success_rating = actualData.success_rating;
      if (actualData.event_success_indicators !== undefined) updateData.event_success_indicators = actualData.event_success_indicators;
      if (actualData.challenges_faced !== undefined) updateData.challenges_faced = actualData.challenges_faced;
      if (actualData.lessons_learned !== undefined) updateData.lessons_learned = actualData.lessons_learned;
      if (actualData.recommendations_future !== undefined) updateData.recommendations_future = actualData.recommendations_future;
      
      // Post-event analysis - only update if value provided
      if (actualData.customer_feedback_summary !== undefined) updateData.customer_feedback_summary = actualData.customer_feedback_summary;
      if (actualData.team_feedback !== undefined) updateData.team_feedback = actualData.team_feedback;
      if (actualData.vendor_feedback !== undefined) updateData.vendor_feedback = actualData.vendor_feedback;
      
      // Additional metrics - only update if value provided
      if (actualData.social_media_engagement !== undefined) updateData.social_media_engagement = actualData.social_media_engagement;
      if (actualData.press_coverage !== undefined) updateData.press_coverage = actualData.press_coverage;
      if (actualData.brand_impact_assessment !== undefined) updateData.brand_impact_assessment = actualData.brand_impact_assessment;
      
      // Notes - only update if value provided
      if (actualData.revenue_variance_notes !== undefined) updateData.revenue_variance_notes = actualData.revenue_variance_notes;
      if (actualData.cost_variance_notes !== undefined) updateData.cost_variance_notes = actualData.cost_variance_notes;
      if (actualData.general_notes !== undefined) updateData.general_notes = actualData.general_notes;
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
      description: supabaseProject.description ?? undefined,
      productType: supabaseProject.product_type,
      targetAudience: supabaseProject.target_audience ?? undefined,
      createdAt: supabaseProject.created_at ? new Date(supabaseProject.created_at) : new Date(),
      updatedAt: supabaseProject.updated_at ? new Date(supabaseProject.updated_at) : new Date(),
      timeline: this.mapSupabaseTimelineToTimeline(supabaseProject.timeline),
      avatarImage: supabaseProject.avatar_image ?? undefined,
      is_public: supabaseProject.is_public ?? false,
      shared_by: supabaseProject.owner_email ?? undefined,
      owner_email: supabaseProject.owner_email ?? undefined,
      share_count: supabaseProject.share_count ?? 0,
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
      createdAt: supabaseModel.created_at ? new Date(supabaseModel.created_at) : new Date(),
      updatedAt: supabaseModel.updated_at ? new Date(supabaseModel.updated_at) : new Date(),
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
      // Revenue streams
      forecast_ticket_sales: supabaseForecast.forecast_ticket_sales || undefined,
      forecast_fnb_revenue: supabaseForecast.forecast_fnb_revenue || undefined,
      forecast_fnb_cogs_pct: supabaseForecast.forecast_fnb_cogs_pct || undefined,
      forecast_merch_revenue: supabaseForecast.forecast_merch_revenue || undefined,
      forecast_merch_cogs_pct: supabaseForecast.forecast_merch_cogs_pct || undefined,
      forecast_sponsorship_income: supabaseForecast.forecast_sponsorship_income || undefined,
      forecast_other_income: supabaseForecast.forecast_other_income || undefined,
      // Cost breakdown
      forecast_staffing_costs: supabaseForecast.forecast_staffing_costs || undefined,
      forecast_venue_costs: supabaseForecast.forecast_venue_costs || undefined,
      forecast_vendor_costs: supabaseForecast.forecast_vendor_costs || undefined,
      forecast_marketing_costs: supabaseForecast.forecast_marketing_costs || undefined,
      forecast_production_costs: supabaseForecast.forecast_production_costs || undefined,
      forecast_other_costs: supabaseForecast.forecast_other_costs || undefined,
      // Marketing details
      marketing_email_budget: supabaseForecast.marketing_email_budget || undefined,
      marketing_social_budget: supabaseForecast.marketing_social_budget || undefined,
      marketing_influencer_budget: supabaseForecast.marketing_influencer_budget || undefined,
      marketing_paid_ads_budget: supabaseForecast.marketing_paid_ads_budget || undefined,
      marketing_content_budget: supabaseForecast.marketing_content_budget || undefined,
      marketing_strategy: supabaseForecast.marketing_strategy || undefined,
      // Event details
      estimated_attendance: supabaseForecast.estimated_attendance || undefined,
      ticket_price: supabaseForecast.ticket_price || undefined,
      // Notes
      revenue_notes: supabaseForecast.revenue_notes || undefined,
      cost_notes: supabaseForecast.cost_notes || undefined,
      marketing_notes: supabaseForecast.marketing_notes || undefined,
      general_notes: supabaseForecast.general_notes || undefined,
      created_at: supabaseForecast.created_at ? new Date(supabaseForecast.created_at) : new Date(),
    };
  }

  private mapSupabaseSpecialEventActualToSpecialEventActual(supabaseActual: SupabaseSpecialEventActual): SpecialEventActual {
    return {
      id: supabaseActual.id,
      project_id: supabaseActual.project_id,
      // Actual revenue streams
      actual_ticket_sales: supabaseActual.actual_ticket_sales ?? undefined,
      actual_fnb_revenue: supabaseActual.actual_fnb_revenue ?? undefined,
      actual_fnb_cogs: supabaseActual.actual_fnb_cogs ?? undefined,
      actual_merch_revenue: supabaseActual.actual_merch_revenue ?? undefined,
      actual_merch_cogs: supabaseActual.actual_merch_cogs ?? undefined,
      actual_sponsorship_income: supabaseActual.actual_sponsorship_income ?? undefined,
      actual_other_income: supabaseActual.actual_other_income ?? undefined,
      // Actual cost breakdown
      actual_staffing_costs: supabaseActual.actual_staffing_costs ?? undefined,
      actual_venue_costs: supabaseActual.actual_venue_costs ?? undefined,
      actual_vendor_costs: supabaseActual.actual_vendor_costs ?? undefined,
      actual_marketing_costs: supabaseActual.actual_marketing_costs ?? undefined,
      actual_production_costs: supabaseActual.actual_production_costs ?? undefined,
      actual_other_costs: supabaseActual.actual_other_costs ?? undefined,
      // Marketing performance
      marketing_email_performance: supabaseActual.marketing_email_performance ?? undefined,
      marketing_social_performance: supabaseActual.marketing_social_performance ?? undefined,
      marketing_influencer_performance: supabaseActual.marketing_influencer_performance ?? undefined,
      marketing_paid_ads_performance: supabaseActual.marketing_paid_ads_performance ?? undefined,
      marketing_content_performance: supabaseActual.marketing_content_performance ?? undefined,
      marketing_roi_notes: supabaseActual.marketing_roi_notes ?? undefined,
      // Event metrics
      actual_attendance: supabaseActual.actual_attendance ?? undefined,
      attendance_breakdown: supabaseActual.attendance_breakdown ?? undefined,
      average_ticket_price: supabaseActual.average_ticket_price ?? undefined,
      // Success indicators
      success_rating: supabaseActual.success_rating ?? undefined,
      event_success_indicators: supabaseActual.event_success_indicators ?? undefined,
      challenges_faced: supabaseActual.challenges_faced ?? undefined,
      lessons_learned: supabaseActual.lessons_learned ?? undefined,
      recommendations_future: supabaseActual.recommendations_future ?? undefined,
      // Post-event analysis
      customer_feedback_summary: supabaseActual.customer_feedback_summary ?? undefined,
      team_feedback: supabaseActual.team_feedback ?? undefined,
      vendor_feedback: supabaseActual.vendor_feedback ?? undefined,
      // Additional metrics
      social_media_engagement: supabaseActual.social_media_engagement ?? undefined,
      press_coverage: supabaseActual.press_coverage ?? undefined,
      brand_impact_assessment: supabaseActual.brand_impact_assessment ?? undefined,
      // Notes
      revenue_variance_notes: supabaseActual.revenue_variance_notes ?? undefined,
      cost_variance_notes: supabaseActual.cost_variance_notes ?? undefined,
      general_notes: supabaseActual.general_notes ?? undefined,
      created_at: supabaseActual.created_at ? new Date(supabaseActual.created_at) : new Date(),
    };
  }

  private mapSupabaseSpecialEventMilestoneToSpecialEventMilestone(supabaseMilestone: SupabaseSpecialEventMilestone): SpecialEventMilestone {
    return {
      id: supabaseMilestone.id,
      project_id: supabaseMilestone.project_id,
      milestone_label: supabaseMilestone.milestone_label ?? undefined,
      target_date: supabaseMilestone.target_date ? new Date(supabaseMilestone.target_date) : undefined,
      completed: supabaseMilestone.completed ?? undefined,
      assignee: supabaseMilestone.assignee ?? undefined,
      notes: supabaseMilestone.notes ?? undefined,
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

      // Query project_shares table directly instead of using missing RPC function
      const { data, error } = await supabase
        .from('project_shares')
        .select(`
          project_id,
          permission,
          projects!inner (
            id,
            name,
            description,
            product_type,
            target_audience,
            created_at,
            updated_at,
            timeline,
            avatar_image,
            is_public,
            owner_email,
            share_count,
            event_type,
            event_date,
            event_end_date
          )
        `)
        .eq('user_email', user.email)
        .is('projects.deleted_at', null)
        .order('projects.updated_at', { ascending: false });

      if (error) {
        console.error('❌ [SupabaseStorageService] Shared projects fetch error:', error);
        // Don't throw, just return empty array for now
        return [];
      }

      const projects = (data || []).map((share: any) => {
        const mappedProject = this.mapSupabaseProjectToProject(share.projects);
        mappedProject.permission = share.permission as 'owner' | 'view' | 'edit';
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
