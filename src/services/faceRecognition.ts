import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export const loadModels = async () => {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
  ]);
};

export const getFaceDescriptor = async (videoElement: HTMLVideoElement) => {
  const detection = await faceapi.detectSingleFace(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection ? Array.from(detection.descriptor) : null;
};

export const createFaceMatcher = (students: any[]) => {
  const labeledDescriptors = students.map(student => {
    const descriptor = new Float32Array(JSON.parse(student.face_descriptor));
    return new faceapi.LabeledFaceDescriptors(student.id.toString(), [descriptor]);
  });
  return new faceapi.FaceMatcher(labeledDescriptors, 0.6);
};
