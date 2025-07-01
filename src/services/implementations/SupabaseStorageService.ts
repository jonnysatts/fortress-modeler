import { IStorageService } from '../interfaces/IStorageService';
import { Project, FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors';
import { serviceContainer, SERVICE_TOKENS } from '../container/ServiceContainer';
import { IErrorService } from '../interfaces/IErrorService';
import { ILogService } from '../interfaces/ILogService';

type SupabaseProject = Database['public']['Tables']['projects']['Row'];
type SupabaseModel = Database['public']['Tables']['financial_models']['Row'];
type SupabaseActualEntry = Database['public']['Tables']['actuals_period_entries']['Row'];

/**
 * Supabase-based implementation of the storage service
 * This implementation provides cloud storage with real-time capabilities
 * while maintaining the exact same interface as DexieStorageService
 */
export class SupabaseStorageService implements IStorageService {
  private errorService: IErrorService | null = null;
  private logService: ILogService | null = null;
  private initialized = false;

  constructor() {
    // Don't resolve services in constructor to avoid circular dependencies
    console.log('SupabaseStorageService constructor called');
  }

  /**
   * Lazy initialization of services to prevent circular dependencies
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    try {
      this.errorService = serviceContainer.resolve(SERVICE_TOKENS.ERROR_SERVICE);
      this.logService = serviceContainer.resolve(SERVICE_TOKENS.LOG_SERVICE);
      this.logService?.info('SupabaseStorageService initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize SupabaseStorageService:', error);
      // Continue without services rather than failing completely
      this.initialized = true;
    }
  }

  // ==================================================
  // PROJECT METHODS
  // ==================================================

  async getProject(projectId: string): Promise<Project | undefined> {
    this.ensureInitialized();
    try {
      this.logService?.debug(`Fetching project ${projectId} from Supabase`);

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
      this.errorService?.logError(error, 'SupabaseStorageService.getProject', 'database', 'high');
      throw new DatabaseError(`Failed to fetch project with ID ${projectId}`, error);
    }
  }

  async getAllProjects(): Promise<Project[]> {
    this.ensureInitialized();
    try {
      this.logService?.debug('Fetching all projects from Supabase');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        throw handleSupabaseError(error);
      }

      return (data || []).map(this.mapSupabaseProjectToProject);
    } catch (error) {
      this.errorService?.logError(error, 'SupabaseStorageService.getAllProjects', 'database', 'high');
      throw new DatabaseError('Failed to fetch projects', error);
    }
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    console.log('🚀 [SupabaseStorageService] createProject called with:', projectData);
    this.ensureInitialized();
    try {
      this.logService?.debug('Creating project in Supabase', { projectData });

      if (!projectData.name?.trim()) {
        throw new ValidationError('Project name is required');
      }
      if (!projectData.productType?.trim()) {
        throw new ValidationError('Product type is required');
      }

      // Get current user
      console.log('🚀 [SupabaseStorageService] Getting current user...');
      const user = await this.getCurrentUser();
      console.log('🚀 [SupabaseStorageService] Current user received:', user?.id || 'null');

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

      const { data, error } = await supabase
        .from('projects')
        .insert(newProject)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      const createdProject = this.mapSupabaseProjectToProject(data);
      this.logService?.info('Project created successfully', { projectId: createdProject.id });
      return createdProject;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      this.errorService?.logError(error, 'SupabaseStorageService.createProject', 'database', 'high');
      throw new DatabaseError('Failed to create project', error);
    }
  }

  async updateProject(projectId: string, projectData: Partial<Project>): Promise<Project> {
    this.ensureInitialized();
    try {
      this.logService?.debug(`Updating project ${projectId}`, { projectData });

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
      this.logService?.info('Project updated successfully', { projectId });
      return updatedProject;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      this.errorService?.logError(error, 'SupabaseStorageService.updateProject', 'database', 'high');
      throw new DatabaseError(`Failed to update project with ID ${projectId}`, error);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    this.ensureInitialized();
    try {
      this.logService?.debug(`Deleting project ${projectId}`);

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

      this.logService?.info('Project deleted successfully', { projectId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.errorService?.logError(error, 'SupabaseStorageService.deleteProject', 'database', 'high');
      throw new DatabaseError(`Failed to delete project with ID ${projectId}`, error);
    }
  }

  // ==================================================
  // MODEL METHODS
  // ==================================================

  async getModelsForProject(projectId: string): Promise<FinancialModel[]> {
    this.ensureInitialized();
    try {
      this.logService?.debug(`Fetching models for project ${projectId}`);

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

      return (data || []).map(this.mapSupabaseModelToModel);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      this.errorService?.logError(error, 'SupabaseStorageService.getModelsForProject', 'database', 'high');
      throw new DatabaseError(`Failed to get models for project ${projectId}`, error);
    }
  }

  async getModel(modelId: string): Promise<FinancialModel | undefined> {
    this.ensureInitialized();
    try {
      this.logService?.debug(`Fetching model ${modelId}`);

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
      this.errorService?.logError(error, 'SupabaseStorageService.getModel', 'database', 'high');
      throw new DatabaseError(`Failed to fetch model with ID ${modelId}`, error);
    }
  }

  async createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    this.ensureInitialized();
    try {
      this.logService?.debug('Creating financial model in Supabase', { modelData });

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
      this.logService?.info('Financial model created successfully', { modelId: createdModel.id });
      return createdModel;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      this.errorService?.logError(error, 'SupabaseStorageService.createModel', 'database', 'high');
      throw new DatabaseError('Failed to create financial model', error);
    }
  }

  async updateModel(modelId: string, modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    this.ensureInitialized();
    try {
      this.logService?.debug(`Updating model ${modelId}`, { modelData });

      const existingModel = await this.getModel(modelId);
      if (!existingModel) {
        throw new NotFoundError(`Financial model with ID ${modelId} not found`);
      }

      const updateData: any = {};
      
      if (modelData.name !== undefined) updateData.name = modelData.name;
      if (modelData.assumptions !== undefined) updateData.assumptions = modelData.assumptions;

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
      this.logService?.info('Financial model updated successfully', { modelId });
      return updatedModel;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      this.errorService?.logError(error, 'SupabaseStorageService.updateModel', 'database', 'high');
      throw new DatabaseError(`Failed to update financial model with ID ${modelId}`, error);
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    this.ensureInitialized();
    try {
      this.logService?.debug(`Deleting model ${modelId}`);

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

      this.logService?.info('Financial model deleted successfully', { modelId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.errorService?.logError(error, 'SupabaseStorageService.deleteModel', 'database', 'high');
      throw new DatabaseError(`Failed to delete financial model with ID ${modelId}`, error);
    }
  }

  // ==================================================
  // ACTUALS METHODS
  // ==================================================

  async getActualsForProject(projectId: string): Promise<ActualsPeriodEntry[]> {
    this.ensureInitialized();
    try {
      this.logService?.debug(`Fetching actuals for project ${projectId}`);

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

      return (data || []).map(this.mapSupabaseActualToActual);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      this.errorService?.logError(error, 'SupabaseStorageService.getActualsForProject', 'database', 'high');
      throw new DatabaseError(`Failed to get actuals for project ${projectId}`, error);
    }
  }

  async upsertActualsPeriod(actualData: Omit<ActualsPeriodEntry, 'id'>): Promise<ActualsPeriodEntry> {
    this.ensureInitialized();
    try {
      this.logService?.debug('Upserting actuals period', { actualData });

      if (!actualData.projectId?.trim()) {
        throw new ValidationError('Project ID is required');
      }
      if (!actualData.period?.trim()) {
        throw new ValidationError('Period is required');
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
      this.logService?.info('Actuals period upserted successfully', { period: actualData.period });
      return result;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      this.errorService?.logError(error, 'SupabaseStorageService.upsertActualsPeriod', 'database', 'high');
      throw new DatabaseError('Failed to upsert actuals period', error);
    }
  }

  // ==================================================
  // UTILITY METHODS
  // ==================================================

  /**
   * Wait for authentication to be ready before proceeding
   */
  private async waitForAuthReady(): Promise<void> {
    console.log('🚀 [SupabaseStorageService] waitForAuthReady started');
    const maxWaitTime = 30000; // 30 seconds max wait
    const checkInterval = 500; // Check every 500ms
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkAuth = async () => {
        try {
          console.log('🚀 [SupabaseStorageService] Checking auth session...');
          // Quick auth check without hanging
          const { data: { session } } = await supabase.auth.getSession();
          console.log('🚀 [SupabaseStorageService] Session check result:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id
          });
          if (session && session.user) {
            this.logService?.info('Auth ready - session found');
            console.log('✅ [SupabaseStorageService] Auth ready - session found!');
            resolve();
            return;
          }

          // Check if we've exceeded max wait time
          const elapsedTime = Date.now() - startTime;
          console.log(`🕰️ [SupabaseStorageService] Auth not ready, elapsed: ${elapsedTime}ms / ${maxWaitTime}ms`);
          if (elapsedTime > maxWaitTime) {
            console.error('❌ [SupabaseStorageService] TIMEOUT waiting for authentication!');
            reject(new Error('Timeout waiting for authentication to be ready'));
            return;
          }

          // Continue checking
          console.log('🔄 [SupabaseStorageService] Retrying auth check in 500ms...');
          setTimeout(checkAuth, checkInterval);
        } catch (error) {
          console.error('❌ [SupabaseStorageService] Error checking auth session:', error);
          // If session check fails, wait a bit and try again
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > maxWaitTime) {
            console.error('❌ [SupabaseStorageService] TIMEOUT after error in auth check!');
            reject(new Error('Timeout waiting for authentication to be ready'));
            return;
          }
          console.log('🔄 [SupabaseStorageService] Retrying after error in 500ms...');
          setTimeout(checkAuth, checkInterval);
        }
      };

      checkAuth();
    });
  }

  /**
   * Get the current authenticated user with timeout protection and retry logic
   */
  private async getCurrentUser(retryCount: number = 0): Promise<any> {
    console.log(`🚀 [SupabaseStorageService] getCurrentUser called (attempt ${retryCount + 1})`);
    const maxRetries = 3;
    const timeoutMs = 10000; // 10 second timeout
    const retryDelayMs = 1000 * Math.pow(2, retryCount); // Exponential backoff

    try {
      // Wait for auth to be ready before proceeding (only on first attempt)
      if (retryCount === 0) {
        console.log('🚀 [SupabaseStorageService] Waiting for auth to be ready...');
        await this.waitForAuthReady();
        console.log('🚀 [SupabaseStorageService] Auth ready check completed');
      }

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`getCurrentUser timeout after ${timeoutMs}ms (attempt ${retryCount + 1})`));
        }, timeoutMs);
      });

      // Race the auth call against timeout
      const authPromise = supabase.auth.getUser();
      const { data: { user }, error } = await Promise.race([authPromise, timeoutPromise]) as any;

      if (error) {
        throw new ValidationError('Failed to get current user: ' + error.message);
      }
      if (!user) {
        throw new ValidationError('User must be authenticated');
      }
      
      this.logService?.info('Successfully retrieved current user', { userId: user.id });
      return user;
    } catch (error) {
      this.logService?.error('getCurrentUser failed', { 
        attempt: retryCount + 1, 
        maxRetries,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Retry with exponential backoff if we haven't exceeded max retries
      if (retryCount < maxRetries && (error instanceof Error && error.message.includes('timeout'))) {
        this.logService?.info(`Retrying getCurrentUser in ${retryDelayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        return this.getCurrentUser(retryCount + 1);
      }

      // If all retries failed or it's a non-timeout error, throw
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new ValidationError(`Authentication timeout after ${maxRetries + 1} attempts. Please refresh the page and try again.`);
      }
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
    this.ensureInitialized();
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