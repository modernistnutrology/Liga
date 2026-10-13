import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iemrrurwjvkdkwqibunk.supabase.co'
// Chave pública (anon/publishable): feita para ficar no app; a proteção vem das regras RLS do banco.
const SUPABASE_ANON_KEY = 'sb_publishable_4XniqcnOsz6DUFmqq6PF_w_ogIbbm-D'

export const nuvemConfigurada = SUPABASE_ANON_KEY.length > 0

export const supabase = nuvemConfigurada
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
