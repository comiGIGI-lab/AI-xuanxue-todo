// ============================================
// Supabase 配置模块
// ============================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Hardcoded at sandbox creation; publish flow rewrites both literals.
export const SUPABASE_URL = 'https://supabase-api-202605292104-eg9drdty.creo4u.com';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiZXhwIjoyMDk1MzkxMDczfQ.fmQ9qkDSoJt29ovIiTC1u392y0XhRg58dbsFupr9H9M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function edgeFunctionUrl(functionName) {
  return `${SUPABASE_URL}/functions/v1/${functionName}`;
}
