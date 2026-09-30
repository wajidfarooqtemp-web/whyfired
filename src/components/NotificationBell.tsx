import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { timeAgo } from "../lib/time";
import { BellIcon } from "./icons";

type NotificationType =
  | "comment_on_case"
  | "reply_to_comment"
  | "case_pending_review"
  | "case_upvote"
  | "case_downvote";

interface NotificationRow {
  id: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  case_id: string | null;
  actor: { display_name: string } | null;
  // Only present for comment-related types; tells us whether to show
  // "Why Fired" instead of the actor's real name, same rule as
  // everywhere else a comment can be posted as official.
  comment: { posted_as_official: boolean } | null;
}

const POLL_MS = 120_000; // fallback only now — realtime below does the real work
const PING_MS = 1_100;
const LIST_LIMIT = 20;

function messageFor(n: NotificationRow): string {
  const who = n.comment?.posted_as_official ? "Why Fired" : n.actor?.display_name ?? "Someone";
  switch (n.type) {
    case "comment_on_case":
      return `${who} commented on your story`;
    case "reply_to_comment":
      return `${who} replied to your comment`;
    case "case_pending_review":
      return `${n.actor?.display_name ?? "Someone"} submitted a case for review`;
    case "case_upvote":
      return `${n.actor?.display_name ?? "Someone"} upvoted your story`;
    case "case_downvote":
      return `${n.actor?.display_name ?? "Someone"} downvoted your story`;
  }
}

function linkFor(n: NotificationRow): string | null {
  if (n.type === "case_pending_review") return "/admin";
  return n.case_id ? `/stories/${n.case_id}` : null;
}

// Bell icon with an unread-count badge, dropdown list, and
// mark-as-read — the LinkedIn/Instagram pattern. Only rendered for
// logged-in users (see Navbar.tsx). A Supabase Realtime subscription
// pushes new notifications in the moment they're created — no
// refresh needed — with a brief "ping" animation on arrival; the
// interval below is just a fallback in case the socket ever drops.
export default function NotificationBell() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [pinging, setPinging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const userId = session?.user.id ?? null;

  function triggerPing() {
    setPinging(true);
    window.setTimeout(() => setPinging(false), PING_MS);
  }

  async function refreshUnreadCount() {
    if (!userId) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
  }

  useEffect(() => {
    if (!userId) return;
    refreshUnreadCount();
    const interval = window.setInterval(refreshUnreadCount, POLL_MS);
    window.addEventListener("focus", refreshUnreadCount);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshUnreadCount);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Live delivery: a Postgres change feed scoped to just this user's
  // own rows (the `filter` below), so no notification meant for
  // someone else ever reaches this browser. A fresh INSERT bumps the
  // badge and, if the panel happens to be open, is fetched (with its
  // actor/comment joins — the realtime payload itself is just raw
  // columns) and prepended to the visible list.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        async (payload) => {
          setUnreadCount((c) => c + 1);
          triggerPing();

          if (!openRef.current) return;
          const { data, error } = await supabase
            .from("notifications")
            .select("id, type, is_read, created_at, case_id, actor:profiles(display_name), comment:comments(posted_as_official)")
            .eq("id", (payload.new as { id: string }).id)
            .single();
          if (error) console.error("Failed to load new notification:", error);
          if (data) {
            const row = data as unknown as NotificationRow;
            setItems((prev) => (prev ? [row, ...prev].slice(0, LIST_LIMIT) : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Close on an outside click, same as the "More" menu elsewhere in
  // the navbar.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function openPanel() {
    const next = !open;
    setOpen(next);
    if (!next || !userId) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, is_read, created_at, case_id, actor:profiles(display_name), comment:comments(posted_as_official)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);

    if (error) console.error("Failed to load notifications:", error);
    const rows = (data as unknown as NotificationRow[]) ?? [];
    setItems(rows);

    // Opening the panel is "seen it", the same as LinkedIn/Instagram:
    // clears the badge immediately rather than waiting for each item
    // to be clicked individually.
    const unreadIds = rows.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      setItems((prev) => (prev ? prev.map((n) => ({ ...n, is_read: true })) : prev));
      setUnreadCount(0);
      await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    }
  }

  function handleClick(n: NotificationRow) {
    setOpen(false);
    const to = linkFor(n);
    if (to) navigate(to);
  }

  if (!userId) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={openPanel}
        aria-label="Notifications"
        aria-expanded={open}
        className={`relative flex items-center justify-center w-9 h-9 rounded-full text-cream-100/80 hover:text-cream-50 hover:bg-white/10 transition-colors ${
          pinging ? "motion-safe:animate-bounce" : ""
        }`}
      >
        <BellIcon size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px]">
            {pinging && (
              <span className="absolute inset-0 rounded-full bg-red-500 opacity-75 motion-safe:animate-ping" />
            )}
            <span className="relative flex-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-16 z-[60] rounded-xl border border-white/10 bg-brand-950 shadow-lg overflow-hidden md:absolute md:left-auto md:right-0 md:top-11 md:w-80 md:max-w-[calc(100vw-2rem)]">
          <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-cream-50">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
            {items === null ? (
              <p className="px-4 py-6 text-sm text-cream-100/50 text-center">Loading...</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-cream-100/50 text-center">Nothing yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className="w-full text-left px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors"
                >
                  <p className="text-sm text-cream-50 leading-snug">{messageFor(n)}</p>
                  <p className="mt-0.5 text-xs text-cream-100/50">{timeAgo(n.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}