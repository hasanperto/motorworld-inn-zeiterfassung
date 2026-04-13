import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'motorworld.db'));
const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'motorworld-secret-2024';
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Database setup
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    team TEXT,
    hourly_rate REAL DEFAULT 15,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    pause_minutes INTEGER DEFAULT 0,
    type TEXT DEFAULT 'normal',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Auth routes
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  
  try {
    const hashed = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(name, email, hashed);
    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: result.lastInsertRowid, name, email } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// Data routes
app.get('/api/data', auth, (req, res) => {
  const employees = db.prepare('SELECT * FROM employees WHERE user_id = ?').all(req.userId);
  const shifts = db.prepare('SELECT * FROM shifts WHERE user_id = ?').all(req.userId);
  res.json({ employees, shifts });
});

app.post('/api/data', auth, (req, res) => {
  const { employees, shifts } = req.body;
  
  db.prepare('DELETE FROM shifts WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM employees WHERE user_id = ?').run(req.userId);
  
  const insertEmp = db.prepare('INSERT INTO employees (id, user_id, name, position, team, hourly_rate) VALUES (?, ?, ?, ?, ?, ?)');
  employees?.forEach(emp => {
    insertEmp.run(emp.id, req.userId, emp.name, emp.position, emp.team, emp.hourlyRate);
  });
  
  const insertShift = db.prepare('INSERT INTO shifts (id, employee_id, user_id, date, start_time, end_time, pause_minutes, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  shifts?.forEach(shift => {
    insertShift.run(shift.id, shift.employee_id, req.userId, shift.date, shift.start_time, shift.end_time, shift.pause_minutes, shift.type);
  });
  
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MotorWorld API running on port ${PORT}`);
});
