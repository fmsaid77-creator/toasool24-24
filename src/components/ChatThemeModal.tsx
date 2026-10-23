import React, { useState } from 'react';
import { X, Check, Palette, Sparkles, Eye } from 'lucide-react';

export interface ChatWallpaperTheme {
  id: string;
  name: string;
  bgHex: string;
  className: string;
  textColor: string;
  isLight?: boolean;
}

export const CHAT_WALLPAPER_THEMES: ChatWallpaperTheme[] = [
  {
    id: 'default_dark',
    name: 'تواصل 24 داكن كلاسيكي',
    bgHex: '#0b141a',
    className: 'bg-[#0b141a] chat-pattern text-slate-100',
    textColor: 'text-slate-100',
  },
  {
    id: 'light_beige',
    name: 'بيج كلاسيكي فاتح',
    bgHex: '#efeae2',
    className: 'bg-[#efeae2] chat-pattern-light text-slate-800',
    textColor: 'text-slate-800',
    isLight: true,
  },
  {
    id: 'night_navy',
    name: 'أزرق كحلي ليلي',
    bgHex: '#0a1426',
    className: 'bg-[#0a1426] chat-pattern text-slate-100',
    textColor: 'text-slate-100',
  },
  {
    id: 'emerald_green',
    name: 'أخضر زمردي داكن',
    bgHex: '#05241b',
    className: 'bg-[#05241b] chat-pattern text-slate-100',
    textColor: 'text-slate-100',
  },
  {
    id: 'charcoal_black',
    name: 'رمادي فحمي هادئ',
    bgHex: '#121214',
    className: 'bg-[#121214] chat-pattern text-slate-100',
    textColor: 'text-slate-100',
  },
  {
    id: 'twilight_violet',
    name: 'شفق أرجواني ملكي',
    bgHex: '#1b0e2b',
    className: 'bg-[#1b0e2b] chat-pattern text-slate-100',
    textColor: 'text-slate-100',
  },
  {
    id: 'ocean_cyan',
    name: 'أزرق محيطي داكن',
    bgHex: '#071e2e',
    className: 'bg-[#071e2e] chat-pattern text-slate-100',
    textColor: 'text-slate-100',
  },
  {
    id: 'warm_coffee',
    name: 'بني مخملي دافئ',
    bgHex: '#211610',
    className: 'bg-[#211610] chat-pattern text-slate-100',
    textColor: 'text-slate-100',
  },
];

interface ChatThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
}

export const ChatThemeModal: React.FC<ChatThemeModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
}) => {
  const [selectedId, setSelectedId] = useState(currentThemeId);

  if (!isOpen) return null;

  const activeTheme = CHAT_WALLPAPER_THEMES.find((t) => t.id === selectedId) || CHAT_WALLPAPER_THEMES[0];

  const handleApply = () => {
    onSelectTheme(selectedId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-right my-auto">
        {/* Header */}
        <div className="p-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">لون خلفية الدردشة</h3>
              <span className="text-[11px] text-slate-400">اختر المظهر والخلفية المفضلة للمحادثات</span>
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

        {/* Live Preview Card */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 block mb-2 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            معاينة حية للمظهر المختار:
          </span>

          <div
            className={`w-full h-32 rounded-2xl p-3 flex flex-col justify-end gap-2 border border-slate-700/80 transition-all duration-300 relative overflow-hidden ${activeTheme.className}`}
          >
            {/* Sample received bubble */}
            <div
              className={`max-w-[70%] p-2 rounded-xl text-xs rounded-br-sm shadow-sm ${
                activeTheme.isLight
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'bg-slate-800 text-slate-100 border border-slate-700/60'
              }`}
            >
              مرحباً بك! هذه معاينة لخلفية الدردشة 🎨
            </div>

            {/* Sample sent bubble */}
            <div className="max-w-[70%] p-2 rounded-xl text-xs rounded-bl-sm self-end bg-blue-600 text-white shadow-sm">
              يبدو التنسيق رائعاً وواضحاً جداً 👍
            </div>
          </div>
        </div>

        {/* Color Palette Grid */}
        <div className="p-4 overflow-y-auto max-h-[300px]">
          <span className="text-xs font-bold text-slate-300 block mb-3">
            الألوان والتنسيقات المتوفرة ({CHAT_WALLPAPER_THEMES.length}):
          </span>

          <div className="grid grid-cols-2 gap-2.5">
            {CHAT_WALLPAPER_THEMES.map((theme) => {
              const isSelected = theme.id === selectedId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedId(theme.id)}
                  className={`p-2.5 rounded-2xl border transition flex items-center gap-2.5 text-right active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-xl shrink-0 border border-slate-600 flex items-center justify-center shadow-inner"
                    style={{ backgroundColor: theme.bgHex }}
                  >
                    {isSelected && (
                      <Check className={`w-4 h-4 stroke-[3] ${theme.isLight ? 'text-blue-700' : 'text-white'}`} />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{theme.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{theme.bgHex}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedId('default_dark')}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            استعادة الافتراضي
          </button>

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
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>تطبيق اللون</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
