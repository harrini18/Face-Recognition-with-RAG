import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Webcam from 'react-webcam';
import { HiOutlineStatusOnline, HiOutlineUserGroup, HiOutlineLightningBolt, HiOutlineShieldCheck } from 'react-icons/hi';

const LiveTab = ({ registeredFaces }) => {
    const webcamRef = useRef(null);
    const [detections, setDetections] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [webcamError, setWebcamError] = useState(null);
    const [backendError, setBackendError] = useState(null);
    const [isWebcamReady, setIsWebcamReady] = useState(false);

    useEffect(() => {
        const checkBackend = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/health', {  // Changed to /api/health
                    method: 'GET',
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log('Backend health check response:', data);
                    setIsConnected(true);
                    setConnectionStatus('connected');
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Backend not reachable');
                }
            } catch (error) {
                console.error('Backend connection failed:', error);
                setBackendError('Backend connection failed: ' + error.message);
                setConnectionStatus('error');
            }
        };

        setConnectionStatus('connecting');
        const connectionTimer = setTimeout(() => {
            checkBackend();
        }, 1500);

        return () => clearTimeout(connectionTimer);
    }, []);

    const handleWebcamError = (error) => {
        console.error('Webcam error:', error);
        setWebcamError('Failed to access webcam. Please ensure permissions are granted and the device is supported.');
        setConnectionStatus('error');
    };

    const handleWebcamUserMedia = () => {
        console.log('Webcam initialized successfully');
        setIsWebcamReady(true);
    };

    useEffect(() => {
        if (!isConnected || isAnalyzing || webcamError || !isWebcamReady) return;

        const interval = setInterval(async () => {
            if (!webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) {
                console.warn('Webcam not ready for screenshot in real-time loop.');
                return;
            }

            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) {
                console.warn('Failed to capture webcam screenshot in real-time loop.');
                return;
            }

            try {
                const response = await fetch('http://localhost:5000/api/recognize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image: imageSrc.split(',')[1],
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Real-time recognition response:', data);  // Added logging
                const newDetections = (data.faces || []).map((face, index) => ({
                    id: index + 1,
                    name: face.name || 'Unknown',
                    confidence: face.confidence || 0,
                    accepted: face.accepted || false,
                    bbox: {
                        x: Math.max(0, Math.min(face.bounding_box.x, 1)),
                        y: Math.max(0, Math.min(face.bounding_box.y, 1)),
                        width: Math.max(0, Math.min(face.bounding_box.width, 1)),
                        height: Math.max(0, Math.min(face.bounding_box.height, 1)),
                    },
                }));
                setDetections(newDetections);
                setConnectionStatus('connected');
                setBackendError(null);
            } catch (error) {
                console.error('Error in real-time face recognition:', error);
                setBackendError('Real-time recognition failed: ' + error.message);
                setConnectionStatus('error');
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [isConnected, isAnalyzing, webcamError, isWebcamReady]);

    const handleAnalyzeClick = async () => {
        if (!webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) {
            console.warn('Webcam not ready for screenshot in analyze click.');
            setBackendError('Webcam not ready for analysis.');
            setConnectionStatus('error');
            return;
        }

        setIsAnalyzing(true);
        setConnectionStatus('analyzing');
        setDetections([]);
        setBackendError(null);

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            console.warn('Failed to capture webcam screenshot in analyze click.');
            setIsAnalyzing(false);
            setBackendError('Failed to capture webcam screenshot.');
            setConnectionStatus(isConnected ? 'connected' : 'error');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageSrc.split(',')[1] }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Analyze click recognition response:', data);  // Added logging
            const newDetections = (data.faces || []).map((face, index) => ({
                id: index + 1,
                name: face.name || 'Unknown',
                confidence: face.confidence || 0,
                accepted: face.accepted || false,
                bbox: {
                    x: Math.max(0, Math.min(face.bounding_box.x, 1)),
                    y: Math.max(0, Math.min(face.bounding_box.y, 1)),
                    width: Math.max(0, Math.min(face.bounding_box.width, 1)),
                    height: Math.max(0, Math.min(face.bounding_box.height, 1)),
                },
            }));
            setDetections(newDetections);
            setConnectionStatus('connected');
            setBackendError(null);
        } catch (error) {
            console.error('Error in analyze click face recognition:', error);
            setBackendError('Face recognition failed: ' + error.message);
            setConnectionStatus('error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const videoConstraints = {
        width: 1280,
        height: 720,
        facingMode: 'user',
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Live Recognition</h2>
                    <p className="text-slate-400">
                        Real-time facial recognition with bounding boxes and identity matching.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                    <div className="glass-card px-4 py-2 flex items-center">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                connectionStatus === 'connected'
                                    ? 'bg-green-500'
                                    : connectionStatus === 'error'
                                    ? 'bg-red-500'
                                    : connectionStatus === 'analyzing'
                                    ? 'bg-blue-500 animate-pulse'
                                    : 'bg-yellow-500 animate-pulse'
                            } mr-2`}
                        ></span>
                        <span className="text-sm font-mono">
                            {connectionStatus === 'connected'
                                ? 'CONNECTED'
                                : connectionStatus === 'error'
                                ? (webcamError || backendError || 'ERROR')
                                : connectionStatus === 'analyzing'
                                ? 'ANALYZING...'
                                : 'CONNECTING...'}
                        </span>
                    </div>
                    <button
                        onClick={handleAnalyzeClick}
                        disabled={isAnalyzing || !isConnected || webcamError || !isWebcamReady}
                        className={`btn-primary px-4 py-2 rounded font-semibold ${
                            isAnalyzing || !isConnected || webcamError || !isWebcamReady ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'
                        }`}
                    >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    className="glass-card col-span-1 lg:col-span-2 overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                        <h3 className="text-lg font-medium flex items-center">
                            <HiOutlineStatusOnline className="mr-2 text-primary-400" />
                            Live Feed
                        </h3>
                        <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded">FPS: 30</span>
                    </div>

                    <div className="relative aspect-video bg-slate-800 flex items-center justify-center">
                        {webcamError ? (
                            <div className="text-red-400 text-center">{webcamError}</div>
                        ) : (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={videoConstraints}
                                onUserMediaError={handleWebcamError}
                                onUserMedia={handleWebcamUserMedia}
                                className="w-full h-full object-cover"
                            />
                        )}

                        {detections.map((detection) => (
                            <div
                                key={detection.id}
                                style={{
                                    position: 'absolute',
                                    left: `${detection.bbox.x * 100}%`,
                                    top: `${detection.bbox.y * 100}%`,
                                    width: `${detection.bbox.width * 100}%`,
                                    height: `${detection.bbox.height * 100}%`,
                                    border: '2px solid',
                                    borderColor: detection.confidence > 0.95 ? '#10b981' : '#f59e0b',
                                    boxShadow: '0 0 0 rgba(255, 255, 255, 0.4)',
                                    animation: 'pulse 2s infinite',
                                    borderRadius: '4px',
                                    transition: 'all 0.5s ease-out',
                                }}
                            >
                                <div className="absolute -bottom-10 -left-1 bg-slate-800/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-mono">
                                    <div className="font-medium text-white">{detection.name}</div>
                                    <div className="text-primary-400">{(detection.confidence * 100).toFixed(1)}%</div>
                                    <div className={`text-xs ${detection.accepted ? 'text-green-400' : 'text-red-400'}`}>
                                        {detection.accepted ? 'Accepted' : 'Not Accepted'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    className="glass-card flex flex-col"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="p-4 border-b border-slate-700/50">
                        <h3 className="text-lg font-medium">Recognition Dashboard</h3>
                    </div>

                    <div className="flex-grow p-4 flex flex-col space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="glass-card p-3">
                                <div className="text-sm text-slate-400 mb-1 flex items-center">
                                    <HiOutlineUserGroup className="mr-1" />
                                    Recognized
                                </div>
                                <div className="text-2xl font-bold">{detections.length}</div>
                            </div>
                            <div className="glass-card p-3">
                                <div className="text-sm text-slate-400 mb-1 flex items-center">
                                    <HiOutlineLightningBolt className="mr-1" />
                                    Avg. Confidence
                                </div>
                                <div className="text-2xl font-bold">
                                    {detections.length
                                        ? `${(
                                              (detections.reduce((acc, d) => acc + d.confidence, 0) /
                                                  detections.length) *
                                              100
                                          ).toFixed(0)}%`
                                        : 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div className="flex-grow overflow-auto">
                            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
                                <HiOutlineShieldCheck className="mr-2" />
                                Recent Identifications
                            </h4>

                            <div className="space-y-3">
                                {detections.length ? (
                                    detections.map((detection) => (
                                        <motion.div
                                            key={detection.id}
                                            className="glass-card p-3 flex items-center"
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-700 mr-3 overflow-hidden flex-shrink-0">
                                                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-secondary-500"></div>
                                            </div>
                                            <div>
                                                <div className="font-medium">{detection.name}</div>
                                                <div className="text-xs text-slate-400 flex items-center">
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                                            detection.confidence > 0.95 ? 'bg-green-500' : 'bg-yellow-500'
                                                        }`}
                                                    ></span>
                                                    Match: {(detection.confidence * 100).toFixed(1)}%
                                                </div>
                                                <div className={`text-xs ${detection.accepted ? 'text-green-400' : 'text-red-400'}`}>
                                                    {detection.accepted ? 'Accepted' : 'Not Accepted'}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="text-center text-slate-500 py-6">No faces detected</div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default LiveTab;