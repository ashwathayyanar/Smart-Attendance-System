import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  UserCheck, 
  Activity, 
  Zap, 
  ShieldCheck,
  Scan,
  Users
} from 'lucide-react';
import { FaceService } from '../services/faceService';
import { Student } from '../types';
import * as faceapi from 'face-api.js';
import { motion, AnimatePresence } from 'framer-motion';

export default function AttendanceMode() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [recognizedStudents, setRecognizedStudents] = useState<Set<string>>(new Set());
  const [faceCount, setFaceCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const faceMatcherRef = useRef<faceapi.FaceMatcher | null>(null);

  // ... Logic remains the same (init, startCamera, processVideo, handleCapture) ...
  // [Keep your existing logic functions here, just updating the UI/Return section]

  useEffect(() => {
    const init = async () => {
      try {
        setStatus({ type: 'loading', message: 'Initializing AI Models...' });
        await FaceService.loadModels();
        const res = await fetch('/api/students');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setStudents(data);
          faceMatcherRef.current = FaceService.createFaceMatcher(data);
          setStatus({ type: 'idle', message: '' });
        } else {
          setStatus({ type: 'error', message: 'Database Registry Empty' });
        }
      } catch (error) {
        setStatus({ type: 'error', message: 'Cloud Relay Connection Failed' });
      }
    };
    init();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); stopCamera(); };
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      setStream(s);
      setIsLive(true);
    } catch (err) {
      setStatus({ type: 'error', message: 'Camera Access Denied' });
    }
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
    setIsLive(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  const processVideo = async () => {
    if (!videoRef.current || !canvasRef.current || !faceMatcherRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended || video.readyState < 2) {
      requestRef.current = requestAnimationFrame(processVideo);
      return;
    }
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);
    try {
      const detections = await FaceService.detectFaces(video);
      setFaceCount(detections.length);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      resizedDetections.forEach((detection) => {
        const result = faceMatcherRef.current!.findBestMatch(detection.descriptor);
        const box = detection.detection.box;
        if (ctx) {
            ctx.strokeStyle = result.label === 'unknown' ? '#6366f1' : '#10b981';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Professional dashed viewfinder
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            ctx.setLineDash([]);
            ctx.fillStyle = result.label === 'unknown' ? '#6366f1' : '#10b981';
            ctx.font = '600 10px Inter';
            const name = result.label === 'unknown' ? 'Unidentified' : result.label.split(':::')[1];
            ctx.fillText(name.toUpperCase(), box.x, box.y - 10);
        }
      });
    } catch (err) {}
    requestRef.current = requestAnimationFrame(processVideo);
  };

  const handleCaptureAttendance = async () => {
    if (!videoRef.current || !faceMatcherRef.current || isProcessing) return;
    setIsProcessing(true);
    setStatus({ type: 'loading', message: 'Analyzing Biometric Data...' });
    try {
      const detections = await FaceService.detectFaces(videoRef.current);
      if (!detections || detections.length === 0) {
        setStatus({ type: 'error', message: 'No subjects detected.' });
      } else {
        let count = 0;
        for (const d of detections) {
          const result = faceMatcherRef.current.findBestMatch(d.descriptor);
          if (result.label !== 'unknown' && result.distance < 0.45) {
            const [id] = result.label.split(':::');
            const student = students.find(s => String(s.id) === String(id) || String(s.studentId) === String(id));
            if (student && !recognizedStudents.has(result.label)) {
              await markAttendance(student, d.expressions, result.label);
              count++;
            }
          }
        }
        if (count > 0) setStatus({ type: 'success', message: `Verified ${count} students.` });
        else setStatus({ type: 'error', message: 'No new matches found.' });
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    }
  };

  const markAttendance = async (student: Student, expressions: faceapi.FaceExpressions, label: string) => {
    const emotion = Object.entries(expressions).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const record = {
      studentId: String(student.id || (student as any).studentId),
      name: student.name || (student as any).fullName,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      status: 'PRESENT',
      confidence: 1,
      emotion
    };
    const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
    if (res.ok) {
      setRecognizedStudents(prev => new Set(prev).add(label));
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Welcome, ${record.name}`));
      return true;
    }
    return false;
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* 1. TOP NAVIGATION & CONTROLS */}
      <header className="flex flex-col md:flex-row items-center justify-between p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
            <Scan size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">AI Attendance Session</h1>
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
              {isLive ? 'System Online' : 'System Standby'} • {students.length} Identities Loaded
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          {isLive ? (
            <>
              <button
                onClick={handleCaptureAttendance}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              >
                <Zap size={16} fill="currentColor" />
                Capture
              </button>
              <button
                onClick={stopCamera}
                className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                title="End Session"
              >
                <XCircle size={20} />
              </button>
            </>
          ) : (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              <Camera size={18} />
              Initialize Optical Sensor
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
        
        {/* 2. MAIN VIEWPORT (Google Workspace Style) */}
        <div className="lg:col-span-8 relative rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-950 overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-inner group">
          
          {isLive ? (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transition-opacity duration-1000" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />
              
              {/* Refined Modern Overlay */}
              <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 z-20">
                <div className="flex items-center gap-3 text-white">
                  <Activity size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Stream: 1080p</span>
                </div>
              </div>

              {/* Status Toast inside Viewport */}
              <AnimatePresence>
                {status.type !== 'idle' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
                  >
                    <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-xl border shadow-2xl ${
                      status.type === 'loading' ? 'bg-white/80 border-blue-200 text-blue-600' :
                      status.type === 'error' ? 'bg-rose-600 border-rose-500 text-white' :
                      'bg-emerald-600 border-emerald-500 text-white'
                    }`}>
                      {status.type === 'loading' && <RefreshCw size={16} className="animate-spin" />}
                      <span className="text-xs font-bold uppercase tracking-widest">{status.message}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex flex-col items-center text-center opacity-40">
              <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-900 rounded-3xl flex items-center justify-center mb-4">
                <Camera size={32} className="text-zinc-500" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest">Awaiting Biometric Initialization</p>
            </div>
          )}
        </div>

        {/* 3. SIDEBAR FEED (Zoho CRM Style) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
          
          {/* Real-time Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <Users size={16} className="text-blue-500 mb-2" />
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">In Frame</p>
              <p className="text-2xl font-black">{faceCount}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <CheckCircle2 size={16} className="text-emerald-500 mb-2" />
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Verified</p>
              <p className="text-2xl font-black">{recognizedStudents.size}</p>
            </div>
          </div>

          {/* Activity Log */}
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2 uppercase tracking-widest">
                <Activity size={16} className="text-blue-500" />
                Live Log
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {[...recognizedStudents].reverse().map((label) => {
                  const [id, name] = label.split(':::');
                  return (
                    <motion.div 
                      key={label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-4 group hover:border-blue-500/30 transition-all"
                    >
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold">
                        {name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{name}</p>
                        <p className="text-[10px] font-mono text-zinc-400">ID: {id}</p>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500" />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {recognizedStudents.size === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                  <UserCheck size={48} />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Waiting for validation</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}