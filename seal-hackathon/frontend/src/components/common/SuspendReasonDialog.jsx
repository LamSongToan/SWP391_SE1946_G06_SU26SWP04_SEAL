import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { brand } from "../../styles/designTokens";

export default function SuspendReasonDialog({
  open,
  user = null,
  loading = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  const handleConfirm = () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;
    onConfirm(trimmedReason);
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={1.6}>
          <Box>
            <Typography sx={{ color: brand.colors.text, fontSize: 20, fontWeight: 900 }}>
              Suspend account
            </Typography>
            <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.6 }}>
              Enter a clear reason before suspending this account.
            </Typography>
          </Box>

          {user ? (
            <Box sx={{ p: 1.5, borderRadius: brand.radius.md, bgcolor: "#F8FAFC", border: `1px solid ${brand.colors.line}` }}>
              <Typography sx={{ color: brand.colors.text, fontWeight: 800 }}>
                {user.fullName || user.username}
              </Typography>
              <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                {user.email || `@${user.username}`}
              </Typography>
            </Box>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label="Suspend reason"
            placeholder="Example: Suspended due to policy violation or suspicious activity."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            fullWidth
            multiline
            minRows={5}
            maxRows={8}
            required
            inputProps={{ maxLength: 1000 }}
            helperText={`${reason.length}/1000 characters`}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          disabled={loading || !reason.trim()}
          onClick={handleConfirm}
        >
          {loading ? "Processing..." : "Suspend"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
