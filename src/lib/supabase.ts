import { createClient } from '@supabase/supabase-js';

// 这些值会在部署时通过环境变量注入
const supabaseUrl = 'https://hxvohfnykvzhkelfmiyt.supabase.co/rest/v1/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4dm9oZm55a3Z6aGtlbGZtaXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MjU5NzAsImV4cCI6MjEwMjUwMTk3MH0.xVSy1B74NSGr0TU9f5IG_DTeWlbbHs1zZl_VIobIqoA';

/**
 * Supabase 客户端实例
 * 每个项目拥有独立的 Supabase 数据库实例
 *
 * 使用示例：
 * ```typescript
 * import { supabase } from '@/lib/supabase'
 *
 * // 查询数据
 * const { data, error } = await supabase.from('todos').select('*')
 *
 * // 插入数据
 * await supabase.from('contacts').insert({ name, email, message })
 *
 * // 更新数据
 * await supabase.from('todos').update({ completed: true }).eq('id', todoId)
 *
 * // 删除数据
 * await supabase.from('todos').delete().eq('id', todoId)
 * ```
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 类型导出，方便组件使用
export type { SupabaseClient } from '@supabase/supabase-js';
