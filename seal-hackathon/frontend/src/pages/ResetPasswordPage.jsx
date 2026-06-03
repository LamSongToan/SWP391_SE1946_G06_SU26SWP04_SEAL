import { useMemo, useState } from "react";
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
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import PublicShell from "../components/layout/PublicShell";
import { http, passwordResetStorage } from "../api/http";

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetContext = useMemo(
    () => location.state?.passwordReset || passwordResetStorage.get(),
    [location.state]
  );

  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (nextForm) => {
    const nextErrors = {};

    if (!nextForm.newPassword) {
      nextErrors.newPassword = "New password is required";
    } else if (!PASSWORD_REGEX.test(nextForm.newPassword)) {
      nextErrors.newPassword =
        "Password must include at least one letter, one number, one special character, and be 8-72 characters";
    }

    if (!nextForm.confirmPassword) {
      nextErrors.confirmPassword = "Confirm new password is required";
    } else if (nextForm.confirmPassword !== nextForm.newPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    return nextErrors;
  };

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

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!resetContext?.email || !resetContext?.otp) {
      setError("OTP verification is required before setting a new password.");
      return;
    }

    const nextErrors = validate(form);
    setTouched({ newPassword: true, confirmPassword: true });
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setLoading(true);
    try {
      await http.post("/api/auth/reset-password", {
        email: resetContext.email,
        otp: resetContext.otp,
        newPassword: form.newPassword,
      });
      passwordResetStorage.clear();
      navigate("/login", { state: { message: "Password reset successfully. Please log in." } });
    } catch (err) {
      setError(err?.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || Object.values(validate(form)).some(Boolean) || !resetContext?.email || !resetContext?.otp;

  return (
    <PublicShell>
      <Box
        className="ms-auth-form-wrap"
        sx={{ minHeight: "calc(100vh - 74px)", px: { xs: 2, md: 3 } }}
      >
        <Box className="ms-auth-form-card">
          <span className="ms-auth-header">
            <LockResetRoundedIcon sx={{ fontSize: 16 }} />
            New Password
          </span>
          <Typography variant="h4" sx={{ mt: 2, mb: 0.7 }}>Set New Password</Typography>
          <Typography color="text.secondary" sx={{ mb: 2.5 }}>
            Choose a strong password for <strong>{resetContext?.email || "your account"}</strong>.
          </Typography>

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={1.4}>
              <TextField
                label="New Password"
                type="password"
                value={form.newPassword}
                onChange={(event) => setFormField("newPassword", event.target.value)}
                error={Boolean(touched.newPassword && fieldErrors.newPassword)}
                helperText={
                  (touched.newPassword && fieldErrors.newPassword) ||
                  "At least 8 characters, including a letter, a number, and a special character."
                }
                required
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setFormField("confirmPassword", event.target.value)}
                error={Boolean(touched.confirmPassword && fieldErrors.confirmPassword)}
                helperText={(touched.confirmPassword && fieldErrors.confirmPassword) || " "}
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={isSubmitDisabled}>
                {loading ? "Resetting..." : "Reset Password"}
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
