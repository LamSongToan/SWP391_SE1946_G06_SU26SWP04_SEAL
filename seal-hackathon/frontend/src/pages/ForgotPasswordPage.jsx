import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PasswordRoundedIcon from "@mui/icons-material/PasswordRounded";
import AuthVisualPanel from "../components/auth/AuthVisualPanel";
import { http, passwordResetStorage } from "../api/http";
import { brand } from "../styles/designTokens";

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
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: brand.colors.surface }}>
      <AuthVisualPanel mode="login" />

      <Box
        sx={{
          flexBasis: { xs: "100%", md: "42%" },
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 3, sm: 5, lg: 7 },
          py: 5,
          bgcolor: brand.colors.surface,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 430 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ color: brand.colors.orange, fontSize: 13, fontWeight: 900, letterSpacing: 1.2, mb: 1 }}
          >
            <PasswordRoundedIcon sx={{ fontSize: 18 }} />
            <span>SEAL HACKATHON</span>
          </Stack>
          <Typography component="h1" sx={{ color: brand.colors.text, fontSize: { xs: 30, md: 36 }, fontWeight: 900, lineHeight: 1.12 }}>
            Recover your password
          </Typography>
          <Typography sx={{ color: brand.colors.muted, fontSize: 15, lineHeight: 1.7, mt: 1.2, mb: 3 }}>
            Enter the email linked to your SEAL account. We will send a 6-digit OTP so you can reset your password securely.
          </Typography>

          <Box component="form" noValidate onSubmit={onSubmit}>
            <Stack spacing={2}>
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
                fullWidth
              />
              {error ? <Alert severity="error">{error}</Alert> : null}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitDisabled}
                fullWidth
                sx={{
                  height: 50,
                  bgcolor: brand.colors.orange,
                  color: brand.colors.inverse,
                  "&:hover": { bgcolor: brand.colors.orangeDark },
                }}
                >
                {loading ? <CircularProgress color="inherit" size={20} /> : "Send OTP"}
              </Button>
            </Stack>
          </Box>

          <Typography sx={{ color: brand.colors.muted, fontSize: 15, mt: 3 }}>
            Remembered your password?{" "}
            <Link component={RouterLink} to="/login" sx={{ color: brand.colors.orange, fontWeight: 900, textDecoration: "none" }}>
              Back to sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
