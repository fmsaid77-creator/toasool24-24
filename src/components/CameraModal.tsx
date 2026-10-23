import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Video,
  StopCircle,
  RefreshCw,
  X,
  Check,
  Upload,
  Sparkles,
  Smartphone,
  Image as ImageIcon,
  Sun,
  Flame,
  Palette,
} from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMedia: (dataUrl: string, type: 'image' | 'video', duration?: number, caption?: string) => void;
  initialMode?: 'photo' | 'video';
}

const POPULAR_FILTERS = [
  { id: 'none', name: 'أصلي', css: '' },
  { id: 'warm', name: 'شعبي دافئ', css: 'sepia(0.2) saturate(1.3) contrast(1.05)' },
  { id: 'vibrant', name: 'مشرق حيوي', css: 'saturate(1.5) contrast(1.1) brightness(1.05)' },
  { id: 'vintage', name: 'كلاسيكي', css: 'sepia(0.35) contrast(0.95) brightness(0.95)' },
  { id: 'cinematic', name: 'سينمائي', css: 'contrast(1.25) saturate(1.15) hue-rotate(-5deg)' },
  { id: 'bw', name: 'أبيض وأسود', css: 'grayscale(1) contrast(1.2)' },
];

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onSendMedia,
  initialMode = 'photo',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordSecondsRef = useRef<number>(0);
  const photoCameraInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'photo' | 'video'>(initialMode);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isLivePreviewActive, setIsLivePreviewActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [caption, setCaption] = useState('');
  const [capturedData, setCapturedData] = useState<{ url: string; type: 'image' | 'video'; duration?: number } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);

  // Automatic camera enablement on modal open without permission alerts
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setCaption('');
      setCapturedData(null);
      setSelectedFilter('none');
      // Automatic camera enablement
      handleStartLivePreview(facingMode);
    } else {
      cleanup();
    }
    return () => {
      cleanup();
    };
  }, [isOpen, initialMode]);

  const cleanup = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    stopCamera();
    setIsRecording(false);
    setRecordSeconds(0);
    recordSecondsRef.current = 0;
    setIsLivePreviewActive(false);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Live preview auto-start (no popups)
  const handleStartLivePreview = async (targetFacing?: 'user' | 'environment') => {
    stopCamera();
    const activeFacing = targetFacing || facingMode;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: activeFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: mode === 'video',
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setIsLivePreviewActive(true);
      } else {
        // Fallback directly to native device camera
        setIsLivePreviewActive(false);
      }
    } catch {
      // Quiet fallback without any popup dialog
      setIsLivePreviewActive(false);
    }
  };

  // Flip front / back camera
  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    handleStartLivePreview(nextFacing);
  };

  // Take photo from live stream with flash animation
  const takePhotoFromStream = () => {
    if (!videoRef.current) return;
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 720;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const activeFilter = POPULAR_FILTERS.find((f) => f.id === selectedFilter);
      if (activeFilter && activeFilter.css) {
        ctx.filter = activeFilter.css;
      }
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedData({ url: dataUrl, type: 'image' });
      stopCamera();
      setIsLivePreviewActive(false);
    }
  };

  // Direct native capture
  const triggerNativeCamera = () => {
    if (mode === 'photo') {
      photoCameraInputRef.current?.click();
    } else {
      videoCameraInputRef.current?.click();
    }
  };

  // Handle selected / captured file from camera or gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedData({
          url: reader.result,
          type: isVid ? 'video' : 'image',
          duration: isVid ? 10 : undefined,
        });
        stopCamera();
        setIsLivePreviewActive(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Start live stream video recording
  const startLiveVideoRecording = () => {
    if (!streamRef.current) {
      videoCameraInputRef.current?.click();
      return;
    }

    videoChunksRef.current = [];
    setRecordSeconds(0);
    recordSecondsRef.current = 0;
    setIsRecording(true);

    try {
      const mimeTypes = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      let selectedMime: string | undefined;
      for (const m of mimeTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(streamRef.current, selectedMime ? { mimeType: selectedMime } : {});
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: selectedMime || 'video/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setCapturedData({
              url: reader.result,
              type: 'video',
              duration: recordSecondsRef.current || 3,
            });
          }
        };
        reader.readAsDataURL(blob);
        stopCamera();
        setIsLivePreviewActive(false);
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;

      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch {
      videoCameraInputRef.current?.click();
      setIsRecording(false);
    }
  };

  const stopLiveVideoRecording = () => {
    setIsRecording(false);
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const handleConfirmSend = () => {
    if (capturedData) {
      onSendMedia(capturedData.url, capturedData.type, capturedData.duration, caption.trim() || undefined);
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentFilterObj = POPULAR_FILTERS.find((f) => f.id === selectedFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      {/* Hidden zero-permission native camera and gallery inputs */}
      <input
        ref={photoCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={videoCameraInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={mode === 'video' ? 'video/*' : 'image/*'}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-3 bg-slate-900/95 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMode('photo');
                if (isRecording) stopLiveVideoRecording();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                mode === 'photo' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              التقاط صورة
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('video');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                mode === 'video' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              تسجيل فيديو
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Filter Toggle */}
            {!capturedData && (
              <button
                type="button"
                onClick={() => setShowFilterPicker(!showFilterPicker)}
                className={`p-2 rounded-xl transition ${
                  selectedFilter !== 'none'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="الفلاتر الشعبية"
              >
                <Palette className="w-4 h-4" />
              </button>
            )}

            {/* Flip Camera */}
            {!capturedData && isLivePreviewActive && (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                title="تبديل الكاميرا (أمامية / خلفية)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden border-b border-slate-800">
          {/* Flash Effect */}
          {isFlashActive && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200" />}

          {capturedData ? (
            /* Preview of Captured/Selected Media */
            capturedData.type === 'image' ? (
              <img src={capturedData.url} alt="معاينة" className="w-full h-full object-contain bg-black" />
            ) : (
              <video src={capturedData.url} controls className="w-full h-full object-contain bg-black" autoPlay />
            )
          ) : isLivePreviewActive ? (
            /* Live Camera Stream with Filter */
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ filter: currentFilterObj?.css || 'none' }}
              className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />
          ) : (
            /* Fallback Quick Shutter Hub */
            <div className="p-6 text-center text-slate-300 flex flex-col items-center justify-center w-full h-full">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center mb-3 text-blue-400 shadow-inner">
                {mode === 'photo' ? <Camera className="w-8 h-8" /> : <Video className="w-8 h-8 text-rose-400" />}
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                {mode === 'photo' ? 'التقاط صورة تواصل 24' : 'تسجيل فيديو تواصل 24'}
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mb-4 leading-relaxed">
                جاهز للتصوير الفوري بجودة فائقة
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerNativeCamera}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>فتح الكاميرا الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>المعرض</span>
                </button>
              </div>
            </div>
          )}

          {/* Recording Timer Badge */}
          {isRecording && (
            <div className="absolute top-3 left-3 bg-rose-600/90 text-white text-xs px-3 py-1 rounded-full font-mono font-bold flex items-center gap-1.5 shadow-lg animate-pulse z-30">
              <span className="w-2 h-2 rounded-full bg-white" />
              00:{recordSeconds.toString().padStart(2, '0')}
            </div>
          )}

          {/* Current Filter Badge */}
          {!capturedData && selectedFilter !== 'none' && (
            <div className="absolute top-3 right-3 bg-purple-900/80 backdrop-blur-md text-purple-200 text-[10px] px-2.5 py-1 rounded-full font-bold border border-purple-500/30 z-30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-300" />
              <span>{currentFilterObj?.name}</span>
            </div>
          )}
        </div>

        {/* Filter Selection Drawer */}
        {!capturedData && showFilterPicker && (
          <div className="p-2.5 bg-slate-950/95 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            {POPULAR_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                  selectedFilter === f.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Shutter Controls & Preview Actions */}
        <div className="p-4 bg-slate-900 flex flex-col gap-3 shrink-0">
          {capturedData ? (
            /* Post-capture review & caption */
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="إضافة تعليق على الصورة أو الفيديو (اختياري)..."
                className="w-full px-3.5 py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition text-right"
              />
              <div className="flex items-center gap-2 justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setCapturedData(null);
                    handleStartLivePreview();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  إعادة التقاط
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSend}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 active:scale-95 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>إرسال في الدردشة</span>
                </button>
              </div>
            </div>
          ) : (
            /* Main Shutter & Capture Bar */
            <div className="flex items-center justify-between px-4">
              {/* Choose from Gallery */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="p-3 text-slate-400 hover:text-white rounded-2xl hover:bg-slate-800 transition flex flex-col items-center gap-1"
                title="اختيار من المعرض"
              >
                <ImageIcon className="w-5 h-5 text-purple-400" />
                <span className="text-[10px] font-medium text-slate-400">المعرض</span>
              </button>

              {/* Central Shutter Button */}
              {mode === 'photo' ? (
                <button
                  type="button"
                  onClick={isLivePreviewActive ? takePhotoFromStream : triggerNativeCamera}
                  className="w-16 h-16 rounded-full bg-white border-4 border-slate-700 flex items-center justify-center shadow-xl active:scale-90 transition group cursor-pointer hover:border-blue-500"
                  title="التقاط صورة"
                >
                  <div className="w-12 h-12 rounded-full bg-white group-hover:scale-95 transition-transform" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={
                    isRecording
                      ? stopLiveVideoRecording
                      : isLivePreviewActive
                      ? startLiveVideoRecording
                      : triggerNativeCamera
                  }
                  className={`w-16 h-16 rounded-full border-4 flex items-center justify-center shadow-xl active:scale-90 transition cursor-pointer ${
                    isRecording ? 'border-rose-500 bg-rose-600 animate-pulse' : 'border-slate-700 bg-rose-600 hover:border-rose-400'
                  }`}
                  title={isRecording ? 'إيقاف التسجيل' : 'بدء تسجيل الفيديو'}
                >
                  {isRecording ? (
                    <StopCircle className="w-8 h-8 text-white" />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-white" />
                  )}
                </button>
              )}

              {/* Direct Native Camera Shutter */}
              <button
                type="button"
                onClick={triggerNativeCamera}
                className="p-3 text-slate-400 hover:text-white rounded-2xl hover:bg-slate-800 transition flex flex-col items-center gap-1"
                title="كاميرا الهاتف الأصلية"
              >
                <Smartphone className="w-5 h-5 text-sky-400" />
                <span className="text-[10px] font-medium text-slate-400">الجهاز</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
