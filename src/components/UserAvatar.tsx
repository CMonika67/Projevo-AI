import React, { useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fontSize?: string;
}

const GOOGLE_PALETTE = [
  '#005144', // Projevo Emerald
  '#1A73E8', // Google Blue
  '#8430CE', // Deep Purple
  '#C5221F', // Red
  '#E37400', // Amber
  '#00796B', // Teal
  '#5C6BC0', // Indigo
  '#2E7D32', // Forest Green
];

function getAvatarColor(name: string): string {
  if (!name) return GOOGLE_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GOOGLE_PALETTE.length;
  return GOOGLE_PALETTE[index];
}

export function getInitial(name?: string): string {
  if (!name || !name.trim()) return 'U';
  const trimmed = name.trim();
  // Return the uppercase first letter of the first word
  return trimmed.charAt(0).toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'User',
  className = 'w-10 h-10',
  size,
  fontSize
}) => {
  const [imgError, setImgError] = useState(false);

  // If a valid image URL is provided and has not failed loading, render the image
  const hasValidImage = Boolean(src && src.trim() && !imgError);

  if (hasValidImage) {
    return (
      <img
        src={src!}
        alt={name}
        onError={() => setImgError(true)}
        className={`${className} rounded-full object-cover select-none`}
      />
    );
  }

  // Google-Style Letter Avatar Fallback
  const initial = getInitial(name);
  const bgColor = getAvatarColor(name);

  // Determine appropriate font size based on dimensions if not explicitly passed
  let fontClass = fontSize;
  if (!fontClass) {
    if (className.includes('w-24') || className.includes('h-24') || size === 'xl') {
      fontClass = 'text-[36px] font-extrabold';
    } else if (className.includes('w-16') || className.includes('h-16') || size === 'lg') {
      fontClass = 'text-[24px] font-bold';
    } else if (className.includes('w-11') || className.includes('h-11')) {
      fontClass = 'text-[16px] font-bold';
    } else {
      fontClass = 'text-[14px] font-bold';
    }
  }

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={`${className} rounded-full flex items-center justify-center text-white font-['Manrope'] select-none shadow-xs shrink-0`}
      title={name}
      aria-label={name}
    >
      <span className={`${fontClass} leading-none tracking-tight`}>
        {initial}
      </span>
    </div>
  );
};
