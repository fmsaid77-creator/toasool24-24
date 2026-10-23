import React, { useState, useRef } from 'react';
import { UserProfile, ChatMessage, CallLog, StoryStatus } from '../types/tawasol';
import { LogoBadge } from './LogoBadge';
import {
  MessageSquare,
  Phone,
  Settings,
  Search,
  UserPlus,
  Shield,
  CircleDot,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Sparkles,
  ArrowRight,
  LogOut,
  RefreshCw,
  Share2,
  Headphones,
  Plus,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  Video,
  Smartphone,
  Check,
} from 'lucide-react';

interface SidebarProps {
  currentUser: UserProfile;
  contacts: UserProfile[];
  activeContact: UserProfile | null;
  onSelectContact: (contact: UserProfile) => void;
  messages: ChatMessage[];
  callLogs: CallLog[];
  typingUsers: Set<string>;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onChangeNumber: () => void;
  onNewChatByNumber: (targetNumber: string) => void;
  onOpenInvite?: () => void;
  stories?: StoryStatus[];
  onOpenCreateStatus?: () => void;
  onViewStory?: (index: number) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  adBlockerEnabled?: boolean;
  onToggleAdBlocker?: () => void;
  isCompactPhoneMode?: boolean;
  onToggleCompactPhoneMode?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  contacts,
  activeContact,
  onSelectContact,
  messages,
  callLogs,
  typingUsers,
  onOpenSettings,
  onOpenAdmin,
  onChangeNumber,
  onNewChatByNumber,
  onOpenInvite,
  stories = [],
  onOpenCreateStatus,
  onViewStory,
  soundEnabled = true,
  onToggleSound,
  adBlockerEnabled = true,
  onToggleAdBlocker,
  isCompactPhoneMode = false,
  onToggleCompactPhoneMode,
}) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'status'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatInput, setShowNewChatInput] = useState(false);
  const [customNumberInput, setCustomNumberInput] = useState('');
  const [numberInputError, setNumberInputError] = useState<string | null>(null);

  // Filter contacts by search query & exclude Support team from normal chats list
  const filteredContacts = contacts.filter((c) => {
    if (c.number === currentUser.number) return false;
    // Exclude Support Team ('813579') so it does not clutter regular user contacts
    if (c.number === '813579' || c.name.includes('دعم')) return false;
    const matchName = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchNumber = c.number.includes(searchQuery);
    return matchName || matchNumber;
  });

  // Handler to open Support directly from dedicated top button
  const handleOpenSupport = () => {
    const supportContact = contacts.find((c) => c.number === '813579') || {
      number: '813579',
      name: 'فريق دعم تواصل 24',
      avatar: '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg',
      statusMessage: 'أهلاً بك في منصة تواصل 24! نحن في خدمتكم على مدار الساعة.',
      isOnline: true,
      lastSeen: Date.now(),
      registeredAt: Date.now() - 86400000,
    };
    onSelectContact(supportContact);
  };

  // Calculate last message for each contact
  const getLastMessage = (contactNumber: string) => {
    const contactMsgs = messages.filter(
      (m) =>
        (m.from === contactNumber && m.to === currentUser.number) ||
        (m.from === currentUser.number && m.to === contactNumber)
    );
    if (contactMsgs.length === 0) return null;
    return contactMsgs[contactMsgs.length - 1];
  };

  const handleStartCustomChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customNumberInput.replace(/\D/g, '');
    if (!clean.startsWith('8')) {
      setNumberInputError('⚠️ تنبيه: يجب أن يبدأ رقم تواصل بالرقم 8 إجباري.');
      return;
    }
    if (clean.length < 6 || clean.length > 9) {
      setNumberInputError('⚠️ يتكون الرقم من 6 إلى 9 أرقام.');
      return;
    }
    const lastDigit = parseInt(clean.charAt(clean.length - 1), 10);
    if (lastDigit % 2 === 0) {
      setNumberInputError('⚠️ يجب أن يكون الرقم فردياً (ينتهي بـ 1، 3، 5، 7، 9).');
      return;
    }

    onNewChatByNumber(clean);
    setCustomNumberInput('');
    setNumberInputError(null);
    setShowNewChatInput(false);
  };

  // Top bar horizontal scroll/drag controls
  const topBarScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!topBarScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - topBarScrollRef.current.offsetLeft);
    setScrollLeftState(topBarScrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !topBarScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - topBarScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    topBarScrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const [touchStartX, setTouchStartX] = useState(0);
  const [touchScrollLeftState, setTouchScrollLeftState] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!topBarScrollRef.current) return;
    setTouchStartX(e.touches[0].pageX - topBarScrollRef.current.offsetLeft);
    setTouchScrollLeftState(topBarScrollRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!topBarScrollRef.current) return;
    const x = e.touches[0].pageX - topBarScrollRef.current.offsetLeft;
    const walk = (x - touchStartX) * 1.5;
    topBarScrollRef.current.scrollLeft = touchScrollLeftState - walk;
  };

  const scrollTopBar = (direction: 'left' | 'right') => {
    if (!topBarScrollRef.current) return;
    const offset = direction === 'left' ? -90 : 90;
    topBarScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="w-full md:w-72 lg:w-80 h-full flex flex-col bg-slate-900 border-l border-slate-800 shrink-0">
      {/* Top Header with Compact Support & Smooth Flexible Left/Right Scrollable Bar */}
      <div className="p-2.5 sm:p-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-1.5 overflow-hidden">
        <LogoBadge size="sm" className="shrink-0" />

        {/* Flexible draggable and scrollable top bar with left/right flexibility */}
        <div className="relative flex items-center overflow-hidden min-w-0 flex-1 justify-end gap-1">
          {/* Scroll arrow (towards right in RTL / leftwards) */}
          <button
            type="button"
            onClick={() => scrollTopBar('left')}
            className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 shrink-0 transition shadow-sm active:scale-95"
            title="تحريك الشريط لليمين"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Draggable/scrollable buttons container */}
          <div
            ref={topBarScrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onWheel={(e) => {
              if (topBarScrollRef.current) {
                topBarScrollRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none no-scrollbar py-0.5 px-1 scroll-smooth select-none cursor-grab active:cursor-grabbing max-w-full touch-pan-x"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Highly Effective Ad Blocker Toggle Button (زر حجب وإيقاف الإعلانات الفعّال) */}
            {onToggleAdBlocker && (
              <button
                type="button"
                onClick={onToggleAdBlocker}
                className={`px-2 py-1 rounded-lg border transition text-[11px] font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  adBlockerEnabled
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500/25 animate-pulse'
                }`}
                title={adBlockerEnabled ? 'مانع الإعلانات: نشط ومفعّل 100% (اضغط للإيقاف)' : 'تم إيقاف مانع الإعلانات (اضغط للتفعيل الفوري)'}
              >
                <Shield className={`w-3 h-3 ${adBlockerEnabled ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className="whitespace-nowrap">
                  {adBlockerEnabled ? 'حظر الإعلانات: مفعّل' : 'تفعيل مانع الإعلانات'}
                </span>
              </button>
            )}

            {/* Toggle Phone/Compact View for flexible mobile ergonomics */}
            {onToggleCompactPhoneMode && (
              <button
                type="button"
                onClick={onToggleCompactPhoneMode}
                className={`p-1.5 rounded-lg transition text-xs shrink-0 flex items-center gap-1 ${
                  isCompactPhoneMode
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isCompactPhoneMode ? 'وضع الهاتف المدمج مفعّل (اضغط للوضع الموسع)' : 'التبديل إلى وضع الهاتف المدمج'}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Small Compact Support Button / Window in top bar */}
            <button
              type="button"
              onClick={handleOpenSupport}
              className={`px-2 py-1 rounded-lg border transition text-[11px] font-semibold flex items-center gap-1 shrink-0 active:scale-95 ${
                activeContact?.number === '813579'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30'
              }`}
              title="فريق الدعم الفني (813579)"
            >
              <Headphones className="w-3 h-3 text-blue-400" />
              <span className="whitespace-nowrap text-[11px]">الدعم</span>
            </button>

            {/* Invite Friends / Official Clean Share Link Button */}
            <button
              type="button"
              onClick={onOpenInvite}
              className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition text-xs shrink-0"
              title="مشاركة رابط المنصة: https://ais-pre-turpldaj6psjjp2qwngett-691604538697.europe-west2.run.app"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Sound Mute/Unmute Quick Toggle */}
            {onToggleSound && (
              <button
                type="button"
                onClick={onToggleSound}
                className={`p-1.5 rounded-lg transition text-xs shrink-0 flex items-center gap-1 ${
                  soundEnabled
                    ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
                    : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                }`}
                title={soundEnabled ? 'كتم أصوات البرنامج' : 'تشغيل أصوات البرنامج'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            )}

            {/* Change Number Button */}
            <button
              type="button"
              onClick={onChangeNumber}
              className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition text-xs shrink-0"
              title="تغيير رقم تواصل 24"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
              title="الإعدادات الشخصية"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Owner Admin Discrete Lock Button */}
            <button
              type="button"
              onClick={onOpenAdmin}
              className="p-1.5 text-slate-500 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition shrink-0"
              title="إدارة التطبيق (خاص بمالك البرنامج)"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scroll arrow (towards left in RTL / rightwards) */}
          <button
            type="button"
            onClick={() => scrollTopBar('right')}
            className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 shrink-0 transition shadow-sm active:scale-95"
            title="تحريك الشريط لليسار"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* User Info Capsule */}
      <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={currentUser.avatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/40"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-900 rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white leading-tight">{currentUser.name}</span>
            <span className="font-mono text-blue-400 font-bold text-[11px] leading-tight mt-0.5">
              رقمك: {currentUser.number}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowNewChatInput(true)}
          className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20 text-xs font-semibold flex items-center gap-1 active:scale-95 transition"
          title="محادثة جديدة برقم تواصل"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">رقم جديد</span>
        </button>
      </div>

      {/* New Chat Direct Number Modal Popup */}
      {showNewChatInput && (
        <div className="p-3 bg-slate-800 border-b border-slate-700 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>بدء محادثة مباشرة برقم تواصل:</span>
            <button onClick={() => setShowNewChatInput(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
          <form onSubmit={handleStartCustomChat} className="space-y-2">
            <input
              type="text"
              value={customNumberInput}
              onChange={(e) => {
                setCustomNumberInput(e.target.value);
                setNumberInputError(null);
              }}
              placeholder="اكتب رقم تواصل (مثال: 813579)"
              dir="ltr"
              maxLength={9}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-center text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {numberInputError && (
              <p className="text-[11px] text-amber-400 leading-snug">{numberInputError}</p>
            )}
            <button
              type="submit"
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
            >
              فتح المحادثة
            </button>
          </form>
        </div>
      )}

      {/* Tabs: Chats / Calls / Status */}
      <div className="grid grid-cols-3 border-b border-slate-800 text-xs font-semibold text-center">
        <button
          type="button"
          onClick={() => setActiveTab('chats')}
          className={`py-3 flex items-center justify-center gap-1.5 transition ${
            activeTab === 'chats'
              ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>الدردشات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calls')}
          className={`py-3 flex items-center justify-center gap-1.5 transition ${
            activeTab === 'calls'
              ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>المكالمات</span>
          {callLogs.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`py-3 flex items-center justify-center gap-1.5 transition ${
            activeTab === 'status'
              ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>الحالات</span>
        </button>
      </div>

      {/* Dynamic Ad Spot (Shown ONLY when Ad Blocker is turned OFF) */}
      {!adBlockerEnabled && onToggleAdBlocker && (
        <div className="mx-2.5 my-2 p-2.5 bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl flex flex-col gap-1.5 text-xs text-amber-200 animate-in fade-in shadow-lg">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
              إعلان ترويجي نشط
            </span>
            <span className="text-[10px] text-slate-400">مانع الإعلانات متوقف</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            إعلان يظهر فقط عند إيقاف الحظر. اضغط لتفعيله وإخفاء الإعلان فوراً.
          </p>
          <button
            type="button"
            onClick={onToggleAdBlocker}
            className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-200" />
            <span>تفعيل مانع الإعلانات وحجب هذا الإعلان فوراً 🛡️</span>
          </button>
        </div>
      )}

      {/* Search Bar */}
      {activeTab === 'chats' && (
        <div className="p-3 border-b border-slate-800/80">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالاسم أو الرقم..."
              className="w-full pl-3 pr-9 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Tab Content List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {/* TAB 1: CHATS LIST */}
        {activeTab === 'chats' && (
          <div>
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <p>لا توجد جهات اتصال مطابقة.</p>
                <button
                  onClick={() => setShowNewChatInput(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 text-blue-400 text-xs hover:bg-slate-700 transition"
                >
                  أضف رقم تواصل جديد
                </button>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = activeContact?.number === contact.number;
                const lastMsg = getLastMessage(contact.number);
                const isUserTyping = typingUsers.has(contact.number);

                return (
                  <button
                    key={contact.number}
                    type="button"
                    onClick={() => onSelectContact(contact)}
                    className={`w-full p-3 flex items-center gap-3 text-right transition border-r-2 ${
                      isSelected
                        ? 'bg-slate-800/90 border-blue-500'
                        : 'border-transparent hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Contact Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={contact.avatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
                        alt={contact.name}
                        className="w-12 h-12 rounded-full object-cover ring-1 ring-slate-700"
                      />
                      {contact.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                      )}
                    </div>

                    {/* Middle Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-sm text-white truncate">{contact.name}</span>
                        {lastMsg && (
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {new Date(lastMsg.timestamp).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        {isUserTyping ? (
                          <span className="text-xs text-blue-400 font-medium animate-pulse">
                            جاري الكتابة...
                          </span>
                        ) : lastMsg ? (
                          <span className="text-xs text-slate-400 truncate max-w-[170px]">
                            {lastMsg.contentType === 'audio'
                              ? '🎙️ رسالة صوتية'
                              : lastMsg.contentType === 'video'
                              ? '📹 مقطع فيديو'
                              : lastMsg.contentType === 'image'
                              ? '📷 صورة'
                              : lastMsg.content}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-blue-400/80">
                            رقم: {contact.number}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: CALL LOGS */}
        {activeTab === 'calls' && (
          <div className="p-2 space-y-1">
            {callLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                لا توجد سجلات مكالمات سابقة.
              </div>
            ) : (
              callLogs.slice().reverse().map((call) => {
                const isIncoming = call.receiver === currentUser.number;
                return (
                  <div
                    key={call.id}
                    className="p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800/60 flex items-center justify-between transition text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${call.callType === 'video' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {call.callType === 'video' ? (
                          <Video className="w-4 h-4" />
                        ) : isIncoming ? (
                          call.status === 'missed' ? (
                            <PhoneMissed className="w-4 h-4 text-rose-400" />
                          ) : (
                            <PhoneIncoming className="w-4 h-4 text-emerald-400" />
                          )
                        ) : (
                          <PhoneOutgoing className="w-4 h-4 text-blue-400" />
                        )}
                      </div>

                      <div>
                        <span className="font-bold text-white block">
                          {isIncoming ? call.callerName : call.receiverName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          رقم: {isIncoming ? call.caller : call.receiver}
                        </span>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-[11px] text-slate-300 block">
                        {call.duration > 0 ? `${call.duration} ث` : 'لم يرد'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(call.timestamp).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: STATUS / STORIES */}
        {activeTab === 'status' && (
          <div className="p-4 space-y-4 text-xs">
            {/* My Status */}
            {(() => {
              const myStories = stories.filter((s) => s.userNumber === currentUser.number);
              const latestMyStory = myStories[0];

              return (
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800 flex items-center justify-between">
                  <div
                    onClick={() => {
                      if (myStories.length > 0 && onViewStory) {
                        const globalIdx = stories.findIndex((s) => s.id === latestMyStory.id);
                        onViewStory(globalIdx >= 0 ? globalIdx : 0);
                      } else if (onOpenCreateStatus) {
                        onOpenCreateStatus();
                      }
                    }}
                    className="flex items-center gap-3 cursor-pointer group flex-1"
                  >
                    <div className="relative">
                      <img
                        src={currentUser.avatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
                        alt={currentUser.name}
                        className={`w-12 h-12 rounded-full object-cover transition ${
                          myStories.length > 0
                            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 group-hover:scale-105'
                            : 'ring-1 ring-slate-700'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenCreateStatus) onOpenCreateStatus();
                        }}
                        className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-blue-600 hover:bg-blue-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white shadow"
                        title="إضافة حالة"
                      >
                        +
                      </button>
                    </div>

                    <div>
                      <span className="font-bold text-white block">حالتي</span>
                      <span className="text-slate-400 text-[11px]">
                        {myStories.length > 0
                          ? `لديك ${myStories.length} حالة منشورة • اضغط للمشاهدة`
                          : 'انقر لإضافة حالة جديدة'}
                      </span>
                    </div>
                  </div>

                  {onOpenCreateStatus && (
                    <button
                      type="button"
                      onClick={onOpenCreateStatus}
                      className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 border border-blue-500/30 transition text-xs flex items-center gap-1 shrink-0"
                      title="إضافة حالة جديدة"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Recent Updates Header */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                التحديثات الأخيرة
              </span>

              {(() => {
                const otherStories = stories.filter((s) => s.userNumber !== currentUser.number);

                if (otherStories.length === 0) {
                  return (
                    <div className="p-6 text-center text-slate-500 bg-slate-800/20 rounded-2xl border border-slate-800/60">
                      لا توجد حالات حديثة من جهات الاتصال بعد.
                    </div>
                  );
                }

                return (
                  <div className="space-y-1.5">
                    {otherStories.map((story) => {
                      const globalIdx = stories.findIndex((s) => s.id === story.id);
                      const diffMins = Math.floor((Date.now() - story.timestamp) / 60000);
                      const timeStr =
                        diffMins < 1 ? 'الآن' : diffMins < 60 ? `منذ ${diffMins} دقيقة` : `منذ ${Math.floor(diffMins / 60)} ساعة`;

                      return (
                        <div
                          key={story.id}
                          onClick={() => onViewStory && onViewStory(globalIdx >= 0 ? globalIdx : 0)}
                          className="p-2.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800/60 flex items-center gap-3 cursor-pointer transition"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={story.userAvatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
                              alt={story.userName}
                              className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-white block truncate">{story.userName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
                          </div>

                          <span className="text-[11px] text-blue-400 font-semibold px-2 py-0.5 rounded-lg bg-blue-500/10">
                            مشاهدة
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
