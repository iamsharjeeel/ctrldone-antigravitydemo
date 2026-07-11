"use client";

import React from "react";

const outcomesList = [
  {
    stat: "2",
    desc: "Companies, one contract. Strategy and execution never separate.",
  },
  {
    stat: "14",
    desc: "Days from first call to a growth plan you can act on.",
  },
  {
    stat: "0",
    desc: "Handoffs between the deck and the deploy.",
  },
];

export default function Outcomes() {
  return (
    <section
      id="outcomes"
      className="page-x section-pad relative max-w-6xl mx-auto"
    >
      <div className="reveal-el mb-12 text-left">
        <span className="eyebrow">
          {"// how we operate"}
        </span>
        <h2 className="section-heading !mb-0">
          Three <span className="font-bold">numbers</span> that don{"'"}t need a <span className="font-bold">case study</span>.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {outcomesList.map((item, index) => (
          <div
            key={index}
            className="group relative flex h-full flex-col items-start p-8 bg-surface rounded-sm border border-hairline transition-all duration-300 hover:bg-surface-hover"
          >
            <div className="corner-bracket corner-bracket-tl" />
            <div className="corner-bracket corner-bracket-tr" />
            <div className="corner-bracket corner-bracket-bl" />
            <div className="corner-bracket corner-bracket-br" />

            <div className="relative flex w-full items-center justify-center font-mono text-6xl md:text-7xl font-bold text-blue mb-8 h-24 md:h-28 border border-hairline bg-surface-hover select-none tabular-nums">
              <span className="inline-flex items-center justify-center min-w-[4.5ch]">
                <span className="text-text-muted font-light">[</span>
                <span className="mx-1.5 text-center">{item.stat}</span>
                <span className="text-text-muted font-light">]</span>
              </span>
            </div>
            
            <p className="text-[15px] md:text-[16px] font-normal leading-relaxed text-text-secondary mt-auto">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
