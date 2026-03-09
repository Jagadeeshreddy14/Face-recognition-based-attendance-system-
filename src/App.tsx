import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { loadModels, createFaceMatcher } from './services/faceRecognition';
import { LogIn, UserCheck, Users, BarChart3, Settings, LogOut, Camera, ShieldCheck, FileSpreadsheet, FileText, User, Menu, X, Activity, CheckCircle2, AlertCircle, Clock, UserPlus, Check, Ban, Search, ArrowLeft, Upload, FileUp } from 'lucide-react';
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
  const [view, setView] = useState<'login' | 'dashboard' | 'attendance' | 'students' | 'reports' | 'profile' | 'live' | 'register' | 'approvals' | 'settings' | 'student-details'>('login');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  if (!user && view === 'login') return <LoginPage onLogin={handleLogin} onRegister={() => setView('register')} loading={loading} />;
  if (!user && view === 'register') return <RegisterPage onBack={() => setView('login')} />;

  const Navigation = () => (
    <nav className="flex-1 space-y-1">
      <NavItem icon={<BarChart3 size={20} />} label="Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setSidebarOpen(false); }} />
      <NavItem icon={<Activity size={20} />} label="Live Attendance" active={view === 'live'} onClick={() => { setView('live'); setSidebarOpen(false); }} />
      <NavItem icon={<Camera size={20} />} label="Mark Attendance" active={view === 'attendance'} onClick={() => { setView('attendance'); setSidebarOpen(false); }} />
      {user?.role === 'admin' && (
        <>
          <NavItem icon={<Users size={20} />} label="Students" active={view === 'students'} onClick={() => { setView('students'); setSidebarOpen(false); }} />
          <NavItem icon={<UserPlus size={20} />} label="Approvals" active={view === 'approvals'} onClick={() => { setView('approvals'); setSidebarOpen(false); }} />
          <NavItem icon={<FileText size={20} />} label="Reports" active={view === 'reports'} onClick={() => { setView('reports'); setSidebarOpen(false); }} />
          <NavItem icon={<Settings size={20} />} label="System Settings" active={view === 'settings'} onClick={() => { setView('settings'); setSidebarOpen(false); }} />
        </>
      )}
      {user?.role === 'student' && (
        <NavItem icon={<User size={20} />} label="My Profile" active={view === 'profile'} onClick={() => { setView('profile'); setSidebarOpen(false); }} />
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-zinc-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <ShieldCheck size={18} />
          </div>
          <h1 className="font-bold text-base">FaceAuth</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-zinc-600">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-zinc-200 flex flex-col p-6 space-y-8 z-50 transition-transform duration-300 md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center space-x-3 px-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">FaceAuth</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Attendance System</p>
          </div>
        </div>

        <Navigation />

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
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'dashboard' && <Dashboard user={user!} token={token!} />}
            {view === 'live' && <LiveAttendanceView token={token!} />}
            {view === 'attendance' && <AttendanceView token={token!} />}
            {view === 'students' && <StudentsView token={token!} onViewDetails={(id) => { setSelectedStudentId(id); setView('student-details'); }} />}
            {view === 'approvals' && <ApprovalsView token={token!} />}
            {view === 'reports' && <ReportsView token={token!} />}
            {view === 'settings' && <SettingsView token={token!} />}
            {view === 'profile' && <ProfileView user={user!} token={token!} />}
            {view === 'student-details' && <StudentDetailsView studentId={selectedStudentId!} token={token!} onBack={() => setView('students')} />}
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

function LoginPage({ onLogin, onRegister, loading }: any) {
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

          <div className="mt-6 text-center">
            <button onClick={onRegister} className="text-sm text-zinc-400 hover:text-white transition-colors">
              New student? <span className="text-white font-bold underline underline-offset-4">Register for Approval</span>
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-500">
              Default Admin: <span className="text-zinc-300 font-mono">admin / admin123</span>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function RegisterPage({ onBack }: { onBack: () => void }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [capturedDescriptor, setCapturedDescriptor] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      setCaptureProgress(0);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      await loadModels();
    } catch (err) {
      alert("Could not access camera. You can use the image upload option instead.");
      setIsCapturing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      await loadModels();
      const img = await faceapi.bufferToImage(file);
      const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        setCapturedDescriptor(Array.from(detection.descriptor));
        alert("Face data extracted from image successfully!");
      } else {
        alert("No face detected in the uploaded image. Please try another photo.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process image. Please ensure it's a valid image file.");
    } finally {
      setIsProcessingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) return;
    const totalFrames = 10;
    const descriptors: any[] = [];
    for (let i = 0; i < totalFrames; i++) {
      setCaptureProgress(((i + 1) / totalFrames) * 100);
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
      if (detection) descriptors.push(Array.from(detection.descriptor));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (descriptors.length > 0) {
      const averaged = descriptors[0].map((_: any, idx: number) => descriptors.reduce((acc, curr) => acc + curr[idx], 0) / descriptors.length);
      setCapturedDescriptor(averaged);
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCapturing(false);
    } else {
      alert("No face detected");
      setCaptureProgress(0);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedDescriptor) return alert("Please capture face data");
    const formData = new FormData(e.target as HTMLFormElement);
    const data = { ...Object.fromEntries(formData), face_descriptor: capturedDescriptor };
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(onBack, 3000);
    } else {
      const err = await res.json();
      alert(err.error || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10">
        <Card className="!bg-white/5 !border-white/10 backdrop-blur-xl p-10">
          {success ? (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white">Request Submitted</h2>
              <p className="text-zinc-400">Your registration is pending admin approval. You will be able to login once approved.</p>
              <Button onClick={onBack} variant="secondary" className="w-full !bg-white/10 !text-white border-none">Back to Login</Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Student Registration</h2>
                <p className="text-zinc-400 text-sm">Fill in your details and capture your face profile</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-5">
                <input name="name" required placeholder="Full Name" className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/10" />
                <input name="roll_number" required placeholder="Roll Number" className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/10" />
                <input name="department" required placeholder="Department" className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/10" />
                
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Face Profile</label>
                  {isCapturing ? (
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10">
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                        {captureProgress > 0 && <span className="text-white font-bold text-lg">{Math.round(captureProgress)}%</span>}
                        <Button onClick={captureFace} className="mt-4 !bg-white !text-black">Capture Now</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-white/10 rounded-xl p-6 text-center">
                      {capturedDescriptor ? (
                        <div className="text-emerald-400 font-bold flex items-center justify-center space-x-2">
                          <CheckCircle2 size={18} /> <span>Face Data Captured</span>
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-3">
                          <button type="button" onClick={startCamera} className="text-zinc-400 hover:text-white transition-colors text-sm font-medium flex items-center justify-center space-x-2">
                            <Camera size={16} />
                            <span>Open Camera</span>
                          </button>
                          <div className="flex items-center justify-center space-x-2">
                            <div className="h-px bg-white/10 flex-1"></div>
                            <span className="text-[10px] text-zinc-600 uppercase font-bold">OR</span>
                            <div className="h-px bg-white/10 flex-1"></div>
                          </div>
                          <input 
                            type="file" 
                            ref={imageInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                          />
                          <button 
                            type="button" 
                            onClick={() => imageInputRef.current?.click()} 
                            disabled={isProcessingImage}
                            className="text-zinc-400 hover:text-white transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                          >
                            <Upload size={16} />
                            <span>{isProcessingImage ? 'Processing...' : 'Upload Photo'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={!capturedDescriptor || isProcessingImage} className="w-full py-4 !bg-white !text-black font-bold rounded-xl mt-4">
                  {isProcessingImage ? 'Processing Image...' : 'Submit Registration'}
                </Button>
                <button type="button" onClick={onBack} className="w-full text-zinc-500 text-sm hover:text-zinc-300">Back to Login</button>
              </form>
            </>
          )}
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
      const res = await fetch('/api/analytics/summary', { headers: { 'Authorization': `Bearer ${token}` } });
      setStats(await res.json());
    };
    const fetchStudentAttendance = async () => {
      if (user.role === 'student') {
        const res = await fetch(`/api/attendance/student/${user.student_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        setStudentAttendance(await res.json());
      }
    };
    fetchStats();
    fetchStudentAttendance();
  }, [user, token]);

  if (user.role === 'admin') {
    return (
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Overview</h2>
            <p className="text-zinc-500 mt-1">Real-time system statistics and activity.</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm font-medium text-zinc-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="Total Students" value={stats?.totalStudents || 0} icon={<Users className="text-blue-600" />} />
          <StatCard label="Present Today" value={stats?.presentToday || 0} icon={<UserCheck className="text-emerald-600" />} />
          <StatCard label="Total Classes" value={stats?.totalClasses || 0} icon={<Clock className="text-orange-600" />} />
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
    <div className="space-y-6 md:space-y-8">
      <header>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">My Attendance</h2>
        <p className="text-zinc-500 mt-1 text-sm md:text-base">Track your daily presence and statistics.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Present" value={studentAttendance.length} icon={<UserCheck className="text-emerald-600" />} />
        <StatCard label="Total Classes" value={stats?.totalClasses || 0} icon={<Clock className="text-orange-600" />} />
        <StatCard label="Attendance %" value={stats?.totalClasses > 0 ? `${Math.round((studentAttendance.length / stats.totalClasses) * 100)}%` : '0%'} icon={<BarChart3 className="text-blue-600" />} />
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

function LiveAttendanceView({ token }: { token: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const [detectedStudents, setDetectedStudents] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const cooldowns = useRef<Record<number, number>>({});

  useEffect(() => {
    const init = async () => {
      try {
        await loadModels();
        const res = await fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.length > 0) {
          setFaceMatcher(createFaceMatcher(data));
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setLoading(false);
        setIsScanning(true);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    init();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [token]);

  useEffect(() => {
    let interval: any;
    if (isScanning && faceMatcher && videoRef.current) {
      interval = setInterval(async () => {
        if (!videoRef.current) return;
        const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const match = faceMatcher.findBestMatch(detection.descriptor);
          if (match.label !== 'unknown') {
            const studentId = parseInt(match.label);
            const now = Date.now();
            
            // 10 second cooldown for local feedback
            if (!cooldowns.current[studentId] || now - cooldowns.current[studentId] > 10000) {
              cooldowns.current[studentId] = now;
              
              try {
                const res = await fetch('/api/attendance', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ student_id: studentId })
                });
                const result = await res.json();
                
                setDetectedStudents(prev => [
                  { 
                    id: Date.now(), 
                    name: result.name || 'Unknown', 
                    time: result.time || new Date().toLocaleTimeString(),
                    status: res.ok ? 'success' : 'error',
                    message: res.ok ? 'Attendance Marked' : result.error
                  },
                  ...prev.slice(0, 4)
                ]);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }
      }, 1000); // Scan every second
    }
    return () => clearInterval(interval);
  }, [isScanning, faceMatcher]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Live Attendance</h2>
          <p className="text-zinc-500 mt-1">Real-time facial recognition and automated marking.</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>Live System Active</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="!p-2 overflow-hidden !rounded-[2rem] bg-black aspect-video relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-white space-x-3">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Initializing System...</span>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1] rounded-[1.8rem]" />
                <div className="absolute inset-0 border-[30px] border-black/10 pointer-events-none">
                  <div className="w-full h-full border border-white/20 rounded-2xl relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-dashed border-white/30 rounded-full animate-[spin_10s_linear_infinite]" />
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold flex items-center space-x-2">
            <Activity size={20} className="text-emerald-500" />
            <span>Recent Activity</span>
          </h3>
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {detectedStudents.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border flex items-start space-x-4 ${
                    log.status === 'success' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${log.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {log.status === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-900 truncate">{log.name}</p>
                    <p className={`text-xs font-medium ${log.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {log.message}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-tighter">{log.time}</p>
                  </div>
                </motion.div>
              ))}
              {detectedStudents.length === 0 && (
                <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                  <p className="text-zinc-400 text-sm italic">Waiting for detections...</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
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
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
      <header className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Face Scanner</h2>
        <p className="text-zinc-500 mt-2 text-sm md:text-base">Look directly into the camera to mark your attendance.</p>
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

function StudentsView({ token, onViewDetails }: { token: string, onViewDetails: (id: number) => void }) {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [capturedDescriptors, setCapturedDescriptors] = useState<any[]>([]);
  const [capturedDescriptor, setCapturedDescriptor] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchStudents = async () => {
    const res = await fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    setStudents(data.filter((s: any) => s.status === 'approved'));
  };

  useEffect(() => { fetchStudents(); }, [token]);

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map data to expected format
        const studentsToImport = data.map((row: any) => ({
          name: row.Name || row.name,
          roll_number: String(row['Roll Number'] || row.roll_number || row.roll),
          department: row.Department || row.department || 'General'
        }));

        const res = await fetch('/api/students/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ students: studentsToImport })
        });

        if (res.ok) {
          alert(`Successfully imported ${studentsToImport.length} students`);
          fetchStudents();
        } else {
          const err = await res.json();
          alert("Import failed: " + err.error);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse file");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

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
      setSuccess(true);
      setCapturedDescriptor(null);
      fetchStudents();
      setTimeout(() => {
        setSuccess(false);
        setShowAdd(false);
      }, 2000);
    } else {
      alert("Failed to add student");
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmId === null) return;
    await fetch('/api/students/' + deleteConfirmId, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    setDeleteConfirmId(null);
    fetchStudents();
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Students</h2>
          <p className="text-zinc-500 mt-1">Manage student directory and face profiles.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or roll no..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
            />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleBulkImport} 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="secondary" 
            disabled={isImporting}
            className="!rounded-xl px-6 py-3 flex items-center space-x-2"
          >
            <FileUp size={18} />
            <span>{isImporting ? 'Importing...' : 'Bulk Import'}</span>
          </Button>
          <Button onClick={() => setShowAdd(true)} className="!rounded-xl px-6 py-3">Add New Student</Button>
        </div>
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
              {filteredStudents.map((student) => {
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
                    <td className="py-4 text-right space-x-3">
                      <button onClick={() => onViewDetails(student.id)} className="text-black hover:underline font-bold text-sm">View Details</button>
                      <button onClick={() => setDeleteConfirmId(student.id)} className="text-red-500 hover:text-red-700 font-medium text-sm">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-400 italic">No students found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl">
            <Card className="p-8 relative overflow-hidden">
              {success ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900">Student Registered!</h3>
                  <p className="text-zinc-500">The student has been added successfully. They can now login using their Roll Number.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold">Register New Student</h3>
                    <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start space-x-3 mb-6">
                    <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-800 leading-relaxed">
                      <p className="font-bold mb-1 uppercase tracking-wider">Login Information:</p>
                      <p>Once registered, students can login using their <strong>Roll Number</strong> as both the username and default password.</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddStudent} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Full Name" name="name" required placeholder="e.g. John Doe" />
                      <Input label="Roll Number" name="roll_number" required placeholder="e.g. STU001" />
                    </div>
                    <Input label="Department" name="department" required placeholder="e.g. Computer Science" />
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Face Registration</label>
                      {isCapturing ? (
                        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
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
                      <Button type="submit" disabled={!capturedDescriptor || success}>Complete Registration</Button>
                    </div>
                  </form>
                </>
              )}
            </Card>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl space-y-6"
          >
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-zinc-900">Delete Student?</h3>
              <p className="text-zinc-500 leading-relaxed">
                This action is permanent. Deleting this student will also remove all of their <strong>attendance records</strong> and <strong>face data</strong>.
              </p>
            </div>
            <div className="flex flex-col space-y-3">
              <Button onClick={confirmDelete} variant="danger" className="w-full py-4 !rounded-xl text-lg">
                Yes, Delete Permanently
              </Button>
              <Button onClick={() => setDeleteConfirmId(null)} variant="secondary" className="w-full py-4 !rounded-xl">
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ApprovalsView({ token }: { token: string }) {
  const [pending, setPending] = useState<any[]>([]);

  const fetchPending = async () => {
    const res = await fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    setPending(data.filter((s: any) => s.status === 'pending'));
  };

  useEffect(() => { fetchPending(); }, [token]);

  const approve = async (id: number) => {
    const res = await fetch(`/api/students/approve/${id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchPending();
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Pending Approvals</h2>
        <p className="text-zinc-500 mt-1">Review and approve new student registration requests.</p>
      </header>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Name</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Roll Number</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest">Department</th>
                <th className="pb-4 font-semibold text-zinc-400 uppercase text-[10px] tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {pending.map((student) => (
                <tr key={student.id}>
                  <td className="py-4 font-bold">{student.name}</td>
                  <td className="py-4 font-mono text-sm">{student.roll_number}</td>
                  <td className="py-4 text-zinc-500">{student.department}</td>
                  <td className="py-4 text-right space-x-2">
                    <Button onClick={() => approve(student.id)} variant="success" className="text-xs px-3 py-1.5">Approve</Button>
                    <button className="text-red-500 text-xs font-bold uppercase hover:underline">Reject</button>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-zinc-400 italic">No pending requests.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SettingsView({ token }: { token: string }) {
  const [totalClasses, setTotalClasses] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const res = await fetch('/api/settings', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      const tc = data.find((s: any) => s.key === 'total_classes');
      if (tc) setTotalClasses(parseInt(tc.value));
      setLoading(false);
    };
    fetchSettings();
  }, [token]);

  const save = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ total_classes: totalClasses })
    });
    alert("Settings saved!");
  };

  if (loading) return null;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">System Settings</h2>
        <p className="text-zinc-500 mt-1">Configure academic parameters and system behavior.</p>
      </header>

      <div className="max-w-xl">
        <Card className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <Clock size={20} className="text-zinc-400" />
              <span>Academic Configuration</span>
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total Classes Conducted</label>
              <div className="flex space-x-3">
                <input 
                  type="number" 
                  value={totalClasses} 
                  onChange={(e) => setTotalClasses(parseInt(e.target.value))}
                  className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                />
                <Button onClick={save}>Update</Button>
              </div>
              <p className="text-[10px] text-zinc-400 italic">This value is used to calculate attendance percentages for all students.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-100 space-y-4">
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <AlertCircle size={20} className="text-zinc-400" />
              <span>Email Notifications</span>
            </h3>
            <div className="p-4 bg-zinc-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Admin Alerts</span>
                <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Active</span>
              </div>
              <p className="text-xs text-zinc-500">System will notify admin about new registrations and record deletions via SMTP.</p>
            </div>
          </div>
        </Card>
      </div>
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Reports</h2>
          <p className="text-zinc-500 mt-1">Generate and export attendance logs.</p>
        </div>
        <div className="flex space-x-3 w-full md:w-auto">
          <Button onClick={exportExcel} variant="secondary" className="flex-1 md:flex-none flex items-center justify-center space-x-2">
            <FileSpreadsheet size={18} />
            <span>Excel</span>
          </Button>
          <Button onClick={exportPDF} variant="secondary" className="flex-1 md:flex-none flex items-center justify-center space-x-2">
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

function StudentDetailsView({ studentId, token, onBack }: { studentId: number, token: string, onBack: () => void }) {
  const [student, setStudent] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [totalClasses, setTotalClasses] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const studentRes = await fetch(`/api/students/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      setStudent(await studentRes.json());
      
      const attendanceRes = await fetch(`/api/attendance/student/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      setAttendance(await attendanceRes.json());

      const statsRes = await fetch('/api/analytics/summary', { headers: { 'Authorization': `Bearer ${token}` } });
      const stats = await statsRes.json();
      setTotalClasses(stats.totalClasses);
    };
    fetchData();
  }, [studentId, token]);

  if (!student) return <div className="flex items-center justify-center h-64 text-zinc-400">Loading student details...</div>;

  const isFaceRegistered = student.face_descriptor && JSON.parse(student.face_descriptor).some((v: number) => v !== 0);
  const attendancePercentage = totalClasses > 0 ? Math.round((attendance.length / totalClasses) * 100) : 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{student.name}</h2>
            <p className="text-zinc-500 mt-1">Student Profile & Attendance History</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 space-y-6">
          <h3 className="text-lg font-bold">Personal Information</h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b border-zinc-50 pb-2">
              <span className="text-zinc-400 text-sm">Roll Number</span>
              <span className="font-mono font-bold">{student.roll_number}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-50 pb-2">
              <span className="text-zinc-400 text-sm">Department</span>
              <span className="font-bold">{student.department}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-50 pb-2">
              <span className="text-zinc-400 text-sm">Status</span>
              <span className="text-emerald-600 font-bold uppercase text-xs">Active</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-400 text-sm">Face Data</span>
              <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${isFaceRegistered ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {isFaceRegistered ? 'Registered' : 'Not Registered'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path className="text-zinc-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
              <path className="text-black" strokeDasharray={`${attendancePercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{attendancePercentage}%</span>
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Attendance</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900">{attendance.length} / {totalClasses}</p>
            <p className="text-xs text-zinc-400">Classes Attended</p>
          </div>
        </Card>

        <Card className="md:col-span-1 flex flex-col justify-center space-y-4">
          <div className="p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest mb-1">Last Seen</p>
            <p className="font-bold">{attendance.length > 0 ? attendance[0].date : 'Never'}</p>
            <p className="text-xs text-zinc-500">{attendance.length > 0 ? attendance[0].time : 'No records'}</p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest mb-1">Registration Date</p>
            <p className="font-bold">{new Date(student.created_at).toLocaleDateString()}</p>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-xl font-bold mb-6">Attendance History</h3>
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
              {attendance.map((record) => (
                <tr key={record.id}>
                  <td className="py-4 font-medium">{record.date}</td>
                  <td className="py-4 text-zinc-500">{record.time}</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase">Present</span>
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-zinc-400 italic">No attendance records found for this student.</td>
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
  const [totalClasses, setTotalClasses] = useState(30);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const studentRes = await fetch(`/api/students/${user.student_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      setStudent(await studentRes.json());
      
      const attendanceRes = await fetch(`/api/attendance/student/${user.student_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      setAttendance(await attendanceRes.json());

      const statsRes = await fetch('/api/analytics/summary', { headers: { 'Authorization': `Bearer ${token}` } });
      const stats = await statsRes.json();
      setTotalClasses(stats.totalClasses);
    };
    fetchData();
  }, [user, token]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);

    if (data.newPassword !== data.confirmPassword) {
      setPasswordError("New passwords do not match");
      setPasswordStatus('error');
      return;
    }

    setPasswordStatus('loading');
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword
        })
      });
      const result = await res.json();
      if (res.ok) {
        setPasswordStatus('success');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordStatus('idle');
        }, 2000);
      } else {
        setPasswordError(result.error);
        setPasswordStatus('error');
      }
    } catch (err) {
      setPasswordError("Failed to change password");
      setPasswordStatus('error');
    }
  };

  if (!student) return <div className="flex items-center justify-center h-64 text-zinc-400">Loading profile...</div>;

  const isFaceRegistered = student.face_descriptor && JSON.parse(student.face_descriptor).some((v: number) => v !== 0);

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">My Profile</h2>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">Detailed student information and attendance history.</p>
        </div>
        <Button onClick={() => setShowPasswordModal(true)} variant="secondary" className="flex items-center space-x-2 !rounded-xl">
          <Settings size={18} />
          <span>Change Password</span>
        </Button>
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
          <div>
            <p className="text-sm font-medium text-zinc-400">Attendance Score</p>
            <p className="text-5xl font-bold tracking-tight">
              {totalClasses > 0 ? Math.round((attendance.length / totalClasses) * 100) : 0}%
            </p>
            <p className="text-xs text-zinc-400 mt-2 font-medium">{attendance.length} / {totalClasses} Classes</p>
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
          >
            {passwordStatus === 'success' ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900">Password Updated!</h3>
                <p className="text-zinc-500">Your password has been changed successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-2xl font-bold">Change Password</h3>
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {passwordStatus === 'error' && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start space-x-3">
                    <AlertCircle size={20} className="text-red-600 mt-0.5" />
                    <p className="text-xs text-red-800 leading-relaxed">{passwordError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Current Password</label>
                    <input name="currentPassword" type="password" required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">New Password</label>
                    <input name="newPassword" type="password" required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Confirm New Password</label>
                    <input name="confirmPassword" type="password" required className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all" />
                  </div>
                </div>

                <Button type="submit" disabled={passwordStatus === 'loading'} className="w-full py-4 !rounded-xl text-lg shadow-xl shadow-black/10">
                  {passwordStatus === 'loading' ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
