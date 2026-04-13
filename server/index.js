import express from 'express';
import cors from 'cors';
import db from './database.js';
import { generateToken, verifyToken, hashPassword, comparePassword } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = decoded.userId;
  next();
};

// REGISTER
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  
  try {
    const hashed = hashPassword(password);
    const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(name, email, hashed);
    const token = generateToken(result.lastInsertRowid);
    res.json({ token, user: { id: result.lastInsertRowid, name, email } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !comparePassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = generateToken(user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// GET DATA (protected)
app.get('/api/data', auth, (req, res) => {
  const employees = db.prepare('SELECT * FROM employees WHERE user_id = ?').all(req.userId);
  const shifts = db.prepare('SELECT * FROM shifts WHERE user_id = ?').all(req.userId);
  res.json({ employees, shifts });
});

// SAVE DATA (protected)
app.post('/api/data', auth, (req, res) => {
  const { employees, shifts } = req.body;
  
  // Clear old data
  db.prepare('DELETE FROM shifts WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM employees WHERE user_id = ?').run(req.userId);
  
  // Insert new employees
  if (employees && employees.length > 0) {
    const insertEmp = db.prepare('INSERT INTO employees (id, user_id, name, position, team, hourlyRate) VALUES (?, ?, ?, ?, ?, ?)');
    employees.forEach(emp => {
      insertEmp.run(emp.id, req.userId, emp.name, emp.position, emp.team, emp.hourlyRate);
    });
  }
  
  // Insert new shifts
  if (shifts && shifts.length > 0) {
    const insertShift = db.prepare('INSERT INTO shifts (id, employee_id, user_id, date, startTime, endTime, pauseMinutes, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    shifts.forEach(shift => {
      insertShift.run(shift.id, shift.employeeId, req.userId, shift.date, shift.startTime, shift.endTime, shift.pauseMinutes, shift.type);
    });
  }
  
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
