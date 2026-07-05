"use client";

import React from "react";

export default function Logo() {
  return (
    <div className="flex items-center gap-1 group select-none">
      {/* "ctrl" in light/light weight */}
      <span className="text-[20px] md:text-[24px] font-light tracking-tight text-text transition-colors">
        ctrl
      </span>

      {/* Reconstructed Brand Badge */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mx-0.5 group-hover:scale-105 transition-transform duration-300 shrink-0"
        aria-hidden="true"
      >
        {/* Lime green circle fill in the center */}
        <circle cx="50" cy="50" r="32" fill="var(--color-lime)" className="transition-all duration-300" />
        
        {/* Blue outer arc (270-degree arc from top-right going clockwise to bottom-left) */}
        <path
          d="M76.8 23.2 A 38 38 0 1 1 23.2 76.8"
          stroke="var(--color-blue)"
          strokeWidth="8"
          strokeLinecap="round"
          className="transition-all duration-300"
        />
        
        {/* Dark ink checkmark overlaying the lime circle */}
        <path
          d="M36 50L46 60L64 36"
          stroke="#1B2430" /* Solid ink checkmark for readability */
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* "one" in bold weight */}
      <span className="text-[20px] md:text-[24px] font-bold tracking-tight text-text transition-colors">
        one
      </span>
    </div>
  );
}
