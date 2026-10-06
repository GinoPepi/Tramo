import React from 'react';

/**
 * Minimalist bin icon matching the requested reference:
 * - Arch handle on top
 * - Horizontal lid bar
 * - Tapered bin body with rounded bottom corners
 */
export function TrashIcon({ size = 15, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Curved top handle */}
      <path d="M9.5 6a2.5 2.5 0 0 1 5 0" />
      {/* Horizontal lid bar */}
      <path d="M4.5 8.5h15" />
      {/* Bin body with rounded bottom corners and tapered sides */}
      <path d="M6.5 11l.7 7.5a2.8 2.8 0 0 0 2.8 2.5h4a2.8 2.8 0 0 0 2.8-2.5l.7-7.5" />
    </svg>
  );
}

/**
 * Modern chevron left arrow for back buttons
 */
export function ChevronLeftIcon({ size = 14, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
