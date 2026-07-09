"use client";

import React from "react";
import { Compass, Palette, TrendingUp, Cpu } from "lucide-react";



const servicesList = [
  {
    icon: Compass,
    tag: "/strategy",
    label: "Strategy",
    desc: "Positioning, market research and a growth plan built around your numbers, not a template.",
  },
  {
    icon: Palette,
    tag: "/brand",
    label: "Brand",
    desc: "Identity systems, naming and a voice that holds up across every channel you touch.",
  },
  {
    icon: TrendingUp,
    tag: "/growth",
    label: "Growth Marketing",
    desc: "Paid media, lifecycle and content programs built to compound month over month.",
  },
  {
    icon: Cpu,
    tag: "/product",
    label: "Product & Web",
    desc: "Sites and products designed to convert, built by Otomate on the current stack.",
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="px-6 md:px-12 lg:px-24 py-24 md:py-32 relative max-w-6xl mx-auto"
    >
      <div className="reveal-el mb-12 text-left">
        <span className="inline-block text-xs font-mono tracking-[0.16em] text-blue uppercase mb-4">
          {"// capabilities"}
        </span>
        <h2 className="text-[clamp(2rem,3.6vw,3rem)] font-light leading-[1.1] text-text mb-6 tracking-[-0.02em]">
          What we <span className="font-bold text-blue">run</span>.
        </h2>
      </div>

      {/* 2x2 Console Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {servicesList.map((service, index) => {
          const Icon = service.icon;
          return (
            <div
              key={index}
              className="group relative flex flex-col items-start p-8 md:p-10 bg-surface rounded-sm border border-hairline transition-all duration-300 hover:bg-surface-hover select-none"
            >
              {/* Corner Viewfinder Brackets */}
              <div className="corner-bracket corner-bracket-tl" />
              <div className="corner-bracket corner-bracket-tr" />
              <div className="corner-bracket corner-bracket-bl" />
              <div className="corner-bracket corner-bracket-br" />

              {/* Top-Left Monospace Tag */}
              <span className="absolute top-4 left-4 font-mono text-[11px] text-text-muted select-none">
                {service.tag}
              </span>

              {/* Icon */}
              <div className="text-blue mt-4 mb-6 group-hover:scale-105 transition-transform duration-300">
                <Icon size={32} strokeWidth={1.5} aria-hidden="true" />
              </div>

              <h3 className="text-[15px] font-mono tracking-[0.08em] text-text uppercase mb-3">
                {service.label}
              </h3>

              <p className="text-[15px] md:text-[16px] font-normal leading-relaxed text-text-secondary">
                {service.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
