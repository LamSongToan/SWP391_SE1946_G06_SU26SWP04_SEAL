import { Navigate } from "react-router-dom";
import { authStorage, isAuthSessionValid } from "../api/http";

export default function ProtectedRoute({ children, requiredRole }) {
  const auth = authStorage.get();

  if (!isAuthSessionValid(auth)) {
    authStorage.clear();
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !auth?.roles?.includes(requiredRole)) {
    return <Navigate to="/dashboard?section=account" replace />;
  }

  return children;
}
