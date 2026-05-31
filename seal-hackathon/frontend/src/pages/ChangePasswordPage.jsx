import { useState } from "react";
import {
    Alert, Box, Button, Card, CardContent,
    Container, Stack, TextField, Typography,
} from "@mui/material";
import { http, logout } from "../api/http";
import PublicShell from "../components/layout/PublicShell";

export default function ChangePasswordPage() {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (form.newPassword !== form.confirmPassword) {
            setError("New passwords do not match");
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
            // Log out after password change — tokens should be invalidated
            setTimeout(() => logout(), 2000);
        } catch (err) {
            setError(err?.response?.data?.message || "Change failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Card>
                <CardContent sx={{ p: 3.5 }}>
                    <Typography variant="h4" sx={{ mb: 0.5 }}>Change Password</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2.5 }}>
                        Enter your current password and choose a new one.
                    </Typography>

                    <Box component="form" onSubmit={onSubmit}>
                        <Stack spacing={2}>
                            <TextField
                                label="Current Password"
                                type="password"
                                value={form.currentPassword}
                                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                                required
                            />
                            <TextField
                                label="New Password"
                                type="password"
                                value={form.newPassword}
                                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                                required
                                helperText="Minimum 8 characters"
                            />
                            <TextField
                                label="Confirm New Password"
                                type="password"
                                value={form.confirmPassword}
                                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                required
                            />
                            <Button type="submit" variant="contained" size="large" disabled={loading}>
                                {loading ? "Saving..." : "Change Password"}
                            </Button>
                        </Stack>
                    </Box>

                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
                </CardContent>
            </Card>
        </Container>
    );
}