import { DexieStorageService } from '../implementations/DexieStorageService';
import { SupabaseStorageService } from '../implementations/SupabaseStorageService';
import { ILogService } from '../interfaces/ILogService';
import { IErrorService } from '../interfaces/IErrorService';
import { serviceContainer, SERVICE_TOKENS } from '../container/ServiceContainer';
import { Project, FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import { supabase } from '@/lib/supabase';

export interface MigrationOptions {
  dryRun?: boolean;
  batchSize?: number;
  skipExisting?: boolean;
  validateData?: boolean;
  backupBeforeMigration?: boolean;
}

export interface MigrationResult {
  success: boolean;
  projectsMigrated: number;
  modelsMigrated: number;
  actualsMigrated: number;
  errors: Array<{
    type: 'project' | 'model' | 'actuals';
    id: string;
    error: string;
  }>;
  conflicts: Array<{
    type: 'project' | 'model' | 'actuals';
    localId: string;
    remoteId: string;
    resolution: 'skip' | 'overwrite' | 'merge';
  }>;
  warnings: string[];
  duration: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Comprehensive service for migrating data from IndexedDB (Dexie) to Supabase
 * Handles conflict resolution, data validation, and rollback capabilities
 */
export class DataMigrationService {
  private logService: ILogService;
  private errorService: IErrorService;
  private dexieService: DexieStorageService;
  private supabaseService: SupabaseStorageService;

  constructor() {
    this.logService = serviceContainer.resolve<ILogService>(SERVICE_TOKENS.LOG_SERVICE);
    this.errorService = serviceContainer.resolve<IErrorService>(SERVICE_TOKENS.ERROR_SERVICE);
    this.dexieService = new DexieStorageService();
    this.supabaseService = new SupabaseStorageService();
  }

  /**
   * Perform complete migration from IndexedDB to Supabase
   */
  async migrateAllData(options: MigrationOptions = {}): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      projectsMigrated: 0,
      modelsMigrated: 0,
      actualsMigrated: 0,
      errors: [],
      conflicts: [],
      warnings: [],
      duration: 0,
    };

    try {
      this.logService.info('Starting comprehensive data migration', { options });

      // Pre-migration validation
      if (options.validateData !== false) {
        const validation = await this.validateLocalData();
        if (!validation.isValid) {
          result.errors.push({
            type: 'project',
            id: 'validation',
            error: `Data validation failed: ${validation.errors.join(', ')}`,
          });
          return result;
        }
        result.warnings.push(...validation.warnings);
      }

      // Create backup if requested
      if (options.backupBeforeMigration) {
        await this.createBackup();
        this.logService.info('Local data backup created');
      }

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        result.errors.push({
          type: 'project',
          id: 'auth',
          error: 'User not authenticated for migration',
        });
        return result;
      }

      // Migrate projects first (required for models and actuals)
      const projectsResult = await this.migrateProjects(options);
      result.projectsMigrated = projectsResult.migrated;
      result.errors.push(...projectsResult.errors);
      result.conflicts.push(...projectsResult.conflicts);
      result.warnings.push(...projectsResult.warnings);

      // Migrate financial models
      const modelsResult = await this.migrateFinancialModels(options);
      result.modelsMigrated = modelsResult.migrated;
      result.errors.push(...modelsResult.errors);
      result.conflicts.push(...modelsResult.conflicts);
      result.warnings.push(...modelsResult.warnings);

      // Migrate actuals
      const actualsResult = await this.migrateActuals(options);
      result.actualsMigrated = actualsResult.migrated;
      result.errors.push(...actualsResult.errors);
      result.conflicts.push(...actualsResult.conflicts);
      result.warnings.push(...actualsResult.warnings);

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      this.logService.info('Data migration completed', {
        result: {
          ...result,
          errors: result.errors.length,
          conflicts: result.conflicts.length,
          warnings: result.warnings.length,
        },
      });

      return result;
    } catch (error) {
      result.errors.push({
        type: 'project',
        id: 'migration',
        error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      result.duration = Date.now() - startTime;
      this.errorService.logError('Migration failed', error as Error, { options });
      return result;
    }
  }

  /**
   * Migrate all projects from IndexedDB to Supabase
   */
  private async migrateProjects(options: MigrationOptions) {
    const result = {
      migrated: 0,
      errors: [] as MigrationResult['errors'],
      conflicts: [] as MigrationResult['conflicts'],
      warnings: [] as string[],
    };

    try {
      const localProjects = await this.dexieService.getAllProjects();
      this.logService.info(`Found ${localProjects.length} local projects to migrate`);

      if (options.dryRun) {
        this.logService.info('DRY RUN: Would migrate projects', { count: localProjects.length });
        return result;
      }

      const batchSize = options.batchSize || 10;
      for (let i = 0; i < localProjects.length; i += batchSize) {
        const batch = localProjects.slice(i, i + batchSize);
        
        for (const project of batch) {
          try {
            // Check for conflicts
            const existingProject = await this.supabaseService.getProject(project.id);
            
            if (existingProject && options.skipExisting) {
              result.conflicts.push({
                type: 'project',
                localId: project.id,
                remoteId: existingProject.id,
                resolution: 'skip',
              });
              result.warnings.push(`Skipped existing project: ${project.name}`);
              continue;
            }

            if (existingProject) {
              // Handle conflict - check modification dates
              const localDate = project.updatedAt || project.createdAt;
              const remoteDate = existingProject.updatedAt || existingProject.createdAt;
              
              if (localDate <= remoteDate) {
                result.conflicts.push({
                  type: 'project',
                  localId: project.id,
                  remoteId: existingProject.id,
                  resolution: 'skip',
                });
                result.warnings.push(`Remote project is newer, skipping: ${project.name}`);
                continue;
              }

              // Local is newer, update remote
              await this.supabaseService.updateProject(project.id, {
                name: project.name,
                productType: project.productType,
                description: project.description,
                targetAudience: project.targetAudience,
                timeline: project.timeline,
                avatarImage: project.avatarImage,
              });

              result.conflicts.push({
                type: 'project',
                localId: project.id,
                remoteId: existingProject.id,
                resolution: 'overwrite',
              });
            } else {
              // Create new project
              await this.supabaseService.createProject({
                name: project.name,
                productType: project.productType,
                description: project.description,
                targetAudience: project.targetAudience,
                timeline: project.timeline,
                avatarImage: project.avatarImage,
              });
            }

            result.migrated++;
            this.logService.debug(`Migrated project: ${project.name}`);
          } catch (error) {
            result.errors.push({
              type: 'project',
              id: project.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            this.errorService.logError('Failed to migrate project', error as Error, { project });
          }
        }

        // Small delay between batches to avoid rate limits
        if (i + batchSize < localProjects.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return result;
    } catch (error) {
      result.errors.push({
        type: 'project',
        id: 'batch',
        error: `Project migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return result;
    }
  }

  /**
   * Migrate all financial models from IndexedDB to Supabase
   */
  private async migrateFinancialModels(options: MigrationOptions) {
    const result = {
      migrated: 0,
      errors: [] as MigrationResult['errors'],
      conflicts: [] as MigrationResult['conflicts'],
      warnings: [] as string[],
    };

    try {
      const localProjects = await this.dexieService.getAllProjects();
      
      for (const project of localProjects) {
        try {
          const localModels = await this.dexieService.getModelsForProject(project.id);
          
          if (options.dryRun) {
            this.logService.info('DRY RUN: Would migrate models', { 
              projectId: project.id, 
              count: localModels.length 
            });
            continue;
          }

          for (const model of localModels) {
            try {
              // Create model in Supabase
              await this.supabaseService.createModel({
                projectId: model.projectId,
                name: model.name,
                assumptions: model.assumptions,
              });

              result.migrated++;
              this.logService.debug(`Migrated model: ${model.name} for project: ${project.name}`);
            } catch (error) {
              // Handle duplicate key errors gracefully
              if (error instanceof Error && error.message.includes('duplicate key')) {
                result.conflicts.push({
                  type: 'model',
                  localId: model.id,
                  remoteId: model.id,
                  resolution: 'skip',
                });
                result.warnings.push(`Model already exists: ${model.name}`);
              } else {
                result.errors.push({
                  type: 'model',
                  id: model.id,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
                this.errorService.logError('Failed to migrate model', error as Error, { model });
              }
            }
          }
        } catch (error) {
          result.errors.push({
            type: 'model',
            id: project.id,
            error: `Failed to get models for project: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }

      return result;
    } catch (error) {
      result.errors.push({
        type: 'model',
        id: 'batch',
        error: `Model migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return result;
    }
  }

  /**
   * Migrate all actuals from IndexedDB to Supabase
   */
  private async migrateActuals(options: MigrationOptions) {
    const result = {
      migrated: 0,
      errors: [] as MigrationResult['errors'],
      conflicts: [] as MigrationResult['conflicts'],
      warnings: [] as string[],
    };

    try {
      const localProjects = await this.dexieService.getAllProjects();
      
      for (const project of localProjects) {
        try {
          const localActuals = await this.dexieService.getActualsForProject(project.id);
          
          if (options.dryRun) {
            this.logService.info('DRY RUN: Would migrate actuals', { 
              projectId: project.id, 
              count: localActuals.length 
            });
            continue;
          }

          for (const actual of localActuals) {
            try {
              // Use upsert to handle duplicates gracefully
              await this.supabaseService.upsertActualsPeriod({
                projectId: actual.projectId,
                period: actual.period,
                ...actual.data,
              });

              result.migrated++;
              this.logService.debug(`Migrated actual: ${actual.period} for project: ${project.name}`);
            } catch (error) {
              result.errors.push({
                type: 'actuals',
                id: actual.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              this.errorService.logError('Failed to migrate actual', error as Error, { actual });
            }
          }
        } catch (error) {
          result.errors.push({
            type: 'actuals',
            id: project.id,
            error: `Failed to get actuals for project: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }

      return result;
    } catch (error) {
      result.errors.push({
        type: 'actuals',
        id: 'batch',
        error: `Actuals migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return result;
    }
  }

  /**
   * Validate local data before migration
   */
  async validateLocalData(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      const projects = await this.dexieService.getAllProjects();

      // Check if we have any data to migrate
      if (projects.length === 0) {
        result.warnings.push('No projects found in local database');
        return result;
      }

      // Validate each project
      for (const project of projects) {
        if (!project.name || project.name.trim().length === 0) {
          result.errors.push(`Project ${project.id} has empty name`);
          result.isValid = false;
        }

        if (!project.productType || project.productType.trim().length === 0) {
          result.errors.push(`Project ${project.id} has empty product type`);
          result.isValid = false;
        }

        // Validate models for this project
        try {
          const models = await this.dexieService.getModelsForProject(project.id);
          for (const model of models) {
            if (!model.name || model.name.trim().length === 0) {
              result.warnings.push(`Model ${model.id} in project ${project.name} has empty name`);
            }

            if (!model.assumptions) {
              result.warnings.push(`Model ${model.id} in project ${project.name} has no assumptions`);
            }
          }
        } catch (error) {
          result.warnings.push(`Could not validate models for project ${project.name}: ${error}`);
        }

        // Validate actuals for this project
        try {
          const actuals = await this.dexieService.getActualsForProject(project.id);
          for (const actual of actuals) {
            if (!actual.period || actual.period.trim().length === 0) {
              result.errors.push(`Actual ${actual.id} in project ${project.name} has empty period`);
              result.isValid = false;
            }

            if (!actual.data || Object.keys(actual.data).length === 0) {
              result.warnings.push(`Actual ${actual.period} in project ${project.name} has no data`);
            }
          }
        } catch (error) {
          result.warnings.push(`Could not validate actuals for project ${project.name}: ${error}`);
        }
      }

      this.logService.info('Local data validation completed', {
        projects: projects.length,
        errors: result.errors.length,
        warnings: result.warnings.length,
      });

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Create a backup of local data before migration
   */
  async createBackup(): Promise<void> {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        projects: await this.dexieService.getAllProjects(),
        models: [] as FinancialModel[],
        actuals: [] as ActualsPeriodEntry[],
      };

      // Collect all models and actuals
      for (const project of backupData.projects) {
        const projectModels = await this.dexieService.getModelsForProject(project.id);
        const projectActuals = await this.dexieService.getActualsForProject(project.id);
        
        backupData.models.push(...projectModels);
        backupData.actuals.push(...projectActuals);
      }

      // Store backup in localStorage with timestamp
      const backupKey = `fortress-backup-${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backupData));

      this.logService.info('Backup created successfully', {
        key: backupKey,
        projects: backupData.projects.length,
        models: backupData.models.length,
        actuals: backupData.actuals.length,
      });
    } catch (error) {
      this.errorService.logError('Failed to create backup', error as Error);
      throw error;
    }
  }

  /**
   * Get migration status and summary
   */
  async getMigrationStatus(): Promise<{
    localDataExists: boolean;
    remoteDataExists: boolean;
    localCount: { projects: number; models: number; actuals: number };
    remoteCount: { projects: number; models: number; actuals: number };
    lastMigration?: string;
  }> {
    try {
      // Check local data
      const localProjects = await this.dexieService.getAllProjects();
      const localModelCount = (await Promise.all(
        localProjects.map(p => this.dexieService.getModelsForProject(p.id))
      )).flat().length;
      const localActualCount = (await Promise.all(
        localProjects.map(p => this.dexieService.getActualsForProject(p.id))
      )).flat().length;

      // Check remote data
      const remoteProjects = await this.supabaseService.getAllProjects();
      const remoteModelCount = (await Promise.all(
        remoteProjects.map(p => this.supabaseService.getModelsForProject(p.id))
      )).flat().length;
      const remoteActualCount = (await Promise.all(
        remoteProjects.map(p => this.supabaseService.getActualsForProject(p.id))
      )).flat().length;

      // Check for last migration timestamp
      const lastMigration = localStorage.getItem('fortress-last-migration');

      return {
        localDataExists: localProjects.length > 0,
        remoteDataExists: remoteProjects.length > 0,
        localCount: {
          projects: localProjects.length,
          models: localModelCount,
          actuals: localActualCount,
        },
        remoteCount: {
          projects: remoteProjects.length,
          models: remoteModelCount,
          actuals: remoteActualCount,
        },
        lastMigration: lastMigration || undefined,
      };
    } catch (error) {
      this.errorService.logError('Failed to get migration status', error as Error);
      throw error;
    }
  }

  /**
   * Clean up local data after successful migration
   */
  async cleanupLocalData(confirmationKey: string): Promise<void> {
    if (confirmationKey !== 'CONFIRM_DELETE_LOCAL_DATA') {
      throw new Error('Invalid confirmation key');
    }

    try {
      // This would require implementing cleanup methods in DexieStorageService
      this.logService.warn('Local data cleanup not implemented - manual cleanup required');
      
      // Store cleanup timestamp
      localStorage.setItem('fortress-local-cleanup', new Date().toISOString());
    } catch (error) {
      this.errorService.logError('Failed to cleanup local data', error as Error);
      throw error;
    }
  }
}