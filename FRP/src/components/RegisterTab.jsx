import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import Webcam from 'react-webcam';
import { HiOutlineCamera, HiOutlineRefresh, HiOutlineCheck, HiOutlineExclamationCircle } from 'react-icons/hi';

const RegisterTab = ({ onRegister }) => {
    const [name, setName] = useState('');
    const [capturedImage, setCapturedImage] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const webcamRef = useRef(null);
    const maxRetries = 3;

    const videoConstraints = {
        width: 1280,
        height: 720,
        facingMode: 'user',
    };

    // Function to attempt backend request with retry logic
    const attemptBackendRequest = async (data, retriesLeft = maxRetries) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

        try {
            console.log('Sending request with payload:', data); // Debug payload
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
            }

            return await response.json();
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (retriesLeft > 0) {
                console.log(`Retrying backend request... (${maxRetries - retriesLeft + 1}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
                return attemptBackendRequest(data, retriesLeft - 1);
            }
            throw fetchError;
        }
    };

    // Sync localStorage data with backend on component mount or when retry is triggered
    const syncLocalData = async () => {
        const existingRegistrations = JSON.parse(localStorage.getItem('registeredFaces')) || [];
        if (existingRegistrations.length === 0) return;

        setIsSyncing(true);
        setError(null);

        for (let i = 0; i < existingRegistrations.length; i++) {
            const registrationData = existingRegistrations[i];
            try {
                const result = await attemptBackendRequest(registrationData);
                console.log('Synced local data to backend:', result);

                // Pass to parent component
                onRegister({ ...registrationData, image: `data:image/jpeg;base64,${registrationData.image}` });

                // Remove the successfully synced item
                existingRegistrations.splice(i, 1);
                localStorage.setItem('registeredFaces', JSON.stringify(existingRegistrations));
                i--; // Adjust index after removal
            } catch (syncError) {
                console.error('Failed to sync local data:', syncError);
                setError('Failed to sync local data with backend. Please check the server and MongoDB connection.');
                setIsSyncing(false);
                return; // Stop syncing if one fails; retry later
            }
        }

        setIsSyncing(false);
        // Clear localStorage after successful sync
        localStorage.removeItem('registeredFaces');
    };

    // Initial sync on component mount
    useEffect(() => {
        syncLocalData();
    }, [onRegister]);

    const handleCapture = useCallback(() => {
        setIsCapturing(true);
        setError(null);
        setTimeout(() => {
            const imageSrc = webcamRef.current?.getScreenshot();
            if (imageSrc) {
                setCapturedImage(imageSrc);
            } else {
                setError('Failed to capture image. Please try again.');
            }
            setIsCapturing(false);
        }, 500);
    }, [webcamRef]);

    const handleRetake = () => {
        setCapturedImage(null);
        setRegistrationSuccess(false);
        setError(null);
        setRetryCount(0);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('Please provide a valid name.');
            return;
        }
        if (!capturedImage) {
            setError('Please capture an image.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setRetryCount(0);

        try {
            // Prepare registration data (simplified to match backend expectations)
            const registrationData = {
                name: name.trim(),
                image: capturedImage.split(',')[1], // Send raw base64 string
            };

            try {
                const result = await attemptBackendRequest(registrationData);
                console.log('Registration successful:', result);
            } catch (fetchError) {
                console.error('Fetch error:', fetchError);
                // Fallback to localStorage if backend fails
                const existingRegistrations = JSON.parse(localStorage.getItem('registeredFaces')) || [];
                existingRegistrations.push(registrationData);
                localStorage.setItem('registeredFaces', JSON.stringify(existingRegistrations));
                console.log('Stored in localStorage as fallback:', registrationData);
                setError('Backend unavailable. Data stored locally and will sync later.');
                setRetryCount(maxRetries);
            }

            // Pass data to parent component via onRegister callback
            onRegister({ ...registrationData, image: capturedImage });

            // Show success feedback
            setRegistrationSuccess(true);
            setTimeout(() => {
                setName('');
                setCapturedImage(null);
                setRegistrationSuccess(false);
            }, 2000);
        } catch (error) {
            setError('Failed to register face. Ensure the backend server is running and MongoDB is connected.');
            console.error('Error registering face:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRetrySync = () => {
        syncLocalData();
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Register New Face</h2>
                <p className="text-slate-400">
                    Register a new face to the recognition database for real-time identification.
                </p>
            </div>

            {error && (
                <motion.div
                    className="bg-red-500/20 text-red-400 p-4 rounded-lg mb-6 flex items-center justify-between"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <span>{error}</span>
                    {retryCount > 0 && (
                        <button
                            onClick={handleRetrySync}
                            className="btn-ghost flex items-center text-sm"
                            disabled={isSyncing}
                        >
                            <HiOutlineExclamationCircle className="mr-2" />
                            {isSyncing ? 'Retrying...' : 'Retry Sync'}
                        </button>
                    )}
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    className="glass-card overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="p-4 border-b border-slate-700/50">
                        <h3 className="text-lg font-medium flex items-center">
                            <span className="w-2 h-2 rounded-full bg-primary-400 mr-2 animate-pulse-slow"></span>
                            Camera Feed
                        </h3>
                    </div>

                    <div className="relative aspect-video overflow-hidden bg-slate-800 flex items-center justify-center">
                        {capturedImage ? (
                            <img
                                src={capturedImage}
                                alt="Captured face"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={videoConstraints}
                                className="w-full h-full object-cover"
                            />
                        )}

                        {isCapturing && (
                            <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1.5, opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="w-32 h-32 rounded-full border-2 border-white"
                                ></motion.div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 flex justify-between">
                        {capturedImage ? (
                            <button
                                onClick={handleRetake}
                                className="btn-ghost flex items-center"
                            >
                                <HiOutlineRefresh className="mr-2" />
                                Retake
                            </button>
                        ) : (
                            <button
                                onClick={handleCapture}
                                className="btn-primary flex items-center"
                                disabled={isCapturing}
                            >
                                <HiOutlineCamera className="mr-2" />
                                {isCapturing ? 'Capturing...' : 'Capture Face'}
                            </button>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    className="glass-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="p-4 border-b border-slate-700/50">
                        <h3 className="text-lg font-medium">Register Details</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="glass-input w-full"
                                placeholder="Enter person's name"
                            />
                        </div>

                        {capturedImage && (
                            <motion.div
                                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                            >
                                <div className="flex items-center">
                                    <div className="w-16 h-16 rounded-full overflow-hidden mr-4">
                                        <img
                                            src={capturedImage}
                                            alt="Face preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-mono text-sm text-slate-300">IDENTITY PREVIEW</h4>
                                        <p className="text-lg font-medium">{name || 'Unnamed Person'}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div className="pt-4">
                            <button
                                onClick={handleSubmit}
                                disabled={!name.trim() || !capturedImage || isSubmitting}
                                className={`btn w-full ${registrationSuccess ? 'bg-green-500' : 'btn-secondary'}`}
                            >
                                {isSubmitting ? (
                                    'Processing...'
                                ) : registrationSuccess ? (
                                    <span className="flex items-center justify-center">
                                        <HiOutlineCheck className="mr-2" />
                                        Registration Complete!
                                    </span>
                                ) : (
                                    'Register Face'
                                )}
                            </button>
                        </div>

                        <p className="text-xs text-center text-slate-500 mt-4">
                            By registering, you confirm consent to store facial biometric data
                            in accordance with our privacy policy.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default RegisterTab;