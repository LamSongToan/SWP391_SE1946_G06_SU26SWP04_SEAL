import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid2,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { http } from "../../api/http";

const EMPTY_FORM = {
  fullName: "",
  studentType: "",
  studentCode: "",
  universityName: "",
};

export default function UserProfilePanel() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isStudent = useMemo(() => profile?.roles?.includes("STUDENT"), [profile]);
  const isExternalStudent = form.studentType === "EXTERNAL";

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await http.get("/api/users/me");
      const data = response.data?.data;
      setProfile(data);
      setForm({
        fullName: data?.fullName || "",
        studentType: data?.studentType || "",
        studentCode: data?.studentCode || "",
        universityName: data?.universityName || "",
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const onChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        fullName: form.fullName,
        studentType: isStudent ? form.studentType || null : null,
        studentCode: isStudent ? form.studentCode || null : null,
        universityName: isStudent ? form.universityName || null : null,
      };
      const response = await http.put("/api/users/me", payload);
      const updated = response.data?.data;
      setProfile(updated);
      setForm({
        fullName: updated?.fullName || "",
        studentType: updated?.studentType || "",
        studentCode: updated?.studentCode || "",
        universityName: updated?.universityName || "",
      });
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 0.5 }}>Profile Information</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage account profile used across SEAL Hackathon modules.
          </Typography>

          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Username"
                value={profile?.username || ""}
                fullWidth
                disabled
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Email"
                value={profile?.email || ""}
                fullWidth
                disabled
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Full Name"
                value={form.fullName}
                onChange={onChange("fullName")}
                fullWidth
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Status"
                value={profile?.status || ""}
                fullWidth
                disabled
              />
            </Grid2>

            {isStudent ? (
              <>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label="Student Type"
                    value={form.studentType}
                    onChange={onChange("studentType")}
                    fullWidth
                  >
                    <MenuItem value="FPT">FPT</MenuItem>
                    <MenuItem value="EXTERNAL">EXTERNAL</MenuItem>
                  </TextField>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Student Code"
                    value={form.studentCode}
                    onChange={onChange("studentCode")}
                    fullWidth
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="University"
                    value={form.universityName}
                    onChange={onChange("universityName")}
                    fullWidth
                    disabled={!isExternalStudent}
                  />
                </Grid2>
              </>
            ) : null}
          </Grid2>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Button>
            <Button variant="outlined" onClick={loadProfile} disabled={saving}>
              Refresh
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Account Roles</Typography>
          <Stack direction="row" spacing={0.8} flexWrap="wrap">
            {(profile?.roles || []).map((role) => (
              <Chip key={role} label={role} size="small" />
            ))}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Created At: {profile?.createdAt ? new Date(profile.createdAt).toLocaleString("en-GB") : "N/A"}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
