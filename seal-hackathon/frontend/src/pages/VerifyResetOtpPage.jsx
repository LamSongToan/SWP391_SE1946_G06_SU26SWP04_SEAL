import { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
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
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import AuthVisualPanel from "../components/auth/AuthVisualPanel";
import { http, passwordResetStorage } from "../api/http";
import { brand } from "../styles/designTokens";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;
const OTP_LENGTH = 6;
const OTP_COOLDOWN_SECONDS = 60;

export default function VerifyResetOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const otpInputRefs = useRef([]);

  const initialEmail = useMemo(
    () => location.state?.email || passwordResetStorage.get()?.email || "",
    [location.state]
  );

  const [form, setForm] = useState({
    email: initialEmail,
    otpDigits: Array(OTP_LENGTH).fill(""),
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(
    location.state?.otpSent ? OTP_COOLDOWN_SECONDS : 0
  );

  useEffect(() => {
    if (location.state?.otpSent) {
      otpInputRefs.current[0]?.focus();
    }
  }, [location.state]);

  useEffect(() => {
    if (location.state?.otpSent) {
      setCooldownSeconds(OTP_COOLDOWN_SECONDS);
    }
  }, [location.state?.otpSent]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setCooldownSeconds((current) => (current > 1 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [cooldownSeconds]);

  const otpValue = form.otpDigits.join("");

  const validate = (nextForm) => {
    const nextErrors = {};

    if (!nextForm.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(nextForm.email.trim())) {
      nextErrors.email = "Email is not valid";
    }

    if (!otpValueFor(nextForm).trim()) {
      nextErrors.otp = "OTP is required";
    } else if (!OTP_REGEX.test(otpValueFor(nextForm).trim())) {
      nextErrors.otp = "OTP must be 6 digits";
    }

    return nextErrors;
  };

  const otpValueFor = (nextForm) => nextForm.otpDigits.join("");

  const setFormField = (key, value) => {
    const nextForm = { ...form, [key]: value };
    const nextTouched = { ...touched, [key]: true };
    const nextErrors = validate(nextForm);
    const visibleErrors = Object.fromEntries(
      Object.entries(nextErrors).map(([field, message]) => [field, nextTouched[field] ? message : ""])
    );
    setForm(nextForm);
    setTouched(nextTouched);
    setFieldErrors(visibleErrors);
  };

  const updateOtpDigit = (index, value) => {
    const digitsOnly = value.replace(/\D/g, "");
    const nextDigits = [...form.otpDigits];

    if (digitsOnly.length > 1) {
      const chars = digitsOnly.slice(0, OTP_LENGTH).split("");
      for (let i = 0; i < OTP_LENGTH; i += 1) {
        nextDigits[i] = chars[i] || "";
      }
      const nextForm = { ...form, otpDigits: nextDigits };
      const nextTouched = { ...touched, otp: true };
      const nextErrors = validate(nextForm);
      setForm(nextForm);
      setTouched(nextTouched);
      setFieldErrors({ ...fieldErrors, otp: nextTouched.otp ? nextErrors.otp : "" });
      const nextIndex = Math.min(chars.length, OTP_LENGTH - 1);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    nextDigits[index] = digitsOnly;
    const nextForm = { ...form, otpDigits: nextDigits };
    const nextTouched = { ...touched, otp: true };
    const nextErrors = validate(nextForm);
    setForm(nextForm);
    setTouched(nextTouched);
    setFieldErrors({ ...fieldErrors, otp: nextTouched.otp ? nextErrors.otp : "" });

    if (digitsOnly && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      updateOtpDigit(index, event.key);
      return;
    }

    if (event.key === "Backspace" && !form.otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const selectOtpInput = (event) => {
    const input = event.target;
    window.requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  };

  const resendOtp = async () => {
    const emailError = validate({ ...form, otpDigits: Array(OTP_LENGTH).fill("1") }).email;
    setTouched((current) => ({ ...current, email: true }));
    setFieldErrors((current) => ({ ...current, email: emailError }));
    if (emailError) {
      return;
    }

    if (cooldownSeconds > 0) {
      return;
    }

    setResendingOtp(true);
    setError("");
    try {
      const response = await http.post("/api/auth/forgot-password", { email: form.email.trim() });
      passwordResetStorage.clear();
      navigate("/verify-reset-otp", {
        replace: true,
        state: {
          email: form.email.trim(),
          otpSent: true,
          expiresInMinutes: response.data?.data?.expiresInMinutes,
          message: response.data?.data?.message,
        },
      });
      setForm((current) => ({ ...current, otpDigits: Array(OTP_LENGTH).fill("") }));
      setCooldownSeconds(OTP_COOLDOWN_SECONDS);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to resend OTP");
    } finally {
      setResendingOtp(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const nextErrors = validate(form);
    setTouched({ email: true, otp: true });
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setLoading(true);
    try {
      await http.post("/api/auth/verify-reset-otp", {
        email: form.email.trim(),
        otp: otpValue.trim(),
      });
      const payload = {
        email: form.email.trim(),
        otp: otpValue.trim(),
      };
      passwordResetStorage.set(payload);
      navigate("/reset-password", {
        state: {
          passwordReset: payload,
        },
      });
    } catch (err) {
      setError(err?.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || Object.values(validate(form)).some(Boolean);

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
            <KeyRoundedIcon sx={{ fontSize: 18 }} />
            <span>SEAL HACKATHON</span>
          </Stack>
          <Typography component="h1" sx={{ color: brand.colors.text, fontSize: { xs: 30, md: 36 }, fontWeight: 900, lineHeight: 1.12 }}>
            Verify your OTP
          </Typography>
          <Typography sx={{ color: brand.colors.muted, fontSize: 15, lineHeight: 1.7, mt: 1.2, mb: 3 }}>
            Enter the 6-digit code sent to your email to continue setting a new password.
          </Typography>

          {location.state?.otpSent ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {location.state?.message || "OTP sent successfully."}{" "}
              {location.state?.expiresInMinutes ? `The code expires in ${location.state.expiresInMinutes} minutes.` : ""}
            </Alert>
          ) : null}

          <Box component="form" noValidate onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setFormField("email", event.target.value.trim())}
                error={Boolean(touched.email && fieldErrors.email)}
                helperText={(touched.email && fieldErrors.email) || " "}
                required
                fullWidth
              />

              <Box>
                <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 800, color: brand.colors.text }}>
                  OTP Code
                </Typography>
                <Stack direction="row" spacing={1.1} justifyContent="space-between">
                  {form.otpDigits.map((digit, index) => (
                    <TextField
                      key={index}
                      inputRef={(element) => {
                        otpInputRefs.current[index] = element;
                      }}
                      value={digit}
                      onChange={(event) => updateOtpDigit(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onFocus={selectOtpInput}
                      onClick={selectOtpInput}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectOtpInput(event);
                      }}
                      error={Boolean(touched.otp && fieldErrors.otp)}
                      inputProps={{
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                        maxLength: 1,
                        style: {
                          textAlign: "center",
                          fontSize: "1.35rem",
                          fontWeight: 800,
                          padding: "12px 0",
                        },
                      }}
                      sx={{
                        width: { xs: 42, sm: 52 },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: brand.radius.sm,
                        },
                      }}
                    />
                  ))}
                </Stack>
                <Typography
                  color={touched.otp && fieldErrors.otp ? "error.main" : "text.secondary"}
                  sx={{ mt: 1, minHeight: 20, fontSize: 12 }}
                >
                  {(touched.otp && fieldErrors.otp) || "Enter the 6-digit verification code sent to your email."}
                </Typography>
              </Box>

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
                {loading ? <CircularProgress color="inherit" size={20} /> : "Verify OTP"}
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={resendOtp}
                disabled={resendingOtp || cooldownSeconds > 0}
                fullWidth
                sx={{
                  height: 50,
                  borderRadius: brand.radius.md,
                  fontWeight: 800,
                  bgcolor: brand.colors.surfaceWarm,
                  "&:hover": {
                    bgcolor: "#FFF1E3",
                    borderColor: brand.colors.orange,
                  },
                }}
              >
                {resendingOtp ? (
                  <CircularProgress size={20} />
                ) : cooldownSeconds > 0 ? (
                  `Resend code in ${cooldownSeconds}s`
                ) : (
                  "Resend code"
                )}
              </Button>
            </Stack>
          </Box>

          <Typography sx={{ color: brand.colors.muted, fontSize: 15, mt: 2.4 }}>
            <Link component={RouterLink} to="/forgot-password" sx={{ color: brand.colors.orange, fontWeight: 900, textDecoration: "none" }}>
              Back to password recovery
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
