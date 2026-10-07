import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Maximize2,
  Minimize2,
  Users,
  Clock,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  StopCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  createQRSession,
  rotateSessionToken,
  endQRSession,
  encodeQRData,
  DEFAULT_TOKEN_TTL_SECONDS,
} from '../services/qrSessionService';
import { subscribeToServiceAttendance } from '../services/attendanceService';
import { DEFAULT_COMMUNITY_ID } from '../firebase';

export default function QRAttendanceHostModal({
  isOpen,
  onClose,
  service,
  currentUser,
  onOpenRoster,
  communityId = DEFAULT_COMMUNITY_ID,
}) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(DEFAULT_TOKEN_TTL_SECONDS);
  const [attendees, setAttendees] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalContainerRef = useRef(null);

  // Initialize or resume QR session
  useEffect(() => {
    if (!isOpen || !service) {
      setSession(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function initSession() {
      try {
        const newSession = await createQRSession({
          communityId,
          serviceId: service.id,
          serviceTitle: service.title || 'VBT Gathering',
          serviceDate: service.date,
          hostUid: currentUser?.uid || currentUser?.id || 'host_leader',
          hostName: currentUser?.displayName || currentUser?.name || 'Leader',
          tokenTtlSeconds: DEFAULT_TOKEN_TTL_SECONDS,
        });

        if (isMounted) {
          setSession(newSession);
          setSecondsRemaining(DEFAULT_TOKEN_TTL_SECONDS);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to init QR session:', err);
        if (isMounted) {
          setError(err.message || 'Could not initialize QR check-in session');
          setLoading(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [isOpen, service, currentUser, communityId]);

  // Rotate token callback
  const handleRotateToken = useCallback(async () => {
    if (!session?.id) return;
    try {
      const newToken = await rotateSessionToken(
        communityId,
        session.id,
        session.activeToken
      );
      setSession((prev) =>
        prev
          ? {
              ...prev,
              previousToken: prev.activeToken,
              activeToken: newToken,
            }
          : null
      );
      setSecondsRemaining(DEFAULT_TOKEN_TTL_SECONDS);
    } catch (err) {
      console.error('Failed to rotate token:', err);
    }
  }, [communityId, session?.id, session?.activeToken]);

  // Countdown timer & auto-rotate
  useEffect(() => {
    if (!session || session.status === 'ended') return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleRotateToken();
          return DEFAULT_TOKEN_TTL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, handleRotateToken]);

  // Real-time attendance subscription
  useEffect(() => {
    if (!service?.id) return;
    const unsubscribe = subscribeToServiceAttendance(communityId, service.id, (list) => {
      setAttendees(list);
    });
    return () => unsubscribe();
  }, [communityId, service?.id]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Close & end session
  const handleEndAndClose = async () => {
    if (session?.id) {
      try {
        await endQRSession(communityId, session.id);
      } catch (err) {
        console.error('Error ending session:', err);
      }
    }
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    onClose();
  };

  if (!isOpen || !service) return null;

  const qrDataString = session?.activeToken
    ? encodeQRData({
        communityId,
        sessionId: session.id,
        serviceId: service.id,
        token: session.activeToken,
      })
    : '';

  const progressPercent = ((DEFAULT_TOKEN_TTL_SECONDS - secondsRemaining) / DEFAULT_TOKEN_TTL_SECONDS) * 100;

  return (
    <div
      ref={modalContainerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Live QR Check-in
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
                {service.title || 'VBT Weekly Service'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={handleEndAndClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-400 transition-colors border border-slate-700 hover:border-rose-800"
              title="Close and End Check-in"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split into QR Code and Live Roster Ticker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Left Column: QR Code Display */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <RotateCw className="w-10 h-10 text-cyan-400 animate-spin" />
                <p className="text-slate-400 font-medium">Generating secure QR session...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 p-6 text-center bg-rose-950/30 border border-rose-800/60 rounded-2xl text-rose-300">
                <AlertTriangle className="w-8 h-8 text-rose-400" />
                <p className="font-semibold">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 mt-2 bg-rose-700 hover:bg-rose-600 rounded-xl text-white text-sm font-semibold transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full max-w-sm">
                {/* QR Card */}
                <div className="relative p-5 bg-white rounded-3xl shadow-2xl border-4 border-cyan-500/30 w-full flex flex-col items-center">
                  <QRCodeSVG
                    value={qrDataString}
                    size={280}
                    level="Q"
                    includeMargin={false}
                    className="w-full h-auto max-w-[260px] sm:max-w-[280px]"
                  />
                  <div className="mt-3 flex items-center gap-2 text-slate-800 font-semibold text-xs tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Scan with VBT Community App
                  </div>
                </div>

                {/* Progress bar indicating next code rotation */}
                <div className="w-full mt-6 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Rotating code for security
                    </span>
                    <span className="font-mono font-medium text-cyan-300">
                      {secondsRemaining}s
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${100 - progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Session Details */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
                    Date: {service.date || 'Today'}
                  </span>
                  {service.location && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
                      {service.location}
                    </span>
                  )}
                  <button
                    onClick={handleRotateToken}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                    title="Force rotate code now"
                  >
                    <RotateCw className="w-3 h-3" />
                    Rotate Now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Attendee Stream */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between bg-slate-900/60 overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">Checked In</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-sm font-bold">
                    {attendees.length} Present
                  </span>
                </div>
              </div>

              {/* Attendee Roster List */}
              <div className="mt-4 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {attendees.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">Waiting for members to scan...</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Check-ins will appear live here as people scan.
                    </p>
                  </div>
                ) : (
                  attendees.map((attendee) => (
                    <div
                      key={attendee.id || attendee.memberId}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 animate-fadeIn"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-sm text-white shadow">
                          {attendee.avatar ? (
                            <img
                              src={attendee.avatar}
                              alt=""
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            attendee.displayName?.[0]?.toUpperCase() || 'M'
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight">
                            {attendee.displayName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-400 capitalize">
                              {attendee.memberRole || 'member'}
                            </span>
                            {attendee.team && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-[11px] text-cyan-400 font-medium">
                                  {attendee.team}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>In</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between gap-3">
              {onOpenRoster && (
                <button
                  onClick={() => {
                    onOpenRoster(service);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors border border-slate-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  Manage Roster / Manual Entry
                </button>
              )}
              <button
                onClick={handleEndAndClose}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
