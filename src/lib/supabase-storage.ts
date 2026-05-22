import { createClient } from '@supabase/supabase-js';

// Fallback values prevent build-time crashes if environment variables are missing
// Important: Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are added to your Vercel Project Settings.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabaseStorage = createClient(supabaseUrl, supabaseAnonKey);