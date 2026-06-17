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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import { http } from "../../api/http";
import ModulePageHeader from "../layout/ModulePageHeader";
import { brand } from "../../styles/designTokens";

function getInitials(name = "") {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  return (name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "JG").toUpperCase();
}

function AssignJudgeDialog({ open, onClose, roundId, trackOptions, judgeOptions, onAssigned }) {
  const [judgeUserRoleId, setJudgeUserRoleId] = useState(null);
  const [trackId, setTrackId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setJudgeUserRoleId(null);
    setTrackId(null);
    setError("");
    onClose();
  };

  const onSubmit = async () => {
    if (!judgeUserRoleId || !trackId) {
      setError("Please select both a judge and a track.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await http.post(`/api/coordinator/rounds/${roundId}/judges`, {
        judgeUserRoleId,
        trackId,
      });
      onAssigned(response.data?.data);
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to assign judge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Assign Judge to Round</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Autocomplete
            options={judgeOptions}
            getOptionLabel={(o) => `${o.judgeName} (${o.judgeEmail || o.judgeType || "JUDGE"})`}
            renderOption={(props, o) => (
              <Box component="li" {...props}>
                <Stack direction="row" spacing={1} alignItems="center" width="100%">
                  <Avatar sx={{ width: 28, height: 28, bgcolor: brand.colors.orange, fontSize: 10, fontWeight: 900 }}>
                    {getInitials(o.judgeName)}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography fontSize={14} fontWeight={700} noWrap>{o.judgeName}</Typography>
                    <Typography fontSize={12} color="text.secondary" noWrap>{o.judgeEmail}</Typography>
                  </Box>
                  {o.judgeType ? <Chip size="small" label={o.judgeType} sx={{ fontSize: 11, height: 18 }} /> : null}
                </Stack>
              </Box>
            )}
            onChange={(_, v) => setJudgeUserRoleId(v?.judgeUserRoleId || null)}
            renderInput={(params) => <TextField {...params} label="Select Judge" required />}
          />
          <Autocomplete
            options={trackOptions}
            getOptionLabel={(o) => o.name}
            onChange={(_, v) => setTrackId(v?.trackId || null)}
            renderInput={(params) => <TextField {...params} label="Select Track" required />}
          />
        </Stack>
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={loading || !judgeUserRoleId || !trackId}
          sx={{ bgcolor: brand.colors.orange, "&:hover": { bgcolor: brand.colors.orangeDark } }}>
          {loading ? <CircularProgress size={18} color="inherit" /> : "Assign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RoundJudgeCard({ round, eventTracks, allJudges }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    http.get(`/api/coordinator/rounds/${round.roundId}/judges`)
      .then((r) => { if (mounted) setAssignments(r.data?.data || []); })
      .catch(() => { if (mounted) setError("Failed to load assignments"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [round.roundId]);

  const handleAssigned = (assignment) => {
    setAssignments((prev) => [...prev, assignment]);
  };

  const handleRemove = async (assignmentId) => {
    setRemoving(assignmentId);
    setError("");
    try {
      await http.delete(`/api/coordinator/judge-assignments/${assignmentId}`);
      setAssignments((prev) => prev.filter((a) => a.judgeAssignmentId !== assignmentId));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove assignment");
    } finally {
      setRemoving(null);
    }
  };

  const formatDeadline = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  };

  return (
    <Box sx={{ borderRadius: brand.radius.lg, border: `1px solid ${brand.colors.line}`, bgcolor: brand.colors.surface, overflow: "hidden" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center"
        onClick={() => setExpanded((v) => !v)}
        sx={{ px: 2.2, py: 1.6, cursor: "pointer", "&:hover": { bgcolor: brand.colors.surfaceSoft }, transition: "background 160ms" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: brand.colors.surfaceWarm, display: "grid", placeItems: "center", color: brand.colors.orange, flex: "0 0 36px" }}>
            <GavelRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>{round.roundName}</Typography>
            <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
              Order {round.roundOrder} · Deadline {formatDeadline(round.submissionDeadline)}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={`${assignments.length} judge${assignments.length !== 1 ? "s" : ""}`}
            sx={{ bgcolor: brand.colors.surfaceWarm, color: brand.colors.orange, fontWeight: 900 }} />
          <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />}
            onClick={(e) => { e.stopPropagation(); setAssignOpen(true); }}
            sx={{ borderRadius: 999, borderColor: brand.colors.line, color: brand.colors.text, "&:hover": { borderColor: brand.colors.orange, color: brand.colors.orange } }}>
            Assign
          </Button>
          <IconButton size="small" sx={{ color: brand.colors.muted }}>
            {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
          </IconButton>
        </Stack>
      </Stack>

      {expanded ? (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} sx={{ color: brand.colors.orange }} />
              </Box>
            ) : assignments.length === 0 ? (
              <Typography sx={{ color: brand.colors.muted, fontSize: 14, textAlign: "center", py: 2 }}>
                No judges assigned to this round yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {assignments.map((a) => {
                  const isSuspended = a.judgeStatus?.toUpperCase() === "SUSPENDED";
                  return (
                    <Stack key={a.judgeAssignmentId} direction="row" justifyContent="space-between" alignItems="center"
                      sx={{
                        px: 1.6, py: 1.1, borderRadius: brand.radius.md,
                        border: `1px solid ${isSuspended ? "#fecaca" : brand.colors.line}`,
                        bgcolor: isSuspended ? "#fff5f5" : brand.colors.surfaceSoft,
                        opacity: isSuspended ? 0.75 : 1,
                      }}>
                      <Stack direction="row" spacing={1.2} alignItems="center" minWidth={0}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: isSuspended ? brand.colors.muted : brand.colors.orange, fontSize: 11, fontWeight: 900 }}>
                          {getInitials(a.judgeName)}
                        </Avatar>
                        <Box minWidth={0}>
                          <Stack direction="row" spacing={0.8} alignItems="center">
                            <Typography sx={{ color: brand.colors.text, fontWeight: 800, fontSize: 14 }} noWrap>{a.judgeName}</Typography>
                            {isSuspended && <Chip size="small" label="Suspended" color="error" sx={{ height: 18, fontSize: 11 }} />}
                          </Stack>
                          <Stack direction="row" spacing={0.8} alignItems="center">
                            <Typography sx={{ color: brand.colors.muted, fontSize: 12 }} noWrap>{a.judgeEmail}</Typography>
                            {a.trackName ? <Chip size="small" label={a.trackName} sx={{ height: 18, fontSize: 11, bgcolor: brand.colors.surface }} /> : null}
                            {a.judgeType ? <Chip size="small" label={a.judgeType} sx={{ height: 18, fontSize: 11 }} /> : null}
                          </Stack>
                        </Box>
                      </Stack>
                      <Tooltip title="Remove assignment">
                        <IconButton size="small" onClick={() => handleRemove(a.judgeAssignmentId)}
                          disabled={removing === a.judgeAssignmentId}
                          sx={{ color: "error.main", "&:hover": { bgcolor: "#FFF1F0" } }}>
                          {removing === a.judgeAssignmentId
                            ? <CircularProgress size={16} color="inherit" />
                            : <DeleteOutlineRoundedIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Box>
        </>
      ) : null}

      <AssignJudgeDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        roundId={round.roundId}
        trackOptions={eventTracks}
        judgeOptions={allJudges}
        onAssigned={handleAssigned}
      />
    </Box>
  );
}

export default function JudgeAssignmentPanel() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [allJudges, setAllJudges] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      http.get("/api/coordinator/events"),
      http.get("/api/coordinator/judges"),
    ]).then(([eventsResult, judgesResult]) => {
      if (!mounted) return;
      if (eventsResult.status === "fulfilled") {
        const evList = eventsResult.value.data?.data || [];
        setEvents(evList);
        if (evList.length > 0) setSelectedEventId(evList[0].eventId);
      }
      if (judgesResult.status === "fulfilled") {
        // Transform GuestJudgeDto into a shape compatible with AssignJudgeRequest
        const rawJudges = judgesResult.value.data?.data || [];
        setAllJudges(rawJudges
          .filter((j) => j.status?.toUpperCase() !== "SUSPENDED")

          .map((j) => ({
            judgeUserRoleId: j.judgeUserRoleId,
            judgeName: j.fullName,
            judgeEmail: j.email,
            judgeType: j.judgeType,
          }))
        );
      }
      setLoadingEvents(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    let mounted = true;
    setLoadingRounds(true);
    setError("");
    Promise.allSettled([
      http.get(`/api/coordinator/events/${selectedEventId}/rounds`),
      http.get(`/api/coordinator/events/${selectedEventId}/tracks`),
    ]).then(([roundsResult, tracksResult]) => {
      if (!mounted) return;
      if (roundsResult.status === "fulfilled") setRounds(roundsResult.value.data?.data || []);
      else setError("Failed to load rounds");
      if (tracksResult.status === "fulfilled") setTracks(tracksResult.value.data?.data || []);
      setLoadingRounds(false);
    });
    return () => { mounted = false; };
  }, [selectedEventId]);
  return (
    <Box>
      <ModulePageHeader
        eyebrow="Event Setup"
        title="Judge Assignment"
        description="Assign judges to rounds and tracks for scoring."
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loadingEvents ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: brand.colors.orange }} />
        </Box>
      ) : events.length === 0 ? (
        <Box className="ms-empty">
          <Typography fontWeight={800}>No events configured</Typography>
          <Typography color="text.secondary" variant="body2">Create an event first before assigning judges.</Typography>
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

          {loadingRounds ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress sx={{ color: brand.colors.orange }} />
            </Box>
          ) : rounds.length === 0 ? (
            <Box className="ms-empty">
              <Typography fontWeight={800}>No rounds for this event</Typography>
              <Typography color="text.secondary" variant="body2">Add rounds to this event before assigning judges.</Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {rounds
                .slice()
                .sort((a, b) => a.roundOrder - b.roundOrder)
                .map((round) => (
                  <RoundJudgeCard
                    key={round.roundId}
                    round={round}
                    eventTracks={tracks}
                    allJudges={allJudges}
                  />
                ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
