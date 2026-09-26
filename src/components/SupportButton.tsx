import { useState } from "react";
import { supabase } from "../lib/supabase";

// Razorpay's Checkout.js attaches itself to window; there's no npm
// package for the popup itself, just this global once the script has
// loaded, so this narrow declaration is all TypeScript needs.
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const QUICK_AMOUNTS = [100, 250, 500]; // rupees

let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

// Drop this in wherever the old `<a href="/#support">Support</a>` was
// (the navbar, most likely) — it renders its own button and modal, so
// nothing else needs to manage its open/closed state.
export default function SupportButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [amountRupees, setAmountRupees] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const effectiveRupees = customAmount !== "" ? Number(customAmount) : amountRupees;

  function reset() {
    setAmountRupees(100);
    setCustomAmount("");
    setName("");
    setMessage("");
    setError(null);
    setDone(false);
  }

  function close() {
    setOpen(false);
    // Wait for the closing transition-free unmount before resetting,
    // so the form doesn't visibly blank out while still on screen.
    setTimeout(reset, 200);
  }

  async function handlePay() {
    setError(null);

    if (!Number.isFinite(effectiveRupees) || effectiveRupees < 40) {
      setError("Minimum support amount is ₹40.");
      return;
    }

    setSubmitting(true);
    try {
      await loadRazorpayScript();

      const { data, error: invokeError } = await supabase.functions.invoke("create-support-order", {
        body: {
          amount_paise: Math.round(effectiveRupees * 100),
          name,
          message,
        },
      });

      if (invokeError || data?.error) {
        setError(data?.error ?? "Could not start payment. Please try again.");
        setSubmitting(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Why Fired",
        description: "Supporting Why Fired",
        order_id: data.order_id,
        prefill: name ? { name } : undefined,
        theme: { color: "#7a140f" }, // brand-700
        handler: () => {
          // The webhook is what actually confirms and records the
          // payment; this just tells the person it went through.
          setDone(true);
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      });
      razorpay.open();
      setSubmitting(false);
    } catch {
      setError("Could not start payment. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-cream-100/80 hover:text-cream-50 hover:border-white/30 transition-colors"
        }
      >
        <span aria-hidden="true">&#9829;</span> Support
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/70 backdrop-blur-sm px-5"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-feed-line bg-cream-50 shadow-[0_1px_3px_rgba(61,9,6,0.08)] p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center">
                <h2 className="font-display text-xl text-ink mb-2">Thank you.</h2>
                <p className="text-ink-soft text-sm mb-6">
                  Your support helps keep Why Fired running and free to use.
                </p>
                <button
                  onClick={close}
                  className="rounded-full bg-brand-700 text-cream-50 text-sm font-medium px-5 py-2.5 hover:bg-brand-600 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl text-ink mb-1">Support WhyFired</h2>
                <p className="text-ink-soft text-sm mb-5">
                  WhyFired is a free platform for people to share workplace termination and
                  other workplace-related experiences. If you find the platform useful and
                  would like to support its development, you can leave a voluntary tip.
                </p>

                <div className="flex gap-2 mb-3">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setAmountRupees(amt);
                        setCustomAmount("");
                      }}
                      className={`flex-1 rounded-full px-3 py-2 text-sm border transition-colors ${
                        customAmount === "" && amountRupees === amt
                          ? "bg-brand-700 text-cream-50 border-brand-700"
                          : "bg-feed-card border-feed-line text-ink-soft hover:border-brand-600"
                      }`}
                    >
                      &#8377;{amt}
                    </button>
                  ))}
                </div>

                <label className="block mb-3">
                  <span className="block text-xs text-ink-soft mb-1.5">Or enter an amount (&#8377;)</span>
                  <input
                    type="number"
                    min={40}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="e.g. 750"
                    className="w-full rounded-lg border border-feed-line bg-feed-card px-3 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-brand-600 outline-none"
                  />
                </label>

                <label className="block mb-3">
                  <span className="block text-xs text-ink-soft mb-1.5">Name (optional)</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="How should we credit you?"
                    className="w-full rounded-lg border border-feed-line bg-feed-card px-3 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-brand-600 outline-none"
                  />
                </label>

                <label className="block mb-5">
                  <span className="block text-xs text-ink-soft mb-1.5">Message (optional)</span>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Say something, if you'd like"
                    className="w-full rounded-lg border border-feed-line bg-feed-card px-3 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-brand-600 outline-none"
                  />
                </label>

                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 rounded-full border border-feed-line text-ink-soft text-sm font-medium py-2.5 hover:border-brand-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={submitting}
                    className="flex-1 rounded-full bg-brand-700 text-cream-50 text-sm font-medium py-2.5 hover:bg-brand-600 transition-colors disabled:opacity-60"
                  >
                    {submitting ? "Starting..." : `Pay ₹${effectiveRupees || 0}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}