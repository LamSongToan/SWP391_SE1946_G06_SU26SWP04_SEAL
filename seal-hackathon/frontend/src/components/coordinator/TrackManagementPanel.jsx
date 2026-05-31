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

export default function TrackManagementPanel() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState({ open: false, mode: "create", trackId: null });
  const [trackName, setTrackName] = useState("");

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
      setTracks([]);
    }
  };

  const fetchTracks = async (eventId) => {
    if (!eventId) {
      setTracks([]);
      return;
    }
    const response = await http.get(`/api/coordinator/events/${eventId}/tracks`);
    setTracks(response.data?.data || []);
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
    const loadTracks = async () => {
      if (!selectedEventId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        await fetchTracks(selectedEventId);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load tracks"));
      } finally {
        setLoading(false);
      }
    };
    loadTracks();
  }, [selectedEventId]);

  const openCreate = () => {
    setDialog({ open: true, mode: "create", trackId: null });
    setTrackName("");
  };

  const openEdit = (track) => {
    setDialog({ open: true, mode: "edit", trackId: track.trackId });
    setTrackName(track.name || "");
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog({ open: false, mode: "create", trackId: null });
    setTrackName("");
  };

  const onSubmit = async () => {
    if (!selectedEventId) return;
    setSaving(true);
    setError("");
    try {
      if (dialog.mode === "create") {
        await http.post(`/api/coordinator/events/${selectedEventId}/tracks`, { name: trackName });
      } else {
        await http.put(`/api/coordinator/tracks/${dialog.trackId}`, { name: trackName });
      }
      closeDialog();
      await fetchTracks(selectedEventId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save track"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (trackId) => {
    const yes = window.confirm("Delete this track?");
    if (!yes) return;
    setError("");
    try {
      await http.delete(`/api/coordinator/tracks/${trackId}`);
      await fetchTracks(selectedEventId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete track"));
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6">Category / Track Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Create technical categories within each event.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={bootstrap} disabled={loading}>Refresh</Button>
          <Button variant="contained" onClick={openCreate} disabled={!selectedEventId}>Create Track</Button>
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
      ) : tracks.length === 0 ? (
        <Card sx={{ p: 3 }}>
          <Typography color="text.secondary">No tracks in this event.</Typography>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Track Name</TableCell>
                <TableCell>Event</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tracks.map((track) => (
                <TableRow key={track.trackId} hover>
                  <TableCell>{track.name}</TableCell>
                  <TableCell>{selectedEvent.name}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => openEdit(track)}>Edit</Button>
                      <Button size="small" color="error" variant="outlined" onClick={() => onDelete(track.trackId)}>
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

      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{dialog.mode === "create" ? "Create Track" : "Edit Track"}</DialogTitle>
        <DialogContent>
          <TextField
            sx={{ mt: 1 }}
            label="Track Name"
            value={trackName}
            onChange={(event) => setTrackName(event.target.value)}
            fullWidth
          />
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
