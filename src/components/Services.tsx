"use client";

import React, { useState, useEffect, useRef } from "react";
import { Compass, Palette, TrendingUp, Cpu, X } from "lucide-react";

interface ServicesProps {
  onOpenIntake: () => void;
}

const servicesList = [
  {
    icon: Compass,
    label: "STRATEGY",
    desc: "Positioning, market research and a growth plan built around your numbers, not a template.",
  },
  {
    icon: Palette,
    label: "BRAND",
    desc: "Identity systems, naming and a voice that holds up across every channel you touch.",
  },
  {
    icon: TrendingUp,
    label: "GROWTH MARKETING",
    desc: "Paid media, lifecycle and content programs built to compound month over month.",
  },
  {
    icon: Cpu,
    label: "PRODUCT & WEB",
    desc: "Sites and products designed to convert, built by Otomate on the current stack.",
  },
];

const servicesDetails = [
  {
    title: "STRATEGY",
    deliverables: [
      "Market Positioning Matrix",
      "Channels Growth Playbook",
      "Go-to-Market Strategy",
      "Board-Ready Roadmap"
    ],
    stack: [
      "Unit economics modeling",
      "Competitor landscape audits",
      "Attribution planning"
    ],
    timeline: "14 days from first call"
  },
  {
    title: "BRAND",
    deliverables: [
      "Visual Identity System",
      "SVG Asset Library",
      "Tone & Voice Guidelines",
      "Brand Archetype & Naming"
    ],
    stack: [
      "Vector Design Systems",
      "Editorial Guidelines",
      "Brand Sprints"
    ],
    timeline: "3 - 4 weeks to complete asset kits"
  },
  {
    title: "GROWTH MARKETING",
    deliverables: [
      "Paid Search & Social Accounts",
      "Email Lifecycle Automations",
      "Compound Content Matrix",
      "Real-time Dashboard Setup"
    ],
    stack: [
      "Meta Ads, Google Search, LinkedIn Ads",
      "Klaviyo, Segment",
      "Looker Studio / Custom GA4 analytics"
    ],
    timeline: "Ongoing monthly sprint iterations"
  },
  {
    title: "PRODUCT & WEB",
    deliverables: [
      "Flagship Landing Page",
      "Web App Interface Design",
      "Interactive Canvas Mechanics",
      "Responsive Layout System"
    ],
    stack: [
      "Next.js 15, React 19",
      "Tailwind CSS v4",
      "React Three Fiber, GSAP, Lenis",
      "Vercel Serverless Hosting"
    ],
    timeline: "4 - 6 weeks (built by Otomate technical studio)"
  }
];

export default function Services({ onOpenIntake }: ServicesProps) {
  const [activeServiceIndex, setActiveServiceIndex] = useState<number | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  // Focus trap for drawer accessibility
  useEffect(() => {
    if (activeServiceIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveServiceIndex(null);
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll(
          'button, [tabindex="0"]'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    setTimeout(() => {
      drawerCloseRef.current?.focus();
    }, 100);

    // Disable body scroll when drawer is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeServiceIndex]);

  const activeDetail = activeServiceIndex !== null ? servicesDetails[activeServiceIndex] : null;

  return (
    <section
      id="services"
      className="px-6 md:px-12 lg:px-24 py-24 md:py-32 relative"
    >
      <div className="max-w-6xl mx-auto">
        <div className="reveal-el mb-12">
          <span className="inline-block text-xs font-semibold tracking-[0.16em] text-blue uppercase mb-4">
            Capabilities
          </span>
          <h2 className="text-[clamp(2rem,4vw,3.25rem)] font-light leading-[1.1] text-text mb-6">
            What we <span className="font-bold">run</span>.
          </h2>
        </div>

        {/* 2x2 Interactive Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {servicesList.map((service, index) => {
            const Icon = service.icon;
            return (
              <button
                key={index}
                onClick={() => setActiveServiceIndex(index)}
                className="group text-left relative flex flex-col items-start p-8 md:p-10 bg-surface rounded-md transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 cursor-pointer w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue focus-visible:outline-offset-3"
              >
                {/* 40px Lucide Icon */}
                <div className="text-blue mb-6 group-hover:scale-105 transition-transform duration-300">
                  <Icon size={40} strokeWidth={1.5} aria-hidden="true" />
                </div>

                <div className="flex items-center justify-between w-full mb-3">
                  <h3 className="text-sm font-semibold tracking-[0.16em] text-text uppercase">
                    {service.label}
                  </h3>
                  <span className="text-xs font-light text-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    View Details →
                  </span>
                </div>

                <p className="text-[1.0625rem] font-light leading-relaxed text-text-secondary">
                  {service.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Capability Drawer Slide-Over Panel */}
      <>
        {/* Semi-transparent Backdrop blur overlay */}
        <div
          className={`fixed inset-0 bg-bg/60 backdrop-blur-xs z-40 transition-opacity duration-300 ${
            activeServiceIndex !== null ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setActiveServiceIndex(null)}
        />

        {/* Slide-out Panel container */}
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-hairline z-50 p-8 md:p-10 shadow-lg flex flex-col justify-between transform transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
            activeServiceIndex !== null ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Subtle radial glow inside panel */}
          <div className="absolute top-0 right-0 w-[200px] h-[200px] glow-blue-radial pointer-events-none opacity-30 -translate-y-1/2 translate-x-1/2" />

          {activeDetail && (
            <div className="flex flex-col h-full justify-between">
              <div>
                {/* Header info */}
                <div className="flex justify-between items-center mb-8">
                  <span className="text-xs font-semibold tracking-[0.16em] text-blue uppercase">
                    Capability Details
                  </span>
                  <button
                    ref={drawerCloseRef}
                    onClick={() => setActiveServiceIndex(null)}
                    className="p-1.5 rounded-full border border-hairline hover:bg-surface-hover text-text-secondary hover:text-text transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
                    aria-label="Close details panel"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Service Title */}
                <h3 className="text-2xl font-bold text-text mb-6">
                  {activeDetail.title}
                </h3>

                {/* Deliverables checklist */}
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-text-secondary tracking-wider uppercase mb-3">
                    What you get (Deliverables)
                  </h4>
                  <ul className="space-y-3">
                    {activeDetail.deliverables.map((item, idx) => (
                      <li key={idx} className="text-sm font-light text-text-secondary flex items-start gap-2">
                        <span className="text-blue font-bold mt-0.5 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stack and Methods */}
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-text-secondary tracking-wider uppercase mb-3">
                    Stack & Methodology
                  </h4>
                  <ul className="space-y-2">
                    {activeDetail.stack.map((item, idx) => (
                      <li key={idx} className="text-sm font-light text-text-secondary flex items-start gap-2">
                        <span className="text-blue mt-0.5 shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Timeline */}
                <div className="p-4 bg-bg rounded-md border border-hairline">
                  <h4 className="text-xs font-semibold text-text-secondary tracking-wider uppercase mb-1">
                    Timeline Commitments
                  </h4>
                  <p className="text-sm font-normal text-text">
                    {activeDetail.timeline}
                  </p>
                </div>
              </div>

              {/* Action Button: Opens Intake Form popup */}
              <button
                onClick={() => {
                  setActiveServiceIndex(null);
                  onOpenIntake();
                }}
                className="w-full mt-8 inline-flex items-center justify-center px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue text-bg shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              >
                Discuss this project
              </button>
            </div>
          )}
        </div>
      </>
    </section>
  );
}
