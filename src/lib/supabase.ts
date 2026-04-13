import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zvctvmjdoqlnpvitgoss.supabase.co';
const supabaseAnonKey = 'sb_publishable_EkXSPxN096zAEalH7ShU1Q_IfgcXEJl';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
