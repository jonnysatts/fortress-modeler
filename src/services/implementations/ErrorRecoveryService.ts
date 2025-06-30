import { serviceContainer, SERVICE_TOKENS } from '../container/ServiceContainer';
import { IErrorService } from '../interfaces/IErrorService';
import { ILogService } from '../interfaces/ILogService';

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error | unknown) => boolean;
  recover: () => Promise<void>;
  description: string;
}

/**
 * Service for implementing error recovery strategies
 * Provides automatic and manual recovery options for different error types
 */
export class ErrorRecoveryService {
  private errorService: IErrorService;
  private logService: ILogService;
  private recoveryStrategies: RecoveryStrategy[] = [];

  constructor() {
    this.errorService = serviceContainer.resolve<IErrorService>(SERVICE_TOKENS.ERROR_SERVICE);
    this.logService = serviceContainer.resolve<ILogService>(SERVICE_TOKENS.LOG_SERVICE);
    this.setupDefaultStrategies();
  }

  /**
   * Register a new recovery strategy
   */
  public registerStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.logService.debug('Recovery strategy registered', { name: strategy.name });
  }

  /**
   * Attempt to recover from an error automatically
   */
  public async attemptAutoRecovery(error: Error | unknown, context?: string): Promise<boolean> {
    const applicableStrategies = this.recoveryStrategies.filter(strategy => 
      strategy.canRecover(error)
    );

    if (applicableStrategies.length === 0) {
      this.logService.warn('No recovery strategies found for error', { context, error });
      return false;
    }

    for (const strategy of applicableStrategies) {
      try {
        this.logService.info('Attempting recovery strategy', { 
          strategy: strategy.name, 
          context 
        });
        
        await strategy.recover();
        
        this.logService.info('Recovery strategy succeeded', { 
          strategy: strategy.name, 
          context 
        });
        
        this.errorService.showSuccessToUser(
          'Recovered from Error',
          `Successfully recovered using: ${strategy.description}`
        );
        
        return true;
      } catch (recoveryError) {
        this.logService.warn('Recovery strategy failed', { 
          strategy: strategy.name, 
          context,
          recoveryError 
        });
      }
    }

    return false;
  }

  /**
   * Get available recovery options for manual recovery
   */
  public getRecoveryOptions(error: Error | unknown): RecoveryStrategy[] {
    return this.recoveryStrategies.filter(strategy => strategy.canRecover(error));
  }

  /**
   * Execute a specific recovery strategy manually
   */
  public async executeRecovery(strategyName: string, error: Error | unknown): Promise<void> {
    const strategy = this.recoveryStrategies.find(s => s.name === strategyName);
    
    if (!strategy) {
      throw new Error(`Recovery strategy '${strategyName}' not found`);
    }

    if (!strategy.canRecover(error)) {
      throw new Error(`Recovery strategy '${strategyName}' cannot handle this error`);
    }

    await strategy.recover();
    
    this.logService.info('Manual recovery executed', { strategy: strategyName });
    this.errorService.showSuccessToUser(
      'Recovery Completed',
      strategy.description
    );
  }

  /**
   * Setup default recovery strategies
   */
  private setupDefaultStrategies(): void {
    // Strategy 1: Reload page for critical errors
    this.registerStrategy({
      name: 'page-reload',
      description: 'Reload the current page',
      canRecover: (error) => {
        const message = this.errorService.getErrorMessage(error).toLowerCase();
        return message.includes('chunk') || message.includes('module') || message.includes('script');
      },
      recover: async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
        window.location.reload();
      }
    });

    // Strategy 2: Clear localStorage for storage errors
    this.registerStrategy({
      name: 'clear-storage',
      description: 'Clear local storage and refresh',
      canRecover: (error) => {
        const message = this.errorService.getErrorMessage(error).toLowerCase();
        return message.includes('storage') || message.includes('quota') || message.includes('database');
      },
      recover: async () => {
        try {
          localStorage.clear();
          sessionStorage.clear();
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.reload();
        } catch (storageError) {
          // If we can't clear storage, just reload
          window.location.reload();
        }
      }
    });

    // Strategy 3: Navigate to home for navigation errors
    this.registerStrategy({
      name: 'navigate-home',
      description: 'Return to the home page',
      canRecover: (error) => {
        const message = this.errorService.getErrorMessage(error).toLowerCase();
        return message.includes('route') || message.includes('navigation') || message.includes('not found');
      },
      recover: async () => {
        window.location.href = '/';
      }
    });

    // Strategy 4: Retry network operations
    this.registerStrategy({
      name: 'retry-network',
      description: 'Wait and retry the network operation',
      canRecover: (error) => {
        return this.errorService.shouldRetry(error);
      },
      recover: async () => {
        // This is a placeholder - actual retry would need to be implemented
        // by the calling code with a specific retry function
        await new Promise(resolve => setTimeout(resolve, 2000));
        // The actual retry logic would be injected by the caller
      }
    });

    this.logService.info('Default recovery strategies initialized', { 
      count: this.recoveryStrategies.length 
    });
  }
}

// Export singleton instance
export const errorRecoveryService = new ErrorRecoveryService();