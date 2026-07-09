"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sun, Moon, Menu, X } from "lucide-react";
import { ScrollTrigger } from "@/lib/gsap";
import Logo from "@/components/Logo";

interface NavProps {
  onOpenIntake: () => void;
}

export default function Nav({ onOpenIntake }: NavProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Synchronize with layout script set value
  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme") as "dark" | "light";
    setTheme(currentTheme || "dark");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  };

  useEffect(() => {
    // GSAP ScrollTrigger to toggle class on scrolled past hero
    const trigger = ScrollTrigger.create({
      trigger: "#hero",
      start: "bottom top+=80px",
      onEnter: () => {
        navRef.current?.classList.add("nav-active");
      },
      onLeaveBack: () => {
        navRef.current?.classList.remove("nav-active");
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-between px-6 md:px-12 lg:px-24 transition-all duration-300 nav-header"
      >
        {/* Logo Left */}
        <a href="#hero" className="shrink-0">
          <Logo />
        </a>

        {/* Desktop Links (Center-Right) */}
        <nav className="hidden md:flex items-center gap-8 ml-auto mr-8">
          <a href="#why" className="text-[13px] font-mono tracking-[0.08em] uppercase text-text-secondary hover:text-text">
            Why
          </a>
          <a href="#services" className="text-[13px] font-mono tracking-[0.08em] uppercase text-text-secondary hover:text-text">
            What We Run
          </a>
          <a href="#process" className="text-[13px] font-mono tracking-[0.08em] uppercase text-text-secondary hover:text-text">
            How We Work
          </a>
          <a href="#otomate" className="text-[13px] font-mono tracking-[0.08em] uppercase text-text-secondary hover:text-text">
            Otomate
          </a>
        </nav>

        {/* Actions (Far-Right: Toggle, CTA, and Mobile Toggle) */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-md border border-hairline hover:bg-surface-hover text-text-secondary hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
            aria-label="Toggle light and dark mode"
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-lime" aria-hidden="true" />
            ) : (
              <Moon size={18} className="text-blue" aria-hidden="true" />
            )}
          </button>

          {/* CTA Button */}
          <button
            onClick={onOpenIntake}
            className="hidden sm:inline-flex items-center justify-center text-xs font-mono uppercase tracking-wider bg-blue text-bg px-4 py-2.5 rounded-md hover:bg-blue-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue cursor-pointer"
          >
            Start a project
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md border border-hairline hover:bg-surface-hover text-text-secondary hover:text-text"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Full-screen Overlay Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 bg-surface/98 border-b border-hairline flex flex-col items-center justify-center transition-all duration-500 md:hidden ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col items-center gap-8 text-center">
          <a
            href="#why"
            onClick={closeMobileMenu}
            className="text-lg font-mono tracking-[0.08em] uppercase text-text-secondary hover:text-text"
          >
            Why
          </a>
          <a
            href="#services"
            onClick={closeMobileMenu}
            className="text-lg font-mono tracking-[0.08em] uppercase text-text-secondary hover:text-text"
          >
            What We Run
          </a>
          <a
            href="#process"
            onClick={closeMobileMenu}
            className="text-lg font-mono tracking-[0.08em] uppercase text-text-secondary hover:text-text"
          >
            How We Work
          </a>
          <a
            href="#otomate"
            onClick={closeMobileMenu}
            className="text-lg font-mono tracking-[0.08em] uppercase text-text-secondary hover:text-text"
          >
            Otomate
          </a>
          
          {/* CTA inside mobile menu for small screens */}
          <button
            onClick={() => {
              closeMobileMenu();
              onOpenIntake();
            }}
            className="sm:hidden inline-flex items-center justify-center text-xs font-mono uppercase tracking-wider bg-blue text-bg px-6 py-3 rounded-md mt-4 cursor-pointer"
          >
            Start a project
          </button>
        </nav>
      </div>
    </>
  );
}
