// supabase/functions/admin-list-users/index.ts
//
// Returns every registered user's email plus profile info. Only
// people who actually created an account are in here — emails they
// gave you themselves at signup, nothing scraped or inferred.
//
// The admin check below is enforced here, server-side, every time
// this function runs — not just by hiding a link in the UI. Calling
// this function directly (skipping the admin page entirely) still
// gets refused if the caller isn't an admin.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Not authenticated." }, 401);
    }

    // Scoped to the caller's own JWT — used only to find out who is
    // asking, and whether they're an admin.
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Not authenticated." }, 401);
    }

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile?.is_admin) {
      return json({ error: "Admins only." }, 403);
    }

    // Only past this point does the service role get used — the one
    // key that can see every user's email. It lives only in this
    // function's environment, never in the browser.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userList, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) {
      return json({ error: "Could not load users." }, 500);
    }

    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, display_name, is_admin");

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const users = userList.users
      .map((u) => {
        const p = profileMap.get(u.id);
        return {
          id: u.id,
          email: u.email ?? null,
          display_name: p?.display_name ?? null,
          is_admin: p?.is_admin ?? false,
          signed_up_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        };
      })
      .sort((a, b) => (a.signed_up_at < b.signed_up_at ? 1 : -1));

    return json({ users }, 200);
  } catch {
    return json({ error: "Unexpected error." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
