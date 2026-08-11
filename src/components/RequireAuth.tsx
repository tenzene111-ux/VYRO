import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogoMark } from "./Logo";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-vyro-radial">
        <LogoMark size={48} />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
