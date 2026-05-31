import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import PublicShell from "../components/layout/PublicShell";
import { authStorage, http } from "../api/http";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const successMessage = location.state?.message || "";

  const loginByPassword = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await http.post("/api/auth/login", form);
      authStorage.set(response.data?.data);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <Box className="ms-auth-screen">
        <Box className="ms-auth-panel">
          <Box>
            <span className="ms-auth-header" style={{ color: "#fff" }}>
              <SecurityRoundedIcon sx={{ fontSize: 18 }} />
              Coordinator Workspace
            </span>
            <Typography component="h1">
              Manage SEAL operations from one focused workspace.
            </Typography>
            <Typography sx={{ mt: 2 }}>
              Sign in to review participant accounts, prepare event seasons, organize categories and keep each round on track.
            </Typography>
          </Box>
          <Box className="ms-auth-meta">
            <Box className="ms-auth-meta-item"><strong>Review</strong><span>Accounts</span></Box>
            <Box className="ms-auth-meta-item"><strong>Plan</strong><span>Events</span></Box>
            <Box className="ms-auth-meta-item"><strong>Operate</strong><span>Rounds</span></Box>
          </Box>
        </Box>

        <Box className="ms-auth-form-wrap">
          <Box className="ms-auth-form-card">
              <span className="ms-auth-header">
                <LoginRoundedIcon sx={{ fontSize: 16 }} />
                SEAL Operations Portal
              </span>

              <Typography variant="h4" sx={{ mt: 2, mb: 0.7 }}>Sign In</Typography>
              <Typography color="text.secondary" sx={{ mb: 2.5 }}>
                Continue to your assigned dashboard and daily coordination tools.
              </Typography>

              <Box component="form" onSubmit={loginByPassword}>
                <Stack spacing={1.4}>
                  <TextField
                    label="Username"
                    value={form.username}
                    onChange={(event) => setForm({ ...form, username: event.target.value })}
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
                  <Button type="submit" variant="contained" size="large" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </Stack>
              </Box>

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
      </Box>
    </PublicShell>
  );
}
