import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { UserService, User } from './user.service';

export interface GoogleProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified: boolean;
  hd?: string; // Hosted domain for organization accounts
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  user: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  googleId: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private static oauth2Client: OAuth2Client | null = null;
  private static jwtSecret: string = process.env.JWT_SECRET || 'fortress-modeler-secret';
  
  // Initialize Google OAuth client
  static initializeOAuth(): OAuth2Client {
    if (!this.oauth2Client) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${process.env.CLIENT_URL}/auth/callback`;
      
      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured');
      }
      
      console.log('Initializing OAuth client with redirect URI:', redirectUri);
      
      this.oauth2Client = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
      );
    }
    
    return this.oauth2Client;
  }
  
  // Generate Google OAuth URL
  static getAuthURL(): string {
    const oauth2Client = this.initializeOAuth();
    
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
    
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
    
    return url;
  }
  
  // Verify Google ID token
  static async verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
    const oauth2Client = this.initializeOAuth();
    
    try {
      const ticket = await oauth2Client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Invalid token payload');
      }
      
      if (!payload.email_verified) {
        throw new Error('Email not verified');
      }
      
      return {
        id: payload.sub!,
        email: payload.email!,
        name: payload.name,
        picture: payload.picture,
        email_verified: payload.email_verified,
        hd: payload.hd // Hosted domain
      };
    } catch (error) {
      throw new Error('Invalid Google token');
    }
  }
  
  // Exchange authorization code for tokens
  static async exchangeCodeForTokens(code: string): Promise<GoogleProfile> {
    const oauth2Client = this.initializeOAuth();
    
    try {
      console.log('Exchanging authorization code for tokens...');
      const { tokens } = await oauth2Client.getToken(code);
      console.log('Token exchange successful');
      oauth2Client.setCredentials(tokens);
      
      if (!tokens.id_token) {
        throw new Error('No ID token received from Google');
      }
      
      console.log('Verifying ID token...');
      return await this.verifyGoogleToken(tokens.id_token);
    } catch (error) {
      console.error('Authorization code exchange error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to exchange authorization code: ${error.message}`);
      }
      throw new Error('Failed to exchange authorization code');
    }
  }
  
  // Authenticate user with Google profile
  static async authenticateUser(googleProfile: GoogleProfile): Promise<AuthTokens> {
    try {
      // Extract company domain from email
      const emailDomain = googleProfile.email.split('@')[1];
      const companyDomain = googleProfile.hd || emailDomain;
      
      // Create or update user
      const user = await UserService.upsertUser({
        google_id: googleProfile.id,
        email: googleProfile.email,
        name: googleProfile.name,
        picture: googleProfile.picture,
        company_domain: companyDomain
      });
      
      // Initialize sync status for new users
      await UserService.initializeSyncStatus(user.id);
      
      // Generate JWT token
      const accessToken = this.generateJWT(user);
      
      return {
        access_token: accessToken,
        expires_in: 3600 * 24 * 7, // 7 days
        user
      };
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }
  
  // Generate JWT token
  static generateJWT(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      googleId: user.google_id
    };
    
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '7d',
      issuer: 'fortress-modeler',
      audience: 'fortress-modeler-users'
    });
  }
  
  // Verify and decode JWT token
  static verifyJWT(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'fortress-modeler',
        audience: 'fortress-modeler-users'
      }) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
  
  // Refresh user data in token
  static async refreshUserToken(userId: string): Promise<string | null> {
    try {
      const user = await UserService.getUserById(userId);
      if (!user) {
        return null;
      }
      
      return this.generateJWT(user);
    } catch (error) {
      return null;
    }
  }
  
  // Extract token from Authorization header
  static extractBearerToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7);
  }
  
  // Validate and get user from token
  static async getCurrentUser(token: string): Promise<User | null> {
    try {
      const payload = this.verifyJWT(token);
      return await UserService.getUserById(payload.userId);
    } catch (error) {
      return null;
    }
  }
}