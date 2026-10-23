import React, { useState } from 'react';
import { LogoBadge } from './LogoBadge';
import { ShieldAlert, UserX, Lock, RefreshCw, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface BannedScreenProps {
  bannedNumber: string;
  reason?: string;
  onCheckPermission: () => Promise<boolean>;
}

export const BannedScreen: React.FC<BannedScreenProps> = ({
  bannedNumber,
  reason,
  onCheckPermission,
}) => {
  const [checking, setChecking] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const handleRecheck = async () => {
    setChecking(true);
    setStatusFeedback(null);
    try {
      const allowed = await onCheckPermission();
      if (!allowed) {
        setStatusFeedback('⚠️ لم يمنح مالك التطبيق الإذن بعد. الحساب لا يزال محظوراً وممسوحاً.');
      } else {
        setStatusFeedback('✅ تم منح الإذن من المالك بنجاح! جاري تحويلك...');
      }
    } catch {
      setStatusFeedback('تعذر التحقق من الإذن في الوقت الحالي.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950 text-white select-none">
      <div className="w-full max-w-md p-6 sm:p-8 bg-slate-900 border border-rose-900/40 rounded-3xl shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-rose-600/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-10 h-10 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-rose-600 text-white shadow-lg">
              <Lock className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-rose-400">
            تم مسح هذا الحساب وحظره نهائياً
          </h2>
          <p className="text-xs text-slate-400">
            بقرار مباشر من قِبل <span className="text-white font-semibold">مالك تطبيق تواصل 24</span>
          </p>
        </div>

        {/* Info card */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-right space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">الرقم الممسوح والمحظور:</span>
            <span className="font-mono text-rose-400 font-bold text-sm">{bannedNumber}</span>
          </div>

          <div className="border-t border-slate-700/60 pt-2 text-[11px] text-slate-300 leading-relaxed">
            <div className="font-semibold text-rose-300 mb-1 flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              قواعد الحظر النهائي:
            </div>
            {reason || 'تم مسح اسمك ورقمك نهائياً من سجلات تواصل 24 ومنعك من العودة أو إعادة التسجيل في المنصة دون إذن مباشر من مالك التطبيق.'}
          </div>
        </div>

        {/* Explanatory Box */}
        <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-[11px] leading-relaxed text-right">
          🔒 <strong className="font-bold">ملاحظة هامة:</strong> لا يمكنك إنشاء حساب جديد بهذا الرقم أو إعادة الدخول للمنصة إلا إذا قام مالك التطبيق بالدخول إلى لوحة التحكم والضغط على <strong>«منح الإذن بالعودة»</strong> لرقمك.
        </div>

        {statusFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium text-center ${
              statusFeedback.includes('✅')
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {statusFeedback}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleRecheck}
            disabled={checking}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            التحقق مما إذا كان المالك قد منح الإذن بالعودة
          </button>
        </div>
      </div>
    </div>
  );
};
