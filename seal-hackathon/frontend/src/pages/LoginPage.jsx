import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { authStorage, http } from "../api/http";
import PublicShell from "../components/layout/PublicShell";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginByPassword = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await http.post("/api/auth/login", form);
      authStorage.set(response.data?.data);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card>
          <CardContent sx={{ p: 3.5 }}>
            <Typography sx={{ mb: 0.5 }} variant="h4">
              SEAL Login
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2.5 }}>
              Sign in using username and password.
            </Typography>

            <Box component="form" onSubmit={loginByPassword}>
              <Stack spacing={2}>
                <TextField
                  label="Username"
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  value={form.username}
                />
                <TextField
                  label="Password"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  type="password"
                  value={form.password}
                />
                <Button disabled={loading} size="large" type="submit" variant="contained">
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </Stack>
            </Box>

            {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

            <Typography color="text.secondary" sx={{ mt: 2 }}>
              No account?{" "}
              <Link component={RouterLink} to="/register">
                Create account
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </PublicShell>
  );
}
