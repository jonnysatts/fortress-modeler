import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /auth/google - Get Google OAuth URL
router.get('/google', (req: Request, res: Response) => {
  try {
    const authUrl = AuthService.getAuthURL();
    
    res.json({
      authUrl,
      message: 'Redirect user to this URL for Google authentication'
    });
  } catch (error) {
    console.error('Google auth URL error:', error);
    res.status(500).json({
      error: 'Failed to generate authentication URL',
      code: 'AUTH_URL_ERROR'
    });
  }
});

// POST /auth/google/callback - Handle Google OAuth callback
router.post('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, id_token } = req.body;
    
    if (!code && !id_token) {
      res.status(400).json({
        error: 'Authorization code or ID token required',
        code: 'MISSING_AUTH_DATA'
      });
      return;
    }
    
    let googleProfile;
    
    if (id_token) {
      // Direct ID token verification (for frontend-initiated auth)
      googleProfile = await AuthService.verifyGoogleToken(id_token);
    } else {
      // Authorization code exchange (for server-initiated auth)
      googleProfile = await AuthService.exchangeCodeForTokens(code);
    }
    
    const authTokens = await AuthService.authenticateUser(googleProfile);
    
    res.json({
      success: true,
      ...authTokens,
      message: 'Authentication successful'
    });
    
  } catch (error) {
    console.error('Google callback error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /auth/verify - Verify JWT token
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({
        error: 'Token required',
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
    
    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        company_domain: user.company_domain
      }
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      error: 'Token verification failed',
      code: 'VERIFICATION_FAILED'
    });
  }
});

// POST /auth/refresh - Refresh JWT token
router.post('/refresh', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const newToken = await AuthService.refreshUserToken(req.userId);
    
    if (!newToken) {
      res.status(401).json({
        error: 'Unable to refresh token',
        code: 'REFRESH_FAILED'
      });
      return;
    }
    
    res.json({
      access_token: newToken,
      expires_in: 3600 * 24 * 7, // 7 days
      message: 'Token refreshed successfully'
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

// GET /auth/me - Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userStats = await UserService.getUserStats(req.userId);
    
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
        company_domain: req.user.company_domain,
        preferences: req.user.preferences,
        created_at: req.user.created_at,
        updated_at: req.user.updated_at
      },
      stats: userStats
    });
    
  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// PATCH /auth/me - Update user profile
router.patch('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, preferences } = req.body;
    
    const updatedUser = await UserService.updateUser(req.userId, {
      name,
      preferences
    });
    
    if (!updatedUser) {
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }
    
    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        picture: updatedUser.picture,
        company_domain: updatedUser.company_domain,
        preferences: updatedUser.preferences
      },
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      code: 'UPDATE_ERROR'
    });
  }
});

// POST /auth/logout - Logout (client-side token invalidation)
router.post('/logout', (req: Request, res: Response) => {
  // For JWT tokens, logout is handled client-side by removing the token
  // In the future, we could implement a token blacklist
  res.json({
    message: 'Logout successful',
    instructions: 'Remove access token from client storage'
  });
});

// DELETE /auth/account - Delete user account
router.delete('/account', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      res.status(400).json({
        error: 'Account deletion requires confirmation',
        code: 'CONFIRMATION_REQUIRED',
        required: 'Send { "confirm": "DELETE_MY_ACCOUNT" } to confirm deletion'
      });
      return;
    }
    
    const deleted = await UserService.deleteUser(req.userId);
    
    if (!deleted) {
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }
    
    res.json({
      message: 'Account deleted successfully',
      warning: 'All user data has been permanently removed'
    });
    
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      code: 'DELETION_ERROR'
    });
  }
});

export default router;