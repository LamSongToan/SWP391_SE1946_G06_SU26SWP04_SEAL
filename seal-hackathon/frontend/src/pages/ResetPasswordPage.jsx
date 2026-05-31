import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import PublicShell from "../components/layout/PublicShell";
import { http } from "../api/http";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ resetToken: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await http.post("/api/auth/reset-password", {
        resetToken: form.resetToken,
        newPassword: form.newPassword,
      });
      navigate("/login", { state: { message: "Password reset successfully. Please log in." } });
    } catch (err) {
      setError(err?.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <Box className="ms-auth-screen">
        <Box className="ms-auth-panel">
          <Box>
            <Typography component="h1">Set a new password and return to operations.</Typography>
            <Typography sx={{ mt: 2 }}>
              Use the token issued by password recovery to update credentials for the next login.
            </Typography>
          </Box>
          <Box className="ms-auth-meta">
            <Box className="ms-auth-meta-item"><strong>Token</strong><span>Required</span></Box>
            <Box className="ms-auth-meta-item"><strong>Password</strong><span>Confirmed</span></Box>
            <Box className="ms-auth-meta-item"><strong>Session</strong><span>Re-login</span></Box>
          </Box>
        </Box>

        <Box className="ms-auth-form-wrap">
          <Box className="ms-auth-form-card">
              <span className="ms-auth-header">
                <KeyRoundedIcon sx={{ fontSize: 16 }} />
                Credential Recovery
              </span>
              <Typography variant="h4" sx={{ mt: 2, mb: 0.7 }}>Reset Password</Typography>
              <Typography color="text.secondary" sx={{ mb: 2.5 }}>
                Enter token and choose a new password.
              </Typography>

              <Box component="form" onSubmit={onSubmit}>
                <Stack spacing={1.4}>
                  <TextField
                    label="Reset Token"
                    value={form.resetToken}
                    onChange={(event) => setForm({ ...form, resetToken: event.target.value })}
                    required
                  />
                  <TextField
                    label="New Password"
                    type="password"
                    value={form.newPassword}
                    onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
                    required
                  />
                  <TextField
                    label="Confirm New Password"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                    required
                  />
                  <Button type="submit" variant="contained" size="large" disabled={loading}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>
                </Stack>
              </Box>

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

              <Typography color="text.secondary" sx={{ mt: 2 }}>
                <Link component={RouterLink} to="/login">Back to login</Link>
              </Typography>
          </Box>
        </Box>
      </Box>
    </PublicShell>
  );
}
