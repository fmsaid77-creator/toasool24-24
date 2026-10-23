import React, { useEffect, useState, useRef } from 'react';
import { ActiveCall } from '../types/tawasol';
import { SoundEffects } from '../utils/soundEffects';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  ShieldAlert,
  Video,
  VideoOff,
  Minimize2,
  Maximize2,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface VoiceCallModalProps {
  call: ActiveCall;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo?: () => void;
  onBlockCaller?: (number: string) => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  call,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onBlockCaller,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const ringCleanupRef = useRef<(() => void) | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const isVideo = call.callType === 'video';

  // Play ringing sound when in ringing state or incoming call
  useEffect(() => {
    if (call.status === 'ringing' || (call.isIncoming && call.status === 'calling')) {
      ringCleanupRef.current = SoundEffects.startRinging();
    } else {
      if (ringCleanupRef.current) {
        ringCleanupRef.current();
        ringCleanupRef.current = null;
      }
    }

    if (call.status === 'connected') {
      SoundEffects.playCallConnected();
    } else if (call.status === 'ended') {
      SoundEffects.playCallEnded();
    }

    return () => {
      if (ringCleanupRef.current) {
        ringCleanupRef.current();
      }
    };
  }, [call.status, call.isIncoming]);

  // Call timer when connected
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (call.status === 'connected') {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [call.status]);

  // Video call stream initialization for local preview
  useEffect(() => {
    if (isVideo && (call.status === 'connected' || !call.isIncoming)) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({
            video: { facingMode },
            audio: false,
          })
          .then((stream) => {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.play().catch(() => {});
            }
          })
          .catch((err) => {
            console.warn('Local video preview unavailable:', err);
          });
      }
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [isVideo, call.status, facingMode]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Minimized Floating Pill View (lets user navigate anywhere in the app!)
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 left-4 z-50 bg-slate-900 border border-blue-500/50 rounded-2xl shadow-2xl p-2.5 flex items-center gap-3 backdrop-blur-lg animate-in slide-in-from-bottom-4">
        <div className="relative">
          <img
            src={call.peerAvatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
            alt={call.peerName}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500"
          />
          {isVideo && (
            <span className="absolute -top-1 -right-1 bg-blue-600 p-0.5 rounded-full text-white text-[9px]">
              <Video className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        <div className="text-right cursor-pointer" onClick={() => setIsMinimized(false)}>
          <span className="text-xs font-bold text-white block truncate max-w-[120px]">{call.peerName}</span>
          <span className="text-[10px] text-emerald-400 font-mono">
            {call.status === 'connected' ? formatDuration(seconds) : 'جاري الاتصال...'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2">
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-2 rounded-xl transition ${
              call.isMuted ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'
            }`}
            title="كتم الصوت"
          >
            {call.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onEnd}
            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition"
            title="إنهاء"
          >
            <PhoneOff className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            title="تكبير الشاشة"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-lg">
      <div className={`relative w-full ${isVideo ? 'max-w-md sm:max-w-lg' : 'max-w-sm'} bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 text-center text-white shadow-2xl flex flex-col items-center justify-between min-h-[500px] transition-all`}>
        {/* Top Header & Minimize Button */}
        <div className="w-full relative">
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
              {isVideo ? (
                <>
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  <span>اتصال مباشر (فيديو عالي الدقة)</span>
                </>
              ) : (
                <>
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>مكالمة صوتية مشفرة عبر تواصل 24</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition"
              title="تصغير المكالمة ومتابعة التصفح"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-white truncate px-2">{call.peerName}</h3>
          <p className="text-sm font-mono text-blue-400 tracking-wider mt-0.5">
            رقم تواصل: {call.peerNumber}
          </p>

          <p className="text-xs text-slate-400 mt-2">
            {call.status === 'calling' && (call.isIncoming ? 'مكالمة واردة...' : 'جاري الاتصال...')}
            {call.status === 'ringing' && 'رنين عند الطرف الآخر...'}
            {call.status === 'connected' && `متصل (${formatDuration(seconds)})`}
            {call.status === 'ended' && 'تم إنهاء المكالمة'}
          </p>

          <a
            href={`/call?partner=${encodeURIComponent(call.peerNumber)}&type=${isVideo ? 'video' : 'audio'}&auto=true`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium hover:bg-emerald-500/25 transition shadow-sm"
            title="فتح منصة WebRTC السحابية المباشرة"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>تشغيل عبر شبكة WebRTC السحابية المباشرة ⚡</span>
          </a>
        </div>

        {/* Center Visual (Video Feeds OR Audio Pulsing Avatar) */}
        {isVideo && call.status === 'connected' ? (
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl my-4">
            {/* Peer Video (Simulated Feed or Peer Stream) */}
            <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-br from-slate-900 to-slate-950">
              <img
                src={call.peerAvatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
                alt={call.peerName}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-500/30 mb-3"
              />
              <span className="text-xs font-semibold text-slate-300">{call.peerName}</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                البث المباشر نشط ومستقر
              </span>
            </div>

            {/* Local Video Pip (User's Camera) */}
            <div className="absolute bottom-3 left-3 w-28 h-36 rounded-xl overflow-hidden border-2 border-blue-500 shadow-xl bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="absolute top-1 right-1 p-1 bg-black/60 rounded-md text-white hover:bg-black/90"
                title="تبديل الكاميرا"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          /* Center Pulsing Avatar for Audio / Ringing */
          <div className="relative my-6 flex items-center justify-center">
            {call.status !== 'ended' && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-blue-500/10 animate-ping opacity-75" />
                <div className="absolute w-44 h-44 rounded-full bg-blue-500/5 animate-pulse" />
              </>
            )}

            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-blue-500/40 shadow-2xl z-10 bg-slate-800">
              <img
                src={call.peerAvatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
                alt={call.peerName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Bottom Call Controls */}
        <div className="w-full">
          {call.isIncoming && call.status === 'calling' ? (
            /* Incoming Call Controls: Accept or Decline */
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-8">
                {/* Decline Button */}
                <button
                  type="button"
                  onClick={onDecline}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-600/30 group-active:scale-95 transition">
                    <PhoneOff className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-rose-400">رفض</span>
                </button>

                {/* Accept Button */}
                <button
                  type="button"
                  onClick={onAccept}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-600/30 group-active:scale-95 transition animate-bounce">
                    {isVideo ? <Video className="w-7 h-7 text-white" /> : <Phone className="w-7 h-7 text-white" />}
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    {isVideo ? 'قبول الفيديو' : 'قبول'}
                  </span>
                </button>
              </div>

              {onBlockCaller && (
                <button
                  type="button"
                  onClick={() => onBlockCaller(call.peerNumber)}
                  className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center justify-center gap-1 mx-auto transition"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  رفض وحظر هذا الرقم نهائياً
                </button>
              )}
            </div>
          ) : (
            /* Active / Outgoing Call Controls */
            <div className="flex items-center justify-center gap-4 sm:gap-6 overflow-x-auto touch-pan-x no-scrollbar py-1">
              {/* Mute Button */}
              <button
                type="button"
                onClick={onToggleMute}
                className={`p-3.5 rounded-2xl border transition ${
                  call.isMuted
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                title={call.isMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون'}
              >
                {call.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video Toggle if video call */}
              {isVideo && onToggleVideo && (
                <button
                  type="button"
                  onClick={onToggleVideo}
                  className={`p-3.5 rounded-2xl border transition ${
                    call.isVideoMuted
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={call.isVideoMuted ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
                >
                  {call.isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}

              {/* End Call Button */}
              <button
                type="button"
                onClick={onEnd}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition"
                title="إنهاء المكالمة"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>

              {/* Speaker Toggle */}
              <button
                type="button"
                className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition"
                title="مكبر الصوت"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
