import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define the structure of the user payload within the JWT
interface UserPayload {
  id: string;
  email: string;
  name: string;
}

// Extend the Express Request interface to include the user payload
export interface AuthRequest extends Request {
  user?: UserPayload;
}

/**
 * Middleware to authenticate a token from the Authorization header.
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ error: 'Authentication required: No token provided' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET is not defined in environment variables.');
    return res.status(500).json({ error: 'Server configuration error: JWT secret is missing' });
  }

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Authentication failed: Invalid token' });
    }
    req.user = user as UserPayload;
    next();
  });
};

/**
 * Placeholder for a rate limiting middleware.
 * TODO: Implement a proper rate limiting strategy (e.g., using a library like express-rate-limit).
 */
export const rateLimitByUser = (requests: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This is a placeholder and does not actually limit requests.
    console.warn('Rate limiting is not implemented. All requests are currently allowed.');
    next();
  };
};
