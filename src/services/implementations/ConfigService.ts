import { IConfigService } from '../interfaces/IConfigService';

/**
 * Environment-based configuration service implementation
 */
export class ConfigService implements IConfigService {
  private readonly config: Record<string, any>;

  constructor() {
    this.config = {
      // Environment detection
      NODE_ENV: import.meta.env.MODE || 'development',
      
      // Database configuration
      DATABASE_NAME: import.meta.env.VITE_DATABASE_NAME || 'fortress-modeler-db',
      DATABASE_VERSION: 7,
      
      // Application information
      APP_NAME: import.meta.env.VITE_APP_NAME || 'Fortress Modeler',
      APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
      BUILD_DATE: import.meta.env.VITE_BUILD_DATE,
      
      // Feature flags
      ENABLE_DEBUG_LOGGING: import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true',
      ENABLE_ERROR_REPORTING: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
      
      // API configuration (for future use)
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
    };
  }

  get<T = string>(key: string, defaultValue?: T): T {
    const value = this.config[key];
    if (value !== undefined) {
      return value as T;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Configuration key '${key}' not found and no default value provided`);
  }

  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  getEnvironment(): 'development' | 'production' | 'test' {
    const env = this.get('NODE_ENV', 'development');
    if (env === 'production' || env === 'test') {
      return env;
    }
    return 'development';
  }

  getDatabaseConfig(): { name: string; version: number } {
    return {
      name: this.get('DATABASE_NAME'),
      version: this.get('DATABASE_VERSION'),
    };
  }

  getAppInfo(): { name: string; version: string; buildDate?: string } {
    return {
      name: this.get('APP_NAME'),
      version: this.get('APP_VERSION'),
      buildDate: this.get('BUILD_DATE'),
    };
  }
}