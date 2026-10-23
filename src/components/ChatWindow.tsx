import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ChatMessage } from '../types/tawasol';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { EmojiPicker } from './EmojiPicker';
import { ChatThemeModal, CHAT_WALLPAPER_THEMES } from './ChatThemeModal';
import { ForwardMessageModal } from './ForwardMessageModal';
import {
  Phone,
  Video,
  Camera,
  Mic,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Check,
  CheckCheck,
  Ban,
  Trash2,
  X,
  FileText,
  ShieldAlert,
  Share2,
  CheckSquare,
  Square,
  Reply,
  Film,
  Music,
  Image as ImageIcon,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Smartphone,
  Palette,
  Forward,
  Copy,
  Cloud,
  Sparkles,
} from 'lucide-react';

interface ChatWindowProps {
  currentUser: UserProfile;
  contact: UserProfile;
  messages: ChatMessage[];
  onSendMessage: (content: string, type?: 'text' | 'audio' | 'video' | 'image' | 'file', extra?: any) => void;
  onInitiateCall: (contact: UserProfile) => void;
  onInitiateVideoCall?: (contact: UserProfile) => void;
  onOpenCamera: (initialMode?: 'photo' | 'video') => void;
  isTyping: boolean;
  onSendTyping: (typing: boolean) => void;
  isBlockedByMe: boolean;
  onToggleBlock: (targetNumber: string) => void;
  onClearChat: () => void;
  onDeleteConversation?: () => void;
  onDeleteMessages?: (messageIds: string[]) => void;
  onBackToSidebar?: () => void;
  onOpenInvite?: () => void;
  contacts?: UserProfile[];
  onForwardMessage?: (messagesToForward: ChatMessage[], targetContacts: UserProfile[]) => void;
  adBlockerEnabled?: boolean;
  onToggleAdBlocker?: () => void;
  isCompactPhoneMode?: boolean;
  onToggleCompactPhoneMode?: () => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  cloudSyncEnabled?: boolean;
  onTriggerCloudBackup?: () => void;
}

const COMMON_EMOJIS = ['👋', '❤️', '👍', '🌹', '😂', '🔥', '🙏', '✨', '👏', '😍', '🎉', '💐', '🤲', '👌', '🤍', '🌙'];

const POPULAR_PHRASES = [
  'السلام عليكم ورحمة الله وبركاته 🌹',
  'صباح الخير والبركة والسرور ☀️',
  'مساء الورد والياسمين 🌸',
  'جمعة مباركة وطيبة 🤲',
  'أهلاً وسهلاً بك يا غالي 🤍',
  'ألف ألف مبروك وعقبال الفرحة 🎉',
  'جزاك الله خيراً ونفع بك ✨',
  'حياك الله وبارك فيك ☕',
  'الحمد لله على كل حال 🤲',
  'في أمان الله وحفظه ورعايته 👋',
];

