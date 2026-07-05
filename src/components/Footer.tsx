"use client";

import React from "react";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="px-6 md:px-12 lg:px-24 py-16 border-t border-hairline bg-bg relative z-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        
        {/* Logo and Tagline */}
        <Logo />

        {/* Footer Navigation */}
        <nav className="flex flex-wrap justify-center gap-6 md:gap-8">
          <a href="#why" className="text-xs tracking-wider uppercase text-text-secondary hover:text-text">
            Why
          </a>
          <a href="#services" className="text-xs tracking-wider uppercase text-text-secondary hover:text-text">
            What We Run
          </a>
          <a href="#process" className="text-xs tracking-wider uppercase text-text-secondary hover:text-text">
            How We Work
          </a>
          <a href="#otomate" className="text-xs tracking-wider uppercase text-text-secondary hover:text-text">
            Otomate
          </a>
        </nav>

        {/* Social Links Placeholders */}
        <div className="flex gap-4">
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs tracking-wider uppercase text-text-secondary hover:text-text"
          >
            LinkedIn
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs tracking-wider uppercase text-text-secondary hover:text-text"
          >
            Twitter
          </a>
        </div>
      </div>

      {/* Copyright Footer */}
      <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-hairline flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <p className="text-[13px] font-light text-text-muted">
          © {new Date().getFullYear()} CTRLDONE. All rights reserved.
        </p>
        <p className="text-[13px] font-light text-text-muted">
          Otomate is our technical studio.
        </p>
      </div>
    </footer>
  );
}
