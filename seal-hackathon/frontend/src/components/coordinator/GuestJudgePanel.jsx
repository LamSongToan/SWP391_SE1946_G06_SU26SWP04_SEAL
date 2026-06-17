import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import PersonOffRoundedIcon from "@mui/icons-material/PersonOffRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { http } from "../../api/http";
import ModulePageHeader from "../layout/ModulePageHeader";
import HighlightPill from "../layout/HighlightPill";
import { brand } from "../../styles/designTokens";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

function validateCreate(form) {
  const errors = {};
  if (!form.username.trim()) errors.username = "Username is required";
  else if (form.username.trim().length < 4 || form.username.trim().length > 50)
    errors.username = "Username must be 4–50 characters";
  else if (!USERNAME_REGEX.test(form.username.trim()))
    errors.username = "Only letters, numbers, dot, underscore, hyphen";
  if (!form.fullName.trim()) errors.fullName = "Full name is required";
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = "Email is not valid";
  return errors;
}

function getInitials(name = "") {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  return (name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "JG").toUpperCase();
}

function CopyablePassword({ password }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Stack direction="row" alignItems="center" spacing={1}
      sx={{ bgcolor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2, px: 1.5, py: 1 }}>
      <Typography sx={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: "#166534", flex: 1, wordBreak: "break-all" }}>
        {password}
      </Typography>
      <Tooltip title={copied ? "Copied!" : "Copy password"}>
        <IconButton size="small" onClick={copy} sx={{ color: "#16a34a" }}>
          {copied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function CreateJudgeDialog({ open, onClose, onCreated }) {
  const EMPTY = { username: "", fullName: "", email: "", organization: "", department: "" };
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const setField = (key, value) => {
    const next = { ...form, [key]: value };
    const nextTouched = { ...touched, [key]: true };
    const nextErrors = validateCreate(next);
    setForm(next);
    setTouched(nextTouched);
    setErrors(Object.fromEntries(
      Object.entries(nextErrors).map(([k, v]) => [k, nextTouched[k] ? v : ""])
    ));
  };

  const handleClose = () => {
    setForm(EMPTY);
    setErrors({});
    setTouched({});
    setApiError("");
    onClose();
  };

  const onSubmit = async () => {
    const allTouched = { username: true, fullName: true, email: true };
    setTouched(allTouched);
    const nextErrors = validateCreate(form);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setLoading(true);
    setApiError("");
    try {
      const response = await http.post("/api/coordinator/judges", {
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        organization: form.organization.trim() || undefined,
        department: form.department.trim() || undefined,
      });
      onCreated(response.data?.data);
      handleClose();
    } catch (err) {
      setApiError(err?.response?.data?.message || "Failed to create judge account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Create Guest Judge Account</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2.5, fontSize: 14 }}>
          A temporary password will be generated automatically and shown once. The judge will be asked to change it on first login.
        </Typography>
        <Stack spacing={1.6}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.6}>
            <TextField fullWidth label="Full name" required value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              error={Boolean(errors.fullName)} helperText={errors.fullName || " "} />
            <TextField fullWidth label="Username" required value={form.username}
              onChange={(e) => setField("username", e.target.value)}
              error={Boolean(errors.username)} helperText={errors.username || " "} />
          </Stack>
          <TextField fullWidth label="Email" type="email" required value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            error={Boolean(errors.email)} helperText={errors.email || " "} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.6}>
            <TextField fullWidth label="Organization" value={form.organization}
              onChange={(e) => setField("organization", e.target.value)} helperText=" " />
            <TextField fullWidth label="Department" value={form.department}
              onChange={(e) => setField("department", e.target.value)} helperText=" " />
          </Stack>
        </Stack>
        {apiError ? <Alert severity="error" sx={{ mt: 1 }}>{apiError}</Alert> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={loading}
          sx={{ bgcolor: brand.colors.orange, "&:hover": { bgcolor: brand.colors.orangeDark } }}>
          {loading ? <CircularProgress size={18} color="inherit" /> : "Create Account"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PasswordRevealDialog({ judge, open, onClose }) {
  if (!judge) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Temporary Password</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2, fontSize: 14 }}>
          Share this temporary password with <strong>{judge.fullName}</strong> securely. It will not be shown again after closing.
        </Typography>
        <CopyablePassword password={judge.temporaryPassword} />
        <Alert severity="warning" sx={{ mt: 2 }}>
          Copy and send this password now. It cannot be retrieved later.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="contained" onClick={onClose}
          sx={{ bgcolor: brand.colors.orange, "&:hover": { bgcolor: brand.colors.orangeDark } }}>
          I've copied it
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ResetPasswordDialog({ judge, open, onClose, onReset }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await http.post(`/api/coordinator/judges/${judge.userId}/reset-password`);
      onReset(response.data?.data);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!judge) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Reset Password</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ fontSize: 14 }}>
          A new temporary password will be generated for <strong>{judge.fullName}</strong>. The current password will be invalidated immediately.
        </Typography>
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="warning" onClick={handleReset} disabled={loading}>
          {loading ? <CircularProgress size={18} color="inherit" /> : "Reset Password"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeactivateDialog({ judge, open, onClose, onDeactivated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDeactivate = async () => {
    setLoading(true);
    setError("");
    try {
      await http.post(`/api/coordinator/judges/${judge.userId}/deactivate`);
      onDeactivated(judge.userId);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Deactivation failed");
    } finally {
      setLoading(false);
    }
  };

  if (!judge) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Deactivate Account</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ fontSize: 14 }}>
          <strong>{judge.fullName}</strong>'s account will be deactivated. They will no longer be able to sign in or score submissions.
        </Typography>
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleDeactivate} disabled={loading}>
          {loading ? <CircularProgress size={18} color="inherit" /> : "Deactivate"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function GuestJudgePanel() {
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordReveal, setPasswordReveal] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await http.get("/api/coordinator/judges");
      const data = response.data?.data || [];
      console.log("judge statuses:", data.map(j => ({ name: j.fullName, status: j.status })));
      setJudges(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load judges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreated = (judge) => {
    setJudges((prev) => [judge, ...prev]);
    if (judge.temporaryPassword) setPasswordReveal(judge);
  };

  const handleReset = (judge) => {
    if (judge.temporaryPassword) setPasswordReveal(judge);
  };

  const handleDeactivated = (userId) => {
    setJudges((prev) => prev.map((j) =>
      j.userId === userId ? { ...j, status: "Suspended" } : j
    ));
  };

  const filtered = judges.filter((j) => {
    const q = search.toLowerCase();
    return !q || j.fullName?.toLowerCase().includes(q) || j.email?.toLowerCase().includes(q) || j.username?.toLowerCase().includes(q) || j.organization?.toLowerCase().includes(q);
  });

  const activeCount = judges.filter((j) => j.status?.toUpperCase() !== "SUSPENDED").length;

  return (
    <Box>
      <ModulePageHeader
        eyebrow="Judge Management"
        title="Guest Judge Accounts"
        description="Create and manage temporary judge accounts for scoring."
        actions={(
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <HighlightPill label={`${activeCount} active`} />
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}
              sx={{ bgcolor: brand.colors.orange, "&:hover": { bgcolor: brand.colors.orangeDark }, borderRadius: 999, whiteSpace: "nowrap" }}>
              New Judge
            </Button>
          </Stack>
        )}
      />

      <TextField
        fullWidth
        size="small"
        placeholder="Search by name, email, username, or organization…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: brand.colors.muted, fontSize: 20 }} /></InputAdornment>,
          sx: { borderRadius: 40, bgcolor: brand.colors.surfaceSoft },
        }}
        sx={{ mb: 2 }}
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: brand.colors.orange }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box className="ms-empty">
          <GavelRoundedIcon sx={{ fontSize: 40, color: brand.colors.muted, mb: 1 }} />
          <Typography fontWeight={800}>{search ? "No judges match your search" : "No guest judges yet"}</Typography>
          <Typography color="text.secondary" variant="body2">
            {search ? "Try a different search term." : "Create a guest judge account to get started."}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.2}>
          {filtered.map((judge) => {
            const isInactive = judge.status?.toUpperCase() === "SUSPENDED";
            return (
              <Box key={judge.userId}
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
                  gap: 1.5,
                  alignItems: "center",
                  p: 2,
                  borderRadius: brand.radius.lg,
                  border: `1px solid ${brand.colors.line}`,
                  bgcolor: isInactive ? brand.colors.surfaceSoft : brand.colors.surface,
                  opacity: isInactive ? 0.72 : 1,
                  transition: "box-shadow 160ms ease",
                  "&:hover": { boxShadow: brand.shadow.sm },
                }}
              >
                <Stack direction="row" spacing={1.6} alignItems="center" minWidth={0}>
                  <Avatar sx={{ width: 44, height: 44, bgcolor: isInactive ? brand.colors.muted : brand.colors.orange, fontSize: 13, fontWeight: 900, flex: "0 0 44px" }}>
                    {getInitials(judge.fullName)}
                  </Avatar>
                  <Box minWidth={0}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography sx={{ color: brand.colors.text, fontWeight: 900, fontSize: 15 }} noWrap>
                        {judge.fullName}
                      </Typography>
                      <Chip size="small"
                        label={isInactive ? "Inactive" : judge.judgeType || "JUDGE"}
                        color={isInactive ? "default" : "primary"}
                        sx={isInactive ? {} : { bgcolor: brand.colors.surfaceWarm, color: brand.colors.orange, fontWeight: 900 }}
                      />
                    </Stack>
                    <Typography sx={{ color: brand.colors.muted, fontSize: 13 }} noWrap>
                      @{judge.username} · {judge.email}
                    </Typography>
                    {judge.organization ? (
                      <Typography sx={{ color: brand.colors.muted, fontSize: 12 }} noWrap>
                        {judge.organization}{judge.department ? ` · ${judge.department}` : ""}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-start", md: "flex-end" }} flexWrap="wrap" useFlexGap>
                  <Tooltip title="Reset password">
                    <span>
                      <IconButton size="small" disabled={isInactive} onClick={() => setResetTarget(judge)}
                        sx={{ border: `1px solid ${brand.colors.line}`, "&:hover": { bgcolor: brand.colors.surfaceWarm } }}>
                        <LockResetRoundedIcon fontSize="small" sx={{ color: isInactive ? brand.colors.muted : brand.colors.orange }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={isInactive ? "Already suspended" : "Suspend account"}>
                    <span>
                      <IconButton size="small" disabled={isInactive} onClick={() => setDeactivateTarget(judge)}
                        sx={{ border: `1px solid ${brand.colors.line}`, "&:hover": { bgcolor: "#FFF1F0" } }}>
                        <PersonOffRoundedIcon fontSize="small" sx={{ color: isInactive ? brand.colors.muted : "error.main" }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      <CreateJudgeDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      <PasswordRevealDialog judge={passwordReveal} open={Boolean(passwordReveal)} onClose={() => setPasswordReveal(null)} />
      <ResetPasswordDialog judge={resetTarget} open={Boolean(resetTarget)} onClose={() => setResetTarget(null)} onReset={handleReset} />
      <DeactivateDialog judge={deactivateTarget} open={Boolean(deactivateTarget)} onClose={() => setDeactivateTarget(null)} onDeactivated={handleDeactivated} />
    </Box>
  );
}
