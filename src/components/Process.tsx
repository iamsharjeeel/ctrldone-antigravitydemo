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
    <section id="process" className="px-6 md:px-12 lg:px-24 py-24 md:py-32 relative">
      <div className="max-w-4xl mx-auto">
        <div className="reveal-el mb-16">
          <span className="inline-block text-xs font-semibold tracking-[0.16em] text-blue uppercase mb-4">
            How we work
          </span>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-light leading-[1.1] text-text mb-6">
            Four <span className="font-bold">steps</span>. No <span className="font-bold">slide-deck theater</span>.
          </h2>
        </div>

        <div className="relative">
          {/* Vertical hairline running through center of the numerals */}
          <div className="absolute left-[20px] md:left-[24px] top-6 bottom-6 w-[1px] bg-hairline" />

          <div className="space-y-16">
            {steps.map((step, index) => (
              <div key={index} className="relative flex gap-6 md:gap-10 items-start reveal-el">
                {/* Numeric Indicator */}
                <div className="relative z-10 flex items-center justify-center w-[40px] h-[40px] md:w-[48px] md:h-[48px] rounded-full bg-bg border border-hairline text-blue font-bold text-lg md:text-xl shrink-0">
                  {step.num}
                </div>

                {/* Content Details */}
                <div className="flex-1 pt-1 md:pt-2">
                  <h3 className="text-base font-bold tracking-[0.08em] text-text mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[1.0625rem] font-light leading-relaxed text-text-secondary max-w-2xl">
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
