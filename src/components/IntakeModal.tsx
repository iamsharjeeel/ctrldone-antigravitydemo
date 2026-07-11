"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, ArrowLeft, Check } from "lucide-react";

interface IntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntakeModal({ isOpen, onClose }: IntakeModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBottleneck, setSelectedBottleneck] = useState<string>("");
  const [selectedBudget, setSelectedBudget] = useState<string>("");
  
  const [contactData, setContactData] = useState({
    name: "",
    email: "",
    company: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key and handle Focus trapping
  useEffect(() => {
    if (!isOpen) return;

    // Reset state on open
    setStep(1);
    setSelectedBottleneck("");
    setSelectedBudget("");
    setContactData({ name: "", email: "", company: "" });
    setStatus("idle");
    setErrorMessage("");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], button, textarea, input, [tabindex="0"]'
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
      closeButtonRef.current?.focus();
    }, 100);

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContactData({
      ...contactData,
      [e.target.name]: e.target.value,
    });
  };

  const nextStep = () => {
    if (step === 1 && !selectedBottleneck) return;
    if (step === 2 && !selectedBudget) return;
    setStep((prev) => (prev + 1) as 1 | 2 | 3);
  };

  const prevStep = () => {
    setStep((prev) => (prev - 1) as 1 | 2 | 3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactData.name || !contactData.email) {
      setErrorMessage("Please enter your name and email address.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    // Compile conversational variables into message parameter
    const compiledMessage = `Growth Bottleneck: ${selectedBottleneck} | Current Monthly Ad Spend/Budget: ${selectedBudget}`;

    const payload = {
      name: contactData.name,
      email: contactData.email,
      company: contactData.company || "Not Provided",
      message: compiledMessage,
    };

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus("success");
      } else {
        throw new Error("Failed to submit intake brief. Please try again.");
      }
    } catch (err: unknown) {
      setStatus("error");
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
    }
  };

  const bottlenecks = [
    "Brand Positioning & Messaging",
    "Scaling Growth Channels",
    "Product Design & Web Dev",
    "Go-to-Market Strategy",
  ];

  const budgets = [
    "< $5,000 / mo",
    "$5,000 - $20,000 / mo",
    "$20,000 - $50,000 / mo",
    "$50,000+ / mo",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-md transition-all duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-surface rounded-sm p-8 md:p-10 border border-hairline overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-sm border border-hairline hover:bg-surface-hover text-text-secondary hover:text-text transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
          aria-label="Close brief popup"
        >
          <X size={18} />
        </button>

        {/* CTRLDONE Branded Header */}
        <div className="flex items-center gap-1 justify-center mb-8 select-none">
          <span className="text-[20px] font-light tracking-tight text-text font-sans">ctrl</span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mx-0.5 shrink-0"
            aria-hidden="true"
          >
            <circle cx="50" cy="50" r="32" fill="var(--color-lime)" />
            <path
              d="M76.8 23.2 A 38 38 0 1 1 23.2 76.8"
              stroke="var(--color-blue)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M36 50L46 60L64 36"
              stroke="#1B2430"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[20px] font-bold tracking-tight text-text font-sans">one</span>
        </div>

        {status === "success" ? (
          /* SUCCESS STATE */
          <div className="flex flex-col items-center justify-center text-center py-6 reveal-el" style={{ opacity: 1 }}>
            <div className="relative mb-8">
              <svg
                width="80"
                height="80"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-lime relative z-10"
              >
                <circle cx="50" cy="50" r="32" fill="var(--color-lime)" />
                <path
                  d="M76.8 23.2 A 38 38 0 1 1 23.2 76.8"
                  stroke="var(--color-blue)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M36 50L46 60L64 36"
                  stroke="#1B2430"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-text mb-3 font-mono uppercase tracking-wider">
              [ Intake Brief Sent ]
            </h3>
            
            <p className="text-[15px] font-normal leading-relaxed text-text-secondary max-w-sm mb-8">
              Thank you, <span className="font-semibold text-text">{contactData.name}</span>. CTRLDONE will review your details and reply within 24 hours. Otomate is ready to execute.
            </p>

            {/* Brief summary card */}
            <div className="w-full bg-surface-hover rounded-sm border border-hairline p-5 text-left mb-8 space-y-3 relative z-10">
              <div className="text-xs uppercase tracking-wider text-text-muted font-mono border-b border-hairline pb-2 mb-2">
                {"// submission summary"}
              </div>
              <div className="grid grid-cols-3 text-xs font-mono">
                <span className="text-text-secondary">Company</span>
                <span className="col-span-2 text-text font-bold">{contactData.company || "Not Provided"}</span>
              </div>
              <div className="grid grid-cols-3 text-xs font-mono">
                <span className="text-text-secondary">Bottleneck</span>
                <span className="col-span-2 text-text font-bold">{selectedBottleneck}</span>
              </div>
              <div className="grid grid-cols-3 text-xs font-mono">
                <span className="text-text-secondary">Budget</span>
                <span className="col-span-2 text-text font-bold">{selectedBudget}</span>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="w-full inline-flex items-center justify-center px-6 py-3.5 text-xs font-mono uppercase tracking-wider bg-blue text-bg rounded-sm hover:bg-blue-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue cursor-pointer z-10"
            >
              Done
            </button>
          </div>
        ) : (
          /* WIZARD FLOW STATE */
          <div>
            {/* Step Counter Indicator */}
            <div className="flex items-center gap-4 mb-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center text-xs font-mono tracking-wider text-text-secondary hover:text-text gap-1.5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue rounded-sm px-2 py-1 -ml-2"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              <span className={`text-xs font-mono tracking-[0.16em] text-blue uppercase ${step === 1 ? "" : "ml-auto"}`}>
                Step {step} of 3
              </span>
            </div>

            {/* Premium Dual-Colored Progress Bar */}
            <div className="flex items-center justify-between w-full mb-8 relative px-1">
              {/* Connection background line */}
              <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-[1px] bg-hairline z-0" />
              {/* Animated fill line */}
              <div
                className="absolute left-1 top-1/2 -translate-y-1/2 h-[1px] bg-blue transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] z-0"
                style={{ width: `calc(${((step - 1) / 2) * 100}% - 8px)` }}
              />
              {/* Step indicator bubbles */}
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-sm border text-[13px] font-mono transition-all duration-300 ${
                    s < step
                      ? "bg-blue border-blue text-bg"
                      : s === step
                      ? "bg-surface border-blue text-blue scale-110"
                      : "bg-surface border-hairline text-text-muted"
                  }`}
                >
                  {s < step ? <Check size={14} strokeWidth={3} /> : s}
                </div>
              ))}
            </div>

            {/* STEP 1: Growth Bottleneck */}
            {step === 1 && (
              <div className="reveal-el" style={{ opacity: 1 }}>
                <h3 className="text-base font-bold text-text mb-6 font-mono uppercase tracking-wider">
                  What is your primary growth bottleneck?
                </h3>
                <div className="flex flex-col gap-3 mb-8">
                  {bottlenecks.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedBottleneck(item)}
                      className={`w-full px-6 py-4 text-left rounded-sm border text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue ${
                        selectedBottleneck === item
                          ? "bg-blue/10 border-blue text-text"
                          : "bg-surface hover:bg-surface-hover/80 border-hairline text-text-secondary hover:text-text hover:border-text-secondary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{item}</span>
                        <span
                          className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${
                            selectedBottleneck === item
                              ? "bg-blue border-blue"
                              : "border-hairline"
                          }`}
                        >
                          {selectedBottleneck === item && (
                            <span className="w-1.5 h-1.5 rounded-sm bg-bg" />
                          )}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-hairline">
                  <button
                    onClick={nextStep}
                    disabled={!selectedBottleneck}
                    className="inline-flex items-center justify-center px-8 py-3 rounded-sm text-xs font-mono uppercase tracking-wider bg-blue text-bg hover:bg-blue-hover disabled:opacity-40 disabled:pointer-events-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Budget/Spend */}
            {step === 2 && (
              <div className="reveal-el" style={{ opacity: 1 }}>
                <h3 className="text-base font-bold text-text mb-6 font-mono uppercase tracking-wider">
                  What is your monthly ad spend / budget?
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {budgets.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedBudget(item)}
                      className={`px-4 py-6 text-center rounded-sm border text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue ${
                        selectedBudget === item
                          ? "bg-blue/10 border-blue text-text"
                          : "bg-surface hover:bg-surface-hover/80 border-hairline text-text-secondary hover:text-text hover:border-text-secondary/30"
                      }`}
                    >
                      <span className="block mb-3 font-semibold">{item}</span>
                      <span
                        className={`inline-block w-4 h-4 rounded-sm border transition-all ${
                          selectedBudget === item
                            ? "bg-blue border-blue"
                            : "border-hairline"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-hairline">
                  <button
                    onClick={nextStep}
                    disabled={!selectedBudget}
                    className="inline-flex items-center justify-center px-8 py-3 rounded-sm text-xs font-mono uppercase tracking-wider bg-blue text-bg hover:bg-blue-hover disabled:opacity-40 disabled:pointer-events-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Contact & Submit */}
            {step === 3 && (
              <form onSubmit={handleSubmit} className="reveal-el" style={{ opacity: 1 }}>
                <h3 className="text-base font-bold text-text mb-6 font-mono uppercase tracking-wider">
                  Who should we contact?
                </h3>
                
                <div className="space-y-4 mb-8">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">
                      Your Name <span className="text-blue">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={contactData.name}
                      onChange={handleTextChange}
                      placeholder="e.g. John Doe"
                      disabled={status === "submitting"}
                      className="w-full px-4 py-3 bg-surface hover:bg-surface-hover/50 focus:bg-surface-hover/80 rounded-sm border border-hairline focus:border-blue text-text placeholder-text-muted focus:outline-none transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">
                      Email Address <span className="text-blue">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={contactData.email}
                      onChange={handleTextChange}
                      placeholder="john@company.com"
                      disabled={status === "submitting"}
                      className="w-full px-4 py-3 bg-surface hover:bg-surface-hover/50 focus:bg-surface-hover/80 rounded-sm border border-hairline focus:border-blue text-text placeholder-text-muted focus:outline-none transition-all"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label htmlFor="company" className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">
                      Company Name <span className="text-text-muted">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={contactData.company}
                      onChange={handleTextChange}
                      placeholder="e.g. Acme Corp"
                      disabled={status === "submitting"}
                      className="w-full px-4 py-3 bg-surface hover:bg-surface-hover/50 focus:bg-surface-hover/80 rounded-sm border border-hairline focus:border-blue text-text placeholder-text-muted focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <p className="text-sm font-medium text-red-500 bg-red-500/10 p-3 rounded-sm border border-red-500/20 mb-6 font-mono">
                    {errorMessage}
                  </p>
                )}

                <div className="flex justify-end pt-4 border-t border-hairline gap-4">
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="inline-flex items-center justify-center px-8 py-3 rounded-sm text-xs font-mono uppercase tracking-wider bg-blue text-bg hover:bg-blue-hover disabled:opacity-50 disabled:pointer-events-none transition-all min-w-[140px] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
                  >
                    {status === "submitting" ? (
                      <Loader2 size={16} className="animate-spin text-bg" />
                    ) : (
                      "Submit Brief"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
