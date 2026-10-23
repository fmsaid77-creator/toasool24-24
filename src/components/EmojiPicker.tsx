import React, { useState, useMemo, useRef } from 'react';
import {
  Smile,
  Heart,
  ThumbsUp,
  Sparkles,
  Cat,
  Coffee,
  Search,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'faces',
    name: 'وجوه وتعبيرات',
    icon: <Smile className="w-4 h-4" />,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
      '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎',
      '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺',
      '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
      '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
      '👿', '💀', '☠️', '💩', '🤡', '👻', '👽', '👾', '🤖', '🙈',
      '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞',
    ],
  },
  {
    id: 'gestures',
    name: 'إيماءات وأيدي',
    icon: <ThumbsUp className="w-4 h-4" />,
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘',
      '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚',
      '🖐', '🖖', '👋', '🤙', '💪', '🦾', '🙏', '🤝', '👏', '🙌',
      '👐', '🤲', '✍️', '💅', '🤳', '👂', '👃', '👀', '👁️', '🧠',
    ],
  },
  {
    id: 'hearts',
    name: 'قلوب ومشاعر',
    icon: <Heart className="w-4 h-4" />,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌',
      '💋', '💯', '💢', '💥', '💫', '💦', '💨', '🔥', '✨', '⭐',
      '🌟', '⚡', '🌙', '☀️', '🌈', '💐', '🌹', '🥀', '🌺', '🌸',
    ],
  },
  {
    id: 'celebration',
    name: 'احتفال وطبيعة',
    icon: <Sparkles className="w-4 h-4" />,
    emojis: [
      '🎉', '🎊', '🎈', '🎂', '🎁', '🏆', '🥇', '🥈', '🥉', '👑',
      '💎', '💍', '🎀', '🪄', '🔮', '🧿', '🪄', '🪅', '🎆', '🎇',
      '🌹', '🌸', '🌺', '🌻', '🌼', '🌷', '💐', '🌾', '🌿', '🍀',
      '🍁', '🍂', '🍃', '🌴', '🌲', '🌳', '🪴', '⛅', '☁️', '❄️',
    ],
  },
  {
    id: 'animals',
    name: 'حيوانات',
    icon: <Cat className="w-4 h-4" />,
    emojis: [
      '🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
      '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
      '🐌', '🐞', '🐢', '🐍', '🐙', '🐠', '🐬', '🐳', '🦈', '🕊️',
    ],
  },
  {
    id: 'food',
    name: 'أطعمة ومشروبات',
    icon: <Coffee className="w-4 h-4" />,
    emojis: [
      '☕', '🍵', '🧃', '🥤', '🧋', '🍼', '🥛', '🍏', '🍎', '🍐',
      '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
      '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍔', '🍟', '🍕', '🌭',
      '🥪', '🌮', '🌯', '🥙', '🧆', '🥗', '🍿', '🧁', '🍩', '🍪',
    ],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('faces');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('tawasol24_recent_emojis');
      return stored ? JSON.parse(stored) : ['❤️', '😂', '👍', '🌹', '🔥', '🙏', '✨', '😍'];
    } catch {
      return ['❤️', '😂', '👍', '🌹', '🔥', '🙏', '✨', '😍'];
    }
  });

  const handleEmojiClick = (emoji: string) => {
    onSelectEmoji(emoji);
    // Update recents
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      const next = [emoji, ...filtered].slice(0, 16);
      try {
        localStorage.setItem('tawasol24_recent_emojis', JSON.stringify(next));
      } catch {
        // Ignored
      }
      return next;
    });
  };

  const displayedEmojis = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
      return all.filter((e) => e.includes(query));
    }
    const current = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
    return current ? current.emojis : [];
  }, [activeCategory, searchQuery]);

  // Categories Bar Smooth Horizontal Scroll & Drag Controls
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [isCatDragging, setIsCatDragging] = useState(false);
  const [catStartX, setCatStartX] = useState(0);
  const [catScrollLeft, setCatScrollLeft] = useState(0);

  const scrollCategories = (dir: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;
    const offset = dir === 'left' ? -90 : 90;
    categoryScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleCatMouseDown = (e: React.MouseEvent) => {
    if (!categoryScrollRef.current) return;
    setIsCatDragging(true);
    setCatStartX(e.pageX - categoryScrollRef.current.offsetLeft);
    setCatScrollLeft(categoryScrollRef.current.scrollLeft);
  };
  const handleCatMouseMove = (e: React.MouseEvent) => {
    if (!isCatDragging || !categoryScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - catStartX) * 1.5;
    categoryScrollRef.current.scrollLeft = catScrollLeft - walk;
  };
  const handleCatMouseUp = () => setIsCatDragging(false);

  const [catTouchStartX, setCatTouchStartX] = useState(0);
  const [catTouchScrollLeft, setCatTouchScrollLeft] = useState(0);
  const handleCatTouchStart = (e: React.TouchEvent) => {
    if (!categoryScrollRef.current) return;
    setCatTouchStartX(e.touches[0].pageX - categoryScrollRef.current.offsetLeft);
    setCatTouchScrollLeft(categoryScrollRef.current.scrollLeft);
  };
  const handleCatTouchMove = (e: React.TouchEvent) => {
    if (!categoryScrollRef.current) return;
    const x = e.touches[0].pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - catTouchStartX) * 1.5;
    categoryScrollRef.current.scrollLeft = catTouchScrollLeft - walk;
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full max-w-[360px] sm:max-w-[420px] h-[340px] z-30 select-none animate-in fade-in duration-150">
      {/* Search & Header */}
      <div className="p-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الرموز التعبيرية والفيسات..."
            className="w-full pl-3 pr-8 py-1.5 bg-slate-800 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Categories Bar with Left/Right Movement */}
      {!searchQuery && (
        <div className="px-1.5 py-1.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-1 text-xs">
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 shrink-0 transition"
            title="تحريك لليمين"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <div
            ref={categoryScrollRef}
            onMouseDown={handleCatMouseDown}
            onMouseMove={handleCatMouseMove}
            onMouseUp={handleCatMouseUp}
            onMouseLeave={handleCatMouseUp}
            onTouchStart={handleCatTouchStart}
            onTouchMove={handleCatTouchMove}
            onWheel={(e) => {
              if (categoryScrollRef.current) {
                categoryScrollRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1 overflow-x-auto scrollbar-none no-scrollbar py-0.5 px-1 scroll-smooth select-none cursor-grab active:cursor-grabbing w-full touch-pan-x"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition whitespace-nowrap text-[11px] shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={cat.name}
              >
                {cat.icon}
                <span className="text-[11px]">{cat.name}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollCategories('right')}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 shrink-0 transition"
            title="تحريك لليسار"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recents strip when no search */}
      {!searchQuery && recentEmojis.length > 0 && (
        <div
          className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/40 flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-x"
          onWheel={(e) => {
            e.currentTarget.scrollLeft += e.deltaY;
          }}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[10px] text-slate-400 shrink-0">الأخيرة:</span>
          <div className="flex items-center gap-1 shrink-0">
            {recentEmojis.map((rem, i) => (
              <button
                type="button"
                key={i}
                onClick={() => handleEmojiClick(rem)}
                className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition active:scale-95"
              >
                {rem}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Grid Area */}
      <div className="flex-1 p-2.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 text-center">
          {displayedEmojis.map((emoji, index) => (
            <button
              type="button"
              key={index}
              onClick={() => handleEmojiClick(emoji)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-2xl hover:bg-slate-800/80 hover:scale-125 active:scale-90 transition-transform duration-100"
            >
              {emoji}
            </button>
          ))}
        </div>

        {displayedEmojis.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8">
            <Smile className="w-8 h-8 mb-2 opacity-50" />
            <span>لا توجد رموز مطابقة للبحث</span>
          </div>
        )}
      </div>
    </div>
  );
};
