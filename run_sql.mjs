import https from 'https';

const SUPABASE_URL = 'https://zvctvmjdoqlnpvitgoss.supabase.co';
const ANON_KEY = 'sb_publishable_EkXSPxN096zAEalH7ShU1Q_IfgcXEJl';

const sql = `
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  team TEXT,
  hourly_rate REAL DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own employees" ON employees FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own shifts" ON shifts FOR ALL USING (auth.uid() = user_id);
`;

// Use Supabase REST API to execute SQL via rpc if available, or just verify connection
const body = JSON.stringify({ query: sql });

const url = new URL('/rest/v1/rpc/sql', SUPABASE_URL);

const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': 'Bearer ' + ANON_KEY,
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 500));
  });
});

req.on('error', e => console.log('Error:', e.message));
req.write(body);
req.end();
