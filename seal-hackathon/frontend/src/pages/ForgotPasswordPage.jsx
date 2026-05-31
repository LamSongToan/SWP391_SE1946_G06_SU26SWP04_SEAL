import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
    Alert, Box, Button, Card, CardContent,
    Container, Link, Stack, TextField, Typography,
} from "@mui/material";
import { http } from "../api/http";
import PublicShell from "../components/layout/PublicShell";

export default function ForgotPasswordPage() {
    const [username, setUsername] = useState("");
    const [result, setResult] = useState(null); // { resetToken, message, expiresInMinutes }
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setResult(null);
        setLoading(true);
        try {
            const response = await http.post("/api/auth/forgot-password", { username });
            setResult(response.data?.data);
        } catch (err) {
            setError(err?.response?.data?.message || "Request failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PublicShell>
            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Card>
                    <CardContent sx={{ p: 3.5 }}>
                        <Typography variant="h4" sx={{ mb: 0.5 }}>Forgot Password</Typography>
                        <Typography color="text.secondary" sx={{ mb: 2.5 }}>
                            Enter your username to receive a password reset token.
                        </Typography>

                        <Box component="form" onSubmit={onSubmit}>
                            <Stack spacing={2}>
                                <TextField
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                                <Button type="submit" variant="contained" size="large" disabled={loading}>
                                    {loading ? "Sending..." : "Get Reset Token"}
                                </Button>
                            </Stack>
                        </Box>

                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                        {result && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>{result.message}</Typography>
                                {result.resetToken && (
                                    <>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            Reset Token (dev only — would be emailed in production):
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily: "monospace",
                                                wordBreak: "break-all",
                                                bgcolor: "#f0f4f8",
                                                p: 1,
                                                borderRadius: 1,
                                                mt: 0.5,
                                            }}
                                        >
                                            {result.resetToken}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Expires in {result.expiresInMinutes} minutes.
                                        </Typography>
                                    </>
                                )}
                            </Alert>
                        )}

                        <Typography color="text.secondary" sx={{ mt: 2 }}>
                            Have a token?{" "}
                            <Link component={RouterLink} to="/reset-password">Reset password</Link>
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                            <Link component={RouterLink} to="/login">Back to login</Link>
                        </Typography>
                    </CardContent>
                </Card>
            </Container>
        </PublicShell>
    );
}