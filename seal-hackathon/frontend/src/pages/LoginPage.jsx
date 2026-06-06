import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import AuthVisualPanel from "../components/auth/AuthVisualPanel";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import { authStorage, googleRegistrationStorage, http } from "../api/http";
import { brand } from "../styles/designTokens";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginForm(form) {
  const errors = {};
  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = "Email is not valid";
  }
  if (!form.password) {
    errors.password = "Password is required";
  }
  return errors;
}

function normalizeLoginError(error) {
  const message = error?.response?.data?.message || error?.message || "";
  const normalized = message.toLowerCase();
  if (normalized.includes("not approved") || normalized.includes("pending")) {
    return "Your account is waiting for administrator approval. Please sign in again after it is approved.";
  }
  if (normalized.includes("locked") || normalized.includes("suspended")) {
    return "Your account is currently inactive. Please contact the Event Coordinator.";
  }
  if (normalized.includes("rejected")) {
    return message || "Your account request was rejected. Please contact the Event Coordinator for details.";
  }
  return message || "Sign in failed";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  const successMessage = location.state?.message || "";
  const sessionExpired = new URLSearchParams(location.search).get("sessionExpired") === "1";
  const hasClientErrors = Object.values(validateLoginForm(form)).some(Boolean);

  const setFormField = (key, value) => {
    const nextForm = { ...form, [key]: value };
    const nextTouched = { ...touched, [key]: true };
    const nextErrors = validateLoginForm(nextForm);
    setForm(nextForm);
    setTouched(nextTouched);
    setFieldErrors(Object.fromEntries(
      Object.entries(nextErrors).map(([field, message]) => [field, nextTouched[field] ? message : ""])
    ));
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
        navigate("/register", { state: { googleRegistration: registrationPayload } });
        return;
      }

      authStorage.set(data?.auth);
      googleRegistrationStorage.clear();
      navigate("/dashboard?section=account");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const loginByPassword = async (event) => {
    event.preventDefault();
    setError("");
    const nextErrors = validateLoginForm(form);
    setTouched({ email: true, password: true });
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setLoading(true);
    try {
      const response = await http.post("/api/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });
      authStorage.set(response.data?.data, rememberDevice);
      googleRegistrationStorage.clear();
      navigate("/dashboard?section=account");
    } catch (err) {
      setError(normalizeLoginError(err));
    } finally {
      setLoading(false);
    }
  };

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
          <Typography sx={{ color: brand.colors.orange, fontSize: 13, fontWeight: 900, letterSpacing: 1.2, mb: 1 }}>
            SEAL HACKATHON
          </Typography>
          <Typography component="h1" sx={{ color: brand.colors.text, fontSize: { xs: 30, md: 36 }, fontWeight: 900, lineHeight: 1.12 }}>
            Sign in to SEAL
          </Typography>
          <Typography sx={{ color: brand.colors.muted, fontSize: 15, lineHeight: 1.7, mt: 1.2, mb: 3 }}>
            Track your team, deadlines, rounds, and Hackathon tasks at FPT University HCMC.
          </Typography>

          <Stack spacing={1.2} sx={{ mb: 2.4 }}>
            <GoogleSignInButton
              text="signin_with"
              onCredential={handleGoogleLogin}
              disabled={loading || googleLoading}
              width={300}
            />
            {googleLoading ? (
              <Typography color="text.secondary" variant="body2">Processing Google sign-in...</Typography>
            ) : null}
          </Stack>

          <Divider sx={{ color: brand.colors.muted, fontSize: 13, mb: 2.8 }}>
            or sign in with email
          </Divider>

          <Box component="form" noValidate onSubmit={loginByPassword}>
            <Stack spacing={2}>
              <TextField
                type="email"
                label="Email"
                value={form.email}
                onChange={(event) => setFormField("email", event.target.value)}
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email || " "}
                required
                fullWidth
              />
              <TextField
                type={showPassword ? "text" : "password"}
                label="Password"
                value={form.password}
                onChange={(event) => setFormField("password", event.target.value)}
                error={Boolean(fieldErrors.password)}
                helperText={fieldErrors.password || " "}
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        edge="end"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Stack alignItems="center" direction="row" justifyContent="space-between" sx={{ gap: 2 }}>
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={rememberDevice}
                      onChange={(event) => setRememberDevice(event.target.checked)}
                      size="small"
                      sx={{ color: brand.colors.orange }}
                    />
                  )}
                  label="Remember this device"
                  sx={{ m: 0, "& .MuiFormControlLabel-label": { color: brand.colors.muted, fontSize: 14 } }}
                />
                <Link component={RouterLink} to="/forgot-password" sx={{ color: brand.colors.orange, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </Stack>

              <Button
                disabled={loading || googleLoading || hasClientErrors}
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                sx={{
                  height: 50,
                  bgcolor: brand.colors.orange,
                  color: brand.colors.inverse,
                  "&:hover": { bgcolor: brand.colors.orangeDark },
                }}
              >
                {loading ? <CircularProgress color="inherit" size={20} /> : "Sign in"}
              </Button>
            </Stack>
          </Box>

          {successMessage ? <Alert severity="success" sx={{ mt: 2 }}>{successMessage}</Alert> : null}
          {sessionExpired ? <Alert severity="warning" sx={{ mt: 2 }}>Your session expired. Please sign in again.</Alert> : null}
          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

          <Typography sx={{ color: brand.colors.muted, fontSize: 15, mt: 3 }}>
            New to SEAL?{" "}
            <Link component={RouterLink} to="/register" sx={{ color: brand.colors.orange, fontWeight: 900, textDecoration: "none" }}>
              Register
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
