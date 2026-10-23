import React, { useState } from 'react';
import { UserProfile, StoryStatus } from '../types/tawasol';
import { X, Send, Image, Type, Palette, Camera } from 'lucide-react';

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onStatusCreated: (story: StoryStatus) => void;
}

const BACKGROUND_GRADIENTS = [
  { id: 'blue', label: 'أزرق', class: 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500' },
  { id: 'emerald', label: 'أخضر', class: 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-green-500' },
  { id: 'purple', label: 'بنفسجي', class: 'bg-gradient-to-tr from-purple-700 via-pink-600 to-rose-500' },
  { id: 'amber', label: 'برتقالي', class: 'bg-gradient-to-tr from-amber-600 via-orange-600 to-rose-600' },
  { id: 'slate', label: 'داكن', class: 'bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950' },
];

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStatusCreated,
}) => {
  const [statusType, setStatusType] = useState<'text' | 'media'>('text');
  const [textContent, setTextContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_GRADIENTS[0]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video');
    setMediaType(isVid ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (statusType === 'text' && !textContent.trim()) return;
    if (statusType === 'media' && !mediaUrl) return;

    setIsSubmitting(true);
    const newStoryData = {
      userNumber: currentUser.number,
      userName: currentUser.name,
      userAvatar: currentUser.avatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg',
      text: textContent.trim(),
      mediaUrl: statusType === 'media' ? (mediaUrl || undefined) : undefined,
      mediaType: (statusType === 'media' ? mediaType : 'text') as 'image' | 'video' | 'text',
      backgroundColor: selectedBg.class,
    };

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStoryData),
      });
      const data = await res.json();
      if (data.story) {
        onStatusCreated(data.story);
      }
    } catch {
      // Local fallback
      const fallbackStory: StoryStatus = {
        id: `story_${Date.now()}`,
        ...newStoryData,
        timestamp: Date.now(),
      };
      onStatusCreated(fallbackStory);
    } finally {
      setIsSubmitting(false);
      onClose();
      setTextContent('');
      setMediaUrl(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto touch-pan-x no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setStatusType('text')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                statusType === 'text' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>حالة نصية</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusType('media')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                statusType === 'media' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              <span>صورة أو فيديو</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {statusType === 'text' ? (
            /* Text Story Canvas */
            <div className="space-y-3">
              <div
                className={`w-full aspect-[4/3] rounded-2xl p-6 flex items-center justify-center text-center shadow-inner relative transition-colors ${selectedBg.class}`}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="اكتب حالتك هنا..."
                  rows={4}
                  maxLength={180}
                  className="w-full bg-transparent text-white font-bold text-lg sm:text-xl placeholder-white/60 text-center resize-none border-none focus:outline-none drop-shadow"
                />
                <span className="absolute bottom-2 left-3 text-[10px] text-white/70 font-mono">
                  {textContent.length}/180
                </span>
              </div>

              {/* Background selector */}
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-400" />
                  اختر لون الخلفية:
                </label>
                <div className="flex items-center gap-2 overflow-x-auto touch-pan-x no-scrollbar py-1">
                  {BACKGROUND_GRADIENTS.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setSelectedBg(bg)}
                      className={`w-8 h-8 rounded-full ${bg.class} border-2 transition ${
                        selectedBg.id === bg.id ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-80'
                      }`}
                      title={bg.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Media Story Canvas */
            <div className="space-y-3">
              <div className="w-full aspect-[4/3] rounded-2xl bg-black flex items-center justify-center overflow-hidden border border-slate-800 relative">
                {mediaUrl ? (
                  mediaType === 'video' ? (
                    <video src={mediaUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={mediaUrl} alt="حالة" className="w-full h-full object-cover" />
                  )
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-400 hover:text-white transition">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-xs">اضغط لاختيار صورة أو مقطع فيديو</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleMediaUpload}
                    />
                  </label>
                )}
              </div>

              <input
                type="text"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="أضف تعليقاً على الحالة (اختياري)..."
                maxLength={100}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting || (statusType === 'text' && !textContent.trim()) || (statusType === 'media' && !mediaUrl)}
            className={`w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition ${
              (statusType === 'text' && textContent.trim()) || (statusType === 'media' && mediaUrl)
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 active:scale-[0.99]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري النشر...' : 'نشر الحالة الآن'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
