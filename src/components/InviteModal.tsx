import React, { useState } from 'react';
import { LogoBadge } from './LogoBadge';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  if (!isOpen) return null;

  // The official exclusive application share URL specified by the user
  const officialShareUrl = 'https://ais-pre-turpldaj6psjjp2qwngett-691604538697.europe-west2.run.app';

  const invitationMessage = `🌟 انضم إليّ الآن على تطبيق «تواصل 24» للمراسلة الفورية والمكالمات الصوتية المشفرة!
رابط التطبيق المعتمد للمشاركة:
${officialShareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(officialShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(invitationMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'تواصل 24 - Tawasol 24',
          text: 'انضم الآن إلى تطبيق تواصل 24 للمراسلة الفورية والمكالمات الصوتية المشفرة',
          url: officialShareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoBadge size="sm" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-blue-400" />
                رابط المشاركة والانضمام لتطبيق تواصل 24
              </h3>
              <p className="text-[11px] text-slate-400">
                الرابط المعتمد والوحيد لمشاركة التطبيق
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-right">
          {/* Official Share Link Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                رابط التطبيق المعتمد للمشاركة:
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">مباشر وجاهز للنشر</span>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 focus-within:border-blue-500 transition">
              <input
                type="text"
                readOnly
                value={officialShareUrl}
                className="flex-1 bg-transparent border-none text-white font-mono text-xs focus:outline-none text-left dir-ltr px-1 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    تم النسخ!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    نسخ الرابط
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Ready-to-send Invitation Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                رسالة دعوة جاهزة للإرسال:
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap select-all font-sans">
              {invitationMessage}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition"
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    تم نسخ نص الرسالة!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    نسخ نص الدعوة كاملاً
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Share Button */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            مشاركة الرابط عبر التطبيقات (واتساب، تيليجرام، فيسبوك)
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            تطبيق تواصل 24 - رابط حصري ومعتمد
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
