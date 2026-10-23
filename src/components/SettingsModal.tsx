import React, { useState } from 'react';
import { UserProfile } from '../types/tawasol';
import { LogoBadge } from './LogoBadge';
import {
  User,
  Shield,
  Volume2,
  Ban,
  Trash2,
  RefreshCw,
  X,
  Check,
  Bell,
  Phone,
  Cloud,
  CloudUpload,
  CloudDownload,
  Database,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onChangeNumber: () => void;
  blockedNumbers: string[];
  onUnblockNumber: (num: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetAccount: () => void;
  adBlockerEnabled?: boolean;
  onToggleAdBlocker?: () => void;
  blockedAdsCount?: number;
  cloudSyncEnabled?: boolean;
  onToggleCloudSync?: () => void;
  onTriggerCloudBackup?: () => Promise<{ success: boolean; message: string }>;
  onRestoreCloudBackup?: () => Promise<{ success: boolean; message: string }>;
  onClearCloudBackup?: () => Promise<{ success: boolean; message: string }>;
  cloudBackupInfo?: { lastBackupAt?: number; size?: string; messageCount?: number; hasBackup: boolean } | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onChangeNumber,
  blockedNumbers,
  onUnblockNumber,
  soundEnabled,
  onToggleSound,
  onResetAccount,
  adBlockerEnabled = true,
  onToggleAdBlocker,
  blockedAdsCount = 18,
  cloudSyncEnabled = true,
  onToggleCloudSync,
  onTriggerCloudBackup,
  onRestoreCloudBackup,
  onClearCloudBackup,
  cloudBackupInfo,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [statusMessage, setStatusMessage] = useState(currentUser.statusMessage || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [cloudActionFeedback, setCloudActionFeedback] = useState<string | null>(null);

  const showCloudFeedback = (msg: string) => {
    setCloudActionFeedback(msg);
    setTimeout(() => setCloudActionFeedback(null), 3500);
  };

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name: name.trim() || currentUser.name,
      statusMessage: statusMessage.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-right text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <LogoBadge size="sm" showText={false} />
            <h3 className="text-lg font-bold text-white">إعدادات تواصل 24</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Active Number Box */}
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-900/50 flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-300 font-semibold block">رقمك المعتمد في تواصل 24:</span>
              <span className="text-xl font-bold font-mono text-white tracking-wider">
                {currentUser.number}
              </span>
              <span className="text-[10px] text-blue-400 block mt-0.5">
                (رقم فردي يبدأ بـ 8 ومحفوظ دائم لحسابك)
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onChangeNumber();
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تغيير الرقم
            </button>
          </div>

          {/* Profile Details */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-400" />
              الاسم المستعار:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              الحالة / السيرة الشخصية:
            </label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Sound & Notifications */}
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className={`w-4 h-4 ${soundEnabled ? 'text-blue-400' : 'text-slate-500'}`} />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">أصوات البرنامج والتنبيهات</span>
                <span className="text-[10px] text-slate-400">
                  {soundEnabled ? 'الأصوات قيد التشغيل' : 'تم إيقاف جميع الأصوات (وضع صامت)'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${soundEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                {soundEnabled ? 'مفعّلة' : 'مكتومة'}
              </span>
              <button
                type="button"
                onClick={onToggleSound}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  soundEnabled ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    soundEnabled ? 'right-1' : 'right-6'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Ad Blocker Switch & Settings (مانع وحاجب الإعلانات الفعّال) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/40 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${adBlockerEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white block">مانع وحاجب الإعلانات الذكي</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      adBlockerEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {adBlockerEnabled ? 'مفعّل وشغّال 100%' : 'متوقف'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    إيقاف تام لكافة الإعلانات المزعجة، النوافذ المنبثقة، والروابط الترويجية
                  </span>
                </div>
              </div>

              {onToggleAdBlocker && (
                <button
                  type="button"
                  onClick={onToggleAdBlocker}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    adBlockerEnabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-700'
                  }`}
                  title={adBlockerEnabled ? 'اضغط لتعطيل مانع الإعلانات' : 'اضغط لتشغيل مانع الإعلانات وحجبها فوراً'}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      adBlockerEnabled ? 'right-1' : 'right-7'
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Quick stats on blocked items */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                إجمالي العناصر والإعلانات المحجوبة:
              </span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {blockedAdsCount} إعلان محجوب
              </span>
            </div>
          </div>

          {/* Optional Cloud Storage Card (التخزين والنسخ السحابي الاختياري) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${cloudSyncEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white block">التخزين السحابي الاختياري</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      cloudSyncEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {cloudSyncEnabled ? 'مفعّل ☁️' : 'معطّل'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    حفظ وتشفير محادثاتك وسجلاتك سحابياً ومزامنتها اختيارياً عند الطلب
                  </span>
                </div>
              </div>

              {onToggleCloudSync && (
                <button
                  type="button"
                  onClick={onToggleCloudSync}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    cloudSyncEnabled ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-700'
                  }`}
                  title={cloudSyncEnabled ? 'إيقاف النسخ السحابي التلقائي' : 'تشغيل النسخ السحابي التلقائي'}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      cloudSyncEnabled ? 'right-1' : 'right-7'
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Cloud Storage Status & Actions */}
            {cloudSyncEnabled && (
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span>حالة التخزين السحابي:</span>
                  </div>
                  <span className="font-mono text-blue-400 font-semibold">
                    {cloudBackupInfo?.hasBackup
                      ? `${cloudBackupInfo.size || '1.2 MB'} (${cloudBackupInfo.messageCount || 0} رسالة)`
                      : 'جاهز لأول نسخة سحابية'}
                  </span>
                </div>

                {cloudActionFeedback && (
                  <div className="p-2 rounded-xl bg-blue-900/30 border border-blue-500/40 text-[11px] text-blue-200 text-center animate-in fade-in">
                    {cloudActionFeedback}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isBackingUp}
                    onClick={async () => {
                      if (!onTriggerCloudBackup) return;
                      setIsBackingUp(true);
                      try {
                        const res = await onTriggerCloudBackup();
                        showCloudFeedback(res.message || 'تم حفظ النسخة السحابية بنجاح ☁️');
                      } catch {
                        showCloudFeedback('تعذر إجراء النسخ السحابي حالياً');
                      } finally {
                        setIsBackingUp(false);
                      }
                    }}
                    className="py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <CloudUpload className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-bounce' : ''}`} />
                    <span>{isBackingUp ? 'جاري النسخ...' : 'نسخ سحابي الآن'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={async () => {
                      if (!onRestoreCloudBackup) return;
                      const conf = window.confirm('هل تريد استرجاع البيانات والرسائل من النسخة السحابية؟');
                      if (!conf) return;
                      setIsRestoring(true);
                      try {
                        const res = await onRestoreCloudBackup();
                        showCloudFeedback(res.message || 'تمت استعادة البيانات من السحابة بنجاح ✅');
                      } catch {
                        showCloudFeedback('تعذر استعادة البيانات من السحابة');
                      } finally {
                        setIsRestoring(false);
                      }
                    }}
                    className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <CloudDownload className={`w-3.5 h-3.5 ${isRestoring ? 'animate-bounce' : ''}`} />
                    <span>{isRestoring ? 'جاري الاستعادة...' : 'استعادة من السحابة'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Blocked Numbers Section */}
          <div className="border-t border-slate-800 pt-4">
            <h5 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <Ban className="w-4 h-4 text-rose-400" />
              قائمة الأرقام المحظورة ({blockedNumbers.length}):
            </h5>

            {blockedNumbers.length === 0 ? (
              <p className="text-xs text-slate-500">لا توجد أرقام محظورة حالياً.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {blockedNumbers.map((num) => (
                  <div
                    key={num}
                    className="p-2 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-slate-200 font-semibold">{num}</span>
                    <button
                      type="button"
                      onClick={() => onUnblockNumber(num)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-[11px] font-medium transition"
                    >
                      إلغاء الحظر
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit / Save */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition"
            >
              {isSaved ? <Check className="w-4 h-4" /> : null}
              <span>{isSaved ? 'تم الحفظ بنجاح' : 'حفظ التعديلات'}</span>
            </button>

            <button
              type="button"
              onClick={onResetAccount}
              className="p-2.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 rounded-xl text-xs transition border border-rose-500/20"
              title="تسجيل الخروج والبدء برقم جديد"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
