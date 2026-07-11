"use client";

import React, { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

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
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const markers = section.querySelectorAll<HTMLElement>(".process-marker");
    const cards = section.querySelectorAll<HTMLElement>(".process-step");
    const progress = progressRef.current;

    if (prefersReducedMotion) {
      gsap.set(cards, { opacity: 1 });
      gsap.set(markers, { borderColor: "var(--signal-blue)", color: "var(--signal-blue)" });
      if (progress) gsap.set(progress, { scaleX: 1 });
      return;
    }

    gsap.set(cards, { opacity: 0.35 });
    gsap.set(markers, { borderColor: "var(--hairline)", color: "var(--signal-blue)" });
    if (progress) gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
        toggleActions: "play none none none",
      },
    });

    steps.forEach((_, index) => {
      const at = index * 0.45;
      tl.to(
        cards[index],
        { opacity: 1, duration: 0.55, ease: "power3.out" },
        at
      );
      tl.to(
        markers[index],
        {
          borderColor: "var(--signal-blue)",
          boxShadow: "0 0 0 1px var(--signal-blue)",
          duration: 0.4,
          ease: "power2.out",
        },
        at
      );
      if (progress) {
        tl.to(
          progress,
          {
            scaleX: (index + 1) / steps.length,
            duration: 0.45,
            ease: "power2.inOut",
          },
          at
        );
      }
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === section) t.kill();
      });
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="process"
      className="page-x section-pad relative max-w-6xl mx-auto"
    >
      <div className="reveal-el mb-12 text-left">
        <span className="eyebrow">
          {"// how we work"}
        </span>
        <h2 className="section-heading !mb-0">
          Four <span className="font-bold">steps</span>. No <span className="font-bold">slide-deck theater</span>.
        </h2>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute left-[6%] right-[6%] top-[28px] hidden h-px bg-hairline md:block">
          <div
            ref={progressRef}
            className="h-full origin-left bg-blue"
            style={{ transform: "scaleX(0)" }}
          />
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
          {steps.map((step) => (
            <div key={step.num} className="process-step relative flex flex-col items-start text-left">
              <div className="process-marker relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-sm border border-hairline bg-surface font-mono text-lg text-blue select-none">
                {step.num}
              </div>

              <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-text-muted">
                STEP_{step.num}
              </span>
              <h3 className="mb-3 text-base font-bold tracking-[0.08em] text-text md:text-lg">
                {step.title}
              </h3>
              <p className="text-[15px] font-normal leading-relaxed text-text-secondary md:text-[16px]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
