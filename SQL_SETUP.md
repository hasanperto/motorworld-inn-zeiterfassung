-- MotorWorld Inn - Supabase Schema Setup
-- Run this in Supabase Dashboard → SQL Editor

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  team TEXT,
  hourly_rate REAL DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id),
  user_id UUID REFERENCES auth.users NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  pause_minutes INTEGER DEFAULT 0,
  type TEXT DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own data
CREATE POLICY "Users can manage own employees" ON employees
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own shifts" ON shifts
  FOR ALL USING (auth.uid() = user_id);