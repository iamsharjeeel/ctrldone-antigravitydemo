"use client";

import React from "react";

const steps = [
  {
    num: "01",
    title: "DISCOVER",
    desc: "Two weeks. Your market, your data, your constraints. We leave with a plan, not a slide deck.",
  },
  {
    num: "02",
    title: "STRATEGIZE",
    desc: "Positioning, channels and a roadmap you can defend to your board.",
  },
  {
    num: "03",
    title: "BUILD",
    desc: "Otomate takes the plan and ships it: brand assets, site, campaigns, tracking.",
  },
  {
    num: "04",
    title: "SHIP & SCALE",
    desc: "We stay on the numbers after launch. If a channel underperforms, we cut it fast.",
  },
];

export default function Process() {
  return (
    <section id="process" className="px-6 md:px-12 lg:px-24 py-24 md:py-32 relative max-w-6xl mx-auto">
      <div className="max-w-4xl">
        <div className="reveal-el mb-20 text-left">
          <span className="inline-block text-xs font-mono tracking-[0.16em] text-blue uppercase mb-4">
            {"// how we work"}
          </span>
          <h2 className="text-[clamp(2rem,3.6vw,3rem)] font-light leading-[1.1] text-text mb-6 tracking-[-0.02em]">
            Four <span className="font-bold">steps</span>. No <span className="font-bold">slide-deck theater</span>.
          </h2>
        </div>

        <div className="relative">
          {/* Vertical dashed trace line */}
          <div className="absolute left-[24px] md:left-[28px] top-6 bottom-6 w-0 border-l border-dashed border-hairline select-none pointer-events-none" />

          <div className="space-y-20">
            {steps.map((step, index) => (
              <div key={index} className="relative flex gap-6 md:gap-10 items-start reveal-el">
                {/* Square build log indicator */}
                <div className="relative z-10 flex items-center justify-center w-[48px] h-[48px] md:w-[56px] md:h-[56px] rounded-sm bg-surface border border-hairline text-blue font-mono text-[16px] md:text-lg shrink-0 select-none">
                  {step.num}
                </div>

                {/* Content Details */}
                <div className="flex-1 pt-1.5">
                  <span className="block font-mono text-[11px] uppercase tracking-wider text-text-muted mb-1">
                    STEP_{step.num}
                  </span>
                  <h3 className="text-base md:text-lg font-bold tracking-[0.08em] text-text mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[16px] md:text-[18px] font-normal leading-relaxed text-text-secondary max-w-2xl">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
