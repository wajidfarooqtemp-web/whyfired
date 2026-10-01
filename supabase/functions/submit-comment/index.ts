// supabase/functions/submit-comment/index.ts

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Keeps single and double newlines (paragraph breaks) while still
// stripping markup, control characters, and runaway spacing — see
// the matching function in submit-case/index.ts for the full story.
function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    // "Comment as Why Fired": admin-only, same pattern as the
    // "post as Why Fired" path in submit-case/index.ts. is_admin is
    // read fresh here rather than trusted from the client, and the
    // insert trigger (migration 015) enforces the same check again
    // independently before the row is written.
    let postAsOfficial = false;
    if (body.post_as_official === true) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!profileRow?.is_admin) {
        return json({ error: "Not authorized." }, 403);
      }
      postAsOfficial = true;
    }

    const caseId = typeof body.case_id === "string" ? body.case_id : "";
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(caseId)) {
      return json({ error: "Invalid case." }, 422);
    }

    // Optional: this comment is a reply to another comment. Only
    // format-checked here — whether it actually belongs to this case
    // and is still visible is enforced independently by the
    // database trigger (migration 016), same defense-in-depth
    // pattern as everything else in this function.
    let parentCommentId: string | null = null;
    if (body.parent_comment_id !== undefined && body.parent_comment_id !== null) {
      if (typeof body.parent_comment_id !== "string" || !uuidPattern.test(body.parent_comment_id)) {
        return json({ error: "Invalid reply target." }, 422);
      }
      parentCommentId = body.parent_comment_id;
    }

    const commentBody = typeof body.body === "string" ? sanitizeText(body.body) : "";
    if (commentBody.length < 1 || commentBody.length > 2000) {
      return json({ error: "Comment must be between 1 and 2000 characters." }, 422);
    }

    // IP rate limit, on top of the existing per-user rate limit
    // (the database trigger that already blocks "commenting too
    // fast"). This one catches the same abuse spread across several
    // different accounts instead of just one. Skipped for the
    // admin-only official path, same reasoning as submit-case: that
    // path is already gated above, an admin replying as Why Fired
    // isn't the abuse case this guards against.
    if (!postAsOfficial) {
      // See the matching comment in submit-case/index.ts: the LAST
      // entry in this header is the one Supabase's own edge network
      // added, and is the only one a client can't forge themselves.
      const forwardedFor = req.headers.get("x-forwarded-for");
      const ip = forwardedFor?.split(",").map((s) => s.trim()).filter(Boolean).pop() ?? "unknown";
      const ipHash = await sha256Hex(ip);
      const { data: allowed } = await supabase.rpc("check_rate_limit", {
        p_ip_hash: ipHash,
        p_action: "submit_comment",
        p_max_count: 15,
        p_window_minutes: 60,
      });
      if (allowed === false) {
        return json({ error: "Too many comments from this connection. Please slow down." }, 429);
      }
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        case_id: caseId,
        user_id: user.id,
        body: commentBody,
        posted_as_official: postAsOfficial,
        parent_comment_id: parentCommentId,
      })
      .select("id, created_at")
      .single();

    if (error) {
      // The database's own rate-limit trigger raises a plain,
      // already-friendly message; pass it straight through. Same
      // for the reply-target checks (migration 016's trigger).
      if (
        error.message?.includes("commenting too fast") ||
        error.message?.includes("reply")
      ) {
        return json({ error: error.message }, error.message.includes("reply") ? 422 : 429);
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