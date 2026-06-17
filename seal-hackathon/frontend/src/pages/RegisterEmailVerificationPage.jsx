import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid2,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import MarkEmailUnreadRoundedIcon from "@mui/icons-material/MarkEmailUnreadRounded";
import AuthVisualPanel from "../components/auth/AuthVisualPanel";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import {
  authStorage,
  googleRegistrationStorage,
  http,
  rejectedRegistrationStorage,
  registrationVerificationStorage,
} from "../api/http";
import { brand } from "../styles/designTokens";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_COOLDOWN_SECONDS = 60;

function validateEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Email is required";
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return "Email is not valid";
  }
  return "";
}

function validateOtp(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Verification code is required";
  }
  if (!/^\d{6}$/.test(trimmed)) {
    return "Verification code must contain 6 digits";
  }
  return "";
}

export default function RegisterEmailVerificationPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return undefined;
    }
    const timerId = window.setInterval(() => {
      setCooldownSeconds((current) => (current > 1 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [cooldownSeconds]);

  const updateFieldError = (name, value) => {
    if (!touched[name]) {
      return "";
    }
    return name === "email" ? validateEmail(value) : validateOtp(value);
  };

  const handleSendCode = async () => {
    const emailError = validateEmail(email);
    setTouched((current) => ({ ...current, email: true }));
    setFieldErrors((current) => ({ ...current, email: emailError }));
    setError("");
    setSuccessMessage("");

    if (emailError) {
      return;
    }

    if (cooldownSeconds > 0) {
      return;
    }

    setOtpSending(true);
    try {
      const response = await http.post("/api/auth/register/send-otp", {
        email: email.trim(),
      });
      setSuccessMessage(
        response.data?.data?.message || "A verification code has been sent to your email."
      );
      setCooldownSeconds(OTP_COOLDOWN_SECONDS);
      setFieldErrors((current) => ({ ...current, email: "", otp: "" }));
    } catch (err) {
      const message = err?.response?.data?.message || "Unable to send verification code right now.";
      if (message.toLowerCase().includes("email")) {
        setFieldErrors((current) => ({ ...current, email: message }));
      } else {
        setError(message);
      }
      setSuccessMessage("");
    } finally {
      setOtpSending(false);
    }
  };

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
        registrationVerificationStorage.clear();
        navigate("/register", { replace: true, state: { googleRegistration: registrationPayload } });
        return;
      }
      authStorage.set(data?.auth);
      googleRegistrationStorage.clear();
      registrationVerificationStorage.clear();
      navigate("/dashboard");
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Google sign-in failed";
      const payload = err?.response?.data?.data || null;
      if (message.toLowerCase().includes("rejected") && payload?.resubmitToken) {
        const rejectedRegistration = {
          resubmitToken: payload.resubmitToken,
          rejectionReason: payload.rejectionReason || "",
        };
        rejectedRegistrationStorage.set(rejectedRegistration);
        navigate("/register", { replace: true, state: { rejectedRegistration } });
        return;
      }
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleContinue = async (event) => {
    event.preventDefault();

    const nextTouched = { email: true, otp: true };
    const nextFieldErrors = {
      email: validateEmail(email),
      otp: validateOtp(otp),
    };
    setTouched(nextTouched);
    setFieldErrors(nextFieldErrors);
    setError("");

    if (Object.values(nextFieldErrors).some(Boolean)) {
      return;
    }

    setVerifying(true);
    try {
      await http.post("/api/auth/register/verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });
      registrationVerificationStorage.set({
        email: email.trim(),
        otp: otp.trim(),
      });
      navigate("/register", { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message || "Verification failed";
      if (message.toLowerCase().includes("email")) {
        setFieldErrors((current) => ({ ...current, otp: message }));
      } else {
        setError(message);
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: brand.colors.surface }}>
      <AuthVisualPanel mode="register" />

      <Box
        sx={{
          flexBasis: { xs: "100%", md: "42%" },
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 3, sm: 5, lg: 7 },
          py: { xs: 4, md: 5 },
          bgcolor: brand.colors.surface,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 460 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ color: brand.colors.orange, fontSize: 13, fontWeight: 900, letterSpacing: 1.2, mb: 1 }}
          >
            <MarkEmailUnreadRoundedIcon sx={{ fontSize: 18 }} />
            <span>REQUEST ACCOUNT</span>
          </Stack>
          <Typography component="h1" sx={{ color: brand.colors.text, fontSize: { xs: 30, md: 36 }, fontWeight: 900, lineHeight: 1.12 }}>
            Verify your email
          </Typography>
          <Typography sx={{ color: brand.colors.muted, fontSize: 15, lineHeight: 1.7, mt: 1.2, mb: 3 }}>
            Start with your email address. Once the 6-digit verification code is confirmed, we will take you to the account details form.
          </Typography>

          <Box component="form" noValidate onSubmit={handleContinue}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => {
                  const nextValue = event.target.value.trim();
                  setEmail(nextValue);
                  setFieldErrors((current) => ({
                    ...current,
                    email: updateFieldError("email", nextValue),
                  }));
                  setSuccessMessage("");
                }}
                onBlur={() => {
                  setTouched((current) => ({ ...current, email: true }));
                  setFieldErrors((current) => ({
                    ...current,
                    email: validateEmail(email),
                  }));
                }}
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email || " "}
                required
                fullWidth
              />

              <Grid2 container spacing={1.2} sx={{ alignItems: "flex-start" }}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="medium"
                    label="Email verification code"
                    value={otp}
                    onChange={(event) => {
                      const nextValue = event.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtp(nextValue);
                      setFieldErrors((current) => ({
                        ...current,
                        otp: updateFieldError("otp", nextValue),
                      }));
                    }}
                    onBlur={() => {
                      setTouched((current) => ({ ...current, otp: true }));
                      setFieldErrors((current) => ({
                        ...current,
                        otp: validateOtp(otp),
                      }));
                    }}
                    error={Boolean(fieldErrors.otp)}
                    helperText={fieldErrors.otp || "Enter the 6-digit code sent to your email"}
                    inputProps={{ inputMode: "numeric", maxLength: 6 }}
                    required
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleSendCode}
                    disabled={otpSending || verifying || googleLoading || cooldownSeconds > 0}
                    sx={{
                      height: 56,
                      borderRadius: brand.radius.md,
                      fontWeight: 800,
                      borderColor: brand.colors.lineStrong,
                      color: brand.colors.text,
                      bgcolor: brand.colors.surfaceWarm,
                      "&:hover": {
                        bgcolor: "#FFF1E3",
                        borderColor: brand.colors.orange,
                      },
                    }}
                  >
                    {otpSending ? (
                      <CircularProgress size={20} />
                    ) : cooldownSeconds > 0 ? (
                      `Resend code in ${cooldownSeconds}s`
                    ) : successMessage ? (
                      "Resend code"
                    ) : (
                      "Send code"
                    )}
                  </Button>
                </Grid2>
              </Grid2>

              {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
              {error ? <Alert severity="error">{error}</Alert> : null}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={verifying || otpSending || googleLoading}
                fullWidth
                sx={{
                  height: 50,
                  bgcolor: brand.colors.orange,
                  color: brand.colors.inverse,
                  "&:hover": { bgcolor: brand.colors.orangeDark },
                }}
              >
                {verifying ? <CircularProgress color="inherit" size={20} /> : "Continue to account details"}
              </Button>

              <Divider sx={{ color: brand.colors.muted, fontSize: 13 }}>or continue with Google</Divider>
              <GoogleSignInButton
                text="signup_with"
                onCredential={handleGoogleLogin}
                disabled={otpSending || verifying || googleLoading}
                fullWidth
                minHeight={50}
              />
              {googleLoading ? <Typography color="text.secondary" variant="body2">Processing Google sign-in...</Typography> : null}
            </Stack>
          </Box>

          <Typography sx={{ color: brand.colors.muted, fontSize: 15, mt: 3 }}>
            Already have an account?{" "}
            <Link component={RouterLink} to="/login" sx={{ color: brand.colors.orange, fontWeight: 900, textDecoration: "none" }}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
