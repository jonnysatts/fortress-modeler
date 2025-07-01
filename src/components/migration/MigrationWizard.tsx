import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Database, 
  Upload, 
  Download,
  Clock,
  Users,
  FileText,
  BarChart3
} from 'lucide-react';
import { DataMigrationService, MigrationOptions, MigrationResult } from '@/services/migration/DataMigrationService';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from 'sonner';

type MigrationStep = 'overview' | 'validation' | 'options' | 'migration' | 'complete';

interface MigrationState {
  currentStep: MigrationStep;
  migrationService: DataMigrationService;
  options: MigrationOptions;
  validationResult: any;
  migrationStatus: any;
  migrationResult: MigrationResult | null;
  isLoading: boolean;
}

export function MigrationWizard() {
  const { user, isAuthenticated } = useSupabaseAuth();
  const [state, setState] = useState<MigrationState>({
    currentStep: 'overview',
    migrationService: new DataMigrationService(),
    options: {
      dryRun: false,
      batchSize: 10,
      skipExisting: true,
      validateData: true,
      backupBeforeMigration: true,
    },
    validationResult: null,
    migrationStatus: null,
    migrationResult: null,
    isLoading: false,
  });

  // Load migration status on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadMigrationStatus();
    }
  }, [isAuthenticated]);

  const loadMigrationStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const status = await state.migrationService.getMigrationStatus();
      setState(prev => ({ 
        ...prev, 
        migrationStatus: status,
        isLoading: false 
      }));
    } catch (error) {
      console.error('Failed to load migration status:', error);
      toast.error('Failed to load migration status');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const validateData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const validation = await state.migrationService.validateLocalData();
      setState(prev => ({ 
        ...prev, 
        validationResult: validation,
        isLoading: false,
        currentStep: 'options'
      }));
    } catch (error) {
      console.error('Validation failed:', error);
      toast.error('Data validation failed');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const runMigration = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, currentStep: 'migration' }));
      const result = await state.migrationService.migrateAllData(state.options);
      
      setState(prev => ({ 
        ...prev, 
        migrationResult: result,
        isLoading: false,
        currentStep: 'complete'
      }));

      if (result.success) {
        toast.success(`Migration completed successfully! Migrated ${result.projectsMigrated} projects, ${result.modelsMigrated} models, and ${result.actualsMigrated} actuals.`);
        // Store last migration timestamp
        localStorage.setItem('fortress-last-migration', new Date().toISOString());
      } else {
        toast.error(`Migration completed with ${result.errors.length} errors`);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Migration failed');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const updateOption = (key: keyof MigrationOptions, value: any) => {
    setState(prev => ({
      ...prev,
      options: { ...prev.options, [key]: value }
    }));
  };

  if (!isAuthenticated) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Migration
          </CardTitle>
          <CardDescription>
            Please sign in to access the data migration wizard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Authentication is required to migrate your local data to the cloud.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Data Migration Wizard
          </CardTitle>
          <CardDescription>
            Migrate your local data to Supabase cloud storage with conflict resolution and validation.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            {(['overview', 'validation', 'options', 'migration', 'complete'] as MigrationStep[]).map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  state.currentStep === step 
                    ? 'bg-blue-600 text-white' 
                    : index < (['overview', 'validation', 'options', 'migration', 'complete'] as MigrationStep[]).indexOf(state.currentStep)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < (['overview', 'validation', 'options', 'migration', 'complete'] as MigrationStep[]).indexOf(state.currentStep) ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 4 && <div className="w-12 h-0.5 bg-gray-200 mx-2" />}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-gray-600 capitalize">
            {state.currentStep.replace('_', ' ')}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {state.currentStep === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Overview</CardTitle>
            <CardDescription>
              Review your current data status before starting the migration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {state.isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading migration status...</p>
              </div>
            ) : state.migrationStatus ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Local Data (IndexedDB)
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Projects
                      </span>
                      <Badge variant="outline">{state.migrationStatus.localCount.projects}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Models
                      </span>
                      <Badge variant="outline">{state.migrationStatus.localCount.models}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Actuals
                      </span>
                      <Badge variant="outline">{state.migrationStatus.localCount.actuals}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Cloud Data (Supabase)
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Projects
                      </span>
                      <Badge variant="outline">{state.migrationStatus.remoteCount.projects}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Models
                      </span>
                      <Badge variant="outline">{state.migrationStatus.remoteCount.models}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Actuals
                      </span>
                      <Badge variant="outline">{state.migrationStatus.remoteCount.actuals}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {state.migrationStatus && state.migrationStatus.lastMigration && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Last migration: {new Date(state.migrationStatus.lastMigration).toLocaleString()}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button 
                onClick={() => setState(prev => ({ ...prev, currentStep: 'validation' }))}
                disabled={!state.migrationStatus?.localDataExists}
              >
                Start Migration
              </Button>
              <Button variant="outline" onClick={loadMigrationStatus}>
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.currentStep === 'validation' && (
        <Card>
          <CardHeader>
            <CardTitle>Data Validation</CardTitle>
            <CardDescription>
              Validating your local data before migration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state.isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto"></div>
                <p className="mt-2 text-gray-600">Validating data...</p>
              </div>
            ) : !state.validationResult ? (
              <div className="text-center py-8">
                <Button onClick={validateData}>Start Validation</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant={state.validationResult.isValid ? "default" : "destructive"}>
                  {state.validationResult.isValid ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {state.validationResult.isValid 
                      ? "Data validation passed! Your data is ready for migration."
                      : `Data validation failed with ${state.validationResult.errors.length} errors.`
                    }
                  </AlertDescription>
                </Alert>

                {state.validationResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Errors:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                      {state.validationResult.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {state.validationResult.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-700 mb-2">Warnings:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600">
                      {state.validationResult.warnings.map((warning: string, index: number) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  {state.validationResult.isValid && (
                    <Button onClick={() => setState(prev => ({ ...prev, currentStep: 'options' }))}>
                      Continue
                    </Button>
                  )}
                  <Button variant="outline" onClick={validateData}>
                    Re-validate
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setState(prev => ({ ...prev, currentStep: 'overview' }))}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {state.currentStep === 'options' && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Options</CardTitle>
            <CardDescription>
              Configure how your data will be migrated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="dryRun"
                  checked={state.options.dryRun}
                  onCheckedChange={(checked) => updateOption('dryRun', checked)}
                />
                <label htmlFor="dryRun" className="text-sm font-medium">
                  Dry Run (Preview only, don't migrate data)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="backup"
                  checked={state.options.backupBeforeMigration}
                  onCheckedChange={(checked) => updateOption('backupBeforeMigration', checked)}
                />
                <label htmlFor="backup" className="text-sm font-medium">
                  Create backup before migration
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="skipExisting"
                  checked={state.options.skipExisting}
                  onCheckedChange={(checked) => updateOption('skipExisting', checked)}
                />
                <label htmlFor="skipExisting" className="text-sm font-medium">
                  Skip existing records (avoid conflicts)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="validate"
                  checked={state.options.validateData}
                  onCheckedChange={(checked) => updateOption('validateData', checked)}
                />
                <label htmlFor="validate" className="text-sm font-medium">
                  Validate data before migration
                </label>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium mb-2 block">
                Batch Size: {state.options.batchSize}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={state.options.batchSize}
                onChange={(e) => updateOption('batchSize', parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-sm text-gray-600 mt-1">
                Number of records to process in each batch
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={runMigration}>
                {state.options.dryRun ? 'Run Preview' : 'Start Migration'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setState(prev => ({ ...prev, currentStep: 'validation' }))}
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.currentStep === 'migration' && (
        <Card>
          <CardHeader>
            <CardTitle>Migration in Progress</CardTitle>
            <CardDescription>
              Migrating your data to Supabase. Please don't close this window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto"></div>
              <p className="mt-4 text-lg font-medium">Migrating your data...</p>
              <p className="text-gray-600">This may take a few minutes depending on the amount of data.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {state.currentStep === 'complete' && state.migrationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {state.migrationResult.success ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
              Migration {state.migrationResult.success ? 'Completed' : 'Completed with Errors'}
            </CardTitle>
            <CardDescription>
              Migration finished in {Math.round(state.migrationResult.duration / 1000)} seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Summary */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {state.migrationResult.projectsMigrated}
                </div>
                <div className="text-sm text-gray-600">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {state.migrationResult.modelsMigrated}
                </div>
                <div className="text-sm text-gray-600">Models</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {state.migrationResult.actualsMigrated}
                </div>
                <div className="text-sm text-gray-600">Actuals</div>
              </div>
            </div>

            {/* Errors */}
            {state.migrationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {state.migrationResult.errors.length} errors occurred during migration.
                  <details className="mt-2">
                    <summary className="cursor-pointer">View errors</summary>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      {state.migrationResult.errors.map((error, index) => (
                        <li key={index}>
                          {error.type}: {error.error}
                        </li>
                      ))}
                    </ul>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            {/* Conflicts */}
            {state.migrationResult.conflicts.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {state.migrationResult.conflicts.length} conflicts were resolved during migration.
                  <details className="mt-2">
                    <summary className="cursor-pointer">View conflicts</summary>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      {state.migrationResult.conflicts.map((conflict, index) => (
                        <li key={index}>
                          {conflict.type}: {conflict.resolution} ({conflict.localId})
                        </li>
                      ))}
                    </ul>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {state.migrationResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {state.migrationResult.warnings.length} warnings were generated.
                  <details className="mt-2">
                    <summary className="cursor-pointer">View warnings</summary>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      {state.migrationResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={() => window.location.reload()}>
                Continue to Application
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setState(prev => ({ ...prev, currentStep: 'overview' }))}
              >
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}