import React, { useState } from 'react';
import { UserProfile, ChatMessage } from '../types/tawasol';
import {
  X,
  Search,
  Forward,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  User,
} from 'lucide-react';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  contacts: UserProfile[];
  currentUserNumber: string;
  onConfirmForward: (targetContacts: UserProfile[]) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  contacts,
  currentUserNumber,
  onConfirmForward,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());

  if (!isOpen || !message) return null;

  // Filter out current user and support team from regular forward list
  const availableContacts = contacts.filter((c) => {
    if (c.number === currentUserNumber) return false;
    const matchName = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchNum = c.number.includes(searchQuery);
    return matchName || matchNum;
  });

  const toggleSelectContact = (number: string) => {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedNumbers.size === availableContacts.length) {
      setSelectedNumbers(new Set());
    } else {
      setSelectedNumbers(new Set(availableContacts.map((c) => c.number)));
    }
  };

  const handleForward = () => {
    if (selectedNumbers.size === 0) return;
    const targets = availableContacts.filter((c) => selectedNumbers.has(c.number));
    onConfirmForward(targets);
    setSelectedNumbers(new Set());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-right my-auto max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Forward className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">إعادة توجيه الرسالة</h3>
              <span className="text-[11px] text-slate-400">اختر جهة اتصال أو أكثر للإرسال</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview Snippet */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 mx-3 my-2 rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
            {message.contentType === 'image' && <ImageIcon className="w-4 h-4" />}
            {message.contentType === 'video' && <Film className="w-4 h-4" />}
            {message.contentType === 'audio' && <Music className="w-4 h-4" />}
            {message.contentType === 'file' && <FileText className="w-4 h-4" />}
            {message.contentType === 'text' && <Forward className="w-4 h-4" />}
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-blue-400 block mb-0.5">
              محتوى الرسالة المراد توجيهها:
            </span>
            <p className="text-xs text-slate-200 truncate">
              {message.content || (
                message.contentType === 'image'
                  ? 'صورة مرفقة 📸'
                  : message.contentType === 'video'
                  ? 'مقطع فيديو 🎥'
                  : message.contentType === 'audio'
                  ? 'رسالة صوتية 🎵'
                  : 'مستند / ملف 📄'
              )}
            </p>
          </div>
        </div>

        {/* Search Input & Select All */}
        <div className="px-4 py-2 flex items-center justify-between gap-2 border-b border-slate-800/60">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو الرقم..."
              className="w-full pr-8 pl-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {availableContacts.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition shrink-0"
            >
              {selectedNumbers.size === availableContacts.length ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
          )}
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[180px] max-h-[300px]">
          {availableContacts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              لا توجد جهات اتصال مطابقة للبحث.
            </div>
          ) : (
            availableContacts.map((c) => {
              const isSelected = selectedNumbers.has(c.number);
              return (
                <div
                  key={c.number}
                  onClick={() => toggleSelectContact(c.number)}
                  className={`p-2.5 rounded-2xl border transition flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-sm'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={c.avatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
                        alt={c.name}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-700"
                      />
                      {c.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{c.name}</span>
                      <span className="text-[10px] font-mono text-blue-400">{c.number}</span>
                    </div>
                  </div>

                  {/* Checkbox indicator */}
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-slate-600 bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            تم تحديد: <strong className="text-blue-400 font-mono">{selectedNumbers.size}</strong> جهة اتصال
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleForward}
              disabled={selectedNumbers.size === 0}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition active:scale-95"
            >
              <Forward className="w-4 h-4" />
              <span>إعادة توجيه</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
