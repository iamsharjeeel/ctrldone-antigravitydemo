"use client";

import React from "react";

interface StartProjectProps {
  onOpenIntake: () => void;
}

export default function StartProject({ onOpenIntake }: StartProjectProps) {
  return (
    <section
      id="start"
      className="px-6 md:px-12 lg:px-24 py-32 md:py-48 flex items-center justify-center text-center relative overflow-hidden max-w-6xl mx-auto"
    >
      <div className="max-w-2xl mx-auto z-10 reveal-el">
        <span className="inline-block text-xs font-mono tracking-[0.16em] text-blue uppercase mb-4">
          {"// start"}
        </span>
        <h2 className="text-[clamp(2rem,3.6vw,3rem)] font-light leading-[1.1] text-text mb-6 tracking-[-0.02em]">
          Tell us what{"'"}s <span className="font-bold">not working</span>.
        </h2>
        <p className="text-[16px] md:text-[18px] font-normal leading-relaxed text-text-secondary max-w-xl mx-auto mb-10">
          Send us where you are and where you want to be. We{"'"}ll reply with a specific next step, no sales script.
        </p>

        <div className="flex flex-col items-center gap-6 select-none">
          <button
            onClick={onOpenIntake}
            className="inline-flex items-center justify-center px-5 py-3 text-xs font-mono uppercase tracking-wider bg-blue text-bg rounded-sm hover:bg-blue-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue cursor-pointer"
          >
            Book a call
          </button>
          <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
            or email{" "}
            <a
              href="mailto:hello@ctrldone.com"
              className="text-text font-bold hover:text-blue hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
            >
              hello@ctrldone.com
            </a>
          </span>
        </div>
      </div>
    </section>
  );
}
