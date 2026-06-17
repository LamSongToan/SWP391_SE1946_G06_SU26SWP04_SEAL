import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid2,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
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

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;
const FPT_STUDENT_CODE_REGEX = /^(SE|HE|DE|QE|CE)\d{6}$/;
const APPROVAL_MESSAGE = "Account created successfully. Please wait for administrator approval.";

const INITIAL_FORM = {
  username: "",
  email: "",
  password: "",
  fullName: "",
  studentType: "FPT",
  fptStudentCode: "",
  externalStudentCode: "",
  externalUniversity: "",
};

function getPasswordStrength(password) {
  if (!password) return { score: 0, color: brand.colors.line, label: "" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z\d]/.test(password)) score += 1;
  if (password.length >= 12) score += 1;
  if (score <= 1) return { score: 1, color: brand.colors.danger, label: "Weak" };
  if (score === 2) return { score: 2, color: brand.colors.amber, label: "Fair" };
  if (score === 3) return { score: 3, color: brand.colors.green, label: "Good" };
  return { score: 4, color: brand.colors.orange, label: "Strong" };
}

function PasswordStrengthBar({ password }) {
  const strength = getPasswordStrength(password);
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 0.75 }}>
      {[1, 2, 3, 4].map((segment) => (
        <Box
          key={segment}
          sx={{
            flex: 1,
            height: 5,
            borderRadius: 10,
            bgcolor: segment <= strength.score ? strength.color : brand.colors.line,
          }}
        />
      ))}
      {strength.label ? (
        <Typography sx={{ color: strength.color, fontSize: 12, fontWeight: 800, minWidth: 44 }}>
          {strength.label}
        </Typography>
      ) : null}
    </Stack>
  );
}

