// ============================================
// Supabase 配置模块
// ============================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export { SUPABASE_URL, SUPABASE_ANON_KEY };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function edgeFunctionUrl(functionName) {
  return `${SUPABASE_URL}/functions/v1/${functionName}`;
}
