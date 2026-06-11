import { useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import AuthVisualPanel from "../components/auth/AuthVisualPanel";
import { http, passwordResetStorage } from "../api/http";
import { brand } from "../styles/designTokens";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

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
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = (nextForm) => {
    const nextErrors = {};

    if (!nextForm.newPassword) {
      nextErrors.newPassword = "New password is required";
    } else if (!PASSWORD_REGEX.test(nextForm.newPassword)) {
      nextErrors.newPassword =
        "Password must include uppercase, lowercase, number, special character, and be 8-72 characters";
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
            <LockResetRoundedIcon sx={{ fontSize: 18 }} />
            <span>SEAL HACKATHON</span>
          </Stack>
          <Typography component="h1" sx={{ color: brand.colors.text, fontSize: { xs: 30, md: 36 }, fontWeight: 900, lineHeight: 1.12 }}>
            Set a new password
          </Typography>
          <Typography sx={{ color: brand.colors.muted, fontSize: 15, lineHeight: 1.7, mt: 1.2, mb: 3 }}>
            Choose a strong password for <strong>{resetContext?.email || "your account"}</strong>.
          </Typography>

          {!resetContext?.email || !resetContext?.otp ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please verify your OTP before setting a new password.
            </Alert>
          ) : null}

          <Box component="form" noValidate onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                value={form.newPassword}
                onChange={(event) => setFormField("newPassword", event.target.value)}
                error={Boolean(touched.newPassword && fieldErrors.newPassword)}
                helperText={
                  (touched.newPassword && fieldErrors.newPassword) ||
                  "At least 8 characters with uppercase, lowercase, number, and special character."
                }
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                        edge="end"
                        onClick={() => setShowNewPassword((value) => !value)}
                      >
                        {showNewPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(event) => setFormField("confirmPassword", event.target.value)}
                error={Boolean(touched.confirmPassword && fieldErrors.confirmPassword)}
                helperText={(touched.confirmPassword && fieldErrors.confirmPassword) || " "}
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        edge="end"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                      >
                        {showConfirmPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
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
                {loading ? <CircularProgress color="inherit" size={20} /> : "Reset Password"}
              </Button>
            </Stack>
          </Box>

          <Typography sx={{ color: brand.colors.muted, fontSize: 15, mt: 3 }}>
            <Link component={RouterLink} to="/login" sx={{ color: brand.colors.orange, fontWeight: 900, textDecoration: "none" }}>
              Back to sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
