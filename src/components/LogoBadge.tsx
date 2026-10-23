import React from 'react';

interface LogoBadgeProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const LogoBadge: React.FC<LogoBadgeProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8', text: 'text-base', sub: 'text-[10px]' },
    md: { box: 'w-10 h-10', text: 'text-xl', sub: 'text-xs' },
    lg: { box: 'w-14 h-14', text: 'text-2xl', sub: 'text-sm' },
    xl: { box: 'w-20 h-20', text: 'text-3xl', sub: 'text-base' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* WhatsApp-like icon in vibrant Royal Blue with message/envelope inside */}
      <div className={`relative ${currentSize.box} shrink-0 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group`}>
        {/* Generated 3D Badge Image */}
        <img
          src="/src/assets/images/tawasol24_logo_badge_1791830208691.jpg"
          alt="تواصل 24"
          className="w-full h-full object-cover rounded-2xl ring-1 ring-blue-400/40 shadow-inner"
          onError={(e) => {
            // CSS Fallback if image path fails
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.classList.add('bg-gradient-to-tr', 'from-blue-700', 'to-blue-500');
            }
          }}
        />
        {/* Subtle decorative glow */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur-xs opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none -z-10" />
      </div>

      {showText && (
        <div className="flex flex-col select-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-tight text-white ${currentSize.text} leading-none`}>
              تواصل
            </span>
            <span className={`font-black text-blue-400 ${currentSize.text} leading-none`}>
              24
            </span>
          </div>
          <span className={`text-slate-400 font-medium ${currentSize.sub} leading-tight mt-0.5`}>
            مراسلة ومكالمات مباشرة
          </span>
        </div>
      )}
    </div>
  );
};
