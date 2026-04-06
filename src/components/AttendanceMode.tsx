
import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, XCircle, UserCheck, Activity, Zap, ShieldCheck } from 'lucide-react';
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

  useEffect(() => {
    const init = async () => {
      try {
        setStatus({ type: 'loading', message: 'Syncing system models...' });
        await FaceService.loadModels();
        
        const res = await fetch('/api/students');
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setStudents(data);
          faceMatcherRef.current = FaceService.createFaceMatcher(data);
          setStatus({ type: 'idle', message: '' });
        } else {
          setStatus({ type: 'error', message: 'No registered identities found.' });
        }
      } catch (error) {
        console.error('Initialization failed:', error);
        setStatus({ type: 'error', message: 'Relay connection failed.' });
      }
    };
    init();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isLive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      processVideo();
    }
  }, [isLive, stream]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      setStream(s);
      setIsLive(true);
    } catch (err) {
      setStatus({ type: 'error', message: 'Optical sensor access denied.' });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
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
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx?.clearRect(0, 0, canvas.width, canvas.height);

      resizedDetections.forEach((detection) => {
        const result = faceMatcherRef.current!.findBestMatch(detection.descriptor);
        const box = detection.detection.box;
        
        let studentName = 'Unknown Entity';
        if (result.label !== 'unknown') {
          const [, name] = result.label.split(':::');
          studentName = name || 'Student';
        }

        // Custom High-Tech Drawing
        if (ctx) {
            ctx.strokeStyle = result.label === 'unknown' ? '#ef4444' : '#10b981';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            ctx.fillStyle = result.label === 'unknown' ? '#ef4444' : '#10b981';
            ctx.font = 'bold 12px Inter';
            ctx.fillText(studentName.toUpperCase(), box.x, box.y - 10);
        }
      });
    } catch (err) {
      console.error('Sensor processing error:', err);
    }

    requestRef.current = requestAnimationFrame(processVideo);
  };

  const handleCaptureAttendance = async () => {
    if (!videoRef.current || !faceMatcherRef.current || isProcessing) return;
    
    setIsProcessing(true);
    setStatus({ type: 'loading', message: 'Analyzing Biometrics...' });

    try {
      const detections = await FaceService.detectFaces(videoRef.current);
      
      if (!detections || detections.length === 0) {
        setStatus({ type: 'error', message: 'No target detected.' });
        setIsProcessing(false);
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 2000);
        return;
      }

      let markedCount = 0;
      
      for (const detection of detections) {
        const result = faceMatcherRef.current.findBestMatch(detection.descriptor);
        
        // Using Stricter Match (0.45 distance) to prevent Durga/False-positives
        if (result.label !== 'unknown' && result.distance < 0.45) {
          if (!recognizedStudents.has(result.label)) {
            const [id] = result.label.split(':::');
            const student = students.find(s => String(s.id) === String(id) || String(s.studentId) === String(id));
            
            if (student) {
              const success = await markAttendance(student, detection.expressions, result.label);
              if (success) markedCount++;
            }
          }
        }
      }
      
      if (markedCount > 0) {
        setStatus({ type: 'success', message: `Manifest Updated: ${markedCount} verified.` });
      } else {
        setStatus({ type: 'error', message: 'Verification failed or already logged.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'System override error.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    }
  };

  const markAttendance = async (student: Student, expressions: faceapi.FaceExpressions, label: string) => {
    const emotion = Object.entries(expressions).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const now = new Date();
    
    const record = {
      studentId: String(student.id || (student as any).studentId),
      name: student.name || (student as any).fullName,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString(),
      status: 'PRESENT',
      confidence: 1,
      emotion
    };

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });

      if (response.ok) {
        setRecognizedStudents(prev => new Set(prev).add(label));
        const utterance = new SpeechSynthesisUtterance(`Verified: ${record.name}`);
        window.speechSynthesis.speak(utterance);
        return true; 
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <ShieldCheck size={32} />
           </div>
           <div>
              <h2 className="text-3xl font-black tracking-tighter leading-none mb-1">Smart Attendance <span className="text-emerald-500">Session</span></h2>
              <div className="flex items-center gap-2 opacity-40 text-[10px] font-black uppercase tracking-[0.2em]">
                 <Activity size={12} className="animate-pulse" />
                 <span>Real-time Biometric Analysis Active</span>
              </div>
           </div>
        </div>

        <div className="flex gap-3">
          {isLive && (
            <button
              onClick={handleCaptureAttendance}
              disabled={isProcessing}
              className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              <Zap size={20} fill="currentColor" />
              Capture Attendance
            </button>
          )}
          {!isLive ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
            >
              <Camera size={20} />
              Initialize Session
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-3 px-8 py-4 bg-zinc-800 hover:bg-rose-600 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95"
            >
              <XCircle size={20} />
              Terminate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* OPTICAL SENSOR (CAMERA) VIEWPORT */}
        <div className="lg:col-span-2 relative aspect-video bg-black rounded-[3.5rem] overflow-hidden border-8 border-zinc-900 shadow-2xl group">
          
          {/* High-tech Corner Overlays */}
          <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-emerald-500/50 rounded-tl-xl z-20"></div>
          <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-emerald-500/50 rounded-tr-xl z-20"></div>
          <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-emerald-500/50 rounded-bl-xl z-20"></div>
          <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-emerald-500/50 rounded-br-xl z-20"></div>

          {isLive ? (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale-[0.2] brightness-110" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10" />
              
              {/* Scanning Line Animation */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent h-20 w-full animate-scan z-0"></div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 bg-zinc-950">
              <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-zinc-800 mb-6 border border-zinc-800 shadow-inner">
                <Camera size={48} />
              </div>
              <h3 className="text-xl font-black text-zinc-700 uppercase tracking-widest">Sensor Offline</h3>
              <p className="text-zinc-800 text-xs font-bold mt-2 uppercase tracking-widest">Awaiting System Initialization</p>
            </div>
          )}

          {/* STATUS TOAST OVERLAY */}
          <AnimatePresence>
            {status.type !== 'idle' && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-10 left-10 right-10 z-30"
              >
                <div className={`p-5 rounded-3xl flex items-center gap-4 backdrop-blur-2xl border shadow-2xl ${
                  status.type === 'loading' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' :
                  status.type === 'error' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' :
                  'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                }`}>
                  <div className="w-10 h-10 rounded-2xl bg-black/20 flex items-center justify-center">
                    {status.type === 'loading' ? <RefreshCw size={20} className="animate-spin" /> :
                     status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest">{status.message}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LOGS & ANALYTICS SIDEBAR */}
        <div className="space-y-8 flex flex-col">
          <div className="bg-white dark:bg-zinc-900/50 p-8 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-xl flex-1 backdrop-blur-xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <UserCheck className="text-emerald-500" size={24} />
                 <h3 className="font-black text-xl tracking-tight">Verified Feed</h3>
              </div>
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-50">
                {faceCount} Live Targets
              </span>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {[...recognizedStudents].reverse().map((label: string) => {
                const [id, name] = label.split(':::');
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={label} 
                    className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-3xl border border-transparent hover:border-emerald-500/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-emerald-500/20">
                      {name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-black truncate tracking-tight">{name || 'Unknown'}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">{id}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  </motion.div>
                );
              })}
              {recognizedStudents.size === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-20 py-20 text-center">
                   <Activity size={48} className="mb-4" />
                   <p className="text-xs font-black uppercase tracking-widest">Sensor Feed Empty</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-500/20 relative overflow-hidden group">
            <Zap className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-700" />
            <h4 className="font-black text-lg mb-2 uppercase tracking-tighter italic">Optimization Protocol</h4>
            <p className="text-xs font-bold opacity-80 leading-relaxed uppercase tracking-wider">
              Ensure optimal lux levels and direct ocular alignment for sub-second verification latency.
            </p>
          </div>
        </div>
      </div>
      
      {/* CSS For Scan Animation - Add to your index.css if possible */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
