import React, { useState, useEffect } from 'react';
import { StoryStatus } from '../types/tawasol';
import { X, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';

interface StatusViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: StoryStatus[];
  initialIndex?: number;
  currentUserNumber: string;
  onDeleteStory?: (id: string) => void;
}

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  isOpen,
  onClose,
  stories,
  initialIndex = 0,
  currentUserNumber,
  onDeleteStory,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen || stories.length === 0) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2; // ~5 seconds per story
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isOpen, stories.length]);

  if (!isOpen || stories.length === 0) return null;

  const currentStory = stories[currentIndex] || stories[0];
  const isMine = currentStory.userNumber === currentUserNumber;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const formatStoryTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    return `منذ ${hours} ساعة`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-slate-950">
        {/* Top Progress Bars */}
        <div className="absolute top-0 inset-x-0 p-3 pt-4 z-30 flex items-center gap-1.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story User Header */}
        <div className="absolute top-6 inset-x-0 p-4 z-30 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <img
              src={currentStory.userAvatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
              alt={currentStory.userName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500 shadow-md"
            />
            <div className="text-right">
              <span className="font-bold text-sm block leading-tight drop-shadow">{currentStory.userName}</span>
              <span className="text-[11px] text-white/80 font-mono drop-shadow">
                {formatStoryTime(currentStory.timestamp)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMine && onDeleteStory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('هل تريد حذف هذه الحالة؟')) {
                    onDeleteStory(currentStory.id);
                    if (stories.length <= 1) {
                      onClose();
                    } else if (currentIndex > 0) {
                      setCurrentIndex(currentIndex - 1);
                    }
                  }
                }}
                className="p-2 text-rose-400 hover:text-rose-300 rounded-full bg-black/40 backdrop-blur transition"
                title="حذف حالتي"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white rounded-full bg-black/40 backdrop-blur transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Story Canvas Body */}
        <div className="flex-1 flex items-center justify-center relative min-h-[460px] sm:aspect-[9/16] select-none">
          {currentStory.mediaType === 'image' && currentStory.mediaUrl ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <img
                src={currentStory.mediaUrl}
                alt="حالة"
                className="w-full h-full object-contain"
              />
              {currentStory.text && (
                <div className="absolute bottom-6 inset-x-4 p-3 rounded-2xl bg-black/60 backdrop-blur text-white text-center text-sm font-medium">
                  {currentStory.text}
                </div>
              )}
            </div>
          ) : currentStory.mediaType === 'video' && currentStory.mediaUrl ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <video
                src={currentStory.mediaUrl}
                autoPlay
                controls
                playsInline
                className="w-full h-full object-contain"
              />
              {currentStory.text && (
                <div className="absolute bottom-6 inset-x-4 p-3 rounded-2xl bg-black/60 backdrop-blur text-white text-center text-sm font-medium">
                  {currentStory.text}
                </div>
              )}
            </div>
          ) : (
            /* Text Story Canvas */
            <div
              className={`w-full h-full flex items-center justify-center p-8 text-center text-white ${
                currentStory.backgroundColor || 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500'
              }`}
            >
              <p className="text-xl sm:text-2xl font-bold leading-relaxed drop-shadow-lg max-w-sm">
                {currentStory.text}
              </p>
            </div>
          )}

          {/* Navigation Tap Zones */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white/70 hover:text-white disabled:opacity-0 transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white/70 hover:text-white transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
