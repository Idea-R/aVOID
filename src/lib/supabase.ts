import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Make Supabase optional for development - allows app to run without backend
let supabase: any = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase environment variables not configured. Running in offline mode.');
  console.log('To enable authentication and leaderboard features, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file');
  
  // Create a mock supabase client for development
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: null, error: { message: 'Offline mode - authentication disabled' } }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Offline mode - authentication disabled' } }),
      resetPasswordForEmail: () => Promise.resolve({ data: null, error: { message: 'Offline mode - authentication disabled' } }),
      updateUser: () => Promise.resolve({ data: null, error: { message: 'Offline mode - authentication disabled' } }),
      setSession: () => Promise.resolve({ data: { user: null }, error: { message: 'Offline mode - authentication disabled' } }),
      signOut: () => Promise.resolve(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: { message: 'Offline mode - database disabled' } }),
      update: () => Promise.resolve({ data: null, error: { message: 'Offline mode - database disabled' } })
    })
  };
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

export type LeaderboardScore = {
  id: string;
  player_name: string;
  score: number;
  is_verified: boolean;
  user_id: string | null;
  created_at: string;
  game_session_id: string;
};