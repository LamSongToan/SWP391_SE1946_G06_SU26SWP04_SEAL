import { useEffect, useMemo, useRef, useState } from "react";
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
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import PublicShell from "../components/layout/PublicShell";
import { http, passwordResetStorage } from "../api/http";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;
const OTP_LENGTH = 6;

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

  useEffect(() => {
    if (location.state?.otpSent) {
      otpInputRefs.current[0]?.focus();
    }
  }, [location.state]);

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
    <PublicShell>
      <Box
        className="ms-auth-form-wrap"
        sx={{ minHeight: "calc(100vh - 74px)", px: { xs: 2, md: 3 } }}
      >
        <Box className="ms-auth-form-card">
          <span className="ms-auth-header">
            <KeyRoundedIcon sx={{ fontSize: 16 }} />
            OTP Verification
          </span>
          <Typography variant="h4" sx={{ mt: 2, mb: 0.7 }}>Verify OTP</Typography>
          <Typography color="text.secondary" sx={{ mb: 2.5 }}>
            Enter the 6-digit code sent to your email to continue.
          </Typography>

          {location.state?.otpSent ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {location.state?.message || "OTP sent successfully."}{" "}
              {location.state?.expiresInMinutes ? `The code expires in ${location.state.expiresInMinutes} minutes.` : ""}
            </Alert>
          ) : null}

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={1.5}>
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setFormField("email", event.target.value.trim())}
                error={Boolean(touched.email && fieldErrors.email)}
                helperText={(touched.email && fieldErrors.email) || " "}
                required
              />

              <Box>
                <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600, color: "text.secondary" }}>
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
                          fontSize: "1.4rem",
                          fontWeight: 700,
                          padding: "12px 0",
                        },
                      }}
                      sx={{
                        width: { xs: 44, sm: 52 },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
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

              <Button type="submit" variant="contained" size="large" disabled={isSubmitDisabled}>
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>
            </Stack>
          </Box>

          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Need a new OTP?{" "}
            <Button
              variant="text"
              size="small"
              onClick={resendOtp}
              disabled={resendingOtp}
              sx={{ minWidth: 0, px: 0.5, verticalAlign: "baseline" }}
            >
              {resendingOtp ? "Sending..." : "Resend code"}
            </Button>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.8 }}>
            <Link component={RouterLink} to="/forgot-password">Back to forgot password</Link>
          </Typography>
        </Box>
      </Box>
    </PublicShell>
  );
}
