import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("attendance.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123";

// Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "user@example.com",
    pass: process.env.SMTP_PASS || "password",
  },
});

const sendAdminEmail = async (subject: string, text: string) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  try {
    await transporter.sendMail({
      from: `"Attendance System" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject,
      text,
    });
  } catch (error) {
    console.error("Email error:", error);
  }
};

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'student')),
    student_id INTEGER,
    FOREIGN KEY(student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    roll_number TEXT UNIQUE,
    department TEXT,
    face_descriptor TEXT,
    status TEXT DEFAULT 'approved' -- 'pending', 'approved', 'rejected'
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    date TEXT,
    time TEXT,
    status TEXT DEFAULT 'present',
    FOREIGN KEY(student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('total_classes', '30');
`);

// Migration: Add status column if not exists
try {
  db.exec("ALTER TABLE students ADD COLUMN status TEXT DEFAULT 'approved'");
} catch (e) {
  // Column already exists
}

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
  
  // Seed dummy students
  const dummyStudents = [
    { name: "John Doe", roll: "STU001", dept: "Computer Science" },
    { name: "Jane Smith", roll: "STU002", dept: "Information Technology" }
  ];

  dummyStudents.forEach(s => {
    const studentResult = db.prepare("INSERT INTO students (name, roll_number, department, face_descriptor) VALUES (?, ?, ?, ?)")
      .run(s.name, s.roll, s.dept, JSON.stringify(new Array(128).fill(0))); // Placeholder descriptor
    
    const studentHashedPassword = bcrypt.hashSync(s.roll, 10);
    db.prepare("INSERT INTO users (username, password, role, student_id) VALUES (?, ?, ?, ?)")
      .run(s.roll, studentHashedPassword, "student", studentResult.lastInsertRowid);
  });
  console.log("Database seeded with admin and dummy students.");
}

const allUsers = db.prepare("SELECT username, role FROM users").all();
console.log("Current users in DB:", allUsers);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, student_id: user.student_id }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, student_id: user.student_id } });
  });

  app.get("/api/debug/users", (req, res) => {
    const users = db.prepare("SELECT username, role FROM users").all();
    res.json(users);
  });

  app.post("/api/change-password", authenticateToken, (req: any, res: any) => {
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;

    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.user.id);
    res.json({ success: true });
  });

  // Student Management
  app.get("/api/students", authenticateToken, (req, res) => {
    const students = db.prepare("SELECT * FROM students").all();
    res.json(students);
  });

  app.post("/api/register", async (req, res) => {
    const { name, roll_number, department, face_descriptor } = req.body;
    try {
      const result = db.prepare("INSERT INTO students (name, roll_number, department, face_descriptor, status) VALUES (?, ?, ?, ?, ?)")
        .run(name, roll_number, department, JSON.stringify(face_descriptor), 'pending');
      
      await sendAdminEmail(
        "New Student Registration Request",
        `A new student ${name} (${roll_number}) has registered and is waiting for approval.`
      );

      res.json({ id: result.lastInsertRowid, message: "Registration successful. Waiting for admin approval." });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/students/approve/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { id } = req.params;
    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(id) as any;
    if (!student) return res.status(404).json({ error: "Student not found" });

    db.prepare("UPDATE students SET status = 'approved' WHERE id = ?").run(id);
    
    // Create user account
    const hashedPassword = bcrypt.hashSync(student.roll_number, 10);
    db.prepare("INSERT OR IGNORE INTO users (username, password, role, student_id) VALUES (?, ?, ?, ?)")
      .run(student.roll_number, hashedPassword, "student", id);

    res.json({ success: true });
  });

  app.get("/api/students/:id", authenticateToken, (req, res) => {
    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  });

  app.post("/api/students", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { name, roll_number, department, face_descriptor } = req.body;
    try {
      const result = db.prepare("INSERT INTO students (name, roll_number, department, face_descriptor, status) VALUES (?, ?, ?, ?, ?)")
        .run(name, roll_number, department, JSON.stringify(face_descriptor), 'approved');
      
      // Create a student user account automatically
      const hashedPassword = bcrypt.hashSync(roll_number, 10); // Default password is roll number
      db.prepare("INSERT INTO users (username, password, role, student_id) VALUES (?, ?, ?, ?)")
        .run(roll_number, hashedPassword, "student", result.lastInsertRowid);

      await sendAdminEmail(
        "New Student Added by Admin",
        `Admin has added a new student: ${name} (${roll_number}).`
      );

      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/students/bulk", authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { students } = req.body; // Array of { name, roll_number, department, face_descriptor }
    try {
      const insertStudent = db.prepare("INSERT INTO students (name, roll_number, department, face_descriptor, status) VALUES (?, ?, ?, ?, ?)");
      const insertUser = db.prepare("INSERT OR IGNORE INTO users (username, password, role, student_id) VALUES (?, ?, ?, ?)");
      
      const transaction = db.transaction((students) => {
        for (const s of students) {
          const result = insertStudent.run(s.name, s.roll_number, s.department, JSON.stringify(s.face_descriptor || new Array(128).fill(0)), 'approved');
          const hashedPassword = bcrypt.hashSync(s.roll_number, 10);
          insertUser.run(s.roll_number, hashedPassword, "student", result.lastInsertRowid);
        }
      });
      transaction(students);

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/students/:id", authenticateToken, async (req: any, res) => {
    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(req.params.id) as any;
    if (student) {
      await sendAdminEmail(
        "Student Record Deleted",
        `Admin has deleted the record for student: ${student.name} (${student.roll_number}). All associated attendance records have been removed.`
      );
    }
    db.prepare("DELETE FROM users WHERE student_id = ?").run(req.params.id);
    db.prepare("DELETE FROM attendance WHERE student_id = ?").run(req.params.id);
    db.prepare("DELETE FROM students WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Attendance
  app.post("/api/attendance", (req, res) => {
    const { student_id } = req.body;
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString();

    // Prevent duplicate attendance for the same day
    const existing = db.prepare("SELECT * FROM attendance WHERE student_id = ? AND date = ?").get(student_id, date);
    if (existing) {
      return res.status(400).json({ error: "Attendance already marked for today" });
    }

    db.prepare("INSERT INTO attendance (student_id, date, time) VALUES (?, ?, ?)").run(student_id, date, time);
    const student = db.prepare("SELECT name FROM students WHERE id = ?").get(student_id) as any;
    res.json({ success: true, name: student.name, time });
  });

  app.get("/api/attendance/report", authenticateToken, (req, res) => {
    const report = db.prepare(`
      SELECT a.*, s.name, s.roll_number, s.department 
      FROM attendance a 
      JOIN students s ON a.student_id = s.id
      ORDER BY a.date DESC, a.time DESC
    `).all();
    res.json(report);
  });

  app.get("/api/attendance/student/:id", authenticateToken, (req, res) => {
    const attendance = db.prepare("SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC").all(req.params.id);
    res.json(attendance);
  });

  app.get("/api/analytics/summary", authenticateToken, (req, res) => {
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students WHERE status = 'approved'").get() as any;
    const today = new Date().toISOString().split('T')[0];
    const presentToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ?").get(today) as any;
    
    const totalClassesSetting = db.prepare("SELECT value FROM settings WHERE key = 'total_classes'").get() as any;
    const totalClasses = parseInt(totalClassesSetting?.value || "30");

    const dailyStats = db.prepare(`
      SELECT date, COUNT(*) as count 
      FROM attendance 
      GROUP BY date 
      ORDER BY date DESC 
      LIMIT 7
    `).all();

    res.json({
      totalStudents: totalStudents.count,
      presentToday: presentToday.count,
      totalClasses,
      dailyStats: dailyStats.reverse()
    });
  });

  app.get("/api/settings", authenticateToken, (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    res.json(settings);
  });

  app.post("/api/settings", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { total_classes } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('total_classes', total_classes.toString());
    res.json({ success: true });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
