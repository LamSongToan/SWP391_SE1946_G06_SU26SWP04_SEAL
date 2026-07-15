import { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import { http } from "../../api/http";
import { brand } from "../../styles/designTokens";
import ModulePageHeader from "../layout/ModulePageHeader";

function isEndedEvent(event) {
  const normalizedStatus = String(event?.status || "").trim().toUpperCase();
  if (["ENDED", "COMPLETED", "CANCELLED", "FINISHED"].includes(normalizedStatus)) {
    return true;
  }
  if (!event?.competitionEndAt) {
    return false;
  }
  const endTime = new Date(event.competitionEndAt).getTime();
  return !Number.isNaN(endTime) && endTime <= Date.now();
}

function getInitials(name = "") {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  return (name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "MT").toUpperCase();
}

function AssignMentorDialog({ open, onClose, trackId, mentorOptions, onAssigned }) {
  const [mentorUserRoleId, setMentorUserRoleId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setMentorUserRoleId(null);
    setError("");
    onClose();
  };

  const onSubmit = async () => {
    if (!mentorUserRoleId) { setError("Please select a mentor."); return; }
    setLoading(true);
    setError("");
    try {
      const response = await http.post("/api/coordinator/track-mentors", {
        mentorUserRoleId,
        trackId,
      });
      onAssigned(response.data?.data);
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to assign mentor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Assign Mentor to Track</DialogTitle>
      <DialogContent>
        <Autocomplete
          sx={{ mt: 0.5 }}
          options={mentorOptions}
          getOptionLabel={(o) => `${o.mentorName} (${o.mentorEmail || ""})`}
          onChange={(_, v) => {
            setMentorUserRoleId(v?.mentorUserRoleId || null);
          }}
          renderInput={(params) => <TextField {...params} label="Select Mentor" required />}
        />
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={loading || !mentorUserRoleId}
          sx={{ bgcolor: brand.colors.orange, "&:hover": { bgcolor: brand.colors.orangeDark } }}>
          {loading ? <CircularProgress size={18} color="inherit" /> : "Assign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TrackMentorCard({ track, mentorPool, eventMentorAssignments, onAssignmentsChanged }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    http.get(`/api/tracks/${track.trackId}/mentors`)
      .then((r) => {
        if (!mounted) {
          return;
        }
        const nextAssignments = r.data?.data || [];
        setAssignments(nextAssignments);
        onAssignmentsChanged(track.trackId, nextAssignments);
      })
      .catch(() => { if (mounted) setError("Failed to load mentors"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => {
      mounted = false;
      onAssignmentsChanged(track.trackId, []);
    };
  }, [onAssignmentsChanged, track.trackId]);

  const handleAssigned = (assignment) => {
    setAssignments((prev) => {
      const nextAssignments = [...prev, assignment];
      onAssignmentsChanged(track.trackId, nextAssignments);
      return nextAssignments;
    });
  };

  const handleRemove = async (trackMentorId) => {
    setRemoving(trackMentorId);
    setError("");
    try {
      await http.delete(`/api/coordinator/track-mentors/${trackMentorId}`);
      setAssignments((prev) => {
        const nextAssignments = prev.filter((a) => a.trackMentorId !== trackMentorId);
        onAssignmentsChanged(track.trackId, nextAssignments);
        return nextAssignments;
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove mentor");
    } finally {
      setRemoving(null);
    }
  };

  const assignedMentorTrackById = new Map();
  eventMentorAssignments.forEach((assignment) => {
    if (!assignedMentorTrackById.has(assignment.mentorUserRoleId)) {
      assignedMentorTrackById.set(assignment.mentorUserRoleId, assignment.trackId);
    }
  });

  const availableMentors = mentorPool.filter((mentor) => {
    if (assignments.some((assignment) => assignment.mentorUserRoleId === mentor.mentorUserRoleId)) {
      return false;
    }
    const assignedTrackId = assignedMentorTrackById.get(mentor.mentorUserRoleId);
    return !assignedTrackId || assignedTrackId === track.trackId;
  });
  const assignLocked = Boolean(track.mentorAssignmentLocked);
  const assignmentHint = track.mentorAssignmentLockReason || "";
  const canAssign = !assignLocked && availableMentors.length > 0;
  const mentorCapacityHint = !assignLocked && mentorPool.length > 0 && availableMentors.length === 0
    ? "Every available mentor is already assigned to another track in this event. A mentor can only mentor one track per event."
    : "";

  return (
    <Box sx={{ borderRadius: brand.radius.lg, border: `1px solid ${brand.colors.line}`, bgcolor: brand.colors.surface, overflow: "hidden" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.2, py: 1.6 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "#EFF6FF", display: "grid", placeItems: "center", color: "#3B82F6", flex: "0 0 36px" }}>
            <PsychologyRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>{track.name}</Typography>
            <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
              Track ID {track.trackId}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={`${assignments.length} mentor${assignments.length !== 1 ? "s" : ""}`}
            sx={{ bgcolor: "#EFF6FF", color: "#3B82F6", fontWeight: 900 }} />
          <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />}
            onClick={() => setAssignOpen(true)}
            disabled={!canAssign}
            sx={{ borderRadius: 999, borderColor: brand.colors.line, color: brand.colors.text, "&:hover": { borderColor: brand.colors.orange, color: brand.colors.orange } }}>
            Assign
          </Button>
        </Stack>
      </Stack>

      <Divider />
      <Box sx={{ p: 2 }}>
        {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
        {assignmentHint ? (
          <Alert severity={assignLocked ? "warning" : "info"} sx={{ mb: 1.5 }}>
            {assignmentHint}
          </Alert>
        ) : null}
        {mentorCapacityHint ? (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            {mentorCapacityHint}
          </Alert>
        ) : null}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={22} sx={{ color: brand.colors.orange }} />
          </Box>
        ) : assignments.length === 0 ? (
          <Typography sx={{ color: brand.colors.muted, fontSize: 14, textAlign: "center", py: 1.5 }}>
            No mentors assigned to this track yet.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {assignments.map((a) => (
              <Stack key={a.trackMentorId} direction="row" justifyContent="space-between" alignItems="center"
                sx={{ px: 1.6, py: 1, borderRadius: brand.radius.md, border: `1px solid ${brand.colors.line}`, bgcolor: brand.colors.surfaceSoft }}>
                <Stack direction="row" spacing={1.2} alignItems="center" minWidth={0}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "#3B82F6", fontSize: 11, fontWeight: 900 }}>
                    {getInitials(a.mentorName)}
                  </Avatar>
                  <Box minWidth={0}>
                    <Typography sx={{ color: brand.colors.text, fontWeight: 800, fontSize: 14 }} noWrap>{a.mentorName}</Typography>
                    <Typography sx={{ color: brand.colors.muted, fontSize: 12 }} noWrap>
                      {a.mentorEmail}
                      {a.specialization ? ` Â· ${a.specialization}` : ""}
                    </Typography>
                  </Box>
                </Stack>
                <Tooltip title="Remove assignment">
                  <IconButton size="small" onClick={() => handleRemove(a.trackMentorId)}
                    disabled={removing === a.trackMentorId}
                    sx={{ color: "error.main", "&:hover": { bgcolor: "#FFF1F0" } }}>
                    {removing === a.trackMentorId
                      ? <CircularProgress size={16} color="inherit" />
                      : <DeleteOutlineRoundedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      <AssignMentorDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        trackId={track.trackId}
        mentorOptions={availableMentors}
        onAssigned={handleAssigned}
      />
    </Box>
  );
}

export default function MentorAssignmentPanel() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [mentorPool, setMentorPool] = useState([]);
  const [assignmentsByTrack, setAssignmentsByTrack] = useState({});
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      http.get("/api/coordinator/events"),
      http.get("/api/coordinator/users/mentors"),
    ]).then(([eventsResult, mentorsResult]) => {
      if (!mounted) return;
      if (eventsResult.status === "fulfilled") {
        const evList = (eventsResult.value.data?.data || []).filter((event) => !isEndedEvent(event));
        setEvents(evList);
        if (evList.length > 0) setSelectedEventId(evList[0].eventId);
      }
      if (mentorsResult.status === "fulfilled") {
        const pool = mentorsResult.value.data?.data || [];
        setMentorPool(pool);
      }
      setLoadingEvents(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    let mounted = true;
    setLoadingTracks(true);
    setError("");
    setAssignmentsByTrack({});
    http.get(`/api/coordinator/events/${selectedEventId}/tracks`)
      .then((r) => { if (mounted) setTracks(r.data?.data || []); })
      .catch(() => { if (mounted) setError("Failed to load tracks"); })
      .finally(() => { if (mounted) setLoadingTracks(false); });
    return () => { mounted = false; };
  }, [selectedEventId]);

  const handleAssignmentsChanged = useCallback((trackId, nextAssignments) => {
    setAssignmentsByTrack((current) => ({
      ...current,
      [trackId]: nextAssignments,
    }));
  }, []);

  const eventMentorAssignments = Object.values(assignmentsByTrack).flat();

  return (
    <Box>
      <ModulePageHeader
        eyebrow="Event Setup"
        title="Mentor Assignment"
        description="Assign mentors to tracks for events that have not ended. Past event assignments are read-only history."
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loadingEvents ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: brand.colors.orange }} />
        </Box>
      ) : events.length === 0 ? (
        <Box className="ms-empty">
          <Typography fontWeight={800}>No active events available</Typography>
          <Typography color="text.secondary" variant="body2">Mentor assignments are closed after an event ends.</Typography>
        </Box>
      ) : (
        <>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
            {events.map((event) => (
              <Chip key={event.eventId}
                label={event.name}
                onClick={() => setSelectedEventId(event.eventId)}
                sx={{
                  cursor: "pointer",
                  fontWeight: 900,
                  bgcolor: selectedEventId === event.eventId ? brand.colors.navy : brand.colors.surfaceSoft,
                  color: selectedEventId === event.eventId ? "#fff" : brand.colors.text,
                  "&:hover": { bgcolor: selectedEventId === event.eventId ? brand.colors.navy : brand.colors.surfaceWarm },
                }}
              />
            ))}
          </Stack>

          {loadingTracks ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress sx={{ color: brand.colors.orange }} />
            </Box>
          ) : tracks.length === 0 ? (
            <Box className="ms-empty">
              <Typography fontWeight={800}>No tracks for this event</Typography>
              <Typography color="text.secondary" variant="body2">Add tracks to this event before assigning mentors.</Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {tracks.map((track) => (
                <TrackMentorCard
                  key={track.trackId}
                  track={track}
                  mentorPool={mentorPool}
                  eventMentorAssignments={eventMentorAssignments}
                  onAssignmentsChanged={handleAssignmentsChanged}
                />
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
