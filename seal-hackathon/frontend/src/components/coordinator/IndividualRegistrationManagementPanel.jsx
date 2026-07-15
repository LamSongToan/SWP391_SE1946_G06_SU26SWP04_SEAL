import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ModulePageHeader from "../layout/ModulePageHeader";
import { getApiErrorMessage, http } from "../../api/http";
import { brand } from "../../styles/designTokens";

const STATUS_PRESENTATION = {
  WAITING: { label: "Waiting", color: "warning", bg: "#FFF7ED" },
  COORDINATORREVIEW: { label: "Coordinator review", color: "warning", bg: "#FFFBEB" },
  TRACKCHANGEPENDING: { label: "Track change pending", color: "info", bg: "#EFF6FF" },
  MATCHED: { label: "Matched", color: "success", bg: "#ECFDF5" },
  UNSUCCESSFUL: { label: "Rejected / Unsuccessful", color: "error", bg: "#FEF2F2" },
};

function normalizeStatus(value) {
  return String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function statusPresentation(value) {
  const normalized = normalizeStatus(value);
  return STATUS_PRESENTATION[normalized] || {
    label: String(value || "Unknown").replaceAll("_", " "),
    color: "default",
    bg: "#F8FAFC",
  };
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(registration) {
  const source = String(registration.fullName || registration.username || "S").trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function isUnresolved(registration) {
  return ["WAITING", "COORDINATORREVIEW", "TRACKCHANGEPENDING"].includes(normalizeStatus(registration?.status));
}

export default function IndividualRegistrationManagementPanel() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [trackFilter, setTrackFilter] = useState("ALL");
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignTeamId, setAssignTeamId] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => String(event.eventId) === String(selectedEventId)) || null,
    [events, selectedEventId],
  );
  const eventIsOngoing = String(selectedEvent?.status || "").toUpperCase() === "ONGOING";
  const maxTeamSize = Number(dashboard?.maxTeamSize || 5);

  const loadEvents = async () => {
    const response = await http.get("/api/coordinator/events");
    const nextEvents = response.data?.data || [];
    setEvents(nextEvents);
    setSelectedEventId((current) => {
      if (nextEvents.some((event) => String(event.eventId) === String(current))) return current;
      const ongoing = nextEvents.find((event) => String(event.status || "").toUpperCase() === "ONGOING");
      return ongoing?.eventId ? String(ongoing.eventId) : (nextEvents[0]?.eventId ? String(nextEvents[0].eventId) : "");
    });
  };

  const loadRegistrations = async (eventId = selectedEventId) => {
    if (!eventId) {
      setDashboard(null);
      setRegistrations([]);
      return;
    }
    const dashboardResponse = await http.get(`/api/coordinator/events/${eventId}/team-formation`);
    const registrationsResponse = await http.get(
      `/api/coordinator/events/${eventId}/team-formation/individual-registrations`,
    );
    setDashboard(dashboardResponse.data?.data || null);
    setRegistrations(registrationsResponse.data?.data || []);
  };

  useEffect(() => {
    setLoading(true);
    loadEvents()
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load events")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    setError("");
    setSuccess("");
    setStatusFilter("ALL");
    setTrackFilter("ALL");
    loadRegistrations(selectedEventId)
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load individual registrations")))
      .finally(() => setLoading(false));
  }, [selectedEventId]);

  const summary = useMemo(() => registrations.reduce((result, registration) => {
    const status = normalizeStatus(registration.status);
    result.total += 1;
    if (["WAITING", "COORDINATORREVIEW", "TRACKCHANGEPENDING"].includes(status)) result.unresolved += 1;
    if (status === "MATCHED") result.matched += 1;
    if (status === "UNSUCCESSFUL") result.unsuccessful += 1;
    return result;
  }, { total: 0, unresolved: 0, matched: 0, unsuccessful: 0 }), [registrations]);

  const trackOptions = useMemo(() => {
    const tracks = new Map();
    registrations.forEach((registration) => {
      if (registration.trackId != null) tracks.set(String(registration.trackId), registration.trackName || "Unnamed track");
    });
    return [...tracks.entries()].map(([trackId, trackName]) => ({ trackId, trackName }));
  }, [registrations]);

  const filteredRegistrations = useMemo(() => registrations.filter((registration) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || [
      registration.fullName,
      registration.username,
      registration.email,
      registration.trackName,
      registration.assignedTeamName,
      registration.statusReason,
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    const matchesStatus = statusFilter === "ALL" || normalizeStatus(registration.status) === statusFilter;
    const matchesTrack = trackFilter === "ALL"
      || (trackFilter === "UNASSIGNED" && registration.trackId == null)
      || String(registration.trackId) === String(trackFilter);
    return matchesQuery && matchesStatus && matchesTrack;
  }), [query, registrations, statusFilter, trackFilter]);

  const eligibleTeams = useMemo(() => {
    if (!assignTarget) return [];
    const teamSelectMode = String(dashboard?.trackSelectionMode || "").toUpperCase() === "TEAM_SELECT";
    return (dashboard?.teams || []).filter((team) => {
      if (!team.acceptAutoAssignedMembers || Number(team.memberCount || 0) >= maxTeamSize) return false;
      if (!teamSelectMode) return true;
      return assignTarget.trackId != null && String(team.trackId) === String(assignTarget.trackId);
    });
  }, [assignTarget, dashboard, maxTeamSize]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      await loadRegistrations();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to refresh individual registrations"));
    } finally {
      setLoading(false);
    }
  };

  const matchNow = async () => {
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const matchedBefore = registrations.filter((item) => normalizeStatus(item.status) === "MATCHED").length;
      await http.post(`/api/coordinator/events/${selectedEventId}/team-formation/individual-registrations/match-now`);
      const response = await http.get(
        `/api/coordinator/events/${selectedEventId}/team-formation/individual-registrations`,
      );
      const nextRegistrations = response.data?.data || [];
      setRegistrations(nextRegistrations);
      const dashboardResponse = await http.get(`/api/coordinator/events/${selectedEventId}/team-formation`);
      setDashboard(dashboardResponse.data?.data || null);
      const matchedAfter = nextRegistrations.filter((item) => normalizeStatus(item.status) === "MATCHED").length;
      const matchedCount = Math.max(0, matchedAfter - matchedBefore);
      setSuccess(matchedCount
        ? `${matchedCount} individual registration(s) were matched. Remaining registrations will stay in the automatic queue.`
        : "No eligible team could be formed yet. The registrations remain in the automatic queue.");
      setMatchDialogOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to match individual registrations"));
    } finally {
      setActionLoading(false);
    }
  };

  const assignIndividual = async () => {
    if (!assignTarget || !assignTeamId) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await http.post(
        `/api/coordinator/events/${selectedEventId}/team-formation/individual-registrations/${assignTarget.individualRegistrationId}/assign`,
        { teamId: Number(assignTeamId) },
      );
      await loadRegistrations();
      setSuccess(`${assignTarget.fullName || assignTarget.username} was assigned to the selected team.`);
      setAssignTarget(null);
      setAssignTeamId("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to assign this registration"));
    } finally {
      setActionLoading(false);
    }
  };

  const rejectIndividual = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await http.post(
        `/api/coordinator/events/${selectedEventId}/team-formation/individual-registrations/${rejectTarget.individualRegistrationId}/reject`,
        { reason: rejectReason.trim() },
      );
      await loadRegistrations();
      setSuccess(`${rejectTarget.fullName || rejectTarget.username}'s individual registration was rejected.`);
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reject this registration"));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <ModulePageHeader
        eyebrow="Registration Operations"
        title="Individual Registrations"
        description="Review students who registered without a team, intervene when needed, or let the deadline-based matching process handle them automatically."
        actions={(
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={refresh}
              disabled={loading || actionLoading}
              sx={{ borderRadius: 999, fontWeight: 800 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeRoundedIcon />}
              onClick={() => setMatchDialogOpen(true)}
              disabled={!eventIsOngoing || actionLoading || !registrations.some((item) => normalizeStatus(item.status) === "WAITING")}
              sx={{ borderRadius: 999, fontWeight: 850, bgcolor: brand.colors.navy }}
            >
              Match eligible now
            </Button>
          </Stack>
        )}
      />

      <Stack spacing={2}>
        {error ? <Alert severity="error" onClose={() => setError("")}>{error}</Alert> : null}
        {success ? <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert> : null}

        <Card sx={{ borderRadius: brand.radius.lg, border: `1px solid ${brand.colors.line}`, boxShadow: "none" }}>
          <CardContent>
            <TextField
              select
              fullWidth
              label="Event"
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
            >
              {events.map((event) => (
                <MenuItem key={event.eventId} value={String(event.eventId)}>
                  {event.name} - {event.status}
                </MenuItem>
              ))}
            </TextField>

            {selectedEvent ? (
              <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1 }}>
                {[
                  ["Total registrations", summary.total, "#F8FAFC"],
                  ["Awaiting resolution", summary.unresolved, "#FFF7ED"],
                  ["Matched", summary.matched, "#ECFDF5"],
                  ["Unsuccessful", summary.unsuccessful, "#FEF2F2"],
                ].map(([label, value, bg]) => (
                  <Box key={label} sx={{ px: 1.5, py: 1.25, borderRadius: brand.radius.md, bgcolor: bg }}>
                    <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 800 }}>{label}</Typography>
                    <Typography sx={{ color: brand.colors.text, fontSize: 22, fontWeight: 950, mt: 0.25 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
            ) : null}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: brand.radius.lg, border: `1px solid ${brand.colors.line}`, boxShadow: brand.shadow.xs }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2}>
                <TextField
                  fullWidth
                  label="Search student, email, track, team, or reason"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment>,
                    },
                  }}
                />
                <TextField
                  select
                  label="Track"
                  value={trackFilter}
                  onChange={(event) => setTrackFilter(event.target.value)}
                  sx={{ minWidth: { xs: "100%", lg: 210 } }}
                >
                  <MenuItem value="ALL">All tracks</MenuItem>
                  <MenuItem value="UNASSIGNED">No track selected</MenuItem>
                  {trackOptions.map((track) => <MenuItem key={track.trackId} value={track.trackId}>{track.trackName}</MenuItem>)}
                </TextField>
                <TextField
                  select
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  sx={{ minWidth: { xs: "100%", lg: 230 } }}
                >
                  <MenuItem value="ALL">All statuses</MenuItem>
                  {Object.entries(STATUS_PRESENTATION).map(([value, item]) => (
                    <MenuItem key={value} value={value}>{item.label}</MenuItem>
                  ))}
                </TextField>
              </Stack>

              {loading ? (
                <Stack alignItems="center" sx={{ py: 7 }}><CircularProgress /></Stack>
              ) : filteredRegistrations.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center", color: brand.colors.muted }}>
                  <Typography sx={{ fontWeight: 850 }}>No individual registrations match the current filters.</Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {filteredRegistrations.map((registration) => {
                    const presentation = statusPresentation(registration.status);
                    const status = normalizeStatus(registration.status);
                    const canAssign = eventIsOngoing && ["WAITING", "COORDINATORREVIEW"].includes(status);
                    const canReject = eventIsOngoing && isUnresolved(registration);
                    return (
                      <Box
                        key={registration.individualRegistrationId}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", lg: "minmax(230px, 1.35fr) minmax(180px, 0.8fr) minmax(170px, 0.8fr) auto" },
                          gap: 1.5,
                          alignItems: "center",
                          px: { xs: 1.4, md: 1.75 },
                          py: 1.45,
                          borderRadius: brand.radius.md,
                          bgcolor: presentation.bg,
                        }}
                      >
                        <Stack direction="row" spacing={1.2} alignItems="center" minWidth={0}>
                          <Avatar sx={{ width: 40, height: 40, bgcolor: brand.colors.navy, fontSize: 14, fontWeight: 900 }}>
                            {initials(registration)}
                          </Avatar>
                          <Box minWidth={0}>
                            <Typography sx={{ color: brand.colors.text, fontWeight: 900 }} noWrap>
                              {registration.fullName || registration.username}
                            </Typography>
                            <Typography sx={{ color: brand.colors.muted, fontSize: 13 }} noWrap>
                              @{registration.username} | {registration.email}
                            </Typography>
                          </Box>
                        </Stack>

                        <Box>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase" }}>Track</Typography>
                          <Typography sx={{ color: brand.colors.text, fontWeight: 800, mt: 0.2 }}>{registration.trackName || "System assignment"}</Typography>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, mt: 0.2 }}>Registered {formatDateTime(registration.createdAt)}</Typography>
                        </Box>

                        <Box>
                          <Chip label={presentation.label} color={presentation.color} size="small" sx={{ fontWeight: 850 }} />
                          <Typography sx={{ color: brand.colors.text, fontSize: 13, fontWeight: 750, mt: 0.65 }}>
                            {registration.assignedTeamName ? `Team: ${registration.assignedTeamName}` : "No team assigned"}
                          </Typography>
                          {registration.statusReason ? (
                            <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, mt: 0.25 }}>
                              {registration.statusReason}
                            </Typography>
                          ) : null}
                        </Box>

                        <Stack direction="row" spacing={0.75} justifyContent={{ xs: "flex-start", lg: "flex-end" }}>
                          {canAssign ? (
                            <Button
                              variant="outlined"
                              startIcon={<PersonAddAlt1RoundedIcon />}
                              onClick={() => { setAssignTarget(registration); setAssignTeamId(""); }}
                              sx={{ borderRadius: 999, fontWeight: 800, whiteSpace: "nowrap" }}
                            >
                              Assign
                            </Button>
                          ) : null}
                          {canReject ? (
                            <Button
                              color="error"
                              variant="outlined"
                              startIcon={<BlockRoundedIcon />}
                              onClick={() => { setRejectTarget(registration); setRejectReason(""); }}
                              sx={{ borderRadius: 999, fontWeight: 800 }}
                            >
                              Reject
                            </Button>
                          ) : null}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={matchDialogOpen} onClose={() => !actionLoading && setMatchDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Match eligible registrations now?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: brand.colors.muted, lineHeight: 1.65 }}>
            The system will use the same track compatibility, team capacity, and balanced 3-5 member logic on the students currently waiting. Anyone who cannot be matched stays in the queue, and future registrations will still be processed automatically after registration closes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
          <Button variant="contained" onClick={matchNow} disabled={actionLoading} sx={{ borderRadius: 999, fontWeight: 850 }}>
            {actionLoading ? "Matching..." : "Match now"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(assignTarget)} onClose={() => !actionLoading && setAssignTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Assign individual to team</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography sx={{ color: brand.colors.muted }}>
              Only compatible teams that allow system-assigned members and still have an open member slot are available.
            </Typography>
            <TextField
              select
              fullWidth
              label="Eligible team"
              value={assignTeamId}
              onChange={(event) => setAssignTeamId(event.target.value)}
            >
              {eligibleTeams.map((team) => (
                <MenuItem key={team.teamId} value={String(team.teamId)}>
                  {team.teamName} | {team.trackName} | {team.memberCount}/{maxTeamSize} members
                </MenuItem>
              ))}
            </TextField>
            {eligibleTeams.length === 0 ? <Alert severity="info">No compatible opted-in team has an open slot.</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignTarget(null)} disabled={actionLoading}>Cancel</Button>
          <Button variant="contained" onClick={assignIndividual} disabled={actionLoading || !assignTeamId} sx={{ borderRadius: 999, fontWeight: 850 }}>
            Assign to team
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onClose={() => !actionLoading && setRejectTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Reject individual registration</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography sx={{ color: brand.colors.muted }}>
              This removes the student from the event's individual matching queue. The reason will be sent through in-app notification and email.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Rejection reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              inputProps={{ maxLength: 1000 }}
              helperText={`${rejectReason.length}/1000`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)} disabled={actionLoading}>Cancel</Button>
          <Button color="error" variant="contained" onClick={rejectIndividual} disabled={actionLoading || !rejectReason.trim()} sx={{ borderRadius: 999, fontWeight: 850 }}>
            Reject registration
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
