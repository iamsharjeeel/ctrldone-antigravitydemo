"use client";

import React from "react";

function DeploymentCard() {
  return (
    <div className="w-full max-w-sm bg-surface rounded-sm border border-hairline p-5 md:p-6 font-mono text-[13px] text-text-secondary shadow-lg relative text-left">
      <div className="flex items-center justify-between border-b border-hairline pb-3 mb-3 select-none">
        <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">otomate_deployment</span>
        <div className="flex items-center gap-1.5 font-mono text-xs text-lime select-none">
          <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-[11px]">execution: live</span>
        </div>
      </div>

      <div className="font-mono text-[12px] md:text-[13px] leading-loose space-y-2 select-none">
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
  );
}

export default function Otomate() {
  return (
    <section
      id="otomate"
      className="relative page-x section-pad overflow-hidden max-w-6xl mx-auto"
    >
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="text-left reveal-el">
          <span className="eyebrow">
            {"// the execution arm"}
          </span>
          <h2 className="section-heading">
            <span className="text-lime">otomate</span> <span className="font-bold">builds</span> what <span className="text-blue">ctrlDone</span> <span className="font-bold">designs</span>.
          </h2>
          <p className="text-[16px] md:text-[18px] font-normal leading-relaxed text-text-secondary mb-8 max-w-xl">
            <span className="text-lime">otomate</span> is our own technical studio: the developers, motion designers and infrastructure that turn a growth plan into a working product. Same company, one contract. Nothing gets lost between the strategy and the ship date.
          </p>

          <div className="md:hidden mb-8 flex justify-start select-none pointer-events-none">
            <DeploymentCard />
          </div>

          <a
            href="https://otomate.biz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-mono uppercase tracking-wider text-blue hover:text-blue-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
          >
            Visit otomate.biz <span className="ml-2 text-[10px]">↗</span>
          </a>
        </div>

        <div className="hidden md:flex justify-center items-center reveal-el select-none pointer-events-none">
          <DeploymentCard />
        </div>
      </div>
    </section>
  );
}
