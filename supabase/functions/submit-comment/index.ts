// supabase/functions/submit-comment/index.ts

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Not authenticated." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: "Not authenticated." }, 401);
    }

    const body = await req.json();

    const caseId = typeof body.case_id === "string" ? body.case_id : "";
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(caseId)) {
      return json({ error: "Invalid case." }, 422);
    }

    const commentBody = typeof body.body === "string" ? sanitizeText(body.body) : "";
    if (commentBody.length < 1 || commentBody.length > 2000) {
      return json({ error: "Comment must be between 1 and 2000 characters." }, 422);
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({ case_id: caseId, user_id: user.id, body: commentBody })
      .select("id, created_at")
      .single();

    if (error) {
      // The database's own rate-limit trigger raises a plain,
      // already-friendly message; pass it straight through.
      if (error.message?.includes("commenting too fast")) {
        return json({ error: error.message }, 429);
      }
      return json({ error: "Could not post your comment. The case may not be approved yet." }, 400);
    }

    return json({ id: data.id, created_at: data.created_at }, 201);
  } catch {
    return json({ error: "Unexpected error. Please try again." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
