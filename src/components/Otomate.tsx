"use client";

import React from "react";

export default function Otomate() {
  return (
    <section
      id="otomate"
      className="relative px-6 md:px-12 lg:px-24 py-24 md:py-32 overflow-hidden max-w-6xl mx-auto"
    >
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Copy (Left on desktop, bottom on mobile) */}
        <div className="order-2 md:order-1 text-left reveal-el">
          <span className="inline-block text-xs font-mono tracking-[0.16em] text-blue uppercase mb-4">
            {"// the execution arm"}
          </span>
          <h2 className="text-[clamp(2rem,3.6vw,3rem)] font-light leading-[1.1] text-text mb-6 tracking-[-0.02em]">
            Otomate <span className="font-bold">builds</span> what CTRLDONE <span className="font-bold">designs</span>.
          </h2>
          <p className="text-[16px] md:text-[18px] font-normal leading-relaxed text-text-secondary mb-8 max-w-xl">
            Otomate is our own technical studio: the developers, motion designers and infrastructure that turn a growth plan into a working product. Same company, one contract. Nothing gets lost between the strategy and the ship date.
          </p>
          <a
            href="https://otomate.biz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-mono uppercase tracking-wider text-blue hover:text-blue-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
          >
            Visit otomate.biz <span className="ml-2 text-[10px]">↗</span>
          </a>
        </div>

        {/* Console (Right on desktop, top on mobile) */}
        <div className="order-1 md:order-2 flex justify-center items-center reveal-el py-6 select-none pointer-events-none">
          <div className="w-full max-w-sm bg-surface rounded-sm border border-hairline p-5 md:p-6 font-mono text-[13px] text-text-secondary shadow-lg relative flex flex-col justify-start text-left">
            {/* Status Header */}
            <div className="flex items-center justify-between border-b border-hairline pb-4 mb-4 shrink-0 select-none">
              <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">otomate_deployment</span>
              <div className="flex items-center gap-1.5 font-mono text-xs text-lime select-none">
                <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
                <span className="font-bold uppercase tracking-wider text-[11px]">execution: live</span>
              </div>
            </div>

            {/* Trace log outputs */}
            <div className="flex-1 font-mono text-[12px] md:text-[13px] leading-loose space-y-2 pt-1 select-none">
              <div className="flex items-center font-mono">
                <span className="text-text-muted mr-2">[init]</span>
                <span>contract connection</span>
                <span className="text-text-muted ml-auto">ok</span>
              </div>
              <div className="flex items-center font-mono">
                <span className="text-text-muted mr-2">[build]</span>
                <span>brand assets</span>
                <span className="text-lime font-bold ml-auto">done</span>
              </div>
              <div className="flex items-center font-mono">
                <span className="text-text-muted mr-2">[build]</span>
                <span>site deployment</span>
                <span className="text-lime font-bold ml-auto">done</span>
              </div>
              <div className="flex items-center font-mono">
                <span className="text-text-muted mr-2">[status]</span>
                <span>active lead syncing</span>
                <span className="text-lime font-bold ml-auto">live</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
