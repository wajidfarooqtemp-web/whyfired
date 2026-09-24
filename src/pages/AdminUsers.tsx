import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean;
  signed_up_at: string;
  last_sign_in_at: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error: invokeError } = await supabase.functions.invoke("admin-list-users");
      if (invokeError) {
        setError("Couldn't load the user list.");
        return;
      }
      setUsers((data as { users: AdminUser[] }).users);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen px-5 pt-24 pb-16">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Link to="/admin" className="text-sm text-cream-100/50 hover:text-cream-50">
            &larr; Review queue
          </Link>
        </div>
        <h1 className="font-display text-2xl text-cream-50 mb-1">Registered users</h1>
        <p className="text-cream-100/60 text-sm mb-8">
          {users ? `${users.length} account${users.length === 1 ? "" : "s"}` : "Loading..."}
        </p>

        {error && <p className="text-sm text-red-300 mb-4">{error}</p>}

        {users && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-cream-100/50">
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Display name</th>
                  <th className="px-4 py-3 font-normal">Signed up</th>
                  <th className="px-4 py-3 font-normal">Last seen</th>
                  <th className="px-4 py-3 font-normal">Admin</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 text-cream-100/80">
                    <td className="px-4 py-3">{u.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      {u.display_name ?? <span className="text-cream-100/40">not set</span>}
                    </td>
                    <td className="px-4 py-3">{new Date(u.signed_up_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">{u.is_admin ? "Yes" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