export default function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [rejectedRegistration, setRejectedRegistration] = useState(
    () => location.state?.rejectedRegistration || rejectedRegistrationStorage.get()
  );
  const [googleRegistration, setGoogleRegistration] = useState(
    () => location.state?.googleRegistration || googleRegistrationStorage.get()
  );
  const [emailVerification, setEmailVerification] = useState(
    () => location.state?.registrationVerification || registrationVerificationStorage.get()
  );
  const isGoogleRegistration = Boolean(googleRegistration?.idToken && googleRegistration?.email);
  const isRejectedResubmission = Boolean(rejectedRegistration?.resubmitToken);

  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rejectedDraftLoading, setRejectedDraftLoading] = useState(false);

  useEffect(() => {
    setRejectedRegistration(location.state?.rejectedRegistration || rejectedRegistrationStorage.get());
    setGoogleRegistration(location.state?.googleRegistration || googleRegistrationStorage.get());
    setEmailVerification(
      location.state?.registrationVerification || registrationVerificationStorage.get()
    );
  }, [location.state]);

  useEffect(() => {
    if (isRejectedResubmission) {
      const rejectedPayload = location.state?.rejectedRegistration || rejectedRegistrationStorage.get();
      if (!rejectedPayload?.resubmitToken) {
        navigate("/login", { replace: true });
        return;
      }

      let active = true;
      const loadRejectedDraft = async () => {
        setRejectedDraftLoading(true);
        setError("");
        try {
          const response = await http.get("/api/auth/register/rejected", {
            params: { token: rejectedPayload.resubmitToken },
          });
          const draft = response.data?.data;
          if (!active || !draft) {
            return;
          }
          rejectedRegistrationStorage.set({
            resubmitToken: draft.token,
            rejectionReason: draft.rejectionReason || "",
          });
          setRejectedRegistration({
            resubmitToken: draft.token,
            rejectionReason: draft.rejectionReason || "",
          });
          setForm({
            username: draft.username || "",
            email: draft.email || "",
            password: "",
            fullName: draft.fullName || "",
            studentType: draft.studentType || "FPT",
            fptStudentCode: draft.fptStudentCode || "",
            externalStudentCode: draft.externalStudentCode || "",
            externalUniversity: draft.externalUniversity || "",
          });
          setAcceptedTerms(true);
          setFieldErrors({});
          setTouched({});
          setConfirmPassword("");
          setConfirmTouched(false);
        } catch (err) {
          rejectedRegistrationStorage.clear();
          if (active) {
            setRejectedRegistration(null);
            navigate("/login", {
              replace: true,
              state: { message: err?.response?.data?.message || "This rejected registration can no longer be updated." },
            });
          }
        } finally {
          if (active) {
            setRejectedDraftLoading(false);
          }
        }
      };

      loadRejectedDraft();
      return () => {
        active = false;
      };
    }

    if (isGoogleRegistration) {
      setForm((current) => ({
        ...current,
        email: googleRegistration.email,
        fullName: current.fullName || googleRegistration.fullName || "",
      }));
      return;
    }

    const verifiedPayload =
      location.state?.registrationVerification || registrationVerificationStorage.get();
    if (!verifiedPayload?.email || !verifiedPayload?.otp) {
      navigate("/register/verify-email", { replace: true });
      return;
    }

    setEmailVerification(verifiedPayload);
    setForm((current) => ({
      ...current,
      email: verifiedPayload.email,
    }));
  }, [googleRegistration, isGoogleRegistration, isRejectedResubmission, location.state, navigate]);

  const validateField = (name, value, nextForm = form) => {
    const trimmedValue = typeof value === "string" ? value.trim() : value;
    switch (name) {
      case "username":
        if (!trimmedValue) return "Username is required";
        if (trimmedValue.length < 4 || trimmedValue.length > 50) return "Username must be 4-50 characters";
        if (!USERNAME_REGEX.test(trimmedValue)) return "Username may only contain letters, numbers, dot, underscore, and hyphen";
        return "";
      case "fullName":
        if (!trimmedValue) return "Full name is required";
        if (trimmedValue.length > 150) return "Full name must be 150 characters or fewer";
        return "";
      case "email":
        if (!trimmedValue) return "Email is required";
        if (!EMAIL_REGEX.test(trimmedValue)) return "Email is not valid";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (!PASSWORD_REGEX.test(value)) return "Password must include uppercase, lowercase, number, special character, and be 8-72 characters";
        return "";
      case "fptStudentCode":
        if (nextForm.studentType !== "FPT") return "";
        if (!trimmedValue) return "FPT student code is required";
        if (!FPT_STUDENT_CODE_REGEX.test(trimmedValue)) return "FPT student code must look like SE123456, HE123456, DE123456, QE123456, or CE123456";
        return "";
      case "externalStudentCode":
        if (nextForm.studentType !== "EXTERNAL") return "";
        if (!trimmedValue) return "Student code is required";
        return "";
      case "externalUniversity":
        if (nextForm.studentType !== "EXTERNAL") return "";
        if (!trimmedValue) return "University is required";
        if (trimmedValue.length > 150) return "University must be 150 characters or fewer";
        return "";
      default:
        return "";
    }
  };

  const collectClientErrors = (nextForm = form) => {
    const nextErrors = {
      username: validateField("username", nextForm.username, nextForm),
      fullName: validateField("fullName", nextForm.fullName, nextForm),
      email: validateField("email", nextForm.email, nextForm),
    };

    if (!isRejectedResubmission) {
      nextErrors.password = validateField("password", nextForm.password, nextForm);
    }

    if (nextForm.studentType === "FPT") {
      nextErrors.fptStudentCode = validateField("fptStudentCode", nextForm.fptStudentCode, nextForm);
    } else {
      nextErrors.externalStudentCode = validateField("externalStudentCode", nextForm.externalStudentCode, nextForm);
      nextErrors.externalUniversity = validateField("externalUniversity", nextForm.externalUniversity, nextForm);
    }

    if (!isRejectedResubmission && !acceptedTerms) {
      nextErrors.acceptedTerms = "Please agree to the participation terms before registering";
    }

    return nextErrors;
  };

  const confirmPasswordError = useMemo(() => {
    if (!confirmTouched) return "";
    return confirmPassword === form.password ? "" : "Passwords do not match";
  }, [confirmPassword, confirmTouched, form.password]);

  const getFieldErrors = (err) => {
    const response = err?.response?.data;
    const message = response?.message || "";
    const validationData = response?.data;
    if (validationData && typeof validationData === "object" && !Array.isArray(validationData)) {
      return validationData;
    }
    if (message.includes("Username already exists")) return { username: message };
    if (message.includes("Email already exists")) return { email: message };
    if (message.includes("verification code")) return { email: message };
    if (message.includes("FPT student code") || message.includes("Student ID already exists in FPT")) return { fptStudentCode: message };
    if (message.includes("externalStudentCode") || message.includes("Student ID already exists in the selected university")) return { externalStudentCode: message };
    if (message.includes("externalUniversity")) return { externalUniversity: message };
    return {};
  };

  const setFormField = (key, value) => {
    const nextForm = { ...form, [key]: value };
    const nextTouched = { ...touched, [key]: true };

    if (key === "studentType") {
      if (value === "FPT") {
        nextForm.externalStudentCode = "";
        nextForm.externalUniversity = "";
        nextTouched.externalStudentCode = false;
        nextTouched.externalUniversity = false;
      } else {
        nextForm.fptStudentCode = "";
        nextTouched.fptStudentCode = false;
      }
    }

    const clientErrors = collectClientErrors(nextForm);
    const nextFieldErrors = {};
    Object.keys(clientErrors).forEach((fieldName) => {
      nextFieldErrors[fieldName] = nextTouched[fieldName] ? clientErrors[fieldName] : "";
    });

    setForm(nextForm);
    setTouched(nextTouched);
    setFieldErrors(nextFieldErrors);
  };

  const clearGoogleRegistrationMode = () => {
    googleRegistrationStorage.clear();
    setGoogleRegistration(null);
    setForm(INITIAL_FORM);
    setTouched({});
    setFieldErrors({});
    setConfirmPassword("");
    setConfirmTouched(false);
    navigate("/register/verify-email", { replace: true, state: null });
  };

  const cancelRejectedResubmission = () => {
    rejectedRegistrationStorage.clear();
    setRejectedRegistration(null);
    setForm(INITIAL_FORM);
    setTouched({});
    setFieldErrors({});
    navigate("/login", { replace: true });
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
        setGoogleRegistration(registrationPayload);
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
        const nextRejectedRegistration = {
          resubmitToken: payload.resubmitToken,
          rejectionReason: payload.rejectionReason || "",
        };
        rejectedRegistrationStorage.set(nextRejectedRegistration);
        setRejectedRegistration(nextRejectedRegistration);
        navigate("/register", { replace: true, state: { rejectedRegistration: nextRejectedRegistration } });
        return;
      }
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const allTouched = {
      username: true,
      fullName: true,
      email: true,
      ...(form.studentType === "FPT"
        ? { fptStudentCode: true }
        : { externalStudentCode: true, externalUniversity: true }),
    };
    if (!isRejectedResubmission) {
      allTouched.acceptedTerms = true;
      allTouched.password = true;
    }
    const clientErrors = collectClientErrors(form);
    setTouched(allTouched);
    setFieldErrors(clientErrors);

    if (confirmPassword !== form.password) {
      setConfirmTouched(true);
      return;
    }
    if (Object.values(clientErrors).some(Boolean)) {
      return;
    }

    if (!isGoogleRegistration && !isRejectedResubmission && (!emailVerification?.email || !emailVerification?.otp)) {
      navigate("/register/verify-email", { replace: true });
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRejectedResubmission
        ? "/api/auth/register/rejected"
        : isGoogleRegistration
          ? "/api/auth/register/google"
          : "/api/auth/register";
      const payload = isRejectedResubmission
        ? {
            token: rejectedRegistration.resubmitToken,
            username: form.username.trim(),
            fullName: form.fullName.trim(),
            studentType: form.studentType,
            fptStudentCode: form.studentType === "FPT" ? form.fptStudentCode.trim() : null,
            externalStudentCode: form.studentType === "EXTERNAL" ? form.externalStudentCode.trim() : null,
            externalUniversity: form.studentType === "EXTERNAL" ? form.externalUniversity.trim() : null,
          }
        : isGoogleRegistration
        ? {
            username: form.username.trim(),
            fullName: form.fullName.trim(),
            password: form.password,
            studentType: form.studentType,
            fptStudentCode: form.studentType === "FPT" ? form.fptStudentCode.trim() : null,
            externalStudentCode: form.studentType === "EXTERNAL" ? form.externalStudentCode.trim() : null,
            externalUniversity: form.studentType === "EXTERNAL" ? form.externalUniversity.trim() : null,
            idToken: googleRegistration.idToken,
          }
        : {
            username: form.username.trim(),
            email: emailVerification.email.trim(),
            password: form.password,
            otp: emailVerification.otp.trim(),
            fullName: form.fullName.trim(),
            studentType: form.studentType,
            fptStudentCode: form.studentType === "FPT" ? form.fptStudentCode.trim() : null,
            externalStudentCode: form.studentType === "EXTERNAL" ? form.externalStudentCode.trim() : null,
            externalUniversity: form.studentType === "EXTERNAL" ? form.externalUniversity.trim() : null,
          };

      const response = isRejectedResubmission
        ? await http.put(endpoint, payload)
        : await http.post(endpoint, payload);
      googleRegistrationStorage.clear();
      registrationVerificationStorage.clear();
      rejectedRegistrationStorage.clear();
      navigate("/login", {
        state: {
          message: isRejectedResubmission
            ? (response.data?.data?.message || "Registration updated successfully. Please wait for administrator approval.")
            : APPROVAL_MESSAGE,
        },
      });
    } catch (err) {
      const nextFieldErrors = getFieldErrors(err);
      setFieldErrors(nextFieldErrors);
      if (Object.keys(nextFieldErrors).length === 0) {
        setError(err?.response?.data?.message || "Registration failed. Please review the form and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const changeVerifiedEmail = () => {
    registrationVerificationStorage.clear();
    setEmailVerification(null);
    navigate("/register/verify-email", { replace: true });
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
          <Typography sx={{ color: brand.colors.orange, fontSize: 13, fontWeight: 900, letterSpacing: 1.2, mb: 1 }}>
            REQUEST ACCOUNT
          </Typography>
          <Typography component="h1" sx={{ color: brand.colors.text, fontSize: { xs: 30, md: 36 }, fontWeight: 900, lineHeight: 1.12 }}>
            {isRejectedResubmission ? "Update your registration" : "Register for SEAL"}
          </Typography>
          <Typography sx={{ color: brand.colors.muted, fontSize: 15, lineHeight: 1.7, mt: 1.2, mb: 2.4 }}>
            {isRejectedResubmission
              ? "Update the information below based on the coordinator's feedback, then submit your registration again for review."
              : "New accounts must be approved by an administrator before signing in to the Hackathon system."}
          </Typography>

          {isRejectedResubmission ? (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {rejectedRegistration?.rejectionReason || "Your previous registration was rejected. Please update the details below and submit again."}
            </Alert>
          ) : null}

          {isGoogleRegistration ? (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Google account detected for <strong>{googleRegistration.email}</strong>.
            </Alert>
          ) : emailVerification?.email ? (
            <Alert
              icon={<VerifiedRoundedIcon fontSize="inherit" />}
              severity="success"
              sx={{ mb: 1.5 }}
              action={(
                <Button color="inherit" size="small" onClick={changeVerifiedEmail}>
                  Change
                </Button>
              )}
            >
              Email verified for <strong>{emailVerification.email}</strong>.
            </Alert>
          ) : null}

          <Box component="form" noValidate onSubmit={onSubmit}>
            <Stack spacing={1.2}>
              <Grid2 container spacing={1.2}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Full name"
                    value={form.fullName}
                    onChange={(event) => setFormField("fullName", event.target.value.trimStart())}
                    error={Boolean(fieldErrors.fullName)}
                    helperText={fieldErrors.fullName || " "}
                    required
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={form.username}
                    onChange={(event) => setFormField("username", event.target.value.trimStart())}
                    error={Boolean(fieldErrors.username)}
                    helperText={fieldErrors.username || " "}
                    required
                  />
                </Grid2>
              </Grid2>

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={isGoogleRegistration || isRejectedResubmission ? form.email : emailVerification?.email || form.email}
                error={Boolean(fieldErrors.email)}
                helperText={
                  fieldErrors.email ||
                  (isRejectedResubmission
                    ? "This email belongs to your rejected registration and cannot be changed here"
                    : null) ||
                  (isGoogleRegistration
                    ? "This email comes from your Google account"
                    : "This email has already been verified")
                }
                required
                disabled
              />

              {isGoogleRegistration && !isRejectedResubmission ? (
                <Alert severity="info" sx={{ mb: 0.25 }}>
                  This Google account will also use the password below for future email sign-in.
                </Alert>
              ) : null}

              {!isRejectedResubmission ? (
                <>
                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setFormField("password", event.target.value)}
                    error={Boolean(fieldErrors.password)}
                    helperText={fieldErrors.password || " "}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton edge="end" onClick={() => setShowPassword((value) => !value)}>
                            {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <PasswordStrengthBar password={form.password} />
                  <TextField
                    fullWidth
                    label="Confirm password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onBlur={() => setConfirmTouched(true)}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    error={Boolean(confirmPasswordError)}
                    helperText={confirmPasswordError || " "}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton edge="end" onClick={() => setShowConfirmPassword((value) => !value)}>
                            {showConfirmPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </>
              ) : null}

              <Grid2 container spacing={1.2}>
                <Grid2 size={{ xs: 12, sm: 5 }}>
                  <TextField
                    fullWidth
                    select
                    label="Student type"
                    value={form.studentType}
                    onChange={(event) => setFormField("studentType", event.target.value)}
                    required
                  >
                    <MenuItem value="FPT">FPT University</MenuItem>
                    <MenuItem value="EXTERNAL">External</MenuItem>
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 7 }}>
                  {form.studentType === "FPT" ? (
                    <TextField
                      fullWidth
                      label="FPT student code"
                      value={form.fptStudentCode}
                      onChange={(event) => setFormField("fptStudentCode", event.target.value.toUpperCase())}
                      error={Boolean(fieldErrors.fptStudentCode)}
                      helperText={fieldErrors.fptStudentCode || "Example: SE123456"}
                      inputProps={{ maxLength: 8 }}
                      required
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label="Student code"
                      value={form.externalStudentCode}
                      onChange={(event) => setFormField("externalStudentCode", event.target.value.trimStart())}
                      error={Boolean(fieldErrors.externalStudentCode)}
                      helperText={fieldErrors.externalStudentCode || " "}
                      required
                    />
                  )}
                </Grid2>
              </Grid2>

              {form.studentType === "EXTERNAL" ? (
                <TextField
                  fullWidth
                  label="University"
                  value={form.externalUniversity}
                  onChange={(event) => setFormField("externalUniversity", event.target.value.trimStart())}
                  error={Boolean(fieldErrors.externalUniversity)}
                  helperText={fieldErrors.externalUniversity || " "}
                  required
                />
              ) : null}

              {!isRejectedResubmission ? (
                <>
                  <FormControlLabel
                    control={(
                      <Checkbox
                        checked={acceptedTerms}
                        onChange={(event) => {
                          setAcceptedTerms(event.target.checked);
                          setTouched((current) => ({ ...current, acceptedTerms: true }));
                          setFieldErrors((current) => ({
                            ...current,
                            acceptedTerms: event.target.checked ? "" : "Please agree to the participation terms before registering",
                          }));
                        }}
                        size="small"
                        sx={{ color: brand.colors.orange }}
                      />
                    )}
                    label={(
                      <Typography sx={{ color: brand.colors.muted, fontSize: 14 }}>
                        I agree to the{" "}
                        <Link href="#" sx={{ color: brand.colors.orange, fontWeight: 900, textDecoration: "none" }}>
                          SEAL participation terms
                        </Link>
                      </Typography>
                    )}
                    sx={{ m: 0 }}
                  />
                  {touched.acceptedTerms && fieldErrors.acceptedTerms ? (
                    <Typography sx={{ color: brand.colors.danger, fontSize: 12 }}>{fieldErrors.acceptedTerms}</Typography>
                  ) : null}
                </>
              ) : null}

              {error ? <Alert severity="error">{error}</Alert> : null}

              <Button
                disabled={loading || googleLoading || rejectedDraftLoading}
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
                {loading || rejectedDraftLoading
                  ? <CircularProgress color="inherit" size={20} />
                  : isRejectedResubmission
                    ? "Resubmit request"
                    : isGoogleRegistration
                      ? "Complete account"
                      : "Create account"}
              </Button>

              {!isRejectedResubmission ? (
                <>
                  <Divider sx={{ color: brand.colors.muted, fontSize: 13 }}>or continue with Google</Divider>
                  <GoogleSignInButton
                    text="signup_with"
                    onCredential={handleGoogleLogin}
                    disabled={loading || googleLoading}
                    fullWidth
                    minHeight={50}
                  />
                  {googleLoading ? <Typography color="text.secondary" variant="body2">Processing Google sign-in...</Typography> : null}
                  {isGoogleRegistration ? (
                    <Button color="inherit" onClick={clearGoogleRegistrationMode} size="small">
                      Use email registration instead
                    </Button>
                  ) : null}
                </>
              ) : (
                <Button color="inherit" onClick={cancelRejectedResubmission} size="small">
                  Back to sign in
                </Button>
              )}
            </Stack>
          </Box>

          <Typography sx={{ color: brand.colors.muted, fontSize: 15, mt: 2.3 }}>
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
