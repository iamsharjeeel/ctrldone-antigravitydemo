"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, ArrowLeft } from "lucide-react";

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
      const response = await fetch(
        "https://services.leadconnectorhq.com/hooks/ELmgviKqKUd3zxoPoph4/webhook-trigger/2ee31b0a-dacb-421b-a1e3-b779b97b195a",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

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
        className="relative w-full max-w-lg bg-surface rounded-md p-8 md:p-10 shadow-lg border border-hairline overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Glow background */}
        <div className="absolute top-0 right-0 w-[200px] h-[200px] glow-blue-radial pointer-events-none opacity-40 -translate-y-1/2 translate-x-1/2" />

        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full border border-hairline hover:bg-surface-hover text-text-secondary hover:text-text transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
          aria-label="Close brief popup"
        >
          <X size={18} />
        </button>

        {status === "success" ? (
          /* SUCCESS STATE */
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-lime rounded-full opacity-10 blur-xl scale-125" />
              <svg
                width="64"
                height="64"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-lime drop-shadow-[0_0_20px_rgba(214,238,60,0.4)]"
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
            
            <h3 className="text-xl font-bold text-text mb-4">
              Intake Brief Sent
            </h3>
            
            <p className="text-[1.0625rem] font-light leading-relaxed text-text-secondary">
              Got it. CTRLDONE will review and reply with a specific next step within 24 hours. Otomate is prepped to build.
            </p>
            
            <button
              onClick={onClose}
              className="mt-8 inline-flex items-center justify-center px-6 py-2.5 text-xs font-semibold uppercase tracking-wider bg-blue text-bg rounded-full hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          /* WIZARD FLOW STATE */
          <div>
            {/* Step Counter Indicator */}
            <div className="flex items-center gap-4 mb-6">
              {step > 1 && (
                <button
                  onClick={prevStep}
                  className="flex items-center text-xs font-semibold tracking-wider text-text-secondary hover:text-text gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              <span className={`text-xs font-semibold tracking-[0.16em] text-blue uppercase ${step === 1 ? "" : "ml-auto"}`}>
                Step {step} of 3
              </span>
            </div>

            {/* STEP 1: Growth Bottleneck */}
            {step === 1 && (
              <div>
                <h3 className="text-xl font-semibold text-text mb-6">
                  What is your primary growth bottleneck?
                </h3>
                <div className="flex flex-col gap-3 mb-8">
                  {bottlenecks.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedBottleneck(item)}
                      className={`w-full px-6 py-4 text-left rounded-md border text-sm font-medium transition-all cursor-pointer ${
                        selectedBottleneck === item
                          ? "bg-blue/10 border-blue text-text shadow-lime"
                          : "bg-surface hover:bg-surface-hover border-hairline text-text-secondary hover:text-text"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{item}</span>
                        {selectedBottleneck === item && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue animate-pulse" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t border-hairline">
                  <button
                    onClick={nextStep}
                    disabled={!selectedBottleneck}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue text-bg shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Budget/Spend */}
            {step === 2 && (
              <div>
                <h3 className="text-xl font-semibold text-text mb-6">
                  What is your monthly ad spend / budget?
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {budgets.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedBudget(item)}
                      className={`px-4 py-6 text-center rounded-md border text-sm font-medium transition-all cursor-pointer ${
                        selectedBudget === item
                          ? "bg-blue/10 border-blue text-text shadow-lime"
                          : "bg-surface hover:bg-surface-hover border-hairline text-text-secondary hover:text-text"
                      }`}
                    >
                      <span className="block mb-2">{item}</span>
                      <span
                        className={`inline-block w-4 h-4 rounded-full border transition-all ${
                          selectedBudget === item
                            ? "bg-blue border-blue"
                            : "border-hairline"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t border-hairline">
                  <button
                    onClick={nextStep}
                    disabled={!selectedBudget}
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue text-bg shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Contact & Submit */}
            {step === 3 && (
              <form onSubmit={handleSubmit}>
                <h3 className="text-xl font-semibold text-text mb-6">
                  Who should we contact?
                </h3>
                
                <div className="space-y-4 mb-8">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
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
                      className="w-full px-4 py-3 bg-surface hover:bg-surface-hover focus:bg-surface-hover rounded-md border border-hairline focus:border-blue text-text placeholder-text-muted focus:outline-none transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
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
                      className="w-full px-4 py-3 bg-surface hover:bg-surface-hover focus:bg-surface-hover rounded-md border border-hairline focus:border-blue text-text placeholder-text-muted focus:outline-none transition-all"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label htmlFor="company" className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
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
                      className="w-full px-4 py-3 bg-surface hover:bg-surface-hover focus:bg-surface-hover rounded-md border border-hairline focus:border-blue text-text placeholder-text-muted focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <p className="text-sm font-medium text-red-500 bg-red-500/10 p-3 rounded-md border border-red-500/20 mb-6">
                    {errorMessage}
                  </p>
                )}

                <div className="flex justify-end pt-2 border-t border-hairline gap-4">
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="inline-flex items-center justify-center px-8 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue text-bg shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none transition-all min-w-[140px] cursor-pointer"
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
