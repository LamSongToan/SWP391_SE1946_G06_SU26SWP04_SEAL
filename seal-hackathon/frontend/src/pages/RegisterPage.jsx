import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Container,
  Grid2,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { http } from "../api/http";
import PublicShell from "../components/layout/PublicShell";

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
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ p: 3.5 }}>
            <Typography sx={{ mb: 0.5 }} variant="h4">
              SEAL Register
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2.5 }}>
              Create a student account for SEAL hackathon.
            </Typography>

            <form onSubmit={onSubmit}>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Username"
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                    value={form.username}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                    value={form.fullName}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Email"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    type="email"
                    value={form.email}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Password"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    type="password"
                    value={form.password}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Student Type"
                    onChange={(e) => setForm({ ...form, studentType: e.target.value })}
                    required
                    select
                    value={form.studentType}
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
                      onChange={(e) => setForm({ ...form, fptStudentCode: e.target.value })}
                      required
                      value={form.fptStudentCode}
                    />
                  </Grid2>
                ) : (
                  <>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="External Student Code"
                        onChange={(e) => setForm({ ...form, externalStudentCode: e.target.value })}
                        required
                        value={form.externalStudentCode}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="University"
                        onChange={(e) => setForm({ ...form, externalUniversity: e.target.value })}
                        required
                        value={form.externalUniversity}
                      />
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
              Already registered?{" "}
              <Link component={RouterLink} to="/login">
                Go to login
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </PublicShell>
  );
}
