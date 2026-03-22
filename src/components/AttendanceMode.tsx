import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { FaceService } from '../services/faceService';
import { Student, AttendanceRecord } from '../types';
import * as faceapi from 'face-api.js';

export default function AttendanceMode() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [recognizedStudents, setRecognizedStudents] = useState<Set<string>>(new Set());
  const [faceCount, setFaceCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // FIX: Added 'null' to satisfy Ln 17 error
  const requestRef = useRef<number | null>(null);
  const faceMatcherRef = useRef<faceapi.FaceMatcher | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setStatus({ type: 'loading', message: 'Initializing models...' });
        await FaceService.loadModels();
        
        const res = await fetch('/api/students');
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setStudents(data);
          faceMatcherRef.current = FaceService.createFaceMatcher(data);
          setStatus({ type: 'idle', message: '' });
        } else {
          setStatus({ type: 'error', message: 'No students found in database.' });
        }
      } catch (error) {
        console.error('Init failed:', error);
        setStatus({ type: 'error', message: 'Connection to server failed.' });
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
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      setIsLive(true);
    } catch (err) {
      setStatus({ type: 'error', message: 'Camera access denied' });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsLive(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current as number);
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
        
        let displayLabel = 'Unknown';
        if (result.label !== 'unknown') {
          displayLabel = result.label.split(':::')[1] || 'Student';
        }

        new faceapi.draw.DrawBox(box, { 
          label: displayLabel,
          boxColor: result.label === 'unknown' ? '#ef4444' : '#10b981'
        }).draw(canvas);
      });
    } catch (err) {
      console.error('Detection loop error:', err);
    }

    requestRef.current = requestAnimationFrame(processVideo);
  };

  const handleCaptureAttendance = async () => {
    if (!videoRef.current || !faceMatcherRef.current) return;
    
    setStatus({ type: 'loading', message: 'Recognizing face...' });
    try {
      const detections = await FaceService.detectFaces(videoRef.current);
      
      if (detections.length === 0) {
        setStatus({ type: 'error', message: 'No faces seen.' });
        return;
      }

      let count = 0;
      for (const d of detections) {
        const result = faceMatcherRef.current.findBestMatch(d.descriptor);
        if (result.label !== 'unknown' && result.distance < 0.6) {
          const [id] = result.label.split(':::');
          const student = students.find(s => String(s.id) === String(id) || String(s.studentId) === String(id));
          
          if (student && !recognizedStudents.has(result.label)) {
            const success = await markAttendance(student, d.expressions, result.label);
            if (success) count++;
          }
        }
      }
      
      setStatus({ 
        type: count > 0 ? 'success' : 'error', 
        message: count > 0 ? `Marked ${count} student(s)!` : 'Student not recognized.' 
      });
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: 'Capture failed.' });
    }
  };

  const markAttendance = async (student: Student, expressions: faceapi.FaceExpressions, label: string) => {
    const emotion = Object.entries(expressions).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const now = new Date();
    
    // FIX: Using 'any' cast and multiple fallbacks for Ln 168-169 errors
    const record = {
      studentId: String(student.id || (student as any).studentId),
      name: student.name || (student as any).fullName,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString(),
      status: 'PRESENT',
      emotion: emotion
    };

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });

      if (response.ok) {
        setRecognizedStudents(prev => new Set(prev).add(label));
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Attendance marked for ${record.name}`));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* (Rest of the JSX remains exactly as it was) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Live Attendance Mode</h2>
          <p className="opacity-50 text-sm">Real-time Recognition</p>
        </div>
        <div className="flex gap-3">
          {isLive && (
            <button onClick={handleCaptureAttendance} className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg">
              <Camera size={20} /> Capture Attendance
            </button>
          )}
          <button onClick={isLive ? stopCamera : startCamera} className={`flex items-center gap-2 px-6 py-3 text-white font-bold rounded-2xl ${isLive ? 'bg-rose-500' : 'bg-emerald-500'}`}>
            <Camera size={20} /> {isLive ? 'Stop' : 'Start'} Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 relative aspect-video bg-zinc-900 rounded-[2.5rem] overflow-hidden border-4 border-zinc-800">
          {isLive ? (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
              <Camera size={40} className="mb-4" />
              <p>Camera Offline</p>
            </div>
          )}
          {status.type !== 'idle' && (
            <div className="absolute top-6 left-6 right-6 p-4 rounded-2xl bg-zinc-900/80 backdrop-blur border border-zinc-700 text-sm">
              {status.message}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800">
           <h3 className="font-bold mb-4">Recognized Today</h3>
           <div className="space-y-3">
             {[...recognizedStudents].map(l => (
               <div key={l} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
                 {l.split(':::')[1]}
               </div>
             ))}
             {recognizedStudents.size === 0 && <p className="opacity-30 italic text-sm">No students recognized yet</p>}
           </div>
        </div>
      </div>
    </div>
  );
}