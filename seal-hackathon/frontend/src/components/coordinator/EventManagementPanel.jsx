import { useEffect, useState } from "react";
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
  name: "",
  semester: "Summer",
  year: new Date().getFullYear(),
  startDate: "",
  endDate: "",
  status: "Draft",
  description: "",
};

const EVENT_STATUS_OPTIONS = [
  "Draft",
  "Ongoing",
  "Ended",
];

function toDateRange(startDate, endDate) {
  const format = (raw) => (raw ? new Date(raw).toLocaleDateString("en-GB") : "N/A");
  return `${format(startDate)} - ${format(endDate)}`;
}

export default function EventManagementPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState({ open: false, mode: "create", eventId: null });
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await http.get("/api/coordinator/events");
      setEvents(response.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load events"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openCreate = () => {
    setDialog({ open: true, mode: "create", eventId: null });
    setForm(EMPTY_FORM);
    setError("");
  };

  const openEdit = (event) => {
    setDialog({ open: true, mode: "edit", eventId: event.eventId });
    setForm({
      name: event.name || "",
      semester: event.semester || "",
      year: event.year || new Date().getFullYear(),
      startDate: event.startDate || "",
      endDate: event.endDate || "",
      status: event.status || "",
      description: event.description || "",
    });
    setError("");
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog({ open: false, mode: "create", eventId: null });
    setForm(EMPTY_FORM);
  };

  const onChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const onSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      if (dialog.mode === "create") {
        await http.post("/api/coordinator/events", form);
      } else {
        await http.put(`/api/coordinator/events/${dialog.eventId}`, form);
      }
      closeDialog();
      fetchEvents();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save event"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (eventId) => {
    const yes = window.confirm("Delete this event? Related tracks and rounds will also be removed.");
    if (!yes) return;
    setError("");
    try {
      await http.delete(`/api/coordinator/events/${eventId}`);
      fetchEvents();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete event"));
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6">Event Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Create and maintain hackathon events for each semester.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={fetchEvents} disabled={loading}>Refresh</Button>
          <Button variant="contained" onClick={openCreate}>Create Event</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress /></Box>
      ) : events.length === 0 ? (
        <Card sx={{ p: 3 }}>
          <Typography color="text.secondary">No events found.</Typography>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Semester</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Date Range</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.eventId} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{event.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {event.description || "No description"}
                    </Typography>
                  </TableCell>
                  <TableCell>{event.semester}</TableCell>
                  <TableCell>{event.year}</TableCell>
                  <TableCell>{toDateRange(event.startDate, event.endDate)}</TableCell>
                  <TableCell>{event.status}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => openEdit(event)}>Edit</Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => onDelete(event.eventId)}>
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
        <DialogTitle>{dialog.mode === "create" ? "Create Event" : "Edit Event"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField label="Name" value={form.name} onChange={onChange("name")} fullWidth />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField select label="Semester" value={form.semester} onChange={onChange("semester")} fullWidth>
                <MenuItem value="Spring">Spring</MenuItem>
                <MenuItem value="Summer">Summer</MenuItem>
                <MenuItem value="Fall">Fall</MenuItem>
              </TextField>
              <TextField
                label="Year"
                type="number"
                value={form.year}
                onChange={onChange("year")}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={onChange("startDate")}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Date"
                type="date"
                value={form.endDate}
                onChange={onChange("endDate")}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              select
              label="Status"
              value={form.status}
              onChange={onChange("status")}
              fullWidth
              disabled={dialog.mode === "create"}
              helperText={dialog.mode === "create" ? "New events always start as Draft." : ""}
            >
              {EVENT_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={form.description}
              onChange={onChange("description")}
              fullWidth
              multiline
              rows={3}
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
