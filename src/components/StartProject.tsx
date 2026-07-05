"use client";

import React from "react";

interface StartProjectProps {
  onOpenIntake: () => void;
}

export default function StartProject({ onOpenIntake }: StartProjectProps) {
  return (
    <section
      id="start"
      className="px-6 md:px-12 lg:px-24 py-32 md:py-48 flex items-center justify-center text-center relative overflow-hidden"
    >
      <div className="max-w-2xl mx-auto z-10 reveal-el">
        <span className="inline-block text-xs font-semibold tracking-[0.16em] text-blue uppercase mb-4">
          Start
        </span>
        <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-light leading-[1.1] text-text mb-6">
          Tell us what{"'"}s <span className="font-bold">not working</span>.
        </h2>
        <p className="text-[1.0625rem] font-light leading-relaxed text-text-secondary max-w-xl mx-auto mb-10">
          Send us where you are and where you want to be. We{"'"}ll reply with a specific next step, no sales script.
        </p>

        <div className="flex flex-col items-center gap-6">
          <button
            onClick={onOpenIntake}
            className="inline-flex items-center justify-center px-[26px] py-[14px] text-sm font-medium rounded-full bg-blue text-bg shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          >
            Book a call
          </button>
          <span className="text-sm font-light text-text-secondary">
            or email{" "}
            <a
              href="mailto:hello@ctrldone.com"
              className="text-text font-normal hover:text-blue hover:underline underline-offset-4"
            >
              hello@ctrldone.com
            </a>
          </span>
        </div>
      </div>
    </section>
  );
}
