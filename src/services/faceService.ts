import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export class FaceService {
  private static isLoaded = false;

  static async loadModels() {
    if (this.isLoaded) return;
    
    try {
      console.log('Loading face models from:', MODEL_URL);
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

  static async getFaceDescriptor(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
    const detection = await faceapi
      .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.1 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return detection ? detection.descriptor : null;
  }

  static async detectFaces(videoElement: HTMLVideoElement) {
    return await faceapi
      .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.1 }))
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions();
  }

  static createFaceMatcher(students: { id: string; name: string; faceDescriptor: number[] }[]) {
    const labeledDescriptors = students.map(student => {
      const descriptor = new Float32Array(student.faceDescriptor);
      const label = `${student.id}:::${student.name}`;
      return new faceapi.LabeledFaceDescriptors(label, [descriptor]);
    });

    return new faceapi.FaceMatcher(labeledDescriptors, 0.6);
  }
}
