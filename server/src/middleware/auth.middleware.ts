import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { User } from '../services/user.service';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

export interface AuthRequest extends Request {
  user: User;
  userId: string;
}

// Main authentication middleware
export async function authenticateToken(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthService.extractBearerToken(authHeader);
    
    if (!token) {
      res.status(401).json({
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
      return;
    }
    
    const user = await AuthService.getCurrentUser(token);
    
    if (!user) {
      res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user.id;
    
    // Set PostgreSQL session variable for RLS
    req.app.locals.currentUserId = user.id;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

// Optional authentication (for public/guest endpoints)
export async function optionalAuth(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthService.extractBearerToken(authHeader);
    
    if (token) {
      const user = await AuthService.getCurrentUser(token);
      if (user) {
        req.user = user;
        req.userId = user.id;
        req.app.locals.currentUserId = user.id;
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    console.warn('Optional auth warning:', error);
    next();
  }
}

// Check if user has admin privileges (based on email domain)
export function requireAdmin(
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }
  
  const adminDomains = (process.env.ADMIN_DOMAINS || '').split(',').map(d => d.trim());
  const userDomain = req.user.company_domain;
  
  if (!userDomain || !adminDomains.includes(userDomain)) {
    res.status(403).json({
      error: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
    return;
  }
  
  next();
}

// Rate limiting by user (basic implementation)
const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitByUser(requestsPerMinute: number = 60) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userId = req.userId || 'anonymous';
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 1-minute windows
    
    const userLimit = userRequestCounts.get(userId);
    
    if (!userLimit || userLimit.resetTime < windowStart) {
      userRequestCounts.set(userId, { count: 1, resetTime: windowStart + 60000 });
      next();
      return;
    }
    
    if (userLimit.count >= requestsPerMinute) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
      return;
    }
    
    userLimit.count++;
    next();
  };
}

// Validate API key for service-to-service calls
export function validateApiKey(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_SECRET_KEY;
  
  if (!validApiKey) {
    res.status(500).json({
      error: 'API key validation not configured',
      code: 'CONFIG_ERROR'
    });
    return;
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({
      error: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
    return;
  }
  
  next();
}

// CORS preflight handler
export function handleCorsOptions(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).send();
    return;
  }
  
  next();
}