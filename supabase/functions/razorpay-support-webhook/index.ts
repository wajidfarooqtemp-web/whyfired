// supabase/functions/razorpay-support-webhook/index.ts
//
// Razorpay calls this automatically after a payment is captured. This
// is the only place a support payment actually gets marked as paid —
// the frontend and create-support-order never do that themselves, so
// a user can't fake a successful tip by skipping the popup.
//
// In Razorpay dashboard → Settings → Webhooks, point a webhook at this
// function's URL, subscribe to the "payment.captured" event, and set
// the same secret you put in RAZORPAY_WEBHOOK_SECRET below.
//
// Set as Supabase → Edge Functions → Secrets:
//   RAZORPAY_WEBHOOK_SECRET
//   SUPABASE_URL              (already set automatically by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (already set automatically by Supabase)
//
// Important: this function must have "Verify JWT" turned OFF in its
// Supabase settings. Razorpay doesn't send a Supabase auth token, it
// sends its own signature instead, which is what we check below.

import { createClient } from "npm:@supabase/supabase-js@2";

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  if (!RAZORPAY_WEBHOOK_SECRET || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(RAZORPAY_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time compare, so a timing attack can't leak the secret
  // one correct byte at a time.
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Read the raw text before touching it as JSON — the signature is
  // computed over the exact bytes Razorpay sent, not a re-serialised
  // version of them.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const valid = await verifySignature(rawBody, signature);
  if (!valid) {
    console.error("Razorpay webhook: signature mismatch, rejecting");
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(rawBody);

  // We only care about a captured support payment. Anything else
  // (failed, refunded, or a webhook type this project doesn't use)
  // is acknowledged with 200 so Razorpay stops retrying, and ignored.
  if (event.event !== "payment.captured") {
    return new Response("ok", { status: 200 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment || payment.notes?.type !== "support") {
    return new Response("ok", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: updated, error: updateError } = await supabase
    .from("support_payments")
    .update({
      payment_ref: payment.id,
      status: "captured",
      captured_at: new Date().toISOString(),
    })
    .eq("order_id", payment.order_id)
    .select("id");

  if (updateError) {
    console.error("support_payments update error:", updateError);
    return new Response("Database error", { status: 500 });
  }

  // Fallback: the row from create-support-order didn't make it in for
  // some reason, but the payment genuinely went through. Insert it
  // straight from Razorpay's own record rather than losing the tip.
  if (!updated || updated.length === 0) {
    await supabase.from("support_payments").insert({
      order_id: payment.order_id,
      payment_ref: payment.id,
      amount_paise: payment.amount,
      currency: payment.currency ?? "INR",
      name: payment.notes?.name || null,
      message: payment.notes?.message || null,
      status: "captured",
      captured_at: new Date().toISOString(),
    });
  }

  return new Response("ok", { status: 200 });
});