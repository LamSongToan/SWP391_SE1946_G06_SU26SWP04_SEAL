import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import { http, logout } from "../api/http";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

export default function ChangePasswordPage() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (nextForm) => {
    const nextErrors = {};

    if (!nextForm.currentPassword) {
      nextErrors.currentPassword = "Current password is required";
    }

    if (!nextForm.newPassword) {
      nextErrors.newPassword = "New password is required";
    } else if (!PASSWORD_REGEX.test(nextForm.newPassword)) {
      nextErrors.newPassword =
        "Password must include uppercase, lowercase, number, special character, and be 8-72 characters";
    }

    if (!nextForm.confirmPassword) {
      nextErrors.confirmPassword = "Confirm new password is required";
    } else if (nextForm.confirmPassword !== nextForm.newPassword) {
      nextErrors.confirmPassword = "New passwords do not match";
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
    setSuccess("");

    const nextErrors = validate(form);
    setTouched({ currentPassword: true, newPassword: true, confirmPassword: true });
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setLoading(true);
    try {
      await http.post("/api/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess("Password changed successfully. You will be logged out.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTouched({});
      setFieldErrors({});
      setTimeout(() => logout(), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || "Change failed");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || Object.values(validate(form)).some(Boolean);

  return (
    <Container maxWidth="sm" sx={{ py: 0.4 }}>
      <Card className="ms-auth-form">
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <LockResetRoundedIcon color="primary" />
            <Typography variant="h4">Change Password</Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ mb: 2.5 }}>
            Enter your current password and choose a new one.
          </Typography>

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={1.4}>
              <TextField
                label="Current Password"
                type="password"
                value={form.currentPassword}
                onChange={(event) => setFormField("currentPassword", event.target.value)}
                error={Boolean(touched.currentPassword && fieldErrors.currentPassword)}
                helperText={(touched.currentPassword && fieldErrors.currentPassword) || " "}
                required
              />
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
              {error ? <Alert severity="error">{error}</Alert> : null}
              {success ? <Alert severity="success">{success}</Alert> : null}
              <Button type="submit" variant="contained" size="large" disabled={isSubmitDisabled}>
                {loading ? "Saving..." : "Change Password"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
