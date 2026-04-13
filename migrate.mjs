/**
 * MotorWorld Inn - Database Migration
 * 
 * Bu scripti bir kez calistir - Supabase'de tablolari olusturur.
 * 
 * Usage: node migrate.mjs
 * 
 * NOT: Supabase'de tablolari olusturmak icin Service Role Key lazim.
 * Eger bu script calismazsa, SQL Editor'de asagidaki SQL'i calistir.
 */

import { createClient } from '@supabase/supabase-js';

// Service Role Key - bunu Supabase Dashboard > Settings > API > service_role
// veya Management API anahtari olarak al
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const SUPABASE_URL = 'https://zvctvmjdoqlnpvitgoss.supabase.co';
const ANON_KEY = 'sb_publishable_EkXSPxN096zAEalH7ShU1Q_IfgcXEJl';

const SQL_SCHEMA = `
-- Employees tablosu
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  team TEXT,
  hourly_rate REAL DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shifts tablosu  
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  user_id UUID REFERENCES auth.users NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  pause_minutes INTEGER DEFAULT 0,
  type TEXT DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users manage own employees" ON employees;
CREATE POLICY "Users manage own employees" ON employees 
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own shifts" ON shifts;
CREATE POLICY "Users manage own shifts" ON shifts 
  FOR ALL USING (auth.uid() = user_id);
`;

async function migrate() {
  console.log('🔧 MotorWorld Inn - Database Migration');
  console.log('=====================================\n');

  if (!SERVICE_ROLE_KEY) {
    console.log('⚠️  Service Role Key bulunamadi!');
    console.log('\n   Lutfen su sekilde calistir:');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=<your_key> node migrate.mjs');
    console.log('\n   Key\'i Supabase Dashboard\'dan al:');
    console.log('   Settings > API > service_role key\n');
    console.log('   YADA asagidaki SQL\'i Supabase SQL Editor\'de calistir:\n');
    console.log('   ────────────────────────────────────────');
    console.log(SQL_SCHEMA);
    console.log('   ────────────────────────────────────────\n');
    return false;
  }

  // Use service role client for admin operations
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('✅ Service Role Key ile baglanildi\n');

  // Create employees table
  console.log('📋 Creating employees table...');
  const { error: empError } = await supabaseAdmin.from('employees').select('id').limit(1);
  
  if (empError && empError.code === '42P01') {
    console.log('   ❌ employees table does not exist');
    console.log('   ℹ️  Please run the SQL manually in Supabase Dashboard\n');
    return false;
  }
  console.log('   ✅ employees table exists');

  // Check shifts table
  console.log('📋 Checking shifts table...');
  const { error: shiftError } = await supabaseAdmin.from('shifts').select('id').limit(1);
  
  if (shiftError && shiftError.code === '42P01') {
    console.log('   ❌ shifts table does not exist');
    console.log('   ℹ️  Please run the SQL manually in Supabase Dashboard\n');
    return false;
  }
  console.log('   ✅ shifts table exists');

  console.log('\n✨ Database is ready!');
  console.log('You can now use the MotorWorld Inn app.\n');
  return true;
}

migrate()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  });
