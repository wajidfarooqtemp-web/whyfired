// supabase/functions/create-support-order/index.ts
//
// Called from the frontend when someone clicks "Continue" in the
// Support modal. Creates a Razorpay order server-side (so the amount
// can't be tampered with in the browser) and writes a "created" row
// to support_payments. The actual money only moves once Razorpay
// calls razorpay-support-webhook after the popup succeeds — this
// function never marks anything as paid.
//
// Set these as Supabase → Edge Functions → Secrets (never in the
// frontend, never committed to the repo):
//   RAZORPAY_KEY_ID
//   RAZORPAY_KEY_SECRET
//   SUPABASE_URL              (already set automatically by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (already set automatically by Supabase)

import { createClient } from "npm:@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

// Same floor as the reference file: keeps every order comfortably
// above Razorpay's own minimum charge.
const MIN_SUPPORT_PAISE = 4000; // ₹40

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return new Response(JSON.stringify({ error: "Razorpay not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { amount_paise, name, message } = await req.json();

    const amount = Number(amount_paise);
    if (!Number.isInteger(amount) || amount < MIN_SUPPORT_PAISE) {
      return new Response(
        JSON.stringify({ error: `Minimum support amount is ₹${MIN_SUPPORT_PAISE / 100}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Supporting is open to anyone, logged in or not. If there's a
    // valid session, we tag the row with it purely so you can see
    // which account tipped; it changes nothing about the payment.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    const cleanName = (name ?? "").toString().slice(0, 100);
    const cleanMessage = (message ?? "").toString().slice(0, 300);

    // Razorpay's Orders API, called directly over REST — simpler and
    // more reliable in the Deno edge runtime than the Node SDK.
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `support_${crypto.randomUUID().slice(0, 12)}`,
        notes: { type: "support", name: cleanName, message: cleanMessage },
      }),
    });

    if (!orderRes.ok) {
      const text = await orderRes.text();
      console.error("Razorpay order creation failed:", orderRes.status, text);
      return new Response(JSON.stringify({ error: "Could not create order" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = await orderRes.json();

    const { error: insertError } = await supabase.from("support_payments").insert({
      order_id: order.id,
      amount_paise: amount,
      currency: "INR",
      name: cleanName || null,
      message: cleanMessage || null,
      user_id: userId,
      status: "created",
    });

    if (insertError) {
      // The order already exists on Razorpay's side at this point, so
      // we still let the payment go ahead — the webhook will insert a
      // fallback row on capture if this one never landed. We only log
      // it here.
      console.error("support_payments insert error:", insertError);
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount,
        currency: "INR",
        key_id: RAZORPAY_KEY_ID,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-support-order error:", e);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});