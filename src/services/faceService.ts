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
   * FIXED: Uses .flatMap to skip invalid descriptors and enforces the 128-bit length requirement
   * This prevents the "euclideanDistance: arr1.length !== arr2.length" error.
   */
  static createFaceMatcher(students: Student[]) {
    const labeledDescriptors = students.flatMap(student => {
      // 1. Safe extraction of labels
      const id = student.id || student.studentId || "UnknownID";
      const name = student.name || student.fullName || "Student";
      
      let rawData = student.faceData || student.faceDescriptor;

      // 2. Parse if the database sent a string
      if (typeof rawData === 'string') {
        try {
          rawData = JSON.parse(rawData);
        } catch (e) {
          console.warn(`Skipping ${name}: Data is not a valid JSON string.`);
          return []; // Skip this student
        }
      }

      // 3. CRITICAL: Validate descriptor length
      // Face-api.js requires exactly 128 numbers. If we send anything else, it crashes.
      if (!Array.isArray(rawData) || rawData.length !== 128) {
        console.warn(`Skipping ${name}: Descriptor length is ${rawData?.length}, expected 128.`);
        return []; // Skip this student
      }

      // 4. Success: Convert to Float32Array and return as a single-item array for .flatMap
      try {
        const descriptorArray = new Float32Array(rawData);
        const label = `${id}:::${name}`;
        return [new faceapi.LabeledFaceDescriptors(label, [descriptorArray])];
      } catch (e) {
        console.error(`Error processing descriptor for ${name}:`, e);
        return []; // Skip this student
      }
    });

    // Fallback if NO students are valid (prevents empty matcher crash)
    if (labeledDescriptors.length === 0) {
      console.error("No valid student descriptors found in database.");
      return new faceapi.FaceMatcher([
        new faceapi.LabeledFaceDescriptors("none", [new Float32Array(128).fill(0)])
      ]);
    }

    return new faceapi.FaceMatcher(labeledDescriptors, 0.6);
  }
}