import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogoMark } from "./Logo";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-vyro-radial">
        <LogoMark size={48} />
      </div>
    );
  }

  if (!profile?.is_admin) return <Navigate to="/home" replace />;

  return <>{children}</>;
}
