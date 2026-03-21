import React, { useState, useRef, useEffect } from 'react';
import { Camera, User, Phone, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { FaceService } from '../services/faceService';
import { Student } from '../types';

interface StudentRegistrationProps {
  onRegisterSuccess?: () => void;
}

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
        setStatus({ type: 'error', message: 'Failed to load models' });
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
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      setIsCapturing(true);
    } catch (err) {
      setStatus({ type: 'error', message: 'Could not access camera' });
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

    setStatus({ type: 'loading', message: 'Detecting face...' });
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);

    const descriptor = await FaceService.getFaceDescriptor(video);
    
    if (descriptor) {
      setFaceDescriptor(Array.from(descriptor));
      setCapturedImage(canvas.toDataURL('image/jpeg'));
      setStatus({ type: 'success', message: 'Face captured successfully!' });
      stopCamera();
    } else {
      setStatus({ type: 'error', message: 'No face detected. Please try again.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceDescriptor) {
      setStatus({ type: 'error', message: 'Please capture student face first' });
      return;
    }

    setStatus({ type: 'loading', message: 'Saving student data...' });

    const student: Student = {
      ...formData,
      id: formData.id.trim(),
      name: formData.name.trim(),
      className: formData.className.trim(),
      section: formData.section.trim(),
      parentMobile: '', // Add default or input if required
      faceDescriptor,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });

      if (res.ok) {
        setStatus({ type: 'success', message: 'Student registered successfully!' });
        setFormData({ id: '', name: '', className: '', section: '', mobile: '' });
        setCapturedImage(null);
        setFaceDescriptor(null);
        if (onRegisterSuccess) {
          setTimeout(onRegisterSuccess, 1500);
        }
      } else {
        const errorText = await res.text();
        console.error("Server returned error:", res.status, errorText);
        throw new Error(`Failed to save: ${res.status} ${errorText}`);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setStatus({ type: 'error', message: 'Failed to register student' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registration Form */}
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <User className="text-emerald-500" />
            Student Details
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 opacity-70">Student ID</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Enter Student ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 opacity-70">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Enter Full Name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 opacity-70">Class</label>
                <input
                  type="text"
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Enter Class"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 opacity-70">Section</label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Enter Section"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-70">Student Mobile</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Enter Mobile Number"
                  required
                />
              </div>
            </div>

            <div className={`p-4 rounded-2xl flex items-center gap-3 ${
              status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
              status.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
              status.type === 'loading' ? 'bg-blue-500/10 text-blue-500' : 'hidden'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={20} /> : 
               status.type === 'error' ? <AlertCircle size={20} /> : 
               <RefreshCw size={20} className="animate-spin" />}
              <span className="text-sm font-medium">{status.message}</span>
            </div>

            <button
              type="submit"
              disabled={!faceDescriptor || status.type === 'loading'}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              Register Student
            </button>
          </form>
        </div>

        {/* Camera Section */}
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 self-start">
            <Camera className="text-emerald-500" />
            Face Capture
          </h3>

          <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
            {isCapturing ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : capturedImage ? (
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-8">
                <Camera size={48} className="mx-auto mb-4 opacity-20" />
                <p className="opacity-40 text-sm">Camera preview will appear here</p>
              </div>
            )}
            
            {isCapturing && (
              <div className="absolute inset-0 border-2 border-emerald-500/50 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-emerald-500 rounded-[3rem] shadow-[0_0_0_999px_rgba(0,0,0,0.5)]"></div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mt-6">
            {!isCapturing ? (
              <button
                onClick={startCamera}
                className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold transition-all"
              >
                <Camera size={20} />
                {capturedImage ? 'Retake Photo' : 'Start Camera'}
              </button>
            ) : (
              <>
                <button
                  onClick={stopCamera}
                  className="py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={captureFace}
                  className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-lg shadow-emerald-500/20"
                >
                  Capture Face
                </button>
              </>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
}
