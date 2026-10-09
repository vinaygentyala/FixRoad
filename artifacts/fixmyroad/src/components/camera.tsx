import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, RefreshCw, SwitchCamera, X } from 'lucide-react';
import { Spinner } from './bits';

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

async function fileToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
  return downscale(dataUrl);
}

function downscale(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error('Could not read that image. Try a JPEG or PNG photo.'));
    img.src = dataUrl;
  });
}

export function PhotoCapture({ photo, onCapture, onClear }: { photo: string | null; onCapture: (dataUrl: string) => void; onClear: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    setError('');
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setError('Camera access was blocked. Allow camera permission, or upload a photo instead.');
    } finally {
      setStarting(false);
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    stopCamera();
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      onCapture(await fileToDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image.');
    }
  };

  if (photo) {
    return (
      <div className="photo-preview">
        <img src={photo} alt="Captured road damage" />
        <div className="photo-actions">
          <button type="button" className="btn btn-dark btn-sm" onClick={() => { onClear(); startCamera(); }}>
            <RefreshCw size={14} /> Retake
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClear} aria-label="Remove photo">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="camera-box">
        {cameraOn ? (
          <video ref={videoRef} playsInline muted aria-label="Live camera preview" />
        ) : (
          <div className="camera-hint">
            <Camera size={34} />
            <span>Point your camera at the pothole and capture a clear, close photo.</span>
          </div>
        )}
      </div>
      {error && <div className="form-error">{error}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {cameraOn ? (
          <button type="button" className="btn btn-primary" onClick={captureFrame}>
            <Camera size={16} /> Capture photo
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={startCamera} disabled={starting}>
            {starting ? <Spinner small /> : <SwitchCamera size={16} />} Open camera
          </button>
        )}
        {cameraOn && (
          <button type="button" className="btn btn-ghost" onClick={stopCamera}>
            Cancel
          </button>
        )}
        <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={16} /> Upload photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
