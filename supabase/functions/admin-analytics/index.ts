// supabase/functions/admin-analytics/index.ts
//
// Visit counts and a recent-activity feed for the admin dashboard.
// Same admin check as admin-list-users: enforced here, server-side,
// not just hidden behind a UI link.

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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    const [todayRes, yesterdayRes, recentRes] = await Promise.all([
      adminClient
        .from("page_views")
        .select("session_id, path", { count: "exact" })
        .gte("created_at", startOfToday.toISOString()),
      adminClient
        .from("page_views")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfYesterday.toISOString())
        .lt("created_at", startOfToday.toISOString()),
      adminClient
        .from("page_views")
        .select("path, created_at, user_id, session_id")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const todayRows = todayRes.data ?? [];
    const todayCount = todayRes.count ?? todayRows.length;
    const yesterdayCount = yesterdayRes.count ?? 0;
    const todayUniqueSessions = new Set(todayRows.map((r) => r.session_id)).size;

    const pathCounts = new Map<string, number>();
    for (const r of todayRows) {
      pathCounts.set(r.path, (pathCounts.get(r.path) ?? 0) + 1);
    }
    const topPathsToday = Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Emails only for the recent-activity feed's logged-in visitors —
    // same source as admin-list-users, each user's own given email.
    const { data: userList } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailMap = new Map((userList?.users ?? []).map((u) => [u.id, u.email ?? null]));

    const recentEvents = (recentRes.data ?? []).map((r) => ({
      path: r.path,
      created_at: r.created_at,
      session_id: r.session_id,
      email: r.user_id ? emailMap.get(r.user_id) ?? null : null,
    }));

    return json(
      {
        today_count: todayCount,
        yesterday_count: yesterdayCount,
        today_unique_sessions: todayUniqueSessions,
        top_paths_today: topPathsToday,
        recent_events: recentEvents,
      },
      200
    );
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
