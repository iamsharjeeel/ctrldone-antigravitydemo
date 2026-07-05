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
      className="px-6 md:px-12 lg:px-24 py-24 md:py-32"
    >
      <div className="max-w-6xl mx-auto">
        <div className="reveal-el mb-16 text-left">
          <span className="inline-block text-xs font-semibold tracking-[0.16em] text-blue uppercase mb-4">
            How we operate
          </span>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-light leading-[1.1] text-text mb-6">
            Three <span className="font-bold">numbers</span> that don{"'"}t need a <span className="font-bold">case study</span>.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {outcomesList.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-start p-8 md:p-10 bg-surface rounded-md transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1"
            >
              {/* Big Stat Number */}
              <span className="text-6xl md:text-7xl font-bold text-blue mb-6">
                {item.stat}
              </span>
              
              {/* Description copy using text-secondary to ensure AA compliance */}
              <p className="text-[1.0625rem] font-light leading-relaxed text-text-secondary">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
