import express, { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

export const authRouter = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth login endpoint
authRouter.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      res.status(400).json({
        error: 'Missing ID token',
        message: 'Google ID token is required',
      });
      return;
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({
        error: 'Invalid token',
        message: 'Could not verify Google ID token',
      });
      return;
    }

    // Extract user information
    const user = {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      domain: payload.hd, // G Suite domain if applicable
      emailVerified: payload.email_verified,
    };

    // For now, we'll just return user info and a JWT
    // In later phases, we'll save to database
    const jwtToken = jwt.sign(
      { 
        id: user.googleId, 
        email: user.email,
        name: user.name,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        domain: user.domain,
        emailVerified: user.emailVerified,
      },
      token: jwtToken,
      expiresIn: '7d',
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    
    res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown authentication error',
    });
  }
});

// Token verification endpoint
authRouter.get('/verify', authenticateToken, (req: Request, res: Response) => {
  // If we get here, the token is valid (middleware passed)
  res.json({
    valid: true,
    user: req.user,
    message: 'Token is valid',
  });
});

// Logout endpoint (client-side logout mainly, but we can add server-side logic later)
authRouter.post('/logout', authenticateToken, (req: Request, res: Response) => {
  // For now, just confirm logout
  // In production, we might maintain a token blacklist
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// JWT authentication middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      error: 'Access denied',
      message: 'No token provided',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      error: 'Invalid token',
      message: 'Token verification failed',
    });
    return;
  }
}

// Export the middleware for use in other routes
export { authenticateToken };