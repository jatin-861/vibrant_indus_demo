import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ceolzbnjzpjigdplyhau.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlb2x6Ym5qenBqaWdkcGx5aGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MzY4MTUsImV4cCI6MjA5NTQxMjgxNX0.0nzrkGR_6WwLzxkqyL2k1-Uhlnf1b6wOy-lShr4eI2Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
