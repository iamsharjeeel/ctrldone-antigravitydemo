"use client";

import React from "react";

export default function Otomate() {
  return (
    <section
      id="otomate"
      className="relative px-6 md:px-12 lg:px-24 py-24 md:py-32 overflow-hidden"
    >
      {/* Lime glow behind header */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] glow-lime-radial pointer-events-none opacity-40" />

      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Copy (Left on desktop, bottom on mobile) */}
        <div className="order-2 md:order-1 text-left reveal-el">
          <span className="inline-block text-xs font-semibold tracking-[0.16em] text-lime uppercase mb-4">
            The Execution Arm
          </span>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-light leading-[1.1] text-text mb-6">
            Otomate <span className="font-bold">builds</span> what CTRLDONE <span className="font-bold text-lime">designs</span>.
          </h2>
          <p className="text-[1.0625rem] font-light leading-relaxed text-text-secondary mb-8 max-w-xl">
            Otomate is our own technical studio: the developers, motion designers and infrastructure that turn a growth plan into a working product. Same company, one contract. Nothing gets lost between the strategy and the ship date.
          </p>
          <a
            href="https://otomate.biz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-semibold text-lime hover:underline underline-offset-4"
          >
            Visit otomate.biz <span className="ml-2 text-xs">↗</span>
          </a>
        </div>

        {/* Badge (Right on desktop, top on mobile) */}
        <div className="order-1 md:order-2 flex justify-center items-center reveal-el py-6">
          <div className="relative">
            {/* Pulsing light glow behind SVG */}
            <div className="absolute inset-0 bg-lime rounded-full opacity-10 blur-3xl scale-125" />
            
            <svg
              width="200"
              height="200"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-lime drop-shadow-[0_0_35px_rgba(214,238,60,0.3)]"
              aria-hidden="true"
            >
              <circle
                cx="100"
                cy="100"
                r="76"
                stroke="currentColor"
                strokeWidth="5"
              />
              <path
                d="M62 106L88 132L138 68"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
