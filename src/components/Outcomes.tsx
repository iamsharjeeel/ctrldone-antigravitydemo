"use client";

import React from "react";

const outcomesList = [
  {
    stat: "2",
    desc: "Companies, one contract. Strategy and execution never separate.",
    staggerClass: "md:mt-0",
  },
  {
    stat: "14",
    desc: "Days from first call to a growth plan you can act on.",
    staggerClass: "md:mt-12",
  },
  {
    stat: "0",
    desc: "Handoffs between the deck and the deploy.",
    staggerClass: "md:mt-24",
  },
];

export default function Outcomes() {
  return (
    <section
      id="outcomes"
      className="px-6 md:px-12 lg:px-24 py-24 md:py-32 relative max-w-6xl mx-auto"
    >
      <div className="reveal-el mb-20 text-left">
        <span className="inline-block text-xs font-mono tracking-[0.16em] text-blue uppercase mb-4">
          {"// how we operate"}
        </span>
        <h2 className="text-[clamp(2rem,3.6vw,3rem)] font-light leading-[1.1] text-text mb-6 tracking-[-0.02em]">
          Three <span className="font-bold">numbers</span> that don{"'"}t need a <span className="font-bold">case study</span>.
        </h2>
      </div>

      {/* Asymmetric staggered vertical layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {outcomesList.map((item, index) => (
          <div
            key={index}
            className={`group relative flex flex-col items-start p-8 md:p-10 bg-surface rounded-sm border border-hairline transition-all duration-300 hover:bg-surface-hover ${item.staggerClass}`}
          >
            {/* Viewfinder brackets */}
            <div className="corner-bracket corner-bracket-tl" />
            <div className="corner-bracket corner-bracket-tr" />
            <div className="corner-bracket corner-bracket-bl" />
            <div className="corner-bracket corner-bracket-br" />

            {/* Big Stat Number with thin bracket frame */}
            <div className="relative font-mono text-6xl md:text-7xl font-bold text-blue mb-8 px-5 py-2.5 border border-hairline bg-surface-hover select-none">
              <span className="text-text-muted font-light mr-1.5">[</span>
              {item.stat}
              <span className="text-text-muted font-light ml-1.5">]</span>
            </div>
            
            <p className="text-[15px] md:text-[16px] font-normal leading-relaxed text-text-secondary">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
