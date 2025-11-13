import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSupabaseAuth } from '../useSupabaseAuth';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
  })),
};

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useSupabaseAuth', () => {
  let mockUser: User;
  let mockSession: Session;
  let mockAuthStateCallback: (event: string, session: Session | null) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2023-01-01T00:00:00Z',
    } as User;

    mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer',
      user: mockUser,
    } as Session;

    // Mock auth state change listener
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      mockAuthStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    // Default mocks
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication State', () => {
    it('should initialize with authenticated user', async () => {
      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should initialize with no user when not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle authentication state changes', async () => {
      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate sign in
      act(() => {
        mockAuthStateCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Simulate sign out
      act(() => {
        mockAuthStateCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });

  describe('Profile Management', () => {
    it('should fetch user profile on authentication', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        company_domain: 'example.com',
        preferences: {},
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockSupabase.from().single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should handle profile fetch errors gracefully', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found', code: 'PGRST116' },
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.profile).toBeNull();
        expect(result.current.user).toEqual(mockUser);
      });
    });
  });

  describe('Google OAuth Sign In', () => {
    it('should initiate Google OAuth sign in', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://oauth.google.com/redirect', provider: 'google' },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
    });

    it('should handle Google OAuth sign in errors', async () => {
      const authError = { message: 'OAuth error', code: 'oauth_error' };
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: null,
        error: authError,
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to sign in with Google');
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Signed out successfully');
    });

    it('should handle sign out errors', async () => {
      const signOutError = { message: 'Sign out failed', code: 'sign_out_error' };
      mockSupabase.auth.signOut.mockResolvedValue({
        error: signOutError,
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to sign out');
    });
  });

  describe('Profile Updates', () => {
    it('should update user profile', async () => {
      const updatedProfile = {
        name: 'Updated Name',
        company_domain: 'newcompany.com',
      };

      mockSupabase.from().update.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: { ...updatedProfile, id: 'user-123' },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProfile(updatedProfile);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
    });

    it('should handle profile update errors', async () => {
      const updateError = { message: 'Update failed', code: 'update_error' };
      
      mockSupabase.from().update.mockReturnThis();
      mockSupabase.from().eq.mockReturnThis();
      mockSupabase.from().select.mockReturnThis();
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: updateError,
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProfile({ name: 'New Name' });
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during initialization', () => {
      mockSupabase.auth.getSession.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should handle session fetch errors', async () => {
      const sessionError = { message: 'Session fetch failed', code: 'session_error' };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: sessionError,
      });

      const { result } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup auth state change subscription on unmount', () => {
      const unsubscribeMock = vi.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeMock } },
      });

      const { unmount } = renderHook(() => useSupabaseAuth(), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});