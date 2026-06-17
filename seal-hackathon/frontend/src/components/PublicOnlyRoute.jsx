import { Navigate } from "react-router-dom";
import { authStorage, isAuthSessionValid } from "../api/http";

export default function PublicOnlyRoute({ children, redirectTo = "/dashboard" }) {
  const auth = authStorage.get();

  if (isAuthSessionValid(auth)) {
    return <Navigate to={auth?.mustChangePassword ? "/dashboard?section=password&forcePasswordChange=1" : redirectTo} replace />;
  }

  if (auth?.accessToken) {
    authStorage.clear();
  }

  return children;
}
