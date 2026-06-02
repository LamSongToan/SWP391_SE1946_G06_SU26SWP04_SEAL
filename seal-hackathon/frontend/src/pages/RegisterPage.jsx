import { useEffect, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid2,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import PublicShell from "../components/layout/PublicShell";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import { authStorage, googleRegistrationStorage, http } from "../api/http";

const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;
const FPT_STUDENT_CODE_REGEX = /^(SE|HE|DE|QE|CE)\d{6}$/;

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

export default function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [googleRegistration, setGoogleRegistration] = useState(
    () => location.state?.googleRegistration || googleRegistrationStorage.get()
  );
  const isGoogleRegistration = Boolean(googleRegistration?.idToken && googleRegistration?.email);

  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    setGoogleRegistration(location.state?.googleRegistration || googleRegistrationStorage.get());
  }, [location.state]);

  useEffect(() => {
    if (!isGoogleRegistration) {
      return;
    }

    setForm((current) => ({
      ...current,
      email: googleRegistration.email,
      fullName: current.fullName || googleRegistration.fullName || "",
      password: "",
    }));
  }, [googleRegistration, isGoogleRegistration]);

  const clearGoogleRegistrationMode = () => {
    googleRegistrationStorage.clear();
    setGoogleRegistration(null);
    setForm((current) => ({
      ...INITIAL_FORM,
      fullName: current.fullName,
    }));
    setTouched({});
    setFieldErrors({});
    navigate("/register", { replace: true, state: null });
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
        setGoogleRegistration(registrationPayload);
        setForm((current) => ({
          ...current,
          email: registrationPayload.email,
          fullName: current.fullName || registrationPayload.fullName,
        }));
        navigate("/register", { replace: true, state: { googleRegistration: registrationPayload } });
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

  const validateField = (name, value, nextForm = form) => {
    const trimmedValue = typeof value === "string" ? value.trim() : value;

    switch (name) {
      case "username":
        if (!trimmedValue) return "Username is required";
        if (trimmedValue.length < 4 || trimmedValue.length > 50) {
          return "Username must be 4-50 characters";
        }
        if (!USERNAME_REGEX.test(trimmedValue)) {
          return "Username only allows letters, numbers, dot, underscore and hyphen";
        }
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
        if (isGoogleRegistration) return "";
        if (!value) return "Password is required";
        if (!PASSWORD_REGEX.test(value)) {
          return "Password must include at least one letter, one number, one special character, and be 8-72 characters";
        }
        return "";
      case "fptStudentCode":
        if (nextForm.studentType !== "FPT") return "";
        if (!trimmedValue) return "FPT student code is required";
        if (!FPT_STUDENT_CODE_REGEX.test(trimmedValue)) {
          return "FPT student code must look like SE123456, HE123456, DE123456, QE123456, or CE123456";
        }
        return "";
      case "externalStudentCode":
        if (nextForm.studentType !== "EXTERNAL") return "";
        if (!trimmedValue) return "External student code is required";
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

    if (!isGoogleRegistration) {
      nextErrors.password = validateField("password", nextForm.password, nextForm);
    }

    if (nextForm.studentType === "FPT") {
      nextErrors.fptStudentCode = validateField("fptStudentCode", nextForm.fptStudentCode, nextForm);
    } else {
      nextErrors.externalStudentCode = validateField("externalStudentCode", nextForm.externalStudentCode, nextForm);
      nextErrors.externalUniversity = validateField("externalUniversity", nextForm.externalUniversity, nextForm);
    }

    return nextErrors;
  };

  const hasClientErrors = Object.values(collectClientErrors(form)).some(Boolean);
  const isRegisterDisabled = loading || googleLoading || hasClientErrors;

  const getFieldErrors = (err) => {
    const response = err?.response?.data;
    const message = response?.message || "";
    const validationData = response?.data;

    if (validationData && typeof validationData === "object" && !Array.isArray(validationData)) {
      return validationData;
    }

    if (message.includes("Username already exists")) return { username: message };
    if (message.includes("Email already exists")) return { email: message };
    if (message.includes("FPT student code") || message.includes("Student ID already exists in FPT")) {
      return { fptStudentCode: message };
    }
    if (message.includes("externalStudentCode") || message.includes("Student ID already exists in the selected university")) {
      return { externalStudentCode: message };
    }
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

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const allTouched = {
      username: true,
      fullName: true,
      email: true,
      ...(isGoogleRegistration ? {} : { password: true }),
      ...(form.studentType === "FPT"
        ? { fptStudentCode: true }
        : { externalStudentCode: true, externalUniversity: true }),
    };

    const clientErrors = collectClientErrors(form);
    setTouched(allTouched);
    setFieldErrors(clientErrors);
    if (Object.values(clientErrors).some(Boolean)) {
      return;
    }

    setLoading(true);
    try {
      const endpoint = isGoogleRegistration ? "/api/auth/register/google" : "/api/auth/register";
      const payload = isGoogleRegistration
        ? {
            username: form.username,
            fullName: form.fullName,
            studentType: form.studentType,
            fptStudentCode: form.studentType === "FPT" ? form.fptStudentCode : null,
            externalStudentCode: form.studentType === "EXTERNAL" ? form.externalStudentCode : null,
            externalUniversity: form.studentType === "EXTERNAL" ? form.externalUniversity : null,
            idToken: googleRegistration.idToken,
          }
        : form;

      const response = await http.post(endpoint, payload);
      const successMessage = response.data?.data?.message || "Register successful";

      if (isGoogleRegistration) {
        googleRegistrationStorage.clear();
        navigate("/login", { state: { message: successMessage } });
        return;
      }

      setSuccess(successMessage);
      setForm(INITIAL_FORM);
      setTouched({});
      setFieldErrors({});
    } catch (err) {
      const nextFieldErrors = getFieldErrors(err);
      setFieldErrors(nextFieldErrors);
      if (Object.keys(nextFieldErrors).length === 0) {
        setError(err?.response?.data?.message || "Register failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <Box className="ms-auth-screen">
        <Box className="ms-auth-panel">
          <Box>
            <Typography component="h1">
              {isGoogleRegistration ? "Complete your Google registration." : "Join SEAL as a student participant."}
            </Typography>
            <Typography sx={{ mt: 2 }}>
              {isGoogleRegistration
                ? "Your Google account is verified. Complete the remaining student information to create your SEAL account."
                : "Register with your student information to join upcoming hackathon seasons, form a team, and access your student workspace after approval."}
            </Typography>
          </Box>
          <Box className="ms-auth-meta">
            <Box className="ms-auth-meta-item"><strong>Register</strong><span>Student Account</span></Box>
            <Box className="ms-auth-meta-item"><strong>Approval</strong><span>Coordinator Review</span></Box>
            <Box className="ms-auth-meta-item"><strong>Access</strong><span>Team Workspace</span></Box>
          </Box>
        </Box>

        <Box className="ms-auth-form-wrap">
          <Box className="ms-auth-form-card is-wide">
            <span className="ms-auth-header">
              <PersonAddAltRoundedIcon sx={{ fontSize: 16 }} />
              {isGoogleRegistration ? "Google Registration" : "Participant Registration"}
            </span>

            <Typography variant="h4" sx={{ mt: 2, mb: 0.7 }}>
              {isGoogleRegistration ? "Complete Registration" : "Create Account"}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2.5 }}>
              {isGoogleRegistration
                ? "Choose a username and complete your student profile."
                : "Complete the form to request your student account."}
            </Typography>

            {isGoogleRegistration ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Google account detected for <strong>{googleRegistration.email}</strong>.
              </Alert>
            ) : null}

            <form onSubmit={onSubmit}>
              <Grid2 container spacing={1.4}>
                <Grid2 size={{ xs: 12, md: 6 }}>
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
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={form.fullName}
                    onChange={(event) => setFormField("fullName", event.target.value.trimStart())}
                    error={Boolean(fieldErrors.fullName)}
                    helperText={fieldErrors.fullName || " "}
                    required
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setFormField("email", event.target.value.trim())}
                    error={Boolean(fieldErrors.email)}
                    helperText={fieldErrors.email || " "}
                    required
                    disabled={isGoogleRegistration}
                  />
                </Grid2>

                {!isGoogleRegistration ? (
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={form.password}
                      onChange={(event) => setFormField("password", event.target.value)}
                      error={Boolean(fieldErrors.password)}
                      helperText={fieldErrors.password || "At least 8 characters, including a letter, a number, and a special character."}
                      required
                    />
                  </Grid2>
                ) : null}

                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="Student Type"
                    value={form.studentType}
                    onChange={(event) => setFormField("studentType", event.target.value)}
                    required
                  >
                    <MenuItem value="FPT">FPT</MenuItem>
                    <MenuItem value="EXTERNAL">External</MenuItem>
                  </TextField>
                </Grid2>

                {form.studentType === "FPT" ? (
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="FPT Student Code"
                      value={form.fptStudentCode}
                      onChange={(event) => setFormField("fptStudentCode", event.target.value.toUpperCase())}
                      error={Boolean(fieldErrors.fptStudentCode)}
                      helperText={fieldErrors.fptStudentCode || "Format: SE123456, HE123456, DE123456, QE123456, or CE123456."}
                      inputProps={{ maxLength: 8 }}
                      required
                    />
                  </Grid2>
                ) : (
                  <>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="External Student Code"
                        value={form.externalStudentCode}
                        onChange={(event) => setFormField("externalStudentCode", event.target.value.trimStart())}
                        error={Boolean(fieldErrors.externalStudentCode)}
                        helperText={fieldErrors.externalStudentCode || " "}
                        required
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="University"
                        value={form.externalUniversity}
                        onChange={(event) => setFormField("externalUniversity", event.target.value.trimStart())}
                        error={Boolean(fieldErrors.externalUniversity)}
                        helperText={fieldErrors.externalUniversity || " "}
                        required
                      />
                    </Grid2>
                  </>
                )}
              </Grid2>

              <Stack spacing={1.2} sx={{ mt: 2 }}>
                {error ? <Alert severity="error">{error}</Alert> : null}
                {success ? <Alert severity="success">{success}</Alert> : null}
                <Button disabled={isRegisterDisabled} size="large" type="submit" variant="contained">
                  {loading
                    ? "Submitting..."
                    : isGoogleRegistration
                      ? "Complete registration"
                      : "Register"}
                </Button>
                <Divider>or</Divider>
                {isGoogleRegistration ? (
                  <Typography color="text.secondary" variant="body2">
                    Need to switch Google account? Sign in with Google again below.
                  </Typography>
                ) : null}
                <GoogleSignInButton
                  text="signup_with"
                  onCredential={handleGoogleLogin}
                  disabled={loading || googleLoading}
                  width={280}
                />
                {googleLoading ? (
                  <Typography color="text.secondary" variant="body2">
                    Processing Google sign-in...
                  </Typography>
                ) : null}
                {isGoogleRegistration ? (
                  <Button color="inherit" onClick={clearGoogleRegistrationMode} size="small">
                    Use manual registration instead
                  </Button>
                ) : null}
              </Stack>
            </form>

            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Already registered? <Link component={RouterLink} to="/login">Go to login</Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </PublicShell>
  );
}
