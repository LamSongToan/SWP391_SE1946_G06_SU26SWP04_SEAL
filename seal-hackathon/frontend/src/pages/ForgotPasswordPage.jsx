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
import PasswordRoundedIcon from "@mui/icons-material/PasswordRounded";
import PublicShell from "../components/layout/PublicShell";
import { http, passwordResetStorage } from "../api/http";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Email is required";
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      return "Email is not valid";
    }
    return "";
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextError = validateEmail(email);
    setFieldError(nextError);
    setError("");
    if (nextError) {
      return;
    }

    setLoading(true);
    try {
      const response = await http.post("/api/auth/forgot-password", { email: email.trim() });
      passwordResetStorage.clear();
      navigate("/verify-reset-otp", {
        state: {
          email: email.trim(),
          otpSent: true,
          expiresInMinutes: response.data?.data?.expiresInMinutes,
          message: response.data?.data?.message,
        },
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || Boolean(validateEmail(email));

  return (
    <PublicShell>
      <Box
        className="ms-auth-form-wrap"
        sx={{ minHeight: "calc(100vh - 74px)", px: { xs: 2, md: 3 } }}
      >
        <Box className="ms-auth-form-card">
          <span className="ms-auth-header">
            <PasswordRoundedIcon sx={{ fontSize: 16 }} />
            Password Recovery
          </span>
          <Typography variant="h4" sx={{ mt: 2, mb: 0.7 }}>Forgot Password</Typography>
          <Typography color="text.secondary" sx={{ mb: 2.5 }}>
            Enter your registered email and we will send a 6-digit verification code.
          </Typography>

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={1.4}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setEmail(nextValue);
                  setFieldError(validateEmail(nextValue));
                }}
                error={Boolean(fieldError)}
                helperText={fieldError || " "}
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={isSubmitDisabled}>
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            </Stack>
          </Box>

          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

          <Typography color="text.secondary" sx={{ mt: 2 }}>
            <Link component={RouterLink} to="/login">Back to login</Link>
          </Typography>
        </Box>
      </Box>
    </PublicShell>
  );
}
