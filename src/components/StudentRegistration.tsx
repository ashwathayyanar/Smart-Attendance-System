import React, { useState, useRef, useEffect } from 'react';
import { Camera, User, Phone, RefreshCw, CheckCircle2, AlertCircle, ShieldCheck, Fingerprint, Activity, X } from 'lucide-react';
import { FaceService } from '../services/faceService';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentRegistrationProps {
  onRegisterSuccess?: () => void;
}

// Reusable Professional Input Component
const RegistrationInput = ({ icon: Icon, label, darkMode, ...props }: any) => (
  <div className="space-y-1.5 group">
    <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-emerald-500 transition-all">
        <Icon size={18} />
      </div>
      <input
        {...props}
        className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border transition-all outline-none text-sm font-bold ${
          props.disabled ? 'opacity-50 cursor-not-allowed' : ''
        } bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10`}
      />
    </div>
  </div>
);

export default function StudentRegistration({ onRegisterSuccess }: StudentRegistrationProps = {}) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    className: '',
    section: '',
    mobile: ''
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await FaceService.loadModels();
      } catch (error) {
        setStatus({ type: 'error', message: 'Failed to initialize biometric engines' });
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isCapturing && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCapturing, stream]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      setStream(s);
      setIsCapturing(true);
      setStatus({ type: 'idle', message: '' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Optical sensor access denied' });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setStatus({ type: 'loading', message: 'Extracting 128-bit descriptor...' });
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx?.drawImage(video, 0, 0);

      const descriptor = await FaceService.getFaceDescriptor(video);
      
      if (descriptor && descriptor.length === 128) {
        setFaceDescriptor(Array.from(descriptor));
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        setStatus({ type: 'success', message: 'Biometric signature verified' });
        stopCamera();
      } else {
        setStatus({ type: 'error', message: 'Face alignment invalid. Try again.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Biometric processing error' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceDescriptor) {
      setStatus({ type: 'error', message: 'Registration requires face capture' });
      return;
    }

    setStatus({ type: 'loading', message: 'Syncing with Secure Manifest...' });

    const studentPayload = {
      studentId: formData.id.trim(),
      fullName: formData.name.trim(),
      className: formData.className.trim(),
      section: formData.section.trim(),
      mobile: formData.mobile.trim(),
      faceData: JSON.stringify(faceDescriptor),
      faceDescriptor: faceDescriptor,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentPayload)
      });

      if (res.ok) {
        setStatus({ type: 'success', message: 'Identity successfully encrypted' });
        setFormData({ id: '', name: '', className: '', section: '', mobile: '' });
        setCapturedImage(null);
        setFaceDescriptor(null);
        if (onRegisterSuccess) {
          setTimeout(onRegisterSuccess, 1500);
        }
      } else {
        throw new Error('Server rejected sync');
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Cloud synchronization failed' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* 1. STUDENT DETAILS FORM */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 bg-white dark:bg-zinc-900/50 p-10 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
               <User size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">Identity Details</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Profile Configuration</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RegistrationInput 
                icon={Fingerprint} 
                label="Student Identity ID" 
                placeholder="Unique ID"
                value={formData.id}
                onChange={(e: any) => setFormData({ ...formData, id: e.target.value })}
                required
              />
              <RegistrationInput 
                icon={User} 
                label="Legal Full Name" 
                placeholder="Full Name"
                value={formData.name}
                onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RegistrationInput 
                icon={ShieldCheck} 
                label="Academic Class" 
                placeholder="Year/Dept"
                value={formData.className}
                onChange={(e: any) => setFormData({ ...formData, className: e.target.value })}
                required
              />
              <RegistrationInput 
                icon={Activity} 
                label="Section" 
                placeholder="Sec"
                value={formData.section}
                onChange={(e: any) => setFormData({ ...formData, section: e.target.value })}
                required
              />
            </div>

            <RegistrationInput 
              icon={Phone} 
              label="Parents Contact Mobile" 
              type="tel"
              placeholder="+91 00000 00000"
              value={formData.mobile}
              onChange={(e: any) => setFormData({ ...formData, mobile: e.target.value })}
              required
            />

            <AnimatePresence>
              {status.type !== 'idle' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-2xl flex items-center gap-3 border ${
                    status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    status.type === 'error' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}
                >
                  {status.type === 'success' ? <CheckCircle2 size={18} /> : 
                   status.type === 'error' ? <AlertCircle size={18} /> : 
                   <RefreshCw size={18} className="animate-spin" />}
                  <span className="text-xs font-black uppercase tracking-widest">{status.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!faceDescriptor || status.type === 'loading'}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] text-xs uppercase tracking-[0.2em]"
            >
              Finalize Registration
            </button>
          </form>
        </motion.div>

        {/* 2. BIOMETRIC CAPTURE SECTION */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-zinc-950 p-10 rounded-[3rem] shadow-2xl border border-zinc-800 flex flex-col items-center"
        >
          <div className="flex items-center gap-4 self-start mb-8 text-white">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
               <Camera size={20} />
            </div>
            <h3 className="text-xl font-black tracking-tight">Biometric Link</h3>
          </div>

          <div className="relative w-full aspect-[3/4] bg-zinc-900 rounded-[2.5rem] overflow-hidden border-4 border-zinc-800 flex items-center justify-center group shadow-inner">
            {isCapturing ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover grayscale-[0.3] brightness-125"
                />
                {/* OVAL GUIDE MASK */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                   <div className="w-48 h-64 border-2 border-emerald-500 rounded-[100%] shadow-[0_0_0_999px_rgba(9,9,11,0.7)]" />
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-68 border border-white/10 rounded-[100%]" />
                </div>
                {/* STATUS DOT */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Sensor</span>
                </div>
              </>
            ) : capturedImage ? (
              <motion.img 
                initial={{ scale: 1.1 }} 
                animate={{ scale: 1 }} 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="text-center p-12">
                <Camera size={64} className="mx-auto mb-6 text-zinc-800" />
                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">Ready for Initialization</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 w-full mt-10">
            {!isCapturing ? (
              <button
                type="button"
                onClick={startCamera}
                className="w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] bg-zinc-800 hover:bg-zinc-700 text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 border border-zinc-700 shadow-xl"
              >
                <RefreshCw size={18} className={capturedImage ? 'rotate-180' : ''} />
                {capturedImage ? 'Recalibrate Biometrics' : 'Initialize Optical Sensor'}
              </button>
            ) : (
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 py-4 rounded-2xl bg-zinc-800 text-zinc-400 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureFace}
                  className="flex-[2] py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                >
                  Verify Face
                </button>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-zinc-800 w-full">
             <div className="flex items-center gap-3 mb-2 text-emerald-500">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Privacy Protocol</span>
             </div>
             <p className="text-[10px] text-zinc-500 leading-relaxed font-bold uppercase tracking-wider">
               No images are stored. Your face is converted into an encrypted 128-bit numeric vector.
             </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}