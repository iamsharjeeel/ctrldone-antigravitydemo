"use client";

import React, { useEffect, useState } from "react";
import { gsap } from "@/lib/gsap";

interface HeroProps {
  onOpenIntake: () => void;
}

export default function Hero({ onOpenIntake }: HeroProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentTypingText, setCurrentTypingText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Check if the user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    if (prefersReducedMotion) {
      gsap.set(".reveal-content > *", { opacity: 1, y: 0 });
      gsap.set(".reveal-graphic", { opacity: 1, scale: 1, y: 0 });
      
      setCurrentTypingText("$ ctrldone --plan --build");
      setDisplayedLines([
        "> brand.......... done",
        "> channels....... done",
        "> stack.......... done"
      ]);
      setIsDone(true);
      return;
    }

    // Stagger layout content reveal
    gsap.fromTo(
      ".reveal-content > *",
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: "power4.out",
        delay: 0.2,
      }
    );

    // Fade-in the premium right-side terminal
    gsap.fromTo(
      ".reveal-graphic",
      { opacity: 0, scale: 0.96, y: 20 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 1.2,
        ease: "power4.out",
        delay: 0.4,
      }
    );

    // Typing terminal animation sequence
    const fullCommand = "$ ctrldone --plan --build";
    let charIdx = 0;
    let typingInterval: NodeJS.Timeout;

    const startTimeout = setTimeout(() => {
      typingInterval = setInterval(() => {
        if (charIdx < fullCommand.length) {
          setCurrentTypingText(fullCommand.slice(0, charIdx + 1));
          charIdx++;
        } else {
          clearInterval(typingInterval);
          setTimeout(() => {
            setDisplayedLines(prev => [...prev, "> brand.......... done"]);
            setTimeout(() => {
              setDisplayedLines(prev => [...prev, "> channels....... done"]);
              setTimeout(() => {
                setDisplayedLines(prev => [...prev, "> stack.......... done"]);
                setIsDone(true);
              }, 400);
            }, 400);
          }, 300);
        }
      }, 60);
    }, 800);

    // Blinking cursor interval
    const cursorInterval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);

    return () => {
      clearTimeout(startTimeout);
      if (typingInterval) clearInterval(typingInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  // Custom coloring for typed shell commands
  const renderCommandLine = () => {
    if (currentTypingText.startsWith("$ ctrldone")) {
      const remaining = currentTypingText.slice(10);
      return (
        <div className="flex items-center font-mono">
          <span className="text-text-muted font-bold mr-1.5">$</span>
          <span className="text-text font-bold">ctrldone</span>
          <span className="text-blue">{remaining}</span>
          {!isDone && cursorVisible && (
            <span className="inline-block w-2 h-[15px] bg-blue ml-1 cursor-blink" />
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center font-mono">
        <span className="text-text">{currentTypingText}</span>
        {!isDone && cursorVisible && (
          <span className="inline-block w-2 h-[15px] bg-blue ml-1 cursor-blink" />
        )}
      </div>
    );
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col lg:flex-row items-center justify-between px-6 md:px-12 lg:px-24 pt-32 pb-16 overflow-hidden max-w-6xl mx-auto gap-12"
    >
      {/* Left Column Content */}
      <div className="relative z-10 max-w-xl lg:max-w-[45vw] text-left reveal-content space-y-6">
        <span className="inline-block text-xs font-mono tracking-[0.16em] text-blue uppercase">
          {"// growth & digital partners"}
        </span>

        <h1 className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-light tracking-[-0.02em] leading-[1.08] text-text select-none">
          Take <span className="font-bold">control</span>.<br />Get it <span className="font-bold text-blue">done</span>.
        </h1>

        <p className="text-[16px] md:text-[18px] font-normal leading-relaxed text-text-secondary max-w-[480px]">
          We plan the brand, the growth channels and the market position. Otomate, our own technical studio, builds the product. Same team, no handoff gap.
        </p>
        
        <div className="flex flex-row items-center gap-6 pt-2">
          <button
            onClick={onOpenIntake}
            className="inline-flex items-center justify-center px-5 py-3 text-xs font-mono uppercase tracking-wider bg-blue text-bg rounded-md hover:bg-blue-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue cursor-pointer"
          >
            Start a project
          </button>
          <a
            href="#process"
            className="inline-flex items-center text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-text"
          >
            See how we work <span className="ml-1.5 text-[11px]">↓</span>
          </a>
        </div>
      </div>

      {/* Right Column Command Terminal */}
      <div className="relative w-full lg:w-[45vw] aspect-[4/3] max-w-md lg:max-w-none pointer-events-none z-10 reveal-graphic opacity-0">
        <div className="w-full h-full bg-surface rounded-md border border-hairline p-5 md:p-6 font-mono text-[14px] text-text-secondary leading-relaxed select-none pointer-events-auto flex flex-col justify-start text-left">
          {/* Header Bar */}
          <div className="flex items-center gap-1.5 border-b border-hairline pb-4 mb-4 select-none shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-hairline" />
            <span className="w-2.5 h-2.5 rounded-full bg-hairline" />
            <span className="w-2.5 h-2.5 rounded-full bg-hairline" />
            <span className="text-[11px] text-text-muted ml-2 font-mono uppercase tracking-wider">sh - ctrldone</span>
          </div>

          {/* Terminal Console Output */}
          <div className="flex-1 font-mono text-[13px] md:text-sm leading-relaxed space-y-3 pt-1">
            {/* Command Line Input */}
            {renderCommandLine()}

            {/* Success logs */}
            {displayedLines.map((line, idx) => {
              const parts = line.split(".......... ");
              const label = parts[0];
              const status = parts[1];
              return (
                <div key={idx} className="flex items-center font-mono">
                  <span className="text-text-muted">{label}..........</span>
                  <span className="text-lime font-bold ml-1.5">{status}</span>
                </div>
              );
            })}

            {/* Ending Blinking Cursor Block */}
            {isDone && cursorVisible && (
              <div className="flex items-center font-mono">
                <span className="inline-block w-2 h-[15px] bg-text-muted ml-1 cursor-blink" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
