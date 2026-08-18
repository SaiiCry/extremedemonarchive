import { createClient } from '@supabase/supabase-js';

// URL corregida (sin el /rest/v1/ al final)
const supabaseUrl = 'https://hxvohfnykvzhkelfmiyt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4dm9oZm55a3Z6aGtlbGZtaXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MjU5NzAsImV4cCI6MjEwMjUwMTk3MH0.xVSy1B74NSGr0TU9f5IG_DTeWlbbHs1zZl_VIobIqoA';

/**
 * Supabase 客户端实例
 * 每个项目拥有独立的 Supabase 数据库实例
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type { SupabaseClient } from '@supabase/supabase-js';