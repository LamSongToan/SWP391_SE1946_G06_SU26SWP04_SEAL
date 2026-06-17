import { Navigate, useLocation } from "react-router-dom";
import { authStorage, isAuthSessionValid } from "../api/http";

export default function ProtectedRoute({ children, requiredRole }) {
  const auth = authStorage.get();
  const location = useLocation();

  if (!isAuthSessionValid(auth)) {
    authStorage.clear();
    return <Navigate to="/login" replace />;
  }

  if (auth?.mustChangePassword) {
    const params = new URLSearchParams(location.search);
    if (params.get("section") !== "password") {
      return <Navigate to="/dashboard?section=password&forcePasswordChange=1" replace />;
    }
  }

  if (requiredRole && !auth?.roles?.includes(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
