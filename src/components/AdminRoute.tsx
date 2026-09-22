import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-cream-100/60 text-sm">
        Loading...
      </div>
    );
  }

  if (!session || !profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
