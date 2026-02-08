
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

let mockAuthCallback = null;

const mockSupabase = {
    auth: {
        onAuthStateChange: (callback) => {
            mockAuthCallback = callback;
            return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signUp: async ({ email, password }) => {
            if (email && email.includes('test')) {
                const user = { id: 'test-user', email };
                const session = { user };
                if (mockAuthCallback) mockAuthCallback('SIGNED_IN', session);
                return { data: { user, session }, error: null };
            }
            return { error: { message: "Supabase not configured" } };
        },
        signInWithPassword: async ({ email, password }) => {
            if (email && email.includes('test')) {
                const user = { id: 'test-user', email };
                const session = { user };
                if (mockAuthCallback) mockAuthCallback('SIGNED_IN', session);
                return { data: { user, session }, error: null };
            }
            return { error: { message: "Supabase not configured" } };
        },
        signOut: async () => {
            if (mockAuthCallback) mockAuthCallback('SIGNED_OUT', null);
            return { error: null };
        }
    }
};

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : mockSupabase;
