import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
    Alert, Box, Button, Card, CardContent,
    Container, Link, Stack, TextField, Typography,
} from "@mui/material";
import { http } from "../api/http";
import PublicShell from "../components/layout/PublicShell";

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ resetToken: "", newPassword: "", confirmPassword: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (form.newPassword !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            await http.post("/api/auth/reset-password", {
                resetToken: form.resetToken,
                newPassword: form.newPassword,
            });
            navigate("/login", { state: { message: "Password reset successfully. Please log in." } });
        } catch (err) {
            setError(err?.response?.data?.message || "Reset failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PublicShell>
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Card>
                    <CardContent sx={{ p: 3.5 }}>
                        <Typography variant="h4" sx={{ mb: 0.5 }}>Reset Password</Typography>
                        <Typography color="text.secondary" sx={{ mb: 2.5 }}>
                            Enter the reset token and your new password.
                        </Typography>

                        <Box component="form" onSubmit={onSubmit}>
                            <Stack spacing={2}>
                                <TextField
                                    label="Reset Token"
                                    value={form.resetToken}
                                    onChange={(e) => setForm({ ...form, resetToken: e.target.value })}
                                    required
                                    placeholder="Paste the token from the forgot password step"
                                />
                                <TextField
                                    label="New Password"
                                    type="password"
                                    value={form.newPassword}
                                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                                    required
                                />
                                <TextField
                                    label="Confirm New Password"
                                    type="password"
                                    value={form.confirmPassword}
                                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                    required
                                />
                                <Button type="submit" variant="contained" size="large" disabled={loading}>
                                    {loading ? "Resetting..." : "Reset Password"}
                                </Button>
                            </Stack>
                        </Box>

                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                        <Typography color="text.secondary" sx={{ mt: 2 }}>
                            <Link component={RouterLink} to="/login">Back to login</Link>
                        </Typography>
                    </CardContent>
                </Card>
            </Container>
        </PublicShell>
    );
}