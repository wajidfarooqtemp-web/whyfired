import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// qrcode.js (davidshimjs, mirrored on cdnjs) attaches itself to
// window; there's no npm package for what we use here, just this
// global once the script has loaded.
declare global {
  interface Window {
    QRCode: new (
      element: HTMLElement,
      options: { text: string; width: number; height: number },
    ) => void;
  }
}

const QUICK_AMOUNTS = [100, 250, 500]; // rupees
const MIN_RUPEES = 40; // keeps every "tip" comfortably above trivial amounts
const MAX_RUPEES = 100000; // sanity cap so a mistyped amount can't produce a broken link

const UPI_ID = "wajidfarooq3@okaxis";
const PAYEE_NAME = "WhyFired";

const QR_SCRIPT_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
// SRI hash for this exact file/version — if cdnjs ever served
// anything else at this URL, the browser refuses to run it. Re-check
// against https://cdnjs.com/libraries/qrcodejs if this ever gets
// upgraded to a newer version.
const QR_SCRIPT_INTEGRITY =
  "sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==";

let qrScriptPromise: Promise<void> | null = null;
function loadQrScript(): Promise<void> {
  if (qrScriptPromise) return qrScriptPromise;
  qrScriptPromise = new Promise((resolve, reject) => {
    if (window.QRCode) return resolve();
    const script = document.createElement("script");
    script.src = QR_SCRIPT_SRC;
    script.integrity = QR_SCRIPT_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load QR code library"));
    document.body.appendChild(script);
  });
  return qrScriptPromise;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Builds a upi://pay deep link. `amountRupees` must already be
// validated (finite, positive, within range) before this is called.
function buildUpiLink(amountRupees: number, note: string) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: PAYEE_NAME,
    am: amountRupees.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

// Drop this in wherever the old `<a href="/#support">Support</a>` was
// (the navbar, most likely) — it renders its own button and modal, so
// nothing else needs to manage its open/closed state.
//
// This talks to nobody's backend: on mobile it hands off to whatever
// UPI app is installed via a upi:// deep link, on desktop it shows a
// QR code for the same link. There is no webhook or database record
// of whether a payment actually completed — the UPI app is the only
// source of truth for that, same as scanning any other UPI QR code.
export default function SupportButton({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "qr" | "done">("form");
  const [amountRupees, setAmountRupees] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const pendingUpiLinkRef = useRef<string>("");
  const pendingAmountRef = useRef<number>(0);

  const effectiveRupees =
    customAmount !== "" ? Number(customAmount) : amountRupees;

  function reset() {
    setView("form");
    setAmountRupees(100);
    setCustomAmount("");
    setName("");
    setMessage("");
    setError(null);
    setSubmitting(false);
  }

  function close() {
    setOpen(false);
    // Wait for the closing transition-free unmount before resetting,
    // so the form doesn't visibly blank out while still on screen.
    setTimeout(reset, 200);
  }

  // Renders the QR code into the container once the "qr" view is
  // showing and the library has loaded. Re-runs are guarded by
  // clearing the container first, in case this ever fires twice.
  useEffect(() => {
    if (view !== "qr" || !qrContainerRef.current) return;
    qrContainerRef.current.innerHTML = "";
    new window.QRCode(qrContainerRef.current, {
      text: pendingUpiLinkRef.current,
      width: 220,
      height: 220,
    });
  }, [view]);

  function validateAmount(): number | null {
    const amt = effectiveRupees;
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return null;
    }
    if (amt < MIN_RUPEES) {
      setError(`Minimum support amount is ₹${MIN_RUPEES}.`);
      return null;
    }
    if (amt > MAX_RUPEES) {
      setError("That amount is too high to generate a payment link for — try something smaller.");
      return null;
    }
    return amt;
  }

  async function handlePay() {
    setError(null);
    const amt = validateAmount();
    if (amt === null) return;

    const note =
      [name.trim(), message.trim()].filter(Boolean).join(" - ").slice(0, 50) ||
      "Support WhyFired";
    const upiLink = buildUpiLink(amt, note);

    if (isMobileDevice()) {
      // This has to stay synchronous, right here in the click
      // handler — iOS Safari blocks app-switch redirects that happen
      // after an `await`, so nothing async can run before this line.
      window.location.href = upiLink;
      setView("done");
      return;
    }

    setSubmitting(true);
    try {
      await loadQrScript();
      pendingUpiLinkRef.current = upiLink;
      pendingAmountRef.current = amt;
      setView("qr");
    } catch {
      setError(
        `Could not load the QR code. You can also pay directly to ${UPI_ID} via any UPI app.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          onClick?.();
        }}
        className={
          className ??
          "inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-cream-100/80 hover:text-cream-50 hover:border-white/30 transition-colors"
        }
      >
        <span aria-hidden="true">&#9829;</span> Support
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/70 backdrop-blur-sm px-5"
            onClick={close}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-feed-line bg-cream-50 shadow-[0_1px_3px_rgba(61,9,6,0.08)] p-7"
              onClick={(e) => e.stopPropagation()}
            >
              {view === "done" ? (
                <div className="text-center">
                  <h2 className="font-display text-xl text-ink mb-2">
                    Thank you.
                  </h2>
                  <p className="text-ink-soft text-sm mb-6">
                    If your UPI app opened, finish the payment there. Your
                    support helps keep Why Fired running and free to use.
                  </p>
                  <button
                    onClick={close}
                    className="rounded-full bg-brand-700 text-cream-50 text-sm font-medium px-5 py-2.5 hover:bg-brand-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : view === "qr" ? (
                <div className="text-center">
                  <h2 className="font-display text-xl text-ink mb-1">
                    Scan to pay &#8377;{pendingAmountRef.current}
                  </h2>
                  <p className="text-ink-soft text-sm mb-4">
                    Open any UPI app (GPay, PhonePe, Paytm) and scan this code.
                  </p>
                  <div ref={qrContainerRef} className="flex justify-center mb-4" />
                  <p className="text-xs text-ink-soft/70 mb-5">Paying to {UPI_ID}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setView("form")}
                      className="flex-1 rounded-full border border-feed-line text-ink-soft text-sm font-medium py-2.5 hover:border-brand-600 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className="flex-1 rounded-full bg-brand-700 text-cream-50 text-sm font-medium py-2.5 hover:bg-brand-600 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-xl text-ink mb-1">
                    Support WhyFired
                  </h2>
                  <p className="text-ink-soft text-sm mb-5">
                    WhyFired is a free platform for sharing unfair termination and workplace mistreatment experiences in India and abroad. Support its development with a voluntary tip.
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
                    <span className="block text-xs text-ink-soft mb-1.5">
                      Or enter an amount (&#8377;)
                    </span>
                    <input
                      type="number"
                      min={MIN_RUPEES}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="e.g. 750"
                      className="w-full rounded-lg border border-feed-line bg-feed-card px-3 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-brand-600 outline-none"
                    />
                  </label>

                  <label className="block mb-3">
                    <span className="block text-xs text-ink-soft mb-1.5">
                      Name (optional)
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="How should we credit you?"
                      className="w-full rounded-lg border border-feed-line bg-feed-card px-3 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-brand-600 outline-none"
                    />
                  </label>

                  <label className="block mb-5">
                    <span className="block text-xs text-ink-soft mb-1.5">
                      Message (optional)
                    </span>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Say something, if you'd like"
                      className="w-full rounded-lg border border-feed-line bg-feed-card px-3 py-2.5 text-sm text-ink placeholder-ink-soft/60 focus:border-brand-600 outline-none"
                    />
                  </label>

                  {error && (
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                  )}

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
                      {submitting
                        ? "Loading..."
                        : `Pay ₹${effectiveRupees || 0}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}