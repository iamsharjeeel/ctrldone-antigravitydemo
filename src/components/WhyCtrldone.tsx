"use client";

import React from "react";

export default function WhyCtrldone() {
  return (
    <section
      id="why"
      className="relative flex items-center justify-start px-6 md:px-12 lg:px-24 py-24 md:py-32 overflow-hidden"
    >
      <div className="relative z-10 max-w-[640px] text-left reveal-el">
        <span className="inline-block text-xs font-semibold tracking-[0.16em] text-blue uppercase mb-4">
          Why CTRLDONE
        </span>
        <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-light leading-[1.1] text-text mb-6">
          Most <span className="font-bold">agencies</span> hand you a <span className="font-bold">deck</span> and <span className="font-bold">disappear</span>.
        </h2>
        <p className="text-[1.0625rem] font-light leading-relaxed text-text-secondary">
          We don{"'"}t split strategy from execution. CTRLDONE plans the brand, the growth channels and the market position. Otomate, our own technical studio, then builds it: the site, the product, the stack. One accountable team from the first slide to the live release.
        </p>
      </div>
    </section>
  );
}
