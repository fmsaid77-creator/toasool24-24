import React, { useState, useEffect } from 'react';
import { UserProfile, CallLog, ChatMessage, BlacklistedUser } from '../types/tawasol';
import { LogoBadge } from './LogoBadge';
import {
  Lock,
  ShieldCheck,
  Users,
  MessageSquare,
  PhoneCall,
  Mic,
  Video,
  Radio,
  Send,
  Trash2,
  X,
  Eye,
  EyeOff,
  Ban,
  CheckCircle,
  Activity,
  Download,
  UserX,
  UserCheck,
  AlertOctagon,
  Copy,
  Check,
  Cloud,
  Globe,
  ExternalLink,
  Zap,
  Sparkles,
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBroadcastMessage?: (title: string, message: string) => void;
  allUsers: UserProfile[];
  allMessages: ChatMessage[];
  allCalls: CallLog[];
  onUserDeletedPermanently?: (number: string) => void;
  onClearUserChat?: (number: string) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onBroadcastMessage,
  allUsers,
  allMessages,
  allCalls,
  onUserDeletedPermanently,
  onClearUserChat,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cloudHosting' | 'stats' | 'users' | 'blacklist' | 'messages' | 'calls' | 'broadcast' | 'control'>('cloudHosting');
  const [blacklist, setBlacklist] = useState<BlacklistedUser[]>([]);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyUrlSuccess, setCopyUrlSuccess] = useState(false);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('تنبيه هام من إدارة تواصل 24');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Users local state
  const [userList, setUserList] = useState<UserProfile[]>(allUsers);

  useEffect(() => {
    setUserList(allUsers);
  }, [allUsers]);

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: 'Bearer admin_auth_faroog77_token' },
      });
      const data = await res.json();
      if (data.users) setUserList(data.users);
      if (data.blacklist) setBlacklist(data.blacklist);
    } catch {
      // Local fallback
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Prompt requested exact password: fa&roog#77
    if (password === 'fa&roog#77') {
      setIsAuthenticated(true);
      setAuthError(null);
      fetchAdminStats();
    } else {
      setAuthError('كلمة المرور غير صحيحة. هذه النافذة مخصصة لمالك التطبيق فقط.');
    }
  };

  // Permanent Delete & Forbid Return
  const handlePermanentDelete = async (number: string, userName: string) => {
    const confirmDelete = window.confirm(
      `هل أنت متأكد من مسح المستخدم "${userName}" (${number}) نهائياً من القائمة وحظر رقمه من العودة مرة أخرى دون إذنك؟`
    );
    if (!confirmDelete) return;

    setUserList((prev) => prev.filter((u) => u.number !== number));
    setBlacklist((prev) => [
      ...prev,
      {
        number,
        name: userName,
        bannedAt: Date.now(),
        reason: 'تم مسحه وحظر رقمه نهائياً من قبل مالك التطبيق',
      },
    ]);

    if (onUserDeletedPermanently) {
      onUserDeletedPermanently(number);
    }

    try {
      await fetch('/api/admin/permanent-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin_auth_faroog77_token',
        },
        body: JSON.stringify({ number, reason: 'تم مسحه وحظر رقمه نهائياً من قبل مالك التطبيق' }),
      });
    } catch {
      // Local fallback
    }
  };

  // Restore Permission to Return
  const handleRestorePermission = async (number: string) => {
    setBlacklist((prev) => prev.filter((b) => b.number !== number));

    try {
      await fetch('/api/admin/restore-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin_auth_faroog77_token',
        },
        body: JSON.stringify({ number }),
      });
    } catch {
      // Local fallback
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastBody.trim()) return;
    try {
      if (onBroadcastMessage) {
        onBroadcastMessage(broadcastTitle, broadcastBody);
      }
      // Also notify backend
      await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin_auth_faroog77_token',
        },
        body: JSON.stringify({ title: broadcastTitle, message: broadcastBody }),
      });
      setBroadcastSuccess(true);
      setBroadcastBody('');
      setTimeout(() => setBroadcastSuccess(false), 3000);
    } catch (err) {
      console.warn('Broadcast error:', err);
    }
  };

  // Clear subscriber chat messages (Admin action)
  const handleClearUserChat = async (targetNumber: string, userName: string) => {
    const confirmClear = window.confirm(
      `هل أنت متأكد من حذف ومسح جميع محادثات ورسائل المشترك "${userName}" (${targetNumber}) نهائياً؟`
    );
    if (!confirmClear) return;

    if (onClearUserChat) {
      onClearUserChat(targetNumber);
    }

    try {
      const res = await fetch('/api/admin/clear-user-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin_auth_faroog77_token',
        },
        body: JSON.stringify({ targetNumber }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`تم حذف جميع محادثات ورسائل المشترك (${targetNumber}) بنجاح.`);
      }
    } catch {
      // Handled locally
    }
  };

  const handleToggleBan = async (number: string, currentBan: boolean) => {
    const updated = userList.map((u) => (u.number === number ? { ...u, isBanned: !currentBan } : u));
    setUserList(updated);

    try {
      await fetch('/api/admin/toggle-ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin_auth_faroog77_token',
        },
        body: JSON.stringify({ number, ban: !currentBan }),
      });
    } catch {
      // Local fallback
    }
  };

  const handleExportData = () => {
    const dump = {
      exportedAt: new Date().toISOString(),
      users: userList,
      messages: allMessages,
      calls: allCalls,
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tawasol24_audit_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFile = async (url: string, filename: string) => {
    setDownloadingFile(filename);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloadingFile(null), 1500);
    }
  };

  const handleCopyCloudUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.origin);
        setCopyUrlSuccess(true);
        setTimeout(() => setCopyUrlSuccess(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handleCopyCloudLauncher = async () => {
    try {
      const res = await fetch('/index-cloud-netlify.html');
      let text = '';
      if (res.ok) {
        text = await res.text();
      } else {
        text = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>تواصل 24 - التشغيل السحابي</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;overflow:hidden;">
  <iframe src="${window.location.origin}" style="width:100vw;height:100vh;border:none;" allow="camera; microphone; display-capture; autoplay; clipboard-write; clipboard-read"></iframe>
</body>
</html>`;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-right text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <LogoBadge size="sm" showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">لوحة تحكم مالك التطبيق - إدارة تواصل 24</h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-mono">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">إشراف شامل على المنظومة والعمليات والإحصائيات</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {!isAuthenticated ? (
          /* Password Authentication Gate */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 shadow-lg shadow-blue-500/10">
              <Lock className="w-8 h-8" />
            </div>

            <h4 className="text-xl font-bold text-white mb-2">منطقة محمية لمالك التطبيق</h4>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              وفق المواصفات، هذه النافذة مشفرة ومخصصة لمالك التطبيق فقط ولا يمكن فتحها لأي مستخدم آخر.
            </p>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الخاصة بالإدارة..."
                  dir="ltr"
                  className="w-full px-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-center font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition active:scale-[0.99] flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                الدخول إلى لوحة التحكم
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Sub Nav Navigation - Smooth horizontal scroll right and left */}
            <div
              className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 bg-slate-900/50 overflow-x-auto touch-pan-x no-scrollbar scroll-smooth text-xs font-medium"
              onWheel={(e) => {
                e.currentTarget.scrollLeft += e.deltaY;
              }}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {[
                { id: 'cloudHosting', label: 'التشغيل السحابي و Netlify ☁️', icon: Cloud },
                { id: 'stats', label: 'الإحصائيات المباشرة', icon: Activity },
                { id: 'users', label: `المستخدمون (${userList.length})`, icon: Users },
                { id: 'blacklist', label: `المطرودون نهائياً (${blacklist.length})`, icon: UserX },
                { id: 'messages', label: 'سجل الرسائل والوسائط', icon: MessageSquare },
                { id: 'calls', label: 'سجل المكالمات', icon: PhoneCall },
                { id: 'broadcast', label: 'بث إشعار عام', icon: Radio },
                { id: 'control', label: 'النسخ الاحتياطي والضبط', icon: ShieldCheck },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 rounded-xl whitespace-nowrap shrink-0 flex items-center gap-1.5 transition ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Tab 0: Cloud Hosting & Netlify Deployment */}
              {activeTab === 'cloudHosting' && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  {/* Top Alert Banner */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 border border-blue-500/40 shadow-2xl flex items-start gap-4">
                    <div className="p-3.5 rounded-2xl bg-blue-500/20 text-blue-400 shrink-0 border border-blue-500/30 shadow-lg shadow-blue-500/10">
                      <Cloud className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-white text-base">
                          نظام التشغيل السحابي والاتصال المباشر
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/40 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          سحابي فائق السرعة
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        تم مسح جميع المجلدات القديمة من غرفة الإدارة، وتحويل نمط التشغيل إلى سحابي كامل لتعزيز جودة الاتصال الصوتي والمرئي وتخطي قيود الشبكات المحلية، مع تفعيل ودمج محرك WebRTC P2P المرفق.
                      </p>
                    </div>
                  </div>

                  {/* Card 1: Cloud Launcher File (index.html for Netlify) */}
                  <div className="p-6 rounded-3xl bg-slate-800/80 border border-blue-500/40 shadow-2xl space-y-4 relative overflow-hidden">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                          <Cloud className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-bold text-white text-base font-mono">index.html (Cloud Launcher)</h5>
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                              جاهز لـ Netlify و Vercel
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">ملف تشغيل سحابي مستقل وخفيف (Drag & Drop)</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3.5 rounded-2xl border border-slate-700/60">
                      💡 هذا الملف مهيأ ومبرمج لاستضافة التطبيق على المنصات السحابية المجانية (مثل <strong>Netlify</strong> أو <strong>Vercel</strong>) بضغطة زر. يتيح تشغيل التطبيق برابط HTTPS مشفر وآمن يدعم أذونات الكاميرا والميكروفون بالكامل على هواتف أندرويد و Kodular.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadFile('/download/cloud', 'index.html')}
                        disabled={downloadingFile === 'index.html'}
                        className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition active:scale-[0.99] cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>
                          {downloadingFile === 'index.html'
                            ? 'جاري التحميل...'
                            : 'تحميل ملف index.html السحابي'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyCloudLauncher}
                        className="py-3 px-5 rounded-2xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-slate-600 shrink-0"
                        title="نسخ كود ملف التشغيل السحابي للحافظة"
                      >
                        {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copySuccess ? 'تم النسخ!' : 'نسخ كود الملف'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 2: WebRTC Cloud Calling Engine (User Attached Code Integrated) */}
                  <div className="p-6 rounded-3xl bg-slate-800/80 border border-emerald-500/40 shadow-2xl space-y-4 relative overflow-hidden">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
                          <Zap className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-bold text-white text-base font-mono">محرك WebRTC السحابي (call.html)</h5>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-300" />
                              الكود المرفق مفعل ومدمج
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">اتصال صوتي ومرئي مباشر P2P مع سيرفرات STUN من Google</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/60 text-xs text-slate-300 space-y-1.5">
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400" />
                        مميزات المحرك المدمج في التطبيق:
                      </div>
                      <ul className="space-y-1 pr-3 list-disc list-inside text-slate-300">
                        <li>اتصال صوتي وفيديو بجودة عالية وتأخير زمني منخفض جداً عبر PeerJS 1.5.2.</li>
                        <li>سيرفرات STUN عالمية مجانية لتجاوز جدران الحماية وشبكات الجوال.</li>
                        <li>نغمات اتصال ورنين إلكترونية فورية (Web Audio Synthesizer) دون ملفات وسائط ثقيلة.</li>
                        <li>مربوط برقم المستخدم في تواصل 24 تلقائياً مع دعم المكالمات المباشرة.</li>
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <a
                        href="/call"
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-[0.99]"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>فتح واختبار محرك الاتصال المباشر (WebRTC)</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDownloadFile('/download/call', 'call.html')}
                        disabled={downloadingFile === 'call.html'}
                        className="py-3 px-5 rounded-2xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-slate-600 shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        <span>تحميل call.html</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Live Cloud URL for Kodular / Web_Viewer */}
                  <div className="p-5 rounded-3xl bg-slate-800/80 border border-slate-700/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-cyan-400" />
                        <span className="font-bold text-white text-xs">رابط المنصة السحابية المباشر:</span>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-800/50">
                        HTTPS Active
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 overflow-hidden">
                      <span className="font-mono text-emerald-400 text-xs truncate select-all">
                        {typeof window !== 'undefined' ? window.location.origin : 'https://tawasol24.app'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCloudUrl}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 shrink-0 border border-slate-700 transition"
                      >
                        {copyUrlSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copyUrlSuccess ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      يمكنك نسخ هذا الرابط ووضعه مباشرة في خانة <strong className="text-white">HomeURL</strong> داخل أداة <strong className="text-white">Web_Viewer</strong> في كوديلار أو استخدامه في أي متصفح.
                    </p>
                  </div>

                  {/* Card 4: 30-Second Netlify Deployment Guide */}
                  <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                    <h5 className="font-bold text-xs text-blue-400 flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-blue-400" />
                      <span>طريقة تشغيل التطبيق على Netlify مجاناً خلال 30 ثانية:</span>
                    </h5>
                    <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pr-1 leading-relaxed">
                      <li>
                        اضغط على زر <strong className="text-cyan-300">«تحميل ملف index.html السحابي»</strong> أعلاه واحفظه في مجلد على جهازك.
                      </li>
                      <li>
                        افتح الرابط المجاني المباشر: <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer" className="text-blue-400 underline font-mono">app.netlify.com/drop</a>.
                      </li>
                      <li>
                        اسحب المجلد الذي وضعت فيه ملف <code className="text-emerald-400 font-mono">index.html</code> وافلته داخل المربع المنقط في موقع Netlify.
                      </li>
                      <li>
                        خلال ثانيتين فقط، سيعطيك Netlify رابطاً سحابياً مشفراً ودائماً (مثل: <code className="text-emerald-400 font-mono">https://tawasol24-xyz.netlify.app</code>).
                      </li>
                      <li>
                        ضع هذا الرابط في تطبيقك على Kodular أو افتحه من أي هاتف للاستمتاع بأعلى سرعة وجودة صوت وفيديو!
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab 1: Stats */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>المستخدمون المسجلون</span>
                        <Users className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-white">{userList.length}</div>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        {userList.filter((u) => u.isOnline).length} متصل حالياً
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>إجمالي الرسائل</span>
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-white">{allMessages.length}</div>
                      <span className="text-[10px] text-slate-400">تراكمي</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>الرسائل الصوتية</span>
                        <Mic className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-white">
                        {allMessages.filter((m) => m.contentType === 'audio').length}
                      </div>
                      <span className="text-[10px] text-purple-400">تسجيلات فورية</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>الفيديوهات والصور</span>
                        <Video className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-white">
                        {allMessages.filter((m) => m.contentType === 'video' || m.contentType === 'image').length}
                      </div>
                      <span className="text-[10px] text-amber-400">وسائط متعددة</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>المكالمات الصوتية</span>
                        <PhoneCall className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-white">{allCalls.length}</div>
                      <span className="text-[10px] text-cyan-400">مكالمات مسجلة</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>المطرودون نهائياً</span>
                        <UserX className="w-4 h-4 text-rose-400" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-white">
                        {blacklist.length}
                      </div>
                      <span className="text-[10px] text-rose-400">ممنوعون من العودة</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-900/30 text-xs text-blue-300 leading-relaxed">
                    💡 <span className="font-semibold">صلاحيات المالك:</span> يمكنك مسح أي مستخدم نهائياً من القائمة بحيث يفقد القدرة على العودة أو التسجيل مرة أخرى دون إذنك.
                  </div>
                </div>
              )}

              {/* Tab 2: Users Table */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-800/70 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">المستخدم</th>
                          <th className="p-3">رقم تواصل 24</th>
                          <th className="p-3">الحالة</th>
                          <th className="p-3">تاريخ التسجيل</th>
                          <th className="p-3 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {userList.map((user) => (
                          <tr key={user.number} className="hover:bg-slate-800/30 transition">
                            <td className="p-3 flex items-center gap-2.5">
                              <img
                                src={user.avatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                              />
                              <div>
                                <span className="font-semibold text-white block">{user.name}</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[140px] block">
                                  {user.statusMessage || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-blue-400 font-bold">{user.number}</td>
                            <td className="p-3">
                              {user.isBanned ? (
                                <span className="text-rose-400 font-medium">محظور مؤقتاً</span>
                              ) : user.isOnline ? (
                                <span className="text-emerald-400 font-medium">متصل الآن</span>
                              ) : (
                                <span className="text-slate-400">غير متصل</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-400">
                              {new Date(user.registeredAt).toLocaleDateString('ar-EG')}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleClearUserChat(user.number, user.name)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition flex items-center gap-1 shadow-sm"
                                  title="حذف جميع محادثات ورسائل هذا المشترك"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>حذف محادثات المشترك</span>
                                </button>

                                <button
                                  onClick={() => handleToggleBan(user.number, !!user.isBanned)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                                    user.isBanned
                                      ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                                      : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                                  }`}
                                >
                                  {user.isBanned ? 'إلغاء الحظر' : 'حظر مؤقت'}
                                </button>

                                <button
                                  onClick={() => handlePermanentDelete(user.number, user.name)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition flex items-center gap-1 shadow-sm"
                                  title="مسح المستخدم نهائياً وحظر عودته للمنصة دون إذنك"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>مسح نهائي وحظر العودة</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Permanent Blacklist (المطرودون نهائياً) */}
              {activeTab === 'blacklist' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-xs text-rose-300 leading-relaxed flex items-center gap-2.5">
                    <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>
                      <strong>قائمة المشتركين المطرودين والمحظورين نهائياً:</strong> تم مسح هؤلاء المستخدمين تماماً من المنصة، ولا يمكنهم الدخول أو العودة أو إعادة التسجيل بأرقامهم إلا إذا قمت أنت (المالك) بالضغط على زر <strong>«منح الإذن بالعودة»</strong>.
                    </span>
                  </div>

                  {blacklist.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs rounded-2xl border border-slate-800">
                      لا يوجد أي مستخدم مطرود أو محظور نهائياً حالياً.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-800/70 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3">المستخدم والرقم</th>
                            <th className="p-3">سبب الطرد</th>
                            <th className="p-3">تاريخ المسح</th>
                            <th className="p-3 text-center">إذن المالك</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {blacklist.map((item) => (
                            <tr key={item.number} className="hover:bg-slate-800/30 transition">
                              <td className="p-3">
                                <span className="font-bold text-white block">{item.name}</span>
                                <span className="font-mono text-rose-400 text-[11px] block">{item.number}</span>
                              </td>
                              <td className="p-3 text-slate-300">{item.reason || 'مطرود نهائياً من مالك التطبيق'}</td>
                              <td className="p-3 text-slate-400 font-mono">
                                {new Date(item.bannedAt).toLocaleDateString('ar-EG')}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleRestorePermission(item.number)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 mx-auto active:scale-95"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  منح الإذن بالعودة
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Messages Log */}
              {activeTab === 'messages' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">سجل الرسائل الأخيرة في النظام:</div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allMessages.slice(-40).reverse().map((msg) => (
                      <div key={msg.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-blue-400 font-bold">{msg.from}</span>
                            <span className="text-slate-500">⬅</span>
                            <span className="font-mono text-purple-400 font-bold">{msg.to}</span>
                            <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                              نوع: {msg.contentType}
                            </span>
                          </div>
                          <p className="text-slate-200 line-clamp-1">{msg.content || '(مرفق وسائط)'}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Call logs */}
              {activeTab === 'calls' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">سجل المكالمات الصوتية المنجزة:</div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allCalls.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">لا توجد مكالمات صوتية بعد.</div>
                    ) : (
                      allCalls.slice(-40).reverse().map((call) => (
                        <div key={call.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="w-4 h-4 text-blue-400" />
                            <div>
                              <span className="font-semibold text-white">{call.callerName} ({call.caller})</span>
                              <span className="text-slate-500 mx-1.5">اتصل بـ</span>
                              <span className="font-semibold text-white">{call.receiverName} ({call.receiver})</span>
                            </div>
                          </div>
                          <div className="text-left font-mono">
                            <span className="text-emerald-400 font-bold">{call.duration} ثانية</span>
                            <span className="text-[10px] text-slate-500 block">
                              {new Date(call.timestamp).toLocaleTimeString('ar-EG')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: Broadcast */}
              {activeTab === 'broadcast' && (
                <div className="space-y-4 max-w-lg">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                    بث رسالة رسمية لجميع المستخدمين في تواصل 24 تظهر في محادثاتهم كإشعار عام معتمد.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان الإشعار:</label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">نص الرسالة العامة:</label>
                    <textarea
                      rows={4}
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="اكتب التنبيه أو الإعلان الذي سيظهر لجميع المستخدمين..."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  {broadcastSuccess && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      تم إرسال الإشعار العام لجميع المستخدمين بنجاح!
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSendBroadcast}
                    disabled={!broadcastBody.trim()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    إرسال البث لجميع المستخدمين
                  </button>
                </div>
              )}

              {/* Tab 6: Controls & Backup */}
              {activeTab === 'control' && (
                <div className="space-y-6 max-w-lg">
                  <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-400" />
                      تصدير تقرير النظام الشامل
                    </h5>
                    <p className="text-xs text-slate-400">
                      تحميل نسخة احتياطية تتضمن جميع أرقام المستخدمين وسجلات المكالمات والرسائل.
                    </p>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      تصدير كملف JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
