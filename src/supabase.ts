import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnv(key: string): string {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
}

const DEFAULT_SUPABASE_URL = 'https://ubzlknzzxszlmakzlpki.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_URRx_w0tQbtwdwciiajHaw_sYmM6Bfu';

function getSupabaseUrl(): string {
  return (
    getEnv('SUPABASE_URL') ||
    getEnv('NEXT_PUBLIC_SUPABASE_URL') ||
    getEnv('VITE_SUPABASE_URL') ||
    DEFAULT_SUPABASE_URL
  );
}

function getSupabaseKey(): string {
  return (
    getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
    getEnv('SUPABASE_ANON_KEY') ||
    getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    getEnv('VITE_SUPABASE_ANON_KEY') ||
    getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    DEFAULT_SUPABASE_KEY
  );
}

let clientInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  return Boolean(url && key && url.startsWith('https://'));
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(getSupabaseUrl(), getSupabaseKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return clientInstance;
}

// Helper utilities for persisting and querying Supabase alongside server_db.json
export async function syncUserToSupabase(user: any): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !user || !user.email) return false;

  try {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        password_hash: user.passwordHash || null,
        profile: user.profile || {},
        project: user.project || {},
        latest_analysis: user.latestAnalysis || null,
        interview_pools: user.interviewPools || {},
        created_at: user.createdAt || new Date().toISOString()
      }, { onConflict: 'email' });

    if (error) {
      console.warn('[Supabase Sync] Warning syncing user:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase Sync] Failed to sync user to Supabase:', err.message);
    return false;
  }
}

export async function syncSessionToSupabase(token: string, session: any): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !token || !session) return false;

  try {
    const { error } = await supabase
      .from('sessions')
      .upsert({
        token,
        user_id: session.userId,
        email: session.email.toLowerCase(),
        created_at: session.createdAt,
        expires_at: session.expiresAt
      }, { onConflict: 'token' });

    if (error) {
      console.warn('[Supabase Sync] Warning syncing session:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase Sync] Failed to sync session to Supabase:', err.message);
    return false;
  }
}

export async function removeSessionFromSupabase(token: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !token) return false;

  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('token', token);

    if (error) {
      console.warn('[Supabase Sync] Warning deleting session:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase Sync] Failed to delete session from Supabase:', err.message);
    return false;
  }
}
