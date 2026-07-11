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
      className="page-x section-pad relative max-w-6xl mx-auto"
    >
      <div className="reveal-el mb-12 text-left">
        <span className="eyebrow">
          {"// capabilities"}
        </span>
        <h2 className="section-heading !mb-0">
          What we <span className="font-bold text-blue">run</span>.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {servicesList.map((service, index) => {
          const Icon = service.icon;
          return (
            <div
              key={index}
              className="group relative flex flex-col items-start p-8 h-full bg-surface rounded-sm border border-hairline transition-all duration-300 hover:bg-surface-hover hover:border-blue/40 hover:-translate-y-0.5 select-none"
            >
              <span className="font-mono text-[11px] text-text-muted select-none mb-4">
                {service.tag}
              </span>

              <div className="text-blue mb-6 group-hover:scale-105 transition-transform duration-300">
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
