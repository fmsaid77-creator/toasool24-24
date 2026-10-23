import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types/tawasol';
import { validateTawasolNumber, generateFiveSuggestions } from '../utils/numberValidator';
import { LogoBadge } from './LogoBadge';
import { ShieldCheck, RefreshCw, User, Image, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (user: UserProfile) => void;
  existingUser?: UserProfile | null;
  isChangingNumber?: boolean;
  onClose?: () => void;
}

const DEFAULT_AVATARS = [
  '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg',
  '/src/assets/images/avatar_user_one_1791830221106.jpg',
  '/src/assets/images/avatar_user_two_1791830231868.jpg',
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  existingUser,
  isChangingNumber = false,
  onClose,
}) => {
  const [selectedNumber, setSelectedNumber] = useState(existingUser?.number || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState(existingUser?.name || '');
  const [avatar, setAvatar] = useState(existingUser?.avatar || DEFAULT_AVATARS[0]);
  const [statusMessage, setStatusMessage] = useState(
    existingUser?.statusMessage || 'مرحباً! أنا أستخدم تواصل 24 💬'
  );
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate random numbers on mount
  useEffect(() => {
    const fresh = generateFiveSuggestions(existingUser?.number ? [existingUser.number] : []);
    const initialList = existingUser?.number && !fresh.includes(existingUser.number)
      ? [existingUser.number, ...fresh]
      : fresh;
    setSuggestions(initialList);
    if (!selectedNumber && initialList.length > 0) {
      setSelectedNumber(initialList[0]);
    }
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);

  const generateNewSuggestions = () => {
    setIsGenerating(true);
    const fresh = generateFiveSuggestions([selectedNumber]);
    setSuggestions(fresh);
    if (fresh.length > 0) {
      setSelectedNumber(fresh[0]);
      setWarningMessage(null);
    }
    setTimeout(() => setIsGenerating(false), 350);
  };

  const handleSelectSuggestion = (num: string) => {
    setSelectedNumber(num);
    setWarningMessage(null);
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateTawasolNumber(selectedNumber);
    if (!validation.valid) {
      setWarningMessage(validation.message);
      return;
    }

    setIsSubmitting(true);

    try {
      // Register with backend API
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: selectedNumber,
          name: displayName.trim() || `مستخدم ${selectedNumber}`,
          avatar,
          statusMessage: statusMessage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setWarningMessage(data.error || 'تعذر تفعيل هذا الرقم، قد يكون مستخدماً حالياً.');
        setIsSubmitting(false);
        return;
      }

      const userProfile: UserProfile = data.user || {
        number: selectedNumber,
        name: displayName.trim() || `مستخدم ${selectedNumber}`,
        avatar,
        statusMessage: statusMessage.trim(),
        isOnline: true,
        lastSeen: Date.now(),
        registeredAt: Date.now(),
      };

      // Persist permanently in localStorage
      localStorage.setItem('tawasol24_user', JSON.stringify(userProfile));
      onComplete(userProfile);
    } catch {
      // Offline fallback
      const userProfile: UserProfile = {
        number: selectedNumber,
        name: displayName.trim() || `مستخدم ${selectedNumber}`,
        avatar,
        statusMessage: statusMessage.trim(),
        isOnline: true,
        lastSeen: Date.now(),
        registeredAt: Date.now(),
      };
      localStorage.setItem('tawasol24_user', JSON.stringify(userProfile));
      onComplete(userProfile);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentValidation = validateTawasolNumber(selectedNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {/* Compact & flexible display width (max-w-[420px]) */}
      <div className="relative w-full max-w-[420px] bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-5 text-right text-slate-100 my-auto max-h-[96vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3.5">
          <LogoBadge size="sm" />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium border border-slate-700/80 active:scale-95"
              title="رجوع"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>رجوع</span>
            </button>
          )}
        </div>

        <div className="mb-3.5">
          <h2 className="text-base sm:text-lg font-bold text-white mb-1">
            {isChangingNumber ? 'تغيير رقم تواصل 24' : 'تفعيل رقم تواصل 24 المعتمد'}
          </h2>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            الرقم <span className="text-blue-400 font-semibold">فردي</span> يبدأ بالرقم <span className="text-blue-400 font-semibold">8 إجباري</span> وطوله 6 إلى 9 أرقام.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Number Selection & Prominent Generator Section */}
          <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-3.5 space-y-3">
            {/* ثانياً: مفتاح توليد الأرقام بشكل ظاهر وواضح جداً */}
            <div>
              <button
                type="button"
                onClick={generateNewSuggestions}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-500 hover:via-indigo-500 hover:to-sky-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-600/30 border border-blue-400/40 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] ring-2 ring-blue-500/25"
                title="اضغط هنا لتوليد أرقام عشوائية جديدة"
              >
                <RefreshCw className={`w-4 h-4 text-white shrink-0 ${isGenerating ? 'animate-spin' : ''}`} />
                <span className="tracking-wide">مفتاح توليد أرقام عشوائية جديدة</span>
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              </button>
            </div>

            {/* Dropdown Menu Selection */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                اختر الرقم من القائمة المنسدلة:
              </label>
              <select
                value={selectedNumber}
                onChange={(e) => handleSelectSuggestion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 hover:border-blue-500/60 rounded-xl font-mono text-sm text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer transition shadow-inner"
                dir="ltr"
              >
                {suggestions.map((num) => (
                  <option key={num} value={num} className="bg-slate-900 text-white font-mono py-1">
                    {num} (رقم فردي يبدأ بـ 8 - معتمد)
                  </option>
                ))}
              </select>
            </div>

            {/* Interactive Cards List Selection */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">
                أو اضغط مباشرة على الرقم لاختياره من القائمة:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {suggestions.map((sug) => {
                  const isSelected = selectedNumber === sug;
                  return (
                    <button
                      type="button"
                      key={sug}
                      onClick={() => handleSelectSuggestion(sug)}
                      className={`px-2.5 py-2 rounded-xl font-mono text-center transition border flex items-center justify-between active:scale-[0.98] ${
                        isSelected
                          ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-md shadow-blue-600/30 ring-2 ring-blue-500/30'
                          : 'bg-slate-800/90 border-slate-700/70 text-slate-200 hover:border-blue-500/50 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xs tracking-wider" dir="ltr">{sug}</span>
                      {isSelected ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500 text-white font-sans flex items-center gap-0.5 font-semibold">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          المحدد
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-sans">
                          معتمد
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Number Confirmation Status */}
            {selectedNumber && currentValidation.valid && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold block text-[11px]">
                    الرقم المختار: <span className="font-mono text-xs underline font-black" dir="ltr">{selectedNumber}</span>
                  </span>
                  <span className="text-[10px] text-emerald-400/90">
                    رقم فردي يبدأ بـ 8، معتمد ومحفوظ لحسابك.
                  </span>
                </div>
              </div>
            )}

            {warningMessage && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-300 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[11px]">{warningMessage}</span>
              </div>
            )}
          </div>

          {/* User Name & Profile Picture (Optional) */}
          <div className="border-t border-slate-800/80 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                اسم المستخدم (اختياري):
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={selectedNumber ? `مستخدم ${selectedNumber}` : 'اكتب اسمك المستعار'}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Avatar Selection (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-blue-400" />
                صورة الملف الشخصي (اختياري):
              </label>
              <div className="flex items-center gap-2.5">
                <img
                  src={avatar}
                  alt="صورة الملف"
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/50 shrink-0"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {DEFAULT_AVATARS.map((avUrl, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setAvatar(avUrl)}
                      className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition ${
                        avatar === avUrl ? 'border-blue-400 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={avUrl} alt="صورة رمزية" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  <label className="cursor-pointer px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 transition flex items-center gap-1">
                    رفع
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCustomAvatarUpload}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Status message */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-0.5">
                الحالة الشخصية:
              </label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                maxLength={80}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedNumber || !currentValidation.valid || isSubmitting}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition ${
              currentValidation.valid && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 active:scale-[0.99]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isChangingNumber ? 'حفظ وتحديث الرقم' : 'تفعيل الرقم والبدء في التواصل'}</span>
                <ShieldCheck className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
