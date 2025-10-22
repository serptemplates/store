"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const WAITLIST_FORM_ID = "p0UQfTbXR69iXnRlE953";
const WAITLIST_IFRAME_ID = `inline-${WAITLIST_FORM_ID}`;
const WAITLIST_FORM_SRC = `https://ghl.serp.co/widget/form/${WAITLIST_FORM_ID}`;
const WAITLIST_SCRIPT_SRC = "https://ghl.serp.co/js/form_embed.js";

export interface GhlWaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

export function GhlWaitlistModal({ open, onClose }: GhlWaitlistModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-ghl-form-script="true"]`
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = WAITLIST_SCRIPT_SRC;
      script.async = true;
      script.dataset.ghlFormScript = "true";
      document.body.appendChild(script);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const modalContent = useMemo(() => {
    if (!open) return null;

    return (
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-modal-title"
      >
        <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close waitlist form"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>

          <div className="border-b border-slate-200 px-6 pb-3 pt-6">
            <h2 id="waitlist-modal-title" className="text-lg font-semibold text-slate-900">
              Be the first to know
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Join the waitlist and we&apos;ll email you as soon as we launch.
            </p>
          </div>

          <div className="h-[520px] w-full bg-slate-50 px-6 pb-6 pt-4">
            <div className="h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-inner">
              <iframe
                key={WAITLIST_IFRAME_ID}
                src={WAITLIST_FORM_SRC}
                style={{ width: "100%", height: "100%", border: "none", borderRadius: "12px" }}
                id={WAITLIST_IFRAME_ID}
                data-layout="{'id':'INLINE'}"
                data-trigger-type="alwaysShow"
                data-trigger-value=""
                data-activation-type="alwaysActivated"
                data-activation-value=""
                data-deactivation-type="neverDeactivate"
                data-deactivation-value=""
                data-form-name="Coming Soon Email Signups"
                data-height="499"
                data-layout-iframe-id={WAITLIST_IFRAME_ID}
                data-form-id={WAITLIST_FORM_ID}
                title="Coming Soon Email Signups"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }, [onClose, open]);

  if (!mounted) return null;
  if (!modalContent) return null;

  return createPortal(modalContent, document.body);
}
