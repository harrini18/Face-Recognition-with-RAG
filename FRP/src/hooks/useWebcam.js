import { useState, useCallback, useRef } from 'react';

const useWebcam = () => {
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  
  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } 
      });
      
      streamRef.current = stream;
      setIsPermissionGranted(true);
      setIsLoading(false);
      
      return stream;
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError(err.message || 'Could not access webcam');
      setIsLoading(false);
      setIsPermissionGranted(false);
      
      return null;
    }
  }, []);
  
  const releaseCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);
  
  const captureImage = useCallback((videoElement) => {
    if (!videoElement) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    
    return canvas.toDataURL('image/jpeg');
  }, []);
  
  return {
    isPermissionGranted,
    isLoading,
    error,
    requestPermission,
    releaseCamera,
    captureImage,
    stream: streamRef.current
  };
};

export default useWebcam;