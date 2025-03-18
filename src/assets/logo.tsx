
import React from "react";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M44 24C44 35.0457 35.0457 44 24 44C12.9543 44 4 35.0457 4 24C4 12.9543 12.9543 4 24 4C35.0457 4 44 12.9543 44 24Z"
        fill="url(#paint0_linear)"
      />
      <path
        d="M30.9999 14H34.9999L25.9999 24L34.9999 34H31.0999L22.0999 24L30.9999 14Z"
        fill="white"
      />
      <path
        d="M21.9999 14H25.9999L16.9999 24L25.9999 34H22.0999L13.0999 24L21.9999 14Z"
        fill="white"
        fillOpacity="0.6"
      />
      <defs>
        <linearGradient
          id="paint0_linear"
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  );
};
