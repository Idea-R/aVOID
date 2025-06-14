import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  handlePasswordResetRedirect: () => Promise<{ needsPasswordReset: boolean; error?: string }>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  signUp: async (email: string, password: string, displayName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        set({ user: data.user });
        return { success: true, user: data.user };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      // Development mode test account bypass - accept both username and email format
      if (import.meta.env.DEV && 
          (email === 'test' || email === 'test@localhost.dev') && 
          password === 'TestTest123!') {
        console.log('🧪 Development mode: Using test account bypass');
        
        // Create a mock user for testing
        const mockUser = {
          id: 'test-user-id',
          email: 'test@localhost.dev',
          user_metadata: {
            display_name: 'Test User'
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          aud: 'authenticated',
          role: 'authenticated'
        } as any; // Using 'any' to bypass strict typing for test user
        
        set({ user: mockUser });
        return { success: true, user: mockUser };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      set({ user: data.user });
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  resetPassword: async (email: string) => {
    try {
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Please enter a valid email address' };
      }

      // Use the correct redirect URL with hash preservation
      const redirectTo = import.meta.env.DEV 
        ? 'http://localhost:5173/#/reset-password' 
        : 'https://avoidgame.io/#/reset-password';

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo
      });

      if (error) {
        // Handle common errors with better messaging
        if (error.message.includes('For security purposes')) {
          return { success: true }; // Don't reveal if email exists or not
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  updatePassword: async (password: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  handlePasswordResetRedirect: async () => {
    try {
      // Check if we're handling a password reset redirect
      const fullHash = window.location.hash;
      const hashParams = new URLSearchParams(fullHash.includes('?') ? fullHash.split('?')[1] : fullHash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      // Check if this is our custom reset password path
      const isResetPasswordPath = fullHash.includes('/reset-password') || fullHash.includes('#/reset-password');

      // Log debug info
      console.log('Password reset redirect params:', { type, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken, error, errorDescription, isResetPasswordPath, fullHash });

      // Handle auth errors from Supabase
      if (error) {
        console.error('Auth redirect error:', error, errorDescription);
        return { needsPasswordReset: false, error: errorDescription || error };
      }

      if (type === 'recovery' && accessToken && refreshToken) {
        console.log('Setting session for password recovery...');
        
        // Set the session with the tokens from the URL
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('Session setting error:', error);
          return { needsPasswordReset: false, error: error.message };
        }

        if (data.user) {
          console.log('Password reset session established for user:', data.user.id);
          set({ user: data.user });
          
          // Clear the hash from URL for security, but preserve the game state
          window.history.replaceState(null, '', window.location.pathname);
          return { needsPasswordReset: true };
        }
      }

      // Also check if user manually navigated to reset password path (for testing)
      if (isResetPasswordPath && !type) {
        console.log('Manual navigation to reset password path detected');
        return { needsPasswordReset: false };
      }

      return { needsPasswordReset: false };
    } catch (error) {
      console.error('Password reset redirect error:', error);
      return { needsPasswordReset: false, error: 'An unexpected error occurred during password reset' };
    }
  },

  initialize: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      set({ user, loading: false });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event: any, session: any) => {
        set({ user: session?.user || null });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ loading: false });
    }
  }
}));