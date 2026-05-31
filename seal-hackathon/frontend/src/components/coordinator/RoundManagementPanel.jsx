import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { getApiErrorMessage, http } from "../../api/http";

const EMPTY_FORM = {
  roundName: "",
  roundOrder: 1,
  submissionDeadline: "",
  promotionRuleTopN: 1,
};

function toDateTimeInput(raw) {
  if (!raw) return "";
  return raw.length >= 16 ? raw.slice(0, 16) : raw;
}

function formatDateTime(raw) {
  if (!raw) return "N/A";
  return new Date(raw).toLocaleString("en-GB");
}

export default function RoundManagementPanel() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState({ open: false, mode: "create", roundId: null });
  const [form, setForm] = useState(EMPTY_FORM);

  const selectedEvent = useMemo(
    () => events.find((event) => String(event.eventId) === String(selectedEventId)) || null,
    [events, selectedEventId]
  );

  const fetchEvents = async () => {
    const response = await http.get("/api/coordinator/events");
    const data = response.data?.data || [];
    setEvents(data);
    if (data.length > 0 && !selectedEventId) {
      setSelectedEventId(String(data[0].eventId));
    }
    if (data.length === 0) {
      setSelectedEventId("");
      setRounds([]);
    }
  };

  const fetchRounds = async (eventId) => {
    if (!eventId) {
      setRounds([]);
      return;
    }
    const response = await http.get(`/api/coordinator/events/${eventId}/rounds`);
    setRounds(response.data?.data || []);
  };

  const bootstrap = async () => {
    setLoading(true);
    setError("");
    try {
      await fetchEvents();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load events"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    const loadRounds = async () => {
      if (!selectedEventId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        await fetchRounds(selectedEventId);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load rounds"));
      } finally {
        setLoading(false);
      }
    };
    loadRounds();
  }, [selectedEventId]);

  const onChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const openCreate = () => {
    setDialog({ open: true, mode: "create", roundId: null });
    setForm(EMPTY_FORM);
  };

  const openEdit = (round) => {
    setDialog({ open: true, mode: "edit", roundId: round.roundId });
    setForm({
      roundName: round.roundName || "",
      roundOrder: round.roundOrder || 1,
      submissionDeadline: toDateTimeInput(round.submissionDeadline),
      promotionRuleTopN: round.promotionRuleTopN || 1,
    });
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog({ open: false, mode: "create", roundId: null });
    setForm(EMPTY_FORM);
  };

  const onSubmit = async () => {
    if (!selectedEventId) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        roundOrder: Number(form.roundOrder),
        promotionRuleTopN: Number(form.promotionRuleTopN),
        submissionDeadline: form.submissionDeadline ? `${form.submissionDeadline}:00` : "",
      };

      if (dialog.mode === "create") {
        await http.post(`/api/coordinator/events/${selectedEventId}/rounds`, payload);
      } else {
        await http.put(`/api/coordinator/rounds/${dialog.roundId}`, payload);
      }

      closeDialog();
      await fetchRounds(selectedEventId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save round"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (roundId) => {
    const yes = window.confirm("Delete this round?");
    if (!yes) return;
    setError("");
    try {
      await http.delete(`/api/coordinator/rounds/${roundId}`);
      await fetchRounds(selectedEventId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete round"));
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6">Round Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure rounds, deadlines and promotion rules in each event.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={bootstrap} disabled={loading}>Refresh</Button>
          <Button variant="contained" onClick={openCreate} disabled={!selectedEventId}>Create Round</Button>
        </Stack>
      </Stack>

      <Card sx={{ p: 2, mb: 2 }}>
        <TextField
          select
          label="Event"
          value={selectedEventId}
          onChange={(event) => setSelectedEventId(event.target.value)}
          fullWidth
          disabled={events.length === 0}
        >
          {events.map((event) => (
            <MenuItem key={event.eventId} value={String(event.eventId)}>
              {event.name} ({event.season} {event.year})
            </MenuItem>
          ))}
        </TextField>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
      ) : !selectedEvent ? (
        <Card sx={{ p: 3 }}>
          <Typography color="text.secondary">No event available. Create event first.</Typography>
        </Card>
      ) : rounds.length === 0 ? (
        <Card sx={{ p: 3 }}>
          <Typography color="text.secondary">No rounds in this event.</Typography>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Round Name</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Submission Deadline</TableCell>
                <TableCell>Top N</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rounds.map((round) => (
                <TableRow key={round.roundId} hover>
                  <TableCell>{round.roundName}</TableCell>
                  <TableCell>{round.roundOrder}</TableCell>
                  <TableCell>{formatDateTime(round.submissionDeadline)}</TableCell>
                  <TableCell>{round.promotionRuleTopN}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => openEdit(round)}>Edit</Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => onDelete(round.roundId)}>
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.mode === "create" ? "Create Round" : "Edit Round"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField label="Round Name" value={form.roundName} onChange={onChange("roundName")} fullWidth />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Round Order"
                type="number"
                value={form.roundOrder}
                onChange={onChange("roundOrder")}
                fullWidth
              />
              <TextField
                label="Promotion Rule Top N"
                type="number"
                value={form.promotionRuleTopN}
                onChange={onChange("promotionRuleTopN")}
                fullWidth
              />
            </Stack>
            <TextField
              label="Submission Deadline"
              type="datetime-local"
              value={form.submissionDeadline}
              onChange={onChange("submissionDeadline")}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={onSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
