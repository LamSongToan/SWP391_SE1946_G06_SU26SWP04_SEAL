import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PasswordRoundedIcon from "@mui/icons-material/PasswordRounded";
import PublicShell from "../components/layout/PublicShell";
import { http } from "../api/http";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const response = await http.post("/api/auth/forgot-password", { username });
      setResult(response.data?.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <Box className="ms-auth-screen">
        <Box className="ms-auth-panel">
          <Box>
            <Typography component="h1">Recover access to your SEAL workspace.</Typography>
            <Typography sx={{ mt: 2 }}>
              Request a reset token, then use it to set a new password for your account.
            </Typography>
          </Box>
          <Box className="ms-auth-meta">
            <Box className="ms-auth-meta-item"><strong>Step 1</strong><span>Request Token</span></Box>
            <Box className="ms-auth-meta-item"><strong>Step 2</strong><span>Reset Password</span></Box>
            <Box className="ms-auth-meta-item"><strong>Mode</strong><span>Development Token</span></Box>
          </Box>
        </Box>

        <Box className="ms-auth-form-wrap">
          <Box className="ms-auth-form-card">
              <span className="ms-auth-header">
                <PasswordRoundedIcon sx={{ fontSize: 16 }} />
                Password Assistance
              </span>
              <Typography variant="h4" sx={{ mt: 2, mb: 0.7 }}>Forgot Password</Typography>
              <Typography color="text.secondary" sx={{ mb: 2.5 }}>
                Enter username to get reset token.
              </Typography>

              <Box component="form" onSubmit={onSubmit}>
                <Stack spacing={1.4}>
                  <TextField label="Username" value={username} onChange={(event) => setUsername(event.target.value)} required />
                  <Button type="submit" variant="contained" size="large" disabled={loading}>
                    {loading ? "Sending..." : "Get Reset Token"}
                  </Button>
                </Stack>
              </Box>

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

              {result && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>{result.message}</Typography>
                  {result.resetToken ? (
                    <>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Reset token (development mode)</Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace", wordBreak: "break-all", bgcolor: "#f3f4f6", p: 1, borderRadius: 1, mt: 0.5 }}
                      >
                        {result.resetToken}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Expires in {result.expiresInMinutes} minutes.</Typography>
                    </>
                  ) : null}
                </Alert>
              )}

              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Have a token? <Link component={RouterLink} to="/reset-password">Reset password</Link>
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.8 }}>
                <Link component={RouterLink} to="/login">Back to login</Link>
              </Typography>
          </Box>
        </Box>
      </Box>
    </PublicShell>
  );
}
