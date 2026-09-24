import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface AnalyticsData {
  today_count: number;
  yesterday_count: number;
  today_unique_sessions: number;
  top_paths_today: { path: string; count: number }[];
  recent_events: { path: string; created_at: string; session_id: string; email: string | null }[];
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: res, error: invokeError } = await supabase.functions.invoke("admin-analytics");
      if (invokeError) {
        setError("Couldn't load analytics.");
        return;
      }
      setData(res as AnalyticsData);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="max-w-3xl mx-auto">
        <Link to="/admin" className="text-sm text-cream-100/50 hover:text-cream-50">
          &larr; Review queue
        </Link>
        <h1 className="font-display text-2xl text-cream-50 mt-1 mb-1">Site activity</h1>
        <p className="text-cream-100/60 text-sm mb-8">
          Page views only — no IP addresses are stored here. Registered users show their email;
          everyone else shows as a session id, so a pattern of many rapid requests is still
          visible even when there's no account behind it.
        </p>

        {error && <p className="text-sm text-red-300 mb-4">{error}</p>}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <p className="text-2xl font-display text-cream-50">{data.today_count}</p>
                <p className="text-xs text-cream-100/50 mt-1">Views today</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <p className="text-2xl font-display text-cream-50">{data.yesterday_count}</p>
                <p className="text-xs text-cream-100/50 mt-1">Views yesterday</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <p className="text-2xl font-display text-cream-50">{data.today_unique_sessions}</p>
                <p className="text-xs text-cream-100/50 mt-1">Unique visitors today</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-8">
              <h2 className="font-display text-lg text-cream-50 mb-4">Top pages today</h2>
              {data.top_paths_today.length === 0 ? (
                <p className="text-sm text-cream-100/50">No views yet today.</p>
              ) : (
                <div className="space-y-2">
                  {data.top_paths_today.map((p) => (
                    <div key={p.path} className="flex items-center justify-between text-sm">
                      <span className="text-cream-100/80">{p.path}</span>
                      <span className="text-cream-100/50">{p.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <h2 className="font-display text-lg text-cream-50 p-6 pb-4">Recent activity</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-b border-white/10 text-left text-cream-100/50">
                      <th className="px-6 py-2 font-normal">Time</th>
                      <th className="px-6 py-2 font-normal">Page</th>
                      <th className="px-6 py-2 font-normal">Visitor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_events.map((e, i) => (
                      <tr key={i} className="border-b border-white/5 text-cream-100/80">
                        <td className="px-6 py-2 whitespace-nowrap">
                          {new Date(e.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-2">{e.path}</td>
                        <td className="px-6 py-2">
                          {e.email ?? (
                            <span className="text-cream-100/40">
                              anonymous &middot; {e.session_id.slice(0, 8)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
