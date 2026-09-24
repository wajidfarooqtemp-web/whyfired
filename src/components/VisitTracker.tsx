import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

function getSessionId(): string {
  const key = "wf_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

// Renders nothing. Logs one row per page visited, tied to a random
// per-tab id for anonymous visitors, or the real account for logged-in
// ones. Fire-and-forget on purpose — a failed log should never affect
// the page itself.
export default function VisitTracker() {
  const location = useLocation();
  const { session } = useAuth();

  useEffect(() => {
    supabase
      .from("page_views")
      .insert({
        user_id: session?.user?.id ?? null,
        path: location.pathname,
        session_id: getSessionId(),
      })
      .then(() => {});
  }, [location.pathname, session?.user?.id]);

  return null;
}