const POPULAR_REACTIONS = ['❤️', '👍', '😂', '🔥', '👏', '🎉', '💐', '🤲'];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  currentUser,
  contact,
  messages,
  onSendMessage,
  onInitiateCall,
  onInitiateVideoCall,
  onOpenCamera,
  isTyping,
  onSendTyping,
  isBlockedByMe,
  onToggleBlock,
  onClearChat,
  onDeleteConversation,
  onDeleteMessages,
  onBackToSidebar,
  onOpenInvite,
  contacts = [],
  onForwardMessage,
  adBlockerEnabled = true,
  onToggleAdBlocker,
  isCompactPhoneMode = false,
  onToggleCompactPhoneMode,
  onReactToMessage,
  cloudSyncEnabled = true,
  onTriggerCloudBackup,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPopularPhrases, setShowPopularPhrases] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Chat Wallpaper Theme State
  const [chatThemeId, setChatThemeId] = useState<string>(() => {
    try {
      return localStorage.getItem('tawasol24_chat_theme') || 'default_dark';
    } catch {
      return 'default_dark';
    }
  });
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Clear Chat Confirmation Modal State
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Active Contextual Action on Clicked Message (التعامل مع الرسائل بالضغط عليها)
  const [activeActionMsg, setActiveActionMsg] = useState<ChatMessage | null>(null);

  // Forwarding State
  const [forwardingMessages, setForwardingMessages] = useState<ChatMessage[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const currentWallpaper = CHAT_WALLPAPER_THEMES.find((t) => t.id === chatThemeId) || CHAT_WALLPAPER_THEMES[0];

  const handleSelectChatTheme = (newId: string) => {
    setChatThemeId(newId);
    try {
      localStorage.setItem('tawasol24_chat_theme', newId);
    } catch {}
    showToast('تم تغيير لون وتنسيق خلفية الدردشة بنجاح 🎨');
  };

  // Message reply / quote state (الرد على رسالة واقتباسها)
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg_${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 2500);
    }
  };

  const getReplyPayload = () => {
    if (!replyingToMessage) return undefined;
    const isMine = replyingToMessage.from === currentUser.number;
    return {
      id: replyingToMessage.id,
      from: replyingToMessage.from,
      senderName: isMine ? currentUser.name : contact.name,
      content: replyingToMessage.content || (
        replyingToMessage.contentType === 'image'
          ? 'صورة 📸'
          : replyingToMessage.contentType === 'video'
          ? 'فيديو 🎥'
          : replyingToMessage.contentType === 'audio'
          ? 'مقطع صوتي 🎵'
          : 'ملف 📄'
      ),
      contentType: replyingToMessage.contentType,
      mediaUrl: replyingToMessage.mediaUrl,
    };
  };

  // Message selection & deletion state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());

  const toggleSelectMessage = (id: string) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedMsgIds.size === messages.length) {
      setSelectedMsgIds(new Set());
    } else {
      setSelectedMsgIds(new Set(messages.map((m) => m.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedMsgIds.size === 0) return;
    const count = selectedMsgIds.size;
    const confirmDelete = window.confirm(`هل أنت متأكد من مسح (${count}) رسالة محددة؟`);
    if (!confirmDelete) return;

    if (onDeleteMessages) {
      onDeleteMessages(Array.from(selectedMsgIds));
    }
    setSelectedMsgIds(new Set());
    setIsSelecting(false);
  };

  const handleDeleteSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmDelete = window.confirm('هل تريد مسح هذه الرسالة؟');
    if (!confirmDelete) return;

    if (onDeleteMessages) {
      onDeleteMessages([id]);
    }
  };

  // Comprehensive Clear Chat Handlers (خيارات مسح وحذف الدردشة)
  const handleClearAllMessages = () => {
    onClearChat();
    showToast('تم مسح جميع رسائل الدردشة بنجاح 🗑️');
    setShowClearConfirm(false);
  };

  const handleClearMediaOnly = () => {
    const mediaMsgIds = messages
      .filter((m) => m.contentType && m.contentType !== 'text')
      .map((m) => m.id);
    if (mediaMsgIds.length === 0) {
      showToast('لا توجد وسائط أو ملفات في هذه المحادثة لمسحها');
      setShowClearConfirm(false);
      return;
    }
    if (onDeleteMessages) {
      onDeleteMessages(mediaMsgIds);
    }
    showToast(`تم مسح (${mediaMsgIds.length}) من وسائط وملفات الدردشة 🗑️`);
    setShowClearConfirm(false);
  };

  const handleDeleteFullConversation = () => {
    if (onDeleteConversation) {
      onDeleteConversation();
    } else {
      onClearChat();
      if (onBackToSidebar) onBackToSidebar();
    }
    showToast('تم حذف المحادثة بالكامل 🗑️');
    setShowClearConfirm(false);
  };

  // Audio Recording State & Refs
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordSecondsRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Attachment Menu Horizontal Scroll & Drag Controls
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [isAttachDragging, setIsAttachDragging] = useState(false);
  const [attachStartX, setAttachStartX] = useState(0);
  const [attachScrollLeft, setAttachScrollLeft] = useState(0);

  const scrollAttachMenu = (dir: 'left' | 'right') => {
    if (!attachMenuRef.current) return;
    const offset = dir === 'left' ? -120 : 120;
    attachMenuRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleAttachMouseDown = (e: React.MouseEvent) => {
    if (!attachMenuRef.current) return;
    setIsAttachDragging(true);
    setAttachStartX(e.pageX - attachMenuRef.current.offsetLeft);
    setAttachScrollLeft(attachMenuRef.current.scrollLeft);
  };

  const handleAttachMouseMove = (e: React.MouseEvent) => {
    if (!isAttachDragging || !attachMenuRef.current) return;
    e.preventDefault();
    const x = e.pageX - attachMenuRef.current.offsetLeft;
    const walk = (x - attachStartX) * 1.5;
    attachMenuRef.current.scrollLeft = attachScrollLeft - walk;
  };

  const handleAttachMouseUp = () => setIsAttachDragging(false);

  const [attachTouchStartX, setAttachTouchStartX] = useState(0);
  const [attachTouchScrollLeft, setAttachTouchScrollLeft] = useState(0);

  const handleAttachTouchStart = (e: React.TouchEvent) => {
    if (!attachMenuRef.current) return;
    setAttachTouchStartX(e.touches[0].pageX - attachMenuRef.current.offsetLeft);
    setAttachTouchScrollLeft(attachMenuRef.current.scrollLeft);
  };

  const handleAttachTouchMove = (e: React.TouchEvent) => {
    if (!attachMenuRef.current) return;
    const x = e.touches[0].pageX - attachMenuRef.current.offsetLeft;
    const walk = (x - attachTouchStartX) * 1.5;
    attachMenuRef.current.scrollLeft = attachTouchScrollLeft - walk;
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onSendTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 1500);
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), 'text', {
      replyTo: getReplyPayload(),
    });
    setInputText('');
    setReplyingToMessage(null);
    onSendTyping(false);
  };

  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraPhotoRef = useRef<HTMLInputElement>(null);
  const nativeCameraVideoRef = useRef<HTMLInputElement>(null);

  const getSupportedAudioMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidateTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
    ];
    for (const t of candidateTypes) {
      try {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          return t;
        }
      } catch {}
    }
    return '';
  };

  // Start Voice Note Recording on ANY microphone icon click
  const startAudioRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];
        recordSecondsRef.current = 0;
        setRecordSeconds(0);
        setIsRecordingAudio(true);

        const mimeType = getSupportedAudioMimeType();
        const options = mimeType ? { mimeType } : undefined;
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, options);
        } catch {
          recorder = new MediaRecorder(stream);
        }

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          try {
            stream.getTracks().forEach((t) => t.stop());
          } catch {}

          const actualMime = recorder.mimeType || mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: actualMime });
          const finalDuration = recordSecondsRef.current > 0 ? recordSecondsRef.current : 2;

          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              onSendMessage('', 'audio', {
                mediaUrl: reader.result,
                duration: finalDuration,
                replyTo: getReplyPayload(),
              });
              setReplyingToMessage(null);
              showToast('تم إرسال التسجيل الصوتي بنجاح 🎙️');
            }
          };
          reader.readAsDataURL(blob);
        };

        recorder.start(250);
        mediaRecorderRef.current = recorder;

        if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = setInterval(() => {
          recordSecondsRef.current += 1;
          setRecordSeconds(recordSecondsRef.current);
        }, 1000);
      } else {
        audioFileInputRef.current?.click();
      }
    } catch (err: any) {
      console.warn('Microphone recording notice:', err);
      setIsRecordingAudio(false);
      showToast('يمكنك تسجيل أو اختيار مقطع صوت من جهازك مباشرة 🎵');
      audioFileInputRef.current?.click();
    }
  };

  const stopAudioRecording = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping media recorder:', err);
      }
    }
    setIsRecordingAudio(false);
  };

  const cancelAudioRecording = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    audioChunksRef.current = [];
    setIsRecordingAudio(false);
    showToast('تم إلغاء التسجيل الصوتي');
  };

  // File Upload Handling (Photos, Videos, Audio clips from gallery)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'audio' | 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const sizeFormatted = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        onSendMessage(file.name, type, {
          mediaUrl: reader.result,
          fileName: file.name,
          fileSize: sizeFormatted,
          duration: type === 'audio' ? 12 : undefined,
          replyTo: getReplyPayload(),
        });
        setReplyingToMessage(null);
      }
    };
    reader.readAsDataURL(file);
    setShowAttachMenu(false);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Top Chat Header / Selection Toolbar */}
      {isSelecting ? (
        <div className="h-14 px-3 sm:px-4 bg-slate-900 border-b border-blue-500/50 flex items-center justify-between z-20 shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setIsSelecting(false);
                setSelectedMsgIds(new Set());
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="إلغاء التحديد"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-white">
              تم تحديد ({selectedMsgIds.size})
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              {selectedMsgIds.size === messages.length && messages.length > 0
                ? 'إلغاء الكل'
                : 'تحديد الكل'}
            </button>

            {/* Forward Selected Messages */}
            <button
              type="button"
              onClick={() => {
                const selectedMsgs = messages.filter((m) => selectedMsgIds.has(m.id));
                if (selectedMsgs.length > 0) {
                  setForwardingMessages(selectedMsgs);
                  setShowForwardModal(true);
                }
              }}
              disabled={selectedMsgIds.size === 0}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                selectedMsgIds.size > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              title="إعادة توجيه الرسائل المحددة"
            >
              <Forward className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إعادة توجيه</span>
            </button>

            {/* Delete Selected Messages */}
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedMsgIds.size === 0}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                selectedMsgIds.size > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              title="مسح الرسائل المحددة"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="h-14 px-2.5 sm:px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {onBackToSidebar && (
              <button
                type="button"
                onClick={onBackToSidebar}
                className="md:hidden p-1.5 -mr-1 text-slate-300 hover:text-white rounded-xl active:bg-slate-800 transition flex items-center gap-0.5 shrink-0"
                title="الرجوع لقائمة المحادثات"
              >
                <ChevronRight className="w-5 h-5 text-blue-400" />
              </button>
            )}

            {/* Contact Avatar */}
            <div className="relative shrink-0">
              <img
                src={contact.avatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
                alt={contact.name}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-1 ring-slate-700"
              />
              {contact.isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              )}
            </div>

            {/* Contact Details */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <h4 className="font-bold text-xs sm:text-sm text-white truncate">{contact.name}</h4>
                <span className="text-[10px] sm:text-[11px] font-mono text-blue-400 font-semibold px-1 py-0.2 rounded bg-blue-500/10 shrink-0">
                  {contact.number}
                </span>
              </div>

              {/* Status / Typing Indicator */}
              {isTyping ? (
                <span className="text-[11px] text-blue-400 font-medium flex items-center gap-1 truncate">
                  <span className="inline-block animate-pulse">جاري الكتابة</span>
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                  </span>
                </span>
              ) : contact.isOnline ? (
                <span className="text-[10px] sm:text-[11px] text-emerald-400 font-medium truncate">متصل الآن</span>
              ) : (
                <span className="text-[10px] text-slate-400 truncate">
                  آخر ظهور: {new Date(contact.lastSeen).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Action Controls: AdBlocker, Phone Mode, Voice Call, Direct Video Call & Menu */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto touch-pan-x no-scrollbar py-0.5 scroll-smooth shrink-0"
            onWheel={(e) => {
              e.currentTarget.scrollLeft += e.deltaY;
            }}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Highly Effective Ad Blocker Quick Toggle */}
            {onToggleAdBlocker && (
              <button
                type="button"
                onClick={onToggleAdBlocker}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition flex items-center gap-1 shrink-0 ${
                  adBlockerEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-sm'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25 animate-pulse'
                }`}
                title={adBlockerEnabled ? 'مانع الإعلانات: مفعل ومحمي 100% (اضغط للإيقاف)' : 'تم إيقاف مانع الإعلانات (اضغط للتفعيل)'}
              >
                <Shield className={`w-3.5 h-3.5 ${adBlockerEnabled ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className="hidden sm:inline text-[11px] font-bold">
                  {adBlockerEnabled ? 'حظر الإعلانات' : 'حظر إعلانات'}
                </span>
              </button>
            )}

            {/* Toggle Phone/Compact View for flexible mobile ergonomics */}
            {onToggleCompactPhoneMode && (
              <button
                type="button"
                onClick={onToggleCompactPhoneMode}
                className={`p-1.5 rounded-xl border transition hidden sm:flex items-center gap-1 shrink-0 ${
                  isCompactPhoneMode
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                    : 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isCompactPhoneMode ? 'وضع الهاتف المدمج مفعّل (اضغط للوضع الموسع)' : 'التبديل إلى وضع الهاتف المدمج'}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Optional Cloud Sync Indicator & Quick Backup */}
            {cloudSyncEnabled && (
              <button
                type="button"
                onClick={onTriggerCloudBackup}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition flex items-center gap-1 shrink-0"
                title="النسخ والتخزين السحابي مفعّل - اضغط للنسخ السحابي الفوري"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px] font-bold">سحابي ✓</span>
              </button>
            )}
            {/* 1. Voice Call Button */}
            <button
              type="button"
              onClick={() => onInitiateCall(contact)}
              disabled={isBlockedByMe}
              className={`p-1.5 sm:px-3 sm:py-2 rounded-xl border transition flex items-center gap-1.5 ${
                isBlockedByMe
                  ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-500'
                  : 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white shadow-sm'
              }`}
              title="إجراء اتصال صوتي مشفر برقم تواصل"
            >
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-xs font-semibold">اتصال صوتي</span>
            </button>

            {/* 2. Direct Video Call Button */}
            <button
              type="button"
              onClick={() => (onInitiateVideoCall ? onInitiateVideoCall(contact) : onInitiateCall(contact))}
              disabled={isBlockedByMe}
              className={`p-1.5 sm:px-3 sm:py-2 rounded-xl border transition flex items-center gap-1.5 ${
                isBlockedByMe
                  ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-500'
                  : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white shadow-sm'
              }`}
              title="إجراء اتصال مباشر (فيديو عالي الدقة)"
            >
              <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-xs font-semibold">اتصال مباشر</span>
            </button>

            {/* More Options Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {showMenu && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl py-2 z-40 text-xs animate-in fade-in slide-in-from-top-2">
                  {/* قسم خيارات حذف الدردشة */}
                  <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-700/60 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                      خيارات حذف ومسح الدردشة
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">تواصل 24</span>
                  </div>

                  {/* 1. مسح رسائل الدردشة (فتح نافذة الخيارات) */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowClearConfirm(true);
                    }}
                    className="w-full px-4 py-2 text-right flex items-center justify-between text-rose-300 hover:text-white hover:bg-rose-600/20 transition font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                      <div className="flex flex-col text-right">
                        <span>مسح رسائل الدردشة</span>
                        <span className="text-[10px] text-slate-400 font-normal">خيارات تفريغ المحادثة</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {/* 2. مسح الوسائط والملفات فقط */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      handleClearMediaOnly();
                    }}
                    className="w-full px-4 py-2 text-right flex items-center gap-2 text-amber-300 hover:text-white hover:bg-amber-600/20 transition font-semibold"
                  >
                    <Film className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex flex-col text-right">
                      <span>مسح الوسائط والملفات فقط</span>
                      <span className="text-[10px] text-slate-400 font-normal">إزالة الصور والفيديو والصوتيات</span>
                    </div>
                  </button>

                  {/* 3. حذف المحادثة بالكامل */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      handleDeleteFullConversation();
                    }}
                    className="w-full px-4 py-2 text-right flex items-center gap-2 text-rose-400 hover:text-white hover:bg-rose-600/30 transition font-bold"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                    <div className="flex flex-col text-right">
                      <span>حذف المحادثة بالكامل</span>
                      <span className="text-[10px] text-rose-300/70 font-normal">حذف الرسائل وإغلاق الشاشة</span>
                    </div>
                  </button>

                  {/* 4. تحديد رسائل لحذفها */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelecting(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-right flex items-center gap-2 text-blue-300 hover:text-white hover:bg-slate-700/70 transition font-medium"
                  >
                    <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="flex flex-col text-right">
                      <span>تحديد رسائل لحذفها</span>
                      <span className="text-[10px] text-slate-400 font-normal">اختيار وحذف رسائل بعينها</span>
                    </div>
                  </button>

                  <div className="border-t border-slate-700/60 my-1.5" />

                  {/* 5. لون خلفية الدردشة */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowThemeModal(true);
                    }}
                    className="w-full px-4 py-2 text-right flex items-center gap-2.5 text-purple-300 hover:text-white hover:bg-slate-700/70 transition font-semibold"
                  >
                    <Palette className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>لون وتنسيق خلفية الدردشة</span>
                  </button>

                  {/* 4. حظر المستخدم */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleBlock(contact.number);
                      setShowMenu(false);
                    }}
                    className={`w-full px-4 py-2.5 text-right flex items-center gap-2.5 hover:bg-slate-700/70 transition ${
                      isBlockedByMe ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                    <span>{isBlockedByMe ? 'إلغاء حظر هذا الرقم' : 'حظر هذا المستخدم'}</span>
                  </button>

                  {onOpenInvite && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenInvite();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-right flex items-center gap-2.5 text-slate-300 hover:bg-slate-700/70 transition"
                    >
                      <Share2 className="w-4 h-4 text-emerald-400" />
                      <span>مشاركة رابط المنصة</span>
                    </button>
                  )}

                  <div className="border-t border-slate-700/60 my-1 px-3 py-2 text-[10px] text-slate-400 space-y-1 bg-slate-900/40 rounded-b-xl">
                    <div className="font-bold text-slate-300 mb-1">دليل علامات الرسائل:</div>
                    <div className="flex items-center gap-1.5 text-blue-200/90">
                      <Check className="w-3 h-3 text-blue-200" />
                      <span>صح واحدة: تم الإرسال</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <CheckCheck className="w-3 h-3 text-blue-100" />
                      <span>صحان رماديان: تم التسليم</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
                      <CheckCheck className="w-3 h-3 text-cyan-300" />
                      <span>صحان ملونان بالأزرق: تمت القراءة</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Blocked Notification Banner */}
      {isBlockedByMe && (
        <div className="bg-rose-950/60 border-b border-rose-900/40 p-2.5 px-4 flex items-center justify-between text-xs text-rose-300 z-10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>لقد قمت بحظر هذا المستخدم. لن تتمكن من مراسلته أو الاتصال به.</span>
          </div>
          <button
            onClick={() => onToggleBlock(contact.number)}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium text-[11px] transition shrink-0"
          >
            إلغاء الحظر
          </button>
        </div>
      )}

      {/* Messages Feed Area - Compact, Agile and Phone-Friendly */}
      <div 
        className="flex-1 p-2 sm:p-3 overflow-y-auto space-y-2 sm:space-y-2.5 chat-pattern transition-colors duration-300"
        style={{ backgroundColor: currentWallpaper.bgHex }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2.5">
              <Phone className="w-5 h-5" />
            </div>
            <h5 className="font-bold text-white text-sm mb-1">بدء محادثة تواصل 24</h5>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              محادثة سريعة، تشفير كامل، إرسال فوري للرسائل ومقاطع الصوت والفيديو دون الحاجة لأذونات معقدة.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSender = msg.from === currentUser.number;
            const isMsgSelected = selectedMsgIds.has(msg.id);
            const isHighlighted = highlightedMsgId === msg.id;
            const isActionActive = activeActionMsg?.id === msg.id;

            return (
              <div
                key={msg.id}
                id={`msg_${msg.id}`}
                onClick={() => {
                  if (isSelecting) {
                    toggleSelectMessage(msg.id);
                  } else {
                    setActiveActionMsg(isActionActive ? null : msg);
                  }
                }}
                className={`flex items-center gap-1.5 sm:gap-2 transition group relative ${
                  isSelecting ? 'cursor-pointer hover:bg-slate-900/40 p-1 rounded-2xl' : 'cursor-pointer'
                } ${isSender ? 'justify-end' : 'justify-start'} ${
                  isHighlighted ? 'ring-2 ring-cyan-400 bg-cyan-950/40 p-1 rounded-2xl duration-300' : ''
                } ${isActionActive ? 'z-20' : ''}`}
              >
                {/* Contextual Action Bar on Click (تفاعلات شعبية سريعة + تحديد - إعادة توجيه - مسح - رد - نسخ) */}
                {!isSelecting && isActionActive && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute z-30 -top-16 ${
                      isSender ? 'left-2' : 'right-2'
                    } bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-1 shadow-2xl flex flex-col gap-1 text-[11px] font-semibold animate-in fade-in zoom-in-95`}
                  >
                    {/* شريط التفاعلات الشعبية السريعة */}
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-slate-950/70 rounded-xl">
                      {POPULAR_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            if (onReactToMessage) {
                              onReactToMessage(msg.id, emoji);
                            }
                            showToast(`تفاعلت بـ ${emoji}`);
                            setActiveActionMsg(null);
                          }}
                          className="hover:scale-130 transition-transform text-sm p-0.5 active:scale-95"
                          title={`تفاعل بـ ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 px-1">
                      {/* تحديد الرسالة */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSelecting(true);
                          setSelectedMsgIds(new Set([msg.id]));
                          setActiveActionMsg(null);
                        }}
                        className="p-1 hover:text-blue-400 text-slate-200 rounded flex items-center gap-1 transition"
                        title="تحديد الرسالة"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span>تحديد</span>
                      </button>

                    <div className="w-[1px] h-3 bg-slate-700" />

                    {/* إعادة توجيه الرسالة */}
                    <button
                      type="button"
                      onClick={() => {
                        setForwardingMessages([msg]);
                        setShowForwardModal(true);
                        setActiveActionMsg(null);
                      }}
                      className="p-1 hover:text-emerald-400 text-slate-200 rounded flex items-center gap-1 transition"
                      title="إعادة توجيه الرسالة"
                    >
                      <Forward className="w-3.5 h-3.5 text-emerald-400" />
                      <span>توجيه</span>
                    </button>

                    <div className="w-[1px] h-3 bg-slate-700" />

                    {/* مسح الرسالة */}
                    {onDeleteMessages && (
                      <button
                        type="button"
                        onClick={(e) => {
                          handleDeleteSingle(e, msg.id);
                          setActiveActionMsg(null);
                        }}
                        className="p-1 hover:text-rose-400 text-rose-300 rounded flex items-center gap-1 transition"
                        title="مسح هذه الرسالة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>مسح</span>
                      </button>
                    )}

                    <div className="w-[1px] h-3 bg-slate-700" />

                    {/* الرد على الرسالة */}
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToMessage(msg);
                        setActiveActionMsg(null);
                      }}
                      className="p-1 hover:text-cyan-400 text-slate-200 rounded flex items-center gap-1 transition"
                      title="الرد على الرسالة"
                    >
                      <Reply className="w-3.5 h-3.5 text-cyan-400 rotate-180" />
                      <span>رد</span>
                    </button>

                    {/* نسخ النص إذا كان نصياً */}
                    {msg.contentType === 'text' && msg.content && (
                      <>
                        <div className="w-[1px] h-3 bg-slate-700" />
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(msg.content);
                            }
                            showToast('تم نسخ النص إلى الحافظة 📋');
                            setActiveActionMsg(null);
                          }}
                          className="p-1 hover:text-amber-400 text-slate-200 rounded flex items-center gap-1 transition"
                          title="نسخ النص"
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>نسخ</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
                {/* Selection Checkbox */}
                {isSelecting && (
                  <div className="shrink-0">
                    {isMsgSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                )}

                {/* Quick Reply Button (hover on left of received message) */}
                {!isSelecting && !isSender && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyingToMessage(msg);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition"
                    title="الرد على هذه الرسالة واقتباسها"
                  >
                    <Reply className="w-4 h-4 rotate-180" />
                  </button>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[78%] md:max-w-[72%] rounded-2xl p-2.5 sm:p-3 shadow-md relative transition ${
                    isMsgSelected ? 'ring-2 ring-blue-400 shadow-blue-500/20' : ''
                  } ${
                    isSender
                      ? 'bg-blue-600 text-white rounded-bl-sm'
                      : 'bg-slate-800 text-slate-100 rounded-br-sm border border-slate-700/60'
                  }`}
                >
                  {/* Replied / Quoted Message Snippet */}
                  {msg.replyTo && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToMessage(msg.replyTo!.id);
                      }}
                      className={`mb-2 p-2 rounded-xl text-xs cursor-pointer border-r-4 transition flex flex-col gap-0.5 select-none ${
                        isSender
                          ? 'bg-blue-700/60 border-cyan-300 text-blue-100 hover:bg-blue-700/80'
                          : 'bg-slate-900/60 border-blue-400 text-slate-200 hover:bg-slate-900/80'
                      }`}
                      title="اضغط للانتقال إلى الرسالة الأصلية المقتبسة"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-cyan-300 flex items-center gap-1">
                          <Reply className="w-3 h-3 rotate-180" />
                          {msg.replyTo.senderName || `مستخدم ${msg.replyTo.from}`}
                        </span>
                        {msg.replyTo.contentType !== 'text' && (
                          <span className="text-[10px] opacity-75">
                            {msg.replyTo.contentType === 'image' && 'صورة 📸'}
                            {msg.replyTo.contentType === 'video' && 'فيديو 🎥'}
                            {msg.replyTo.contentType === 'audio' && 'صوت 🎵'}
                            {msg.replyTo.contentType === 'file' && 'مستند 📄'}
                          </span>
                        )}
                      </div>
                      <span className="truncate text-[11px] opacity-90 block">
                        {msg.replyTo.content || 'وسائط مرفقة'}
                      </span>
                    </div>
                  )}

                  {/* Content: Text */}
                  {msg.contentType === 'text' && (
                    <p className="text-[13px] sm:text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                  )}

                  {/* Content: Audio Voice Note or Gallery Clip */}
                  {msg.contentType === 'audio' && (
                    <div>
                      {msg.fileName && (
                        <div className="flex items-center gap-1.5 text-[11px] mb-1.5 font-semibold opacity-90 text-amber-300">
                          <Music className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">{msg.fileName}</span>
                          {msg.fileSize && <span className="text-[9px] opacity-75">({msg.fileSize})</span>}
                        </div>
                      )}
                      <VoiceNotePlayer
                        mediaUrl={msg.mediaUrl}
                        duration={msg.duration || 6}
                        isSender={isSender}
                      />
                    </div>
                  )}

                  {/* Content: Video (Recorded or from Gallery) */}
                  {msg.contentType === 'video' && msg.mediaUrl && (
                    <div className="rounded-xl overflow-hidden max-w-sm mb-1 bg-black/40 border border-slate-700/50">
                      <video
                        src={msg.mediaUrl}
                        controls
                        playsInline
                        className="w-full max-h-72 rounded-t-xl bg-black"
                      />
                      <div className="p-2 flex items-center justify-between text-xs bg-slate-900/70 border-t border-slate-800">
                        <div className="flex items-center gap-1.5 text-[11px] text-purple-300">
                          <Film className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[150px]">{msg.fileName || 'مقطع فيديو'}</span>
                          {msg.fileSize && <span className="text-[9px] opacity-70">({msg.fileSize})</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewVideoUrl(msg.mediaUrl || null)}
                          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                          title="عرض ملء الشاشة"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {msg.content && <p className="text-xs p-2 pt-1">{msg.content}</p>}
                    </div>
                  )}

                  {/* Content: Image */}
                  {msg.contentType === 'image' && msg.mediaUrl && (
                    <div className="rounded-xl overflow-hidden max-w-sm mb-1 cursor-pointer" onClick={() => setPreviewMedia(msg.mediaUrl || null)}>
                      <img src={msg.mediaUrl} alt="صورة مرسلة" className="w-full max-h-72 object-cover rounded-xl" />
                      {msg.content && <p className="text-xs mt-1.5">{msg.content}</p>}
                    </div>
                  )}

                  {/* Content: Generic Document */}
                  {msg.contentType === 'file' && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-black/20 text-xs">
                      <FileText className="w-6 h-6 text-blue-300" />
                      <div>
                        <span className="font-semibold block truncate max-w-[160px]">{msg.fileName || msg.content}</span>
                        <span className="text-[10px] opacity-75">{msg.fileSize || 'ملف'}</span>
                      </div>
                    </div>
                  )}

                  {/* Bubble Timestamp & Status Ticks & Single Delete Icon */}
                  <div
                    className={`flex items-center gap-2 text-[10px] mt-1.5 ${
                      isSender ? 'text-blue-100 justify-end' : 'text-slate-400 justify-start'
                    }`}
                  >
                    {/* Delete Single Message Button */}
                    {!isSelecting && onDeleteMessages && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingle(e, msg.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-400 transition"
                        title="مسح هذه الرسالة"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    <span className="font-mono">{formatTime(msg.timestamp)}</span>

                    {isSender && (
                      <div
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium select-none transition-colors ${
                          msg.status === 'read'
                            ? 'bg-blue-900/60 text-cyan-300'
                            : msg.status === 'delivered'
                            ? 'bg-blue-800/40 text-blue-100'
                            : 'bg-blue-900/40 text-blue-200/80'
                        }`}
                        title={
                          msg.status === 'read'
                            ? 'تمت القراءة (صحين ملونين بالأزرق)'
                            : msg.status === 'delivered'
                            ? 'تم التسليم (صحين رماديين)'
                            : 'تم الإرسال (صح واحدة)'
                        }
                      >
                        <span className="leading-none">
                          {msg.status === 'read'
                            ? 'تمت القراءة'
                            : msg.status === 'delivered'
                            ? 'تم التسليم'
                            : 'تم الإرسال'}
                        </span>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-300 stroke-[2.5]" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-100" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-blue-200" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Popular Reactions Pills (التفاعلات النشطة على الرسالة) */}
                  {msg.reactions && Object.entries(msg.reactions).some(([_, count]) => count > 0) && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap pt-1 border-t border-white/10">
                      {Object.entries(msg.reactions).map(([emoji, count]) => {
                        if (!count || count <= 0) return null;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onReactToMessage) {
                                onReactToMessage(msg.id, emoji);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm transition active:scale-95 ${
                              isSender ? 'bg-blue-700/80 text-white' : 'bg-slate-900/90 text-slate-100 border border-slate-700'
                            }`}
                            title={`تفاعل (${count}) بـ ${emoji} - اضغط للتفاعل`}
                          >
                            <span>{emoji}</span>
                            <span className="font-mono text-[9px] opacity-90">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Reply Button (hover on right of sent message) */}
                {!isSelecting && isSender && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyingToMessage(msg);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition"
                    title="الرد على هذه الرسالة واقتباسها"
                  >
                    <Reply className="w-4 h-4 rotate-180" />
                  </button>
                )}
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Banner pinned above the input bar */}
      {replyingToMessage && (
        <div className="px-4 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between z-20 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-1 h-8 rounded-full bg-cyan-400 shrink-0" />
            <div className="text-right overflow-hidden">
              <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                <Reply className="w-3 h-3 rotate-180" />
                الرد على: {replyingToMessage.from === currentUser.number ? 'رسالتك' : contact.name}
              </span>
              <span className="text-xs text-slate-300 truncate block">
                {replyingToMessage.content || (
                  replyingToMessage.contentType === 'image'
                    ? 'صورة 📸'
                    : replyingToMessage.contentType === 'video'
                    ? 'فيديو 🎥'
                    : replyingToMessage.contentType === 'audio'
                    ? 'مقطع صوتي 🎵'
                    : 'ملف 📄'
                )}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToMessage(null)}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="إلغاء الرد"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Comprehensive Categorized Emoji Picker Drawer */}
      {showEmojiPicker && (
        <div className="p-2 bg-slate-950/90 border-t border-slate-800 flex justify-center z-20">
          <EmojiPicker
            onSelectEmoji={(emoji) => setInputText((prev) => prev + emoji)}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Attachment Menu Popup (Gallery Photos, Gallery Videos, Audio clips, Files - NO duplicate camera) */}
      {showAttachMenu && (
        <div className="p-2.5 bg-slate-900 border-t border-slate-800 z-20 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-1 max-w-xl mx-auto">
            {/* Scroll right arrow */}
            <button
              type="button"
              onClick={() => scrollAttachMenu('left')}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
              title="تحريك الخيارات لليمين"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Horizontally scrollable attachment items with smooth mouse/touch drag and wheel */}
            <div
              ref={attachMenuRef}
              onMouseDown={handleAttachMouseDown}
              onMouseMove={handleAttachMouseMove}
              onMouseUp={handleAttachMouseUp}
              onMouseLeave={handleAttachMouseUp}
              onTouchStart={handleAttachTouchStart}
              onTouchMove={handleAttachTouchMove}
              onWheel={(e) => {
                if (attachMenuRef.current) {
                  attachMenuRef.current.scrollLeft += e.deltaY;
                }
              }}
              className="flex items-center justify-around gap-4 sm:gap-6 overflow-x-auto touch-pan-x no-scrollbar py-1 px-2 select-none cursor-grab active:cursor-grabbing w-full scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* 0. Live Voice Recording with Microphone (تسجيل صوتي فوري) */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false);
                  startAudioRecording();
                }}
                className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition shadow-md shadow-emerald-600/10 active:scale-95">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200">تسجيل صوتي</span>
              </button>

              {/* 1. Photos from Gallery (علامة الصور لاستخدام الصور) */}
              <label className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/40 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition shadow-md shadow-purple-600/10 active:scale-95">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200">الصور</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'image')}
                />
              </label>

              {/* 2. Video from Gallery (علامة الفيديو لاستخدام الفيديو) */}
              <label className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/40 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition shadow-md shadow-rose-600/10 active:scale-95">
                  <Film className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200">الفيديو</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'video')}
                />
              </label>

              {/* 3. Audio clips from Gallery/Device */}
              <label className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/40 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition shadow-md shadow-amber-600/10 active:scale-95">
                  <Music className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200">مقطع صوتي</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'audio')}
                />
              </label>

              {/* 4. Files & Documents */}
              <label className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition shadow-md shadow-blue-600/10 active:scale-95">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200">مستندات</span>
                <input
                  type="file"
                  accept="*/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'file')}
                />
              </label>
            </div>

            {/* Scroll left arrow */}
            <button
              type="button"
              onClick={() => scrollAttachMenu('right')}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
              title="تحريك الخيارات لليسار"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden Zero-Permission Native Hardware Pickers */}
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'audio')}
      />
      <input
        ref={nativeCameraPhotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'image')}
      />
      <input
        ref={nativeCameraVideoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'video')}
      />

      {/* Popular Expressions Bar (شريط العبارات والتحيات الشعبية السريعة) */}
      {showPopularPhrases && (
        <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-2 z-20">
          <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold pl-2 border-l border-slate-800 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span>عبارات شعبية:</span>
          </div>
          {POPULAR_PHRASES.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => {
                onSendMessage(phrase, 'text', { replyTo: getReplyPayload() });
                setReplyingToMessage(null);
                showToast('تم إرسال العبارة الشعبية ✨');
                setShowPopularPhrases(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-blue-600 hover:text-white border border-slate-700/80 text-slate-200 text-xs whitespace-nowrap transition active:scale-95 shrink-0"
            >
              {phrase}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Input Area - Compact and Phone Ergonomic */}
      <div className="p-2 sm:p-2.5 bg-slate-900 border-t border-slate-800 shrink-0 z-20">
        {isBlockedByMe ? (
          <div className="text-center py-1.5 text-xs text-slate-500">
            تم حظر التواصل مع هذا الرقم. قم بإلغاء الحظر للكتابة.
          </div>
        ) : isRecordingAudio ? (
          /* Live Voice Recording Bar */
          <div className="flex items-center justify-between bg-slate-800 px-3.5 py-2 rounded-2xl border border-rose-500/40 shadow-lg shadow-rose-950/20 animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={stopAudioRecording}
                className="p-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 animate-pulse hover:bg-rose-500 hover:text-white transition shrink-0"
                title="اضغط على الميكروفون لإيقاف وإرسال التسجيل"
              >
                <Mic className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-rose-400 shrink-0">
                00:{recordSeconds.toString().padStart(2, '0')}
              </span>
              <span className="text-xs text-slate-300 truncate font-medium">جاري تسجيل رسالة صوتية...</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={cancelAudioRecording}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-700/60 transition"
                title="إلغاء التسجيل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopAudioRecording}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5 text-xs font-bold"
                title="إرسال الصوت"
              >
                <span>إرسال</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Standard Input Bar - Compact & Ergonomic for Mobile Phones */
          <form onSubmit={handleSendText} className="flex items-center gap-1 sm:gap-1.5">
            {/* Compact Action Icons Bar (Paperclip, Camera, Video, Phrases, Emoji) */}
            <div
              className="flex items-center gap-0.5 sm:gap-1 shrink-0"
            >
              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(!showAttachMenu);
                  setShowEmojiPicker(false);
                  setShowPopularPhrases(false);
                }}
                className={`p-1 sm:p-1.5 rounded-lg transition shrink-0 ${
                  showAttachMenu
                    ? 'text-white bg-blue-600 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="المرفقات (صور، فيديو، صوت، مستندات)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Photo Camera Button */}
              <button
                type="button"
                onClick={() => onOpenCamera('photo')}
                className="p-1 sm:p-1.5 text-sky-400 hover:text-white rounded-lg hover:bg-sky-500/20 transition shrink-0"
                title="التقاط صورة بكاميرا الجهاز مباشرة"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Video Recording Button */}
              <button
                type="button"
                onClick={() => onOpenCamera('video')}
                className="p-1 sm:p-1.5 text-rose-400 hover:text-white rounded-lg hover:bg-rose-500/20 transition shrink-0"
                title="تسجيل فيديو مباشر بكاميرا الجهاز"
              >
                <Video className="w-4 h-4" />
              </button>

              {/* Popular Community Phrases Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setShowPopularPhrases(!showPopularPhrases);
                  setShowAttachMenu(false);
                  setShowEmojiPicker(false);
                }}
                className={`p-1 sm:p-1.5 rounded-lg transition shrink-0 ${
                  showPopularPhrases
                    ? 'text-amber-300 bg-amber-500/20'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
                }`}
                title="العبارات والتحيات الشعبية السريعة"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              {/* Emoji Button */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowAttachMenu(false);
                  setShowPopularPhrases(false);
                }}
                className={`p-1 sm:p-1.5 rounded-lg transition shrink-0 ${
                  showEmojiPicker
                    ? 'text-amber-300 bg-amber-500/20'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
                }`}
                title="الرموز التعبيرية والفيسات"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={replyingToMessage ? "اكتب ردك..." : "اكتب رسالة..."}
              className="flex-1 min-w-0 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition"
            />

            {/* Send or Mic Button */}
            {inputText.trim() ? (
              <button
                type="submit"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/30 active:scale-95 transition shrink-0"
                title="إرسال الرسالة"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startAudioRecording}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/30 active:scale-95 transition shrink-0"
                title="تسجيل رسالة صوتية (اضغط للتسجيل)"
              >
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* نافذة تأكيد خيارات حذف ومسح الدردشة (Clear Chat Options Modal) */}
      {showClearConfirm && (
        <div
          onClick={() => setShowClearConfirm(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col text-right animate-in zoom-in-95"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">خيارات حذف ومسح الدردشة</h3>
                  <p className="text-xs text-slate-400">محادثة: {contact.name} ({contact.number})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              يرجى اختيار الإجراء المطلوب تنفيذه على محادثة {contact.name}:
            </p>

            {/* Options List */}
            <div className="space-y-2.5 mb-5">
              {/* خيار 1: مسح جميع الرسائل */}
              <button
                type="button"
                onClick={handleClearAllMessages}
                className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-rose-500/50 flex items-start gap-3 transition group text-right"
              >
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition shrink-0 mt-0.5">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-white group-hover:text-rose-300 block mb-0.5">
                    مسح جميع رسائل الدردشة
                  </span>
                  <span className="text-[11px] text-slate-400 leading-normal block">
                    سيتم مسح كافة الرسائل النصية والصوتية والوسائط مع إبقاء المحادثة مفتوحة.
                  </span>
                </div>
              </button>

              {/* خيار 2: مسح الوسائط والملفات فقط */}
              <button
                type="button"
                onClick={handleClearMediaOnly}
                className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 flex items-start gap-3 transition group text-right"
              >
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition shrink-0 mt-0.5">
                  <Film className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-white group-hover:text-amber-300 block mb-0.5">
                    مسح الوسائط والملفات فقط
                  </span>
                  <span className="text-[11px] text-slate-400 leading-normal block">
                    إزالة الصور ومقاطع الفيديو والتسجيلات لتوفير المساحة مع الاحتفاظ بالنصوص.
                  </span>
                </div>
              </button>

              {/* خيار 3: حذف المحادثة بالكامل */}
              <button
                type="button"
                onClick={handleDeleteFullConversation}
                className="w-full p-3 rounded-2xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/50 hover:border-rose-600 flex items-start gap-3 transition group text-right"
              >
                <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition shrink-0 mt-0.5">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-rose-300 block mb-0.5">
                    حذف المحادثة بالكامل وإغلاقها
                  </span>
                  <span className="text-[11px] text-rose-200/70 leading-normal block">
                    مسح كافة الرسائل وإغلاق نافذة الدردشة والعودة لقائمة المحادثات.
                  </span>
                </div>
              </button>
            </div>

            {/* Cancel Button */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة اختيار وتغيير لون خلفية الدردشة */}
      <ChatThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentThemeId={chatThemeId}
        onSelectTheme={handleSelectChatTheme}
      />

      {/* نافذة إعادة توجيه الرسالة لجهات الاتصال */}
      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardingMessages([]);
        }}
        message={forwardingMessages[0] || null}
        contacts={contacts}
        currentUserNumber={currentUser.number}
        onConfirmForward={(targetContacts) => {
          if (onForwardMessage && forwardingMessages.length > 0) {
            onForwardMessage(forwardingMessages, targetContacts);
            showToast(`تمت إعادة توجيه الرسالة إلى (${targetContacts.length}) جهة اتصال بنجاح 🚀`);
          }
          setShowForwardModal(false);
          setForwardingMessages([]);
          setIsSelecting(false);
          setSelectedMsgIds(new Set());
        }}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 border border-blue-500/50 rounded-2xl text-xs font-semibold text-white shadow-xl shadow-black/50 animate-in fade-in zoom-in-95 pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* Video Zoom Modal */}
      {previewVideoUrl && (
        <div
          onClick={() => setPreviewVideoUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center">
            <video
              src={previewVideoUrl}
              controls
              autoPlay
              className="w-full max-h-[80vh] rounded-2xl bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setPreviewVideoUrl(null)}
              className="absolute -top-10 right-0 text-white bg-slate-800 p-2 rounded-full hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Media Zoom Modal */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <img src={previewMedia} alt="معاينة" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
};
