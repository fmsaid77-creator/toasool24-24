import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceNotePlayerProps {
  mediaUrl?: string;
  duration?: number;
  isSender: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  mediaUrl,
  duration = 5,
  isSender,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (mediaUrl) {
      const audio = new Audio(mediaUrl);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [mediaUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio play error:', err);
      });
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatSec = (s: number) => {
    const min = Math.floor(s / 60);
    const rem = Math.floor(s % 60);
    return `${min}:${rem.toString().padStart(2, '0')}`;
  };

  // Generate 28 representative waveform bar heights
  const bars = [16, 24, 38, 20, 45, 60, 35, 75, 50, 68, 85, 40, 60, 95, 70, 50, 80, 60, 45, 65, 35, 55, 40, 25, 45, 30, 20, 15];

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[180px] max-w-[260px] w-full">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition active:scale-95 ${
          isSender
            ? 'bg-white text-blue-600 hover:bg-slate-100'
            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/30'
        }`}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      {/* Waveform Visualization */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-[2.5px] h-8">
          {bars.map((heightPercent, idx) => {
            const barProgress = (idx / bars.length) * 100;
            const isFilled = barProgress <= progress;
            return (
              <div
                key={idx}
                style={{ height: `${heightPercent}%` }}
                className={`w-[3px] rounded-full transition-colors ${
                  isFilled
                    ? isSender
                      ? 'bg-white'
                      : 'bg-blue-400'
                    : isSender
                    ? 'bg-blue-200/50'
                    : 'bg-slate-600'
                }`}
              />
            );
          })}
        </div>

        {/* Timers & Speed toggle */}
        <div className="flex items-center justify-between text-[10px] mt-1 font-mono">
          <span className={isSender ? 'text-blue-100' : 'text-slate-400'}>
            {isPlaying ? formatSec(currentTime) : formatSec(duration)}
          </span>
          <button
            type="button"
            onClick={cyclePlaybackRate}
            className={`px-1.5 py-0.5 rounded font-bold transition ${
              isSender
                ? 'bg-blue-800/40 text-blue-100 hover:bg-blue-800/60'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
