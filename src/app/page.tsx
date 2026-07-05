"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import WhyCtrldone from "@/components/WhyCtrldone";
import Services from "@/components/Services";
import Process from "@/components/Process";
import Otomate from "@/components/Otomate";
import Outcomes from "@/components/Outcomes";
import StartProject from "@/components/StartProject";
import Footer from "@/components/Footer";
import IntakeModal from "@/components/IntakeModal";
import { gsap } from "@/lib/gsap";

// Lazy mount the React Three Fiber Canvas to optimize performance
const ControlRing = dynamic(() => import("@/components/ControlRing"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 flex items-center justify-center bg-bg">
      {/* Static placeholder circle while hydrating */}
      <div className="absolute w-[280px] h-[280px] rounded-full border border-hairline opacity-10 animate-pulse" />
    </div>
  ),
});

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Check if the user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // If prefers-reduced-motion is true, instantly set all reveal elements to full opacity
      gsap.set(".reveal-el", { opacity: 1, y: 0 });
      return;
    }

    // GSAP ScrollTrigger reveals: autoAlpha 0 -> 1 + y: 28px -> 0, duration 0.8s, ease: power4.out
    const revealElements = gsap.utils.toArray<HTMLElement>(".reveal-el");

    revealElements.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power4.out", // GSAP's built-in power4.out matches cubic-bezier(0.16, 1, 0.3, 1) closely
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        }
      );
    });
  }, []);

  const openIntake = () => setIsModalOpen(true);
  const closeIntake = () => setIsModalOpen(false);

  return (
    <div className="relative min-h-screen w-full bg-bg text-text overflow-hidden selection:bg-blue selection:text-bg">
      {/* Navigation */}
      <Nav onOpenIntake={openIntake} />

      {/* 3D Particle Canvas backdrop */}
      <ControlRing />

      {/* Sections */}
      <main className="relative z-10 w-full">
        <Hero onOpenIntake={openIntake} />
        <WhyCtrldone />
        <Services onOpenIntake={openIntake} />
        <Process />
        <Otomate />
        <Outcomes />
        <StartProject onOpenIntake={openIntake} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Intake Modal Popup */}
      <IntakeModal isOpen={isModalOpen} onClose={closeIntake} />
    </div>
  );
}
