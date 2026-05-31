import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Grid2,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import PublicShell from "../components/layout/PublicShell";
import { http } from "../api/http";

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
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const response = await http.post("/api/auth/register", form);
      setSuccess(response.data?.data?.message || "Register successful");
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err?.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <Box className="ms-auth-screen">
        <Box className="ms-auth-panel">
          <Box>
            <Typography component="h1">Create an account for SEAL event operations.</Typography>
            <Typography sx={{ mt: 2 }}>
              Participant profiles enter an approval workflow before joining protected dashboard modules.
            </Typography>
          </Box>
          <Box className="ms-auth-meta">
            <Box className="ms-auth-meta-item"><strong>Profile</strong><span>Student Info</span></Box>
            <Box className="ms-auth-meta-item"><strong>Status</strong><span>Pending Review</span></Box>
            <Box className="ms-auth-meta-item"><strong>Season</strong><span>Multi Event</span></Box>
          </Box>
        </Box>

        <Box className="ms-auth-form-wrap">
          <Box className="ms-auth-form-card is-wide">
              <span className="ms-auth-header">
                <PersonAddAltRoundedIcon sx={{ fontSize: 16 }} />
                Participant Registration
              </span>

              <Typography variant="h4" sx={{ mt: 2, mb: 0.7 }}>Create Account</Typography>
              <Typography color="text.secondary" sx={{ mb: 2.5 }}>
                Complete the form to request system access.
              </Typography>

              <form onSubmit={onSubmit}>
                <Grid2 container spacing={1.4}>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Full Name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth select label="Student Type" value={form.studentType} onChange={(event) => setForm({ ...form, studentType: event.target.value })} required>
                      <MenuItem value="FPT">FPT</MenuItem>
                      <MenuItem value="EXTERNAL">External</MenuItem>
                    </TextField>
                  </Grid2>

                  {form.studentType === "FPT" ? (
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label="FPT Student Code" value={form.fptStudentCode} onChange={(event) => setForm({ ...form, fptStudentCode: event.target.value })} required />
                    </Grid2>
                  ) : (
                    <>
                      <Grid2 size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth label="External Student Code" value={form.externalStudentCode} onChange={(event) => setForm({ ...form, externalStudentCode: event.target.value })} required />
                      </Grid2>
                      <Grid2 size={{ xs: 12 }}>
                        <TextField fullWidth label="University" value={form.externalUniversity} onChange={(event) => setForm({ ...form, externalUniversity: event.target.value })} required />
                      </Grid2>
                    </>
                  )}
                </Grid2>

                <Stack spacing={1.2} sx={{ mt: 2 }}>
                  {error ? <Alert severity="error">{error}</Alert> : null}
                  {success ? <Alert severity="success">{success}</Alert> : null}
                  <Button disabled={loading} size="large" type="submit" variant="contained">
                    {loading ? "Submitting..." : "Register"}
                  </Button>
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
