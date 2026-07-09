"use client";

import React from "react";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="px-6 md:px-12 lg:px-24 py-16 border-t border-hairline bg-surface relative z-10 select-none">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        
        {/* Logo and Tagline */}
        <Logo />

        {/* Footer Navigation in Mono Caps */}
        <nav className="flex flex-wrap justify-center gap-6 md:gap-8">
          <a href="#why" className="text-[12px] font-mono tracking-wider uppercase text-text-secondary hover:text-text">
            Why
          </a>
          <a href="#services" className="text-[12px] font-mono tracking-wider uppercase text-text-secondary hover:text-text">
            What We Run
          </a>
          <a href="#process" className="text-[12px] font-mono tracking-wider uppercase text-text-secondary hover:text-text">
            How We Work
          </a>
          <a href="#otomate" className="text-[12px] font-mono tracking-wider uppercase text-text-secondary hover:text-text">
            Otomate
          </a>
        </nav>

        {/* LinkedIn Link */}
        <div className="flex gap-4">
          <a
            href="https://www.linkedin.com/company/ctrldone/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-mono tracking-wider uppercase text-text-secondary hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
          >
            LinkedIn
          </a>
        </div>
      </div>

      {/* Copyright Footer */}
      <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-hairline flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left select-none">
        <p className="text-[12px] font-mono text-text-muted uppercase tracking-wider">
          © {new Date().getFullYear()} CTRLDONE. All rights reserved.
        </p>
        <p className="text-[12px] font-mono text-text-muted uppercase tracking-wider">
          {"// otomate is our technical studio"}
        </p>
      </div>
    </footer>
  );
}
