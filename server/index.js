import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = 'https://zvctvmjdoqlnpvitgoss.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EkXSPxN096zAEalH7ShU1Q_IfgcXEJl';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth middleware - JWT verify via Supabase
const auth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
  
  req.userId = user.id;
  req.userEmail = user.email;
  next();
};

// REGISTER - Create auth user + profile
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });
  
  if (error) return res.status(400).json({ error: error.message });
  
  res.json({ 
    token: data.session?.access_token, 
    user: { id: data.user?.id, name, email },
    message: 'Registration successful!'
  });
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) return res.status(401).json({ error: 'Invalid credentials' });
  
  res.json({ 
    token: data.session?.access_token, 
    user: { id: data.user?.id, name: data.user?.user_metadata?.name, email: data.user?.email }
  });
});

// LOGOUT
app.post('/api/logout', auth, async (req, res) => {
  await supabase.auth.signOut();
  res.json({ success: true });
});

// GET DATA
app.get('/api/data', auth, async (req, res) => {
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', req.userId);
  
  const { data: shifts, error: shiftError } = await supabase
    .from('shifts')
    .select('*')
    .eq('user_id', req.userId);
  
  if (empError || shiftError) {
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
  
  res.json({ employees: employees || [], shifts: shifts || [] });
});

// SAVE DATA
app.post('/api/data', auth, async (req, res) => {
  const { employees, shifts } = req.body;
  
  // Delete old data
  await supabase.from('shifts').delete().eq('user_id', req.userId);
  await supabase.from('employees').delete().eq('user_id', req.userId);
  
  // Insert employees
  if (employees?.length > 0) {
    const empData = employees.map(emp => ({ ...emp, user_id: req.userId }));
    const { error: empError } = await supabase.from('employees').insert(empData);
    if (empError) return res.status(500).json({ error: empError.message });
  }
  
  // Insert shifts
  if (shifts?.length > 0) {
    const shiftData = shifts.map(s => ({ ...s, user_id: req.userId }));
    const { error: shiftError } = await supabase.from('shifts').insert(shiftData);
    if (shiftError) return res.status(500).json({ error: shiftError.message });
  }
  
  res.json({ success: true });
});

// USER INFO
app.get('/api/me', auth, async (req, res) => {
  const { data: { user } } = await supabase.auth.getUser();
  res.json({ 
    id: user?.id, 
    email: user?.email,
    name: user?.user_metadata?.name 
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));