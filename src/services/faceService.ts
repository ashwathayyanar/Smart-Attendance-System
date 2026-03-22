import * as faceapi from 'face-api.js';
import { Student } from '../types';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export class FaceService {
  private static isLoaded = false;

  static async loadModels() {
    if (this.isLoaded) return;
    
    try {
      console.log('Loading face models...');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      this.isLoaded = true;
      console.log('Face models loaded successfully');
    } catch (error) {
      console.error('Failed to load face models:', error);
      throw error;
    }
  }

  // Used during Registration
  static async getFaceDescriptor(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
    const detection = await faceapi
      .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.1 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return detection ? detection.descriptor : null;
  }

  // Used during Live Attendance
  static async detectFaces(videoElement: HTMLVideoElement) {
    return await faceapi
      .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.1 }))
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions();
  }

  /**
   * FIX: Added "Catch-All" label logic to match the new backend/database labels
   */
  static createFaceMatcher(students: Student[]) {
    const labeledDescriptors = students.map(student => {
      // 1. Safe extraction of the ID and Name (Checks all possible labels)
      const id = student.id || student.studentId || "UnknownID";
      const name = student.name || student.fullName || "Student";
      
      // 2. Safe conversion of the Face Descriptor
      // Database might send a string, an array, or a Float32Array. We force it to Float32Array.
      let descriptorArray: Float32Array;
      
      try {
        const rawData = typeof student.faceData === 'string' ? JSON.parse(student.faceData) : (student.faceData || student.faceDescriptor);
        descriptorArray = new Float32Array(rawData);
      } catch (e) {
        console.error(`Face data error for student ${id}:`, e);
        // Provide an empty array so the matcher doesn't crash the whole app
        descriptorArray = new Float32Array(128); 
      }

      const label = `${id}:::${name}`;
      return new faceapi.LabeledFaceDescriptors(label, [descriptorArray]);
    });

    // 0.6 distance means the AI must be 40% sure it's you. 
    // If it's still failing, you can try 0.5 for more strictness or 0.7 for more leniency.
    return new faceapi.FaceMatcher(labeledDescriptors, 0.6);
  }
}