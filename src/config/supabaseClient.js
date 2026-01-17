/**
 * Supabase Client Configuration
 *
 * Initializes and exports the Supabase client for database operations.
 * Uses environment variables for configuration.
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file');
}

// Create Supabase client
// Singleton instance - only created once
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,  // Keep user logged in across page refreshes
    autoRefreshToken: true, // Automatically refresh auth token
  },
  db: {
    schema: 'public',       // Use public schema
  },
  global: {
    headers: {
      'x-application-name': 'nests-hostels-analytics',
    },
  },
});

// Export utility function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Export utility function to test connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('hostels')
      .select('count')
      .limit(1);

    if (error) throw error;

    return { success: true, message: 'Connected to Supabase successfully' };
  } catch (error) {
    console.error('Supabase connection error:', error);
    return { success: false, message: error.message };
  }
};
