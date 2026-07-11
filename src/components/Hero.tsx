"use client";

import React, { useEffect, useState } from "react";
import { gsap } from "@/lib/gsap";

interface HeroProps {
  onOpenIntake: () => void;
}

type WorkflowLine = {
  tag: string;
  label: string;
  status: string;
  tone: "lime" | "blue" | "muted";
};

const WORKFLOW: WorkflowLine[] = [
  { tag: "audit", label: "brand strategy", status: "done", tone: "lime" },
  { tag: "design", label: "market position", status: "done", tone: "lime" },
  { tag: "growth", label: "channel map", status: "done", tone: "lime" },
  { tag: "handoff", label: "brief → otomate", status: "ready", tone: "blue" },
];

const COMMAND = "$ ctrldone --strategy --growth";

export default function Hero({ onOpenIntake }: HeroProps) {
  const [displayedLines, setDisplayedLines] = useState<WorkflowLine[]>([]);
  const [currentTypingText, setCurrentTypingText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    if (prefersReducedMotion) {
      gsap.set(".reveal-content > *", { opacity: 1, y: 0 });
      gsap.set(".reveal-graphic", { opacity: 1, scale: 1, y: 0 });
      
      setCurrentTypingText(COMMAND);
      setDisplayedLines(WORKFLOW);
      setIsDone(true);
      return;
    }

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

    let charIdx = 0;
    let typingInterval: NodeJS.Timeout;
    const timeouts: NodeJS.Timeout[] = [];

    const startTimeout = setTimeout(() => {
      typingInterval = setInterval(() => {
        if (charIdx < COMMAND.length) {
          setCurrentTypingText(COMMAND.slice(0, charIdx + 1));
          charIdx++;
        } else {
          clearInterval(typingInterval);
          WORKFLOW.forEach((line, index) => {
            const t = setTimeout(() => {
              setDisplayedLines((prev) => [...prev, line]);
              if (index === WORKFLOW.length - 1) setIsDone(true);
            }, 300 + index * 400);
            timeouts.push(t);
          });
        }
      }, 60);
    }, 800);

    const cursorInterval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);

    return () => {
      clearTimeout(startTimeout);
      if (typingInterval) clearInterval(typingInterval);
      timeouts.forEach(clearTimeout);
      clearInterval(cursorInterval);
    };
  }, []);

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

  const statusClass = (tone: WorkflowLine["tone"]) => {
    if (tone === "lime") return "text-lime font-bold";
    if (tone === "blue") return "text-blue font-bold";
    return "text-text-muted";
  };

  return (
    <section
      id="hero"
      className="relative flex flex-col lg:flex-row items-center justify-between page-x overflow-hidden max-w-6xl mx-auto gap-12"
    >
      <div className="relative z-10 max-w-xl lg:max-w-[45vw] text-left reveal-content space-y-6">
        <span className="eyebrow !mb-0">
          {"// growth & digital partners"}
        </span>

        <h1 className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-light tracking-[-0.02em] leading-[1.08] text-text select-none">
          <span className="block">Take <span className="font-bold">control</span>.</span>
          <span className="block mt-1">Get it <span className="font-bold text-blue">done</span>.</span>
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

      <div className="relative w-full max-w-md lg:max-w-lg pointer-events-none z-10 reveal-graphic opacity-0">
        <div className="w-full bg-surface rounded-md border border-hairline p-5 md:p-6 font-mono text-[14px] text-text-secondary leading-relaxed select-none pointer-events-auto text-left">
          <div className="flex items-center justify-between border-b border-hairline pb-3 mb-3 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-hairline" />
              <span className="w-2.5 h-2.5 rounded-full bg-hairline" />
              <span className="w-2.5 h-2.5 rounded-full bg-hairline" />
              <span className="text-[11px] text-text-muted ml-2 font-mono uppercase tracking-wider">ctrlDone_strategy</span>
            </div>
          </div>

          <div className="font-mono text-[12px] md:text-[13px] leading-relaxed space-y-2.5">
            {renderCommandLine()}

            {displayedLines.map((line, idx) => (
              <div key={idx} className="flex items-center font-mono gap-2">
                <span className="text-text-muted shrink-0">[{line.tag}]</span>
                <span className="truncate">{line.label}</span>
                <span className={`ml-auto shrink-0 ${statusClass(line.tone)}`}>{line.status}</span>
              </div>
            ))}

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
