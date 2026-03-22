import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { FaceService } from '../services/faceService';
import { Student } from '../types';
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
  // FIX: Initialized with null to prevent "Expected 1 arguments" error
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
          setStatus({ type: 'error', message: 'No students registered in database.' });
        }
      } catch (error) {
        console.error('Initialization failed:', error);
        setStatus({ type: 'error', message: 'Failed to connect to backend.' });
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
      setStatus({ type: 'error', message: 'Could not access camera' });
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
        
        let studentName = 'Unknown';
        if (result.label !== 'unknown') {
          // Splitting our custom label format: ID:::NAME
          const [, name] = result.label.split(':::');
          studentName = name || 'Student';
        }

        const drawBox = new faceapi.draw.DrawBox(box, { 
          label: studentName,
          boxColor: result.label === 'unknown' ? '#ef4444' : '#10b981'
        });
        drawBox.draw(canvas);
      });
    } catch (err) {
      console.error('Error in face detection loop:', err);
    }

    requestRef.current = requestAnimationFrame(processVideo);
  };

  const handleCaptureAttendance = async () => {
    if (!videoRef.current || !faceMatcherRef.current) {
      setStatus({ type: 'error', message: 'System not ready. Please refresh.' });
      return;
    }
    
    setStatus({ type: 'loading', message: 'Analyzing face...' });
    try {
      // 1. Detect faces from the current video frame
      const detections = await FaceService.detectFaces(videoRef.current);
      
      if (!detections || detections.length === 0) {
        setStatus({ type: 'error', message: 'No faces detected. Move closer.' });
        setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
        return;
      }

      let markedCount = 0;
      
      // 2. Loop through detected faces safely
      for (const detection of detections) {
        // Find the best match from our database
        const result = faceMatcherRef.current.findBestMatch(detection.descriptor);
        
        // 0.6 is the "Strictness" level. Lower = Harder to match.
        if (result.label !== 'unknown' && result.distance < 0.6) {
          const [id] = result.label.split(':::');
          
          // Double check the student exists in our local list
          const student = students.find(s => 
            String(s.id) === String(id) || 
            String(s.studentId) === String(id)
          );
          
          if (student && !recognizedStudents.has(result.label)) {
            const success = await markAttendance(student, detection.expressions, result.label);
            if (success) markedCount++;
          }
        }
      }
      
      // 3. Update status based on results
      if (markedCount > 0) {
        setStatus({ type: 'success', message: `Attendance marked for ${markedCount} student(s)!` });
      } else {
        setStatus({ type: 'error', message: 'Student not recognized. Please re-register.' });
      }
      
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    } catch (err) {
      console.error('CRITICAL CAPTURE ERROR:', err);
      setStatus({ type: 'error', message: 'Recognition Error. Check browser console.' });
    }
  };

  const markAttendance = async (student: Student, expressions: faceapi.FaceExpressions, label: string) => {
    // Determine the dominant emotion
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
        const utterance = new SpeechSynthesisUtterance(`Attendance marked for ${record.name}`);
        window.speechSynthesis.speak(utterance);
        
        return true; // <--- ADDED: Tells the system this was successful
      }
      
      return false; // <--- ADDED: Tells the system the server rejected it
    } catch (err) {
      console.error('Failed to mark attendance', err);
      return false; // <--- ADDED: Tells the system a network error happened
    }
  };
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Live Attendance Mode</h2>
          <p className="opacity-50 text-sm">Real-time face recognition and emotion detection</p>
        </div>
        <div className="flex gap-3">
          {isLive && (
            <button
              onClick={handleCaptureAttendance}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20"
            >
              <Camera size={20} />
              Capture Attendance
            </button>
          )}
          {!isLive ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
            >
              <Camera size={20} />
              Start Session
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-500/20"
            >
              <XCircle size={20} />
              Stop Session
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 relative aspect-video bg-zinc-900 rounded-[2.5rem] overflow-hidden border-4 border-zinc-800 shadow-2xl">
          {isLive ? (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center text-zinc-600 mb-4">
                <Camera size={40} />
              </div>
              <h3 className="text-xl font-bold opacity-30">Camera Offline</h3>
              <p className="opacity-20 text-sm max-w-xs">Start the session to begin real-time face recognition</p>
            </div>
          )}

          {status.type !== 'idle' && (
            <div className="absolute top-6 left-6 right-6">
              <div className={`p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md border ${
                status.type === 'loading' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                status.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {status.type === 'loading' ? <RefreshCw size={20} className="animate-spin" /> :
                 status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                <span className="text-sm font-medium">{status.message}</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={20} />
                Recognized Today
              </h3>
              <span className="text-[10px] font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg opacity-50">
                {faceCount} Faces Detected
              </span>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {[...recognizedStudents].map((label: string) => {
                const [id, name] = label.split(':::');
                return (
                  <div key={label} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                      {name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold truncate">{name || 'Unknown'}</p>
                      <p className="text-[10px] opacity-50 uppercase tracking-wider">{id}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  </div>
                );
              })}
              {recognizedStudents.size === 0 && (
                <p className="text-center py-12 opacity-30 text-sm italic">No students recognized yet</p>
              )}
            </div>
          </div>

          <div className="bg-emerald-500 p-6 rounded-3xl text-white shadow-lg shadow-emerald-500/20">
            <h4 className="font-bold mb-1">Pro Tip</h4>
            <p className="text-xs opacity-90 leading-relaxed">
              Ensure good lighting and ask students to look directly at the camera for best recognition accuracy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}