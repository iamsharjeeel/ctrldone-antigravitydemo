"use client";

import React, { useEffect } from "react";
import { gsap } from "@/lib/gsap";

interface HeroProps {
  onOpenIntake: () => void;
}

export default function Hero({ onOpenIntake }: HeroProps) {
  useEffect(() => {
    // Check if the user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Stagger character reveal: translate up and fade in
    gsap.fromTo(
      ".reveal-char",
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.02,
        duration: 0.6,
        ease: "power4.out",
        delay: 0.3,
      }
    );
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-start px-6 md:px-12 lg:px-24 pt-24 overflow-hidden"
    >
      {/* Subtle blue glow behind content */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] glow-blue-radial pointer-events-none opacity-60" />

      <div className="relative z-10 max-w-xl md:max-w-2xl lg:max-w-[45vw] text-left reveal-el">
        <span className="inline-block text-xs font-semibold tracking-[0.16em] text-blue uppercase mb-4">
          CTRLDONE — Growth & Digital Partners
        </span>

        {/* Headline split character reveal */}
        <h1 className="text-[clamp(2.75rem,7vw,6.5rem)] font-light leading-[1.04] text-text mb-6 select-none">
          {Array.from("Take ").map((char, idx) => (
            <span key={`take-${idx}`} className="reveal-char inline-block opacity-0 md:opacity-1">
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
          <span className="font-bold">
            {Array.from("control").map((char, idx) => (
              <span key={`ctrl-${idx}`} className="reveal-char inline-block opacity-0 md:opacity-1">
                {char}
              </span>
            ))}
          </span>
          {Array.from(". ").map((char, idx) => (
            <span key={`dot1-${idx}`} className="reveal-char inline-block opacity-0 md:opacity-1">
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
          <br />
          {Array.from("Get it ").map((char, idx) => (
            <span key={`getit-${idx}`} className="reveal-char inline-block opacity-0 md:opacity-1">
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
          <span className="font-bold">
            {Array.from("done").map((char, idx) => (
              <span key={`done-${idx}`} className="reveal-char inline-block opacity-0 md:opacity-1">
                {char}
              </span>
            ))}
          </span>
          {Array.from(".").map((char, idx) => (
            <span key={`dot2-${idx}`} className="reveal-char inline-block opacity-0 md:opacity-1">
              {char}
            </span>
          ))}
        </h1>

        <p className="text-[1.0625rem] font-light leading-relaxed text-text-secondary max-w-[480px] mb-8">
          We plan the brand, the growth channels and the market position. Otomate, our own technical studio, builds the product. Same team, no handoff gap.
        </p>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <button
            onClick={onOpenIntake}
            className="inline-flex items-center justify-center px-[22px] py-[12px] text-sm font-medium rounded-full bg-blue text-bg shadow-md hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue focus-visible:outline-offset-3 cursor-pointer"
          >
            Start a project
          </button>
          <a
            href="#process"
            className="inline-flex items-center text-sm font-light text-text-secondary hover:text-text hover:underline underline-offset-4"
          >
            See how we work <span className="ml-1 text-base">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
