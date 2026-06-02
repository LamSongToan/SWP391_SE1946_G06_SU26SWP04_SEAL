import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import PublicShell from "../components/layout/PublicShell";
import { authStorage, googleRegistrationStorage, http } from "../api/http";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const successMessage = location.state?.message || "";

  const handleGoogleLogin = async (idToken) => {
    setError("");
    setGoogleLoading(true);
    try {
      const response = await http.post("/api/auth/google", { idToken });
      const data = response.data?.data;

      if (data?.registrationRequired) {
        const registrationPayload = {
          idToken,
          email: data.email,
          fullName: data.fullName || "",
          pictureUrl: data.pictureUrl || "",
        };
        googleRegistrationStorage.set(registrationPayload);
        navigate("/register", { state: { googleRegistration: registrationPayload } });
        return;
      }

      authStorage.set(data?.auth);
      googleRegistrationStorage.clear();
      navigate("/dashboard?section=account");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const loginByPassword = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await http.post("/api/auth/login", form);
      authStorage.set(response.data?.data);
      googleRegistrationStorage.clear();
      navigate("/dashboard?section=account");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <Box
        className="ms-auth-form-wrap"
        sx={{ minHeight: "calc(100vh - 74px)", px: { xs: 2, md: 3 } }}
      >
        <Box className="ms-auth-form-card">
          <span className="ms-auth-header">
            <LoginRoundedIcon sx={{ fontSize: 16 }} />
            Account Sign In
          </span>

          <Typography variant="h4" sx={{ mt: 2, mb: 0.7 }}>Sign In</Typography>
          <Typography color="text.secondary" sx={{ mb: 2.5 }}>
            Continue with your registered email and password.
          </Typography>

          <Box component="form" onSubmit={loginByPassword}>
            <Stack spacing={1.4}>
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
                fullWidth
              />
              <Button type="submit" variant="contained" size="large" disabled={loading || googleLoading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ my: 2.5 }}>
            <Divider>or</Divider>
          </Box>

          <Stack spacing={1.2}>
            <GoogleSignInButton
              text="signin_with"
              onCredential={handleGoogleLogin}
              disabled={loading || googleLoading}
              width={280}
            />
            {googleLoading ? (
              <Typography color="text.secondary" variant="body2">
                Processing Google sign-in...
              </Typography>
            ) : null}
          </Stack>

          {successMessage ? <Alert severity="success" sx={{ mt: 2 }}>{successMessage}</Alert> : null}
          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

          <Typography color="text.secondary" sx={{ mt: 2 }}>
            No account? <Link component={RouterLink} to="/register">Create account</Link>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.8 }}>
            <Link component={RouterLink} to="/forgot-password">Forgot password?</Link>
          </Typography>
        </Box>
      </Box>
    </PublicShell>
  );
}
