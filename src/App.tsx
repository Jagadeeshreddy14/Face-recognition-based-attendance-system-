import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { loadModels, createFaceMatcher } from './services/faceRecognition';
import { LogIn, UserCheck, Users, BarChart3, Settings, LogOut, Camera, ShieldCheck, FileSpreadsheet, FileText, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Types ---
type Role = 'admin' | 'student';
interface User {
  id: number;
  username: string;
  role: Role;
  student_id?: number;
}

// --- Components ---

const Button = ({ children, onClick, className = "", variant = "primary", disabled = false, type = "button" }: any) => {
  const variants: any = {
    primary: "bg-black text-white hover:bg-zinc-800",
    secondary: "bg-white text-black border border-zinc-200 hover:bg-zinc-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700"
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1">
    {label && <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>}
    <input
      {...props}
      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
    />
  </div>
);

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState<'login' | 'dashboard' | 'attendance' | 'students' | 'reports' | 'profile'>('login');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setView('dashboard');
      }
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        setToken(result.token);
        setUser(result.user);
        setView('dashboard');
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setView('login');
  };

  if (!user && view === 'login') return <LoginPage onLogin={handleLogin} loading={loading} />;

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col p-6 space-y-8">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">FaceAuth</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Attendance System</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem icon={<BarChart3 size={20} />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon={<Camera size={20} />} label="Mark Attendance" active={view === 'attendance'} onClick={() => setView('attendance')} />
          {user?.role === 'admin' && (
            <>
              <NavItem icon={<Users size={20} />} label="Students" active={view === 'students'} onClick={() => setView('students')} />
              <NavItem icon={<FileText size={20} />} label="Reports" active={view === 'reports'} onClick={() => setView('reports')} />
            </>
          )}
          {user?.role === 'student' && (
            <NavItem icon={<User size={20} />} label="My Profile" active={view === 'profile'} onClick={() => setView('profile')} />
          )}
        </nav>

        <div className="pt-6 border-t border-zinc-100">
          <div className="px-4 py-3 bg-zinc-50 rounded-xl mb-4">
            <p className="text-xs text-zinc-400 font-medium">Logged in as</p>
            <p className="text-sm font-bold truncate">{user?.username}</p>
            <p className="text-[10px] uppercase font-bold text-zinc-500 mt-1">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'dashboard' && <Dashboard user={user!} token={token!} />}
            {view === 'attendance' && <AttendanceView token={token!} />}
            {view === 'students' && <StudentsView token={token!} />}
            {view === 'reports' && <ReportsView token={token!} />}
            {view === 'profile' && <ProfileView user={user!} token={token!} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-Views ---

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-medium ${
        active ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-zinc-500 hover:bg-zinc-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function LoginPage({ onLogin, loading }: any) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-800 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900 rounded-full blur-[120px]" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="!bg-white/5 !border-white/10 backdrop-blur-xl p-10">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black mx-auto mb-6 shadow-2xl shadow-white/20">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-zinc-400">Sign in to access the Attendance System</p>
          </div>

          <form onSubmit={onLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Username</label>
              <input
                name="username"
                required
                placeholder="Enter your username"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Password</label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full py-4 !bg-white !text-black hover:!bg-zinc-200 text-lg font-bold rounded-2xl">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-500">
              Default Admin: <span className="text-zinc-300 font-mono">admin / admin123</span>
            </p>
            <button 
              onClick={async () => {
                const res = await fetch('/api/debug/users');
                const users = await res.json();
                alert("Users in DB: " + JSON.stringify(users));
              }}
              className="mt-4 text-[10px] text-zinc-600 hover:text-zinc-400"
            >
              Debug: Check Users
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function Dashboard({ user, token }: { user: User; token: string }) {
  const [stats, setStats] = useState<any>(null);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (user.role === 'admin') {
        const res = await fetch('/api/analytics/summary', { headers: { 'Authorization': `Bearer ${token}` } });
        setStats(await res.json());
      } else {
        const res = await fetch(`/api/attendance/student/${user.student_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        setStudentAttendance(await res.json());
      }
    };
    fetchStats();
  }, [user, token]);

  if (user.role === 'admin') {
    return (
      <div className="space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-bold tracking-tight">Overview</h2>
            <p className="text-zinc-500 mt-1">Real-time system statistics and activity.</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-zinc-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Students" value={stats?.totalStudents || 0} icon={<Users className="text-blue-600" />} />
          <StatCard label="Present Today" value={stats?.presentToday || 0} icon={<UserCheck className="text-emerald-600" />} />
          <StatCard label="Attendance Rate" value={stats?.totalStudents ? `${Math.round((stats.presentToday / stats.totalStudents) * 100)}%` : '0%'} icon={<BarChart3 className="text-purple-600" />} />
        </div>

        <Card className="h-[400px]">
          <h3 className="text-lg font-bold mb-6">Attendance Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.dailyStats || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Line type="monotone" dataKey="count" stroke="#000" strokeWidth={3} dot={{ r: 6, fill: '#000', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-4xl font-bold tracking-tight">My Attendance</h2>
        <p className="text-zinc-500 mt-1">Track your daily presence and statistics.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard label="Total Present" value={studentAttendance.length} icon={<UserCheck className="text-emerald-600" />} />
        <StatCard label="Attendance %" value={`${Math.min(100, Math.round((studentAttendance.length / 30) * 100))}%`} icon={<BarChart3 className="text-blue-600" />} />
      </div>

      <Card>
        <h3 className="text-lg font-bold mb-6">Recent Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Date</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Time</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {studentAttendance.map((record: any) => (
                <tr key={record.id}>
                  <td className="py-4 font-medium">{record.date}</td>
                  <td className="py-4 text-zinc-500">{record.time}</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-bold uppercase">Present</span>
                  </td>
                </tr>
              ))}
              {studentAttendance.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-zinc-400 italic">No attendance records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <Card className="flex items-center space-x-6">
      <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-2xl">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
    </Card>
  );
}

function AttendanceView({ token }: { token: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Initializing camera...');
  const [students, setStudents] = useState<any[]>([]);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await loadModels();
        const res = await fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        setStudents(data);
        
        if (data.length > 0) {
          const matcher = createFaceMatcher(data);
          setFaceMatcher(matcher);
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus('ready');
          setMessage('Position your face in the frame');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Failed to initialize camera or models');
      }
    };
    init();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [token]);

  const handleRecognize = async () => {
    if (!videoRef.current || !faceMatcher) return;

    setStatus('processing');
    setMessage('Scanning face...');

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        if (bestMatch.label !== 'unknown') {
          const studentId = parseInt(bestMatch.label);
          const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId })
          });
          const result = await res.json();
          
          if (res.ok) {
            setStatus('success');
            setMessage(`Attendance marked for ${result.name} at ${result.time}`);
            setTimeout(() => {
              setStatus('ready');
              setMessage('Position your face in the frame');
            }, 3000);
          } else {
            setStatus('error');
            setMessage(result.error);
            setTimeout(() => setStatus('ready'), 3000);
          }
        } else {
          setStatus('error');
          setMessage('Face not recognized. Please register first.');
          setTimeout(() => setStatus('ready'), 3000);
        }
      } else {
        setStatus('error');
        setMessage('No face detected. Try again.');
        setTimeout(() => setStatus('ready'), 3000);
      }
    } catch (err) {
      setStatus('error');
      setMessage('Recognition failed');
      setTimeout(() => setStatus('ready'), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <h2 className="text-4xl font-bold tracking-tight">Face Scanner</h2>
        <p className="text-zinc-500 mt-2">Look directly into the camera to mark your attendance.</p>
      </header>

      <div className="relative group">
        <div className={`absolute -inset-1 bg-gradient-to-r from-zinc-200 to-zinc-300 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 ${status === 'processing' ? 'animate-pulse' : ''}`} />
        <Card className="relative !p-2 overflow-hidden !rounded-[1.8rem]">
          <div className="relative aspect-video bg-black rounded-[1.5rem] overflow-hidden">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
            
            {/* Overlay */}
            <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
              <div className="w-full h-full border-2 border-white/30 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
              </div>
            </div>

            {/* Status Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/80 backdrop-blur-md rounded-full border border-white/10 flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${status === 'processing' ? 'bg-yellow-400 animate-ping' : status === 'success' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-400' : 'bg-white'}`} />
              <span className="text-white text-sm font-medium">{message}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={handleRecognize} 
          disabled={status === 'processing' || status === 'loading' || !faceMatcher}
          className="px-12 py-5 !rounded-2xl text-xl shadow-xl shadow-black/10"
        >
          {status === 'processing' ? 'Processing...' : 'Mark Attendance'}
        </Button>
      </div>
      
      {!faceMatcher && status !== 'loading' && (
        <p className="text-center text-red-500 font-medium">No students registered in the system yet.</p>
      )}
    </div>
  );
}

function StudentsView({ token }: { token: string }) {
  const [students, setStudents] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [capturedDescriptors, setCapturedDescriptors] = useState<any[]>([]);
  const [capturedDescriptor, setCapturedDescriptor] = useState<any>(null);

  const fetchStudents = async () => {
    const res = await fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } });
    setStudents(await res.json());
  };

  useEffect(() => { fetchStudents(); }, [token]);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      setCaptureProgress(0);
      setCapturedDescriptors([]);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      await loadModels();
    } catch (err) {
      alert("Could not access camera. Please ensure you have granted permissions.");
      setIsCapturing(false);
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) return;
    
    const totalFrames = 10; // Capturing 10 frames for better accuracy (averaging)
    const descriptors: any[] = [];
    
    for (let i = 0; i < totalFrames; i++) {
      setCaptureProgress(((i + 1) / totalFrames) * 100);
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (detection) {
        descriptors.push(Array.from(detection.descriptor));
      }
      // Small delay between captures
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (descriptors.length > 0) {
      // Average the descriptors for a more robust profile
      const averaged = descriptors[0].map((_: any, idx: number) => 
        descriptors.reduce((acc, curr) => acc + curr[idx], 0) / descriptors.length
      );
      
      setCapturedDescriptor(averaged);
      alert(`Face data captured successfully! (Processed ${descriptors.length} frames)`);
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCapturing(false);
    } else {
      alert("No face detected during capture. Please try again.");
      setCaptureProgress(0);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedDescriptor) return alert("Please capture face data first");

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      ...Object.fromEntries(formData),
      face_descriptor: capturedDescriptor
    };

    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      setShowAdd(false);
      setCapturedDescriptor(null);
      fetchStudents();
    } else {
      alert("Failed to add student");
    }
  };

  const deleteStudent = async (id: number) => {
    if (!confirm("Are you sure? This will delete all attendance records for this student.")) return;
    await fetch('/api/students/' + id, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    fetchStudents();
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-bold tracking-tight">Students</h2>
          <p className="text-zinc-500 mt-1">Manage student directory and face profiles.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="!rounded-xl px-6 py-3">Add New Student</Button>
      </header>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Name</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Roll Number</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Department</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Status</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {students.map((student) => {
                const isFaceRegistered = student.face_descriptor && JSON.parse(student.face_descriptor).some((v: number) => v !== 0);
                return (
                  <tr key={student.id}>
                    <td className="py-4 font-bold">{student.name}</td>
                    <td className="py-4 font-mono text-sm">{student.roll_number}</td>
                    <td className="py-4 text-zinc-500">{student.department}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${isFaceRegistered ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {isFaceRegistered ? 'Registered' : 'Not Registered'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button onClick={() => deleteStudent(student.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl">
            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-6">Register New Student</h3>
              <form onSubmit={handleAddStudent} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Full Name" name="name" required />
                  <Input label="Roll Number" name="roll_number" required />
                </div>
                <Input label="Department" name="department" required />
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Face Registration</label>
                  {isCapturing ? (
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {captureProgress > 0 && (
                          <div className="bg-black/60 px-4 py-2 rounded-full text-white text-sm font-bold">
                            Capturing: {Math.round(captureProgress)}%
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <Button onClick={captureFace} variant="success" disabled={captureProgress > 0 && captureProgress < 100}>
                          {captureProgress > 0 ? "Processing..." : "Start Capture"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center">
                      {capturedDescriptor ? (
                        <div className="text-emerald-600 font-bold flex items-center justify-center space-x-2">
                          <ShieldCheck />
                          <span>Face Data Ready</span>
                        </div>
                      ) : (
                        <Button onClick={startCamera} variant="secondary">Open Camera to Register Face</Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-100">
                  <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button type="submit" disabled={!capturedDescriptor}>Save Student Profile</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ReportsView({ token }: { token: string }) {
  const [report, setReport] = useState<any[]>([]);

  useEffect(() => {
    const fetchReport = async () => {
      const res = await fetch('/api/attendance/report', { headers: { 'Authorization': `Bearer ${token}` } });
      setReport(await res.json());
    };
    fetchReport();
  }, [token]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(report);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 20, 10);
    let y = 20;
    report.forEach((row, i) => {
      doc.text(`${row.date} | ${row.name} (${row.roll_number}) | ${row.time}`, 20, y);
      y += 10;
      if (y > 280) { doc.addPage(); y = 20; }
    });
    doc.save(`Attendance_Report_${new Date().toLocaleDateString()}.pdf`);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-bold tracking-tight">Reports</h2>
          <p className="text-zinc-500 mt-1">Generate and export attendance logs.</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={exportExcel} variant="secondary" className="flex items-center space-x-2">
            <FileSpreadsheet size={18} />
            <span>Excel</span>
          </Button>
          <Button onClick={exportPDF} variant="secondary" className="flex items-center space-x-2">
            <FileText size={18} />
            <span>PDF</span>
          </Button>
        </div>
      </header>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Date</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Student</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Roll No</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Time</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {report.map((row) => (
                <tr key={row.id}>
                  <td className="py-4 font-medium">{row.date}</td>
                  <td className="py-4 font-bold">{row.name}</td>
                  <td className="py-4 font-mono text-sm">{row.roll_number}</td>
                  <td className="py-4 text-zinc-500">{row.time}</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-bold uppercase">Present</span>
                  </td>
                </tr>
              ))}
              {report.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-400 italic">No attendance records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ProfileView({ user, token }: { user: User; token: string }) {
  const [student, setStudent] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const studentRes = await fetch(`/api/students/${user.student_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      setStudent(await studentRes.json());
      
      const attendanceRes = await fetch(`/api/attendance/student/${user.student_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      setAttendance(await attendanceRes.json());
    };
    fetchData();
  }, [user, token]);

  if (!student) return <div className="flex items-center justify-center h-64 text-zinc-400">Loading profile...</div>;

  const isFaceRegistered = student.face_descriptor && JSON.parse(student.face_descriptor).some((v: number) => v !== 0);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-4xl font-bold tracking-tight">My Profile</h2>
        <p className="text-zinc-500 mt-1">Detailed student information and attendance history.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-6">
          <h3 className="text-lg font-bold">Personal Information</h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-zinc-50 pb-2">
              <span className="text-zinc-400 text-sm">Full Name</span>
              <span className="font-bold">{student.name}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-50 pb-2">
              <span className="text-zinc-400 text-sm">Roll Number</span>
              <span className="font-mono font-bold">{student.roll_number}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-50 pb-2">
              <span className="text-zinc-400 text-sm">Department</span>
              <span className="font-bold">{student.department}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-400 text-sm">Face Data Status</span>
              <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${isFaceRegistered ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {isFaceRegistered ? 'Registered' : 'Not Registered'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center space-y-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl ${isFaceRegistered ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <User size={48} />
          </div>
          <div>
            <h4 className="font-bold text-xl">{student.name}</h4>
            <p className="text-zinc-500 text-sm">{student.roll_number}</p>
          </div>
          {!isFaceRegistered && (
            <p className="text-xs text-red-500 font-medium">Please contact admin to register your face data.</p>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-bold mb-6">Attendance History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Date</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Time</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {attendance.map((record: any) => (
                <tr key={record.id}>
                  <td className="py-4 font-medium">{record.date}</td>
                  <td className="py-4 text-zinc-500">{record.time}</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-bold uppercase">Present</span>
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-zinc-400 italic">No attendance records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
