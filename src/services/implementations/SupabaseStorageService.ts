import { IStorageService } from '../interfaces/IStorageService';
import { Project, FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors';
type SupabaseProject = Database['public']['Tables']['projects']['Row'];
type SupabaseModel = Database['public']['Tables']['financial_models']['Row'];
type SupabaseActualEntry = Database['public']['Tables']['actuals_period_entries']['Row'];

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
      console.log('🔍 [SupabaseStorageService] Fetching all projects from Supabase');

      // Check current user first
      const user = await this.getCurrentUser();
      console.log('🔍 [SupabaseStorageService] Current user for project fetch:', {
        id: user.id,
        email: user.email
      });

      // Test direct query with explicit session check
      console.log('🔍 [SupabaseStorageService] About to query projects table...');
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

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

      const projects = (data || []).map((project) => this.mapSupabaseProjectToProject(project));
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
}