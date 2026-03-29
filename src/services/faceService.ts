import * as faceapi from 'face-api.js';
import { Student } from '../types';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export class FaceService {
  private static isLoaded = false;
  
  // High-performance detector options (cached to prevent memory leaks)
  private static detectorOptions = new faceapi.TinyFaceDetectorOptions({ 
    scoreThreshold: 0.15, // Slightly higher threshold for better quality
    inputSize: 512 
  });

  /**
   * Initializes the Smart Attendance System models.
   * Ensures models are only loaded once to save memory.
   */
  static async loadModels() {
    if (this.isLoaded) return;
    
    try {
      console.log('[System] Initializing Biometric Models...');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      this.isLoaded = true;
      console.log('[System] Biometric Engines Online');
    } catch (error) {
      console.error('[System] Critical Error: Failed to sync models.', error);
      throw error;
    }
  }

  /**
   * Used during Registration to extract a unique 128-bit biometric descriptor.
   */
  static async getFaceDescriptor(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
    const detection = await faceapi
      .detectSingleFace(imageElement, this.detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return detection ? detection.descriptor : null;
  }

  /**
   * Used during Live Attendance to track all faces in the frame.
   */
  static async detectFaces(videoElement: HTMLVideoElement) {
    return await faceapi
      .detectAllFaces(videoElement, this.detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions();
  }

  /**
   * Creates a high-precision FaceMatcher.
   * STRICTNESS: Set to 0.45 to prevent false-positives (like Ashwath marking for Durga).
   */
  static createFaceMatcher(students: Student[]) {
    const labeledDescriptors = students.flatMap(student => {
      const id = student.id || student.studentId || "UnknownID";
      const name = student.name || student.fullName || "Student";
      
      let rawData = student.faceData || student.faceDescriptor;

      // 1. Convert string data from Database back to JSON if necessary
      if (typeof rawData === 'string') {
        try {
          rawData = JSON.parse(rawData);
        } catch (e) {
          return []; // Skip student with corrupt data
        }
      }

      // 2. Validate descriptor integrity
      // Biometric vectors must be exactly 128 numbers long
      if (!Array.isArray(rawData) || rawData.length !== 128) {
        console.warn(`[System] Integrity Check Failed for ${name}: Invalid descriptor length.`);
        return []; 
      }

      // 3. Encapsulate into LabeledFaceDescriptors
      try {
        const descriptorArray = new Float32Array(rawData);
        const label = `${id}:::${name}`;
        return [new faceapi.LabeledFaceDescriptors(label, [descriptorArray])];
      } catch (e) {
        return []; 
      }
    });

    // 4. Fallback: Prevents the system from crashing if no students are registered
    if (labeledDescriptors.length === 0) {
      return new faceapi.FaceMatcher([
        new faceapi.LabeledFaceDescriptors("system_empty", [new Float32Array(128).fill(0)])
      ]);
    }

    /**
     * PRECISION CONFIGURATION
     * 0.45 Distance: Very Strict. Prevents similar-looking students from being misidentified.
     * Lower values = Higher Security.
     */
    return new faceapi.FaceMatcher(labeledDescriptors, 0.45);
  }
}