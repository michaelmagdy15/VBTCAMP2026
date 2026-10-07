import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import {
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Flashlight,
  FlashlightOff,
  Sparkles,
} from 'lucide-react';
import { verifyAndProcessQRCheckIn } from '../services/qrSessionService';
import { DEFAULT_COMMUNITY_ID } from '../firebase';

export default function QRScannerModal({
  isOpen,
  onClose,
  currentUserProfile,
  communityId = DEFAULT_COMMUNITY_ID,
}) {
  const [cameraError, setCameraError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameId = useRef(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Handle scanned data
  const handleQRCodeDetected = useCallback(async (rawString) => {
    stopCamera();
    setIsProcessing(true);

    try {
      const result = await verifyAndProcessQRCheckIn({
        rawQRData: rawString,
        member: currentUserProfile,
        expectedCommunityId: communityId,
      });

      setCheckInResult(result);

      if (result.success) {
        // Trigger celebratory confetti and haptic feedback
        try {
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } catch {}

        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#06b6d4', '#10b981', '#3b82f6', '#f59e0b'],
          });
        } catch {}
      }
    } catch (err) {
      setCheckInResult({
        success: false,
        message: err.message || 'Error processing check-in. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [stopCamera, currentUserProfile, communityId]);

  // Frame processing loop with jsQR
  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        // Detected a QR code
        handleQRCodeDetected(code.data);
        return; // Pause scanning while processing
      }
    }

    animationFrameId.current = requestAnimationFrame(tick);
  }, [handleQRCodeDetected]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCheckInResult(null);
    setIsProcessing(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your current browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      // Check for torch/flashlight support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorch(!!capabilities.torch);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        animationFrameId.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = 'Could not access device camera.';
      if (err.name === 'NotAllowedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser settings to scan.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera found on this device.';
      }
      setCameraError(msg);
    }
  }, [tick]);

  // Toggle flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch constraint error:', err);
      }
    }
  };

  // Start camera when modal opens, stop when closes
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Scan Attendance QR</h3>
              <p className="text-xs text-slate-400">Point at the projector or host screen</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasTorch && !checkInResult && (
              <button
                onClick={toggleTorch}
                className={`p-2 rounded-xl transition-colors border ${
                  torchOn
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Toggle Torch"
              >
                {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scanner Viewport or Result Screen */}
        <div className="relative p-6 flex flex-col items-center">
          {checkInResult ? (
            /* Result Feedback Card */
            <div className="w-full flex flex-col items-center text-center py-6 animate-fadeIn">
              {checkInResult.success ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10 animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Attendance Recorded
                  </div>
                  <h4 className="text-xl font-bold text-white mb-1">
                    {checkInResult.serviceTitle || 'Service Gathering'}
                  </h4>
                  <p className="text-sm text-slate-300 mb-6 max-w-xs leading-relaxed">
                    {checkInResult.message}
                  </p>
                  <div className="w-full p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 mb-6 text-left space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Member:</span>
                      <span className="font-semibold text-white">
                        {currentUserProfile?.displayName || 'Active Member'}
                      </span>
                    </div>
                    {currentUserProfile?.team && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Team:</span>
                        <span className="font-semibold text-cyan-400">
                          {currentUserProfile.team}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Status:</span>
                      <span className="font-semibold text-emerald-400">Present</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/20 transition-all"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Check-in Failed</h4>
                  <p className="text-sm text-rose-300/90 mb-6 max-w-xs leading-relaxed">
                    {checkInResult.message}
                  </p>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={startCamera}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-colors"
                    >
                      <RotateCw className="w-4 h-4" />
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        stopCamera();
                        onClose();
                      }}
                      className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : cameraError ? (
            /* Camera Permission or Hardware Error */
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-center text-rose-400 mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Camera Unavailable</h4>
              <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
                {cameraError}
              </p>
              <button
                onClick={startCamera}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-cyan-600/20"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
            </div>
          ) : (
            /* Active Camera Scanner Viewport */
            <div className="flex flex-col items-center w-full">
              <div className="relative w-full aspect-square max-w-[300px] rounded-3xl overflow-hidden bg-black border-2 border-slate-700 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Target Viewfinder Overlay */}
                <div className="absolute inset-8 border-2 border-cyan-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  {/* Animated scanning laser line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
                  <div className="w-full text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80 bg-slate-950/70 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      Align QR in frame
                    </span>
                  </div>
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                    <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
                    <span className="text-xs font-semibold text-slate-200">
                      Validating check-in...
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-4 text-xs text-slate-400 text-center max-w-xs">
                Scanning for live VBT QR code. Keep your camera steady.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
