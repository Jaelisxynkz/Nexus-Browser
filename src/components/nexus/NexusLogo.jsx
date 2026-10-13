import React from "react";

export default function NexusLogo({ size = 14, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="nexGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        d="M7 25V7h3.5l11 12.5V7H25v18h-3.5L10.5 12.5V25H7z"
        fill="url(#nexGrad)"
      />
    </svg>
  );
}