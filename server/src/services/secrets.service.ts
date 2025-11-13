import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export interface AppSecrets {
  googleClientId: string;
  googleClientSecret: string;
  jwtSecret: string;
  clientUrl: string;
  nodeEnv: string;
}

export class SecretsService {
  private static client: SecretManagerServiceClient | null = null;
  private static projectId: string;
  private static secrets: AppSecrets | null = null;

  static initialize(projectId: string = 'yield-dashboard') {
    this.projectId = projectId;
    this.client = new SecretManagerServiceClient();
  }

  static async getSecrets(): Promise<AppSecrets> {
    if (this.secrets) {
      return this.secrets;
    }

    if (!this.client) {
      this.initialize();
    }

    try {
      console.log('Loading secrets from Google Secrets Manager...');
      
      const [googleClientId, googleClientSecret, jwtSecret, clientUrl] = await Promise.all([
        this.getSecret('google-client-id'),
        this.getSecret('google-client-secret'), 
        this.getSecret('jwt-secret'),
        this.getSecret('client-url')
      ]);

      this.secrets = {
        googleClientId,
        googleClientSecret,
        jwtSecret,
        clientUrl,
        nodeEnv: process.env.NODE_ENV || 'production'
      };

      console.log('✅ Secrets loaded successfully from Google Secrets Manager');
      return this.secrets;
      
    } catch (error) {
      console.warn('⚠️ Failed to load secrets from Google Secrets Manager, falling back to environment variables:', error);
      
      // Fallback to environment variables
      this.secrets = {
        googleClientId: process.env.GOOGLE_CLIENT_ID || '',
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        jwtSecret: process.env.JWT_SECRET || 'fortress-fallback-secret',
        clientUrl: process.env.CLIENT_URL || 'https://fortress-modeler-frontend-pqiu2rcyqq-km.a.run.app',
        nodeEnv: process.env.NODE_ENV || 'production'
      };

      if (!this.secrets.googleClientId || !this.secrets.googleClientSecret) {
        throw new Error('OAuth credentials not available in either Secrets Manager or environment variables');
      }

      console.log('✅ Using environment variables as fallback');
      return this.secrets;
    }
  }

  private static async getSecret(secretName: string): Promise<string> {
    if (!this.client) {
      throw new Error('SecretManager client not initialized');
    }

    const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
    
    try {
      const [version] = await this.client.accessSecretVersion({ name });
      const secret = version.payload?.data?.toString();
      
      if (!secret) {
        throw new Error(`Secret ${secretName} is empty`);
      }
      
      return secret;
    } catch (error) {
      console.error(`Failed to get secret ${secretName}:`, error);
      throw error;
    }
  }

  static async getGoogleClientId(): Promise<string> {
    const secrets = await this.getSecrets();
    // Remove logging of secret availability for security
    return secrets.googleClientId;
  }

  static async getGoogleClientSecret(): Promise<string> {
    const secrets = await this.getSecrets();
    // Remove logging of secret availability for security
    return secrets.googleClientSecret;
  }

  static async getJwtSecret(): Promise<string> {
    const secrets = await this.getSecrets();
    return secrets.jwtSecret;
  }

  static async getClientUrl(): Promise<string> {
    const secrets = await this.getSecrets();
    // Client URL is not sensitive, but remove logging for consistency
    return secrets.clientUrl;
  }

  static async getNodeEnv(): Promise<string> {
    const secrets = await this.getSecrets();
    return secrets.nodeEnv;
  }
}