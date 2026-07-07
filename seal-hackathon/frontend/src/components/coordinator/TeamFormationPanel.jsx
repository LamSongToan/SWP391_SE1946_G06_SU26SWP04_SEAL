import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Collapse,
  CircularProgress,
  Divider,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ModulePageHeader from "../layout/ModulePageHeader";
import CenteredNotification from "../layout/CenteredNotification";
import { getApiErrorMessage, http } from "../../api/http";
import { brand } from "../../styles/designTokens";

function formatDateTime(value) {
  if (!value) return "Not configured";
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

function getTrackCapacityState(track) {
  const teamCount = Number(track.teamCount || 0);
  const minTeams = Number(track.minTeams || 0);
  const maxTeams = track.maxTeams == null ? null : Number(track.maxTeams);

  if (maxTeams != null && teamCount >= maxTeams) {
    return {
      label: "Full",
      helper: "This track has reached its maximum team capacity.",
      color: "error",
      bg: "#FEF2F2",
      border: "#FCA5A5",
    };
  }

  if (minTeams && teamCount < minTeams) {
    return {
      label: "Below minimum",
      helper: `Needs ${minTeams - teamCount} more team(s) to satisfy the minimum track size.`,
      color: "warning",
      bg: "#FFF7ED",
      border: "#FDBA74",
    };
  }

  return {
    label: "Available",
    helper: maxTeams == null ? "This track has no maximum capacity limit." : `${maxTeams - teamCount} team slot(s) still available.`,
    color: "success",
    bg: "#F0FDF4",
    border: "#86EFAC",
  };
}

function buildTrackBalancingSuggestions(dashboard) {
  const tracks = [...(dashboard?.tracks || [])].sort((left, right) => Number(left.teamCount || 0) - Number(right.teamCount || 0));
  if (!tracks.length) return [];

  const suggestions = [];
  tracks.forEach((track) => {
    const teamCount = Number(track.teamCount || 0);
    const minTeams = Number(track.minTeams || 0);
    if (minTeams && teamCount < minTeams) {
      suggestions.push({
        severity: "warning",
        title: `${track.trackName} is below minimum`,
        message: `Add ${minTeams - teamCount} more team(s) to reach the configured minimum of ${minTeams}.`,
      });
    }
  });

  const leastLoaded = tracks[0];
  const mostLoaded = tracks[tracks.length - 1];
  if (leastLoaded && mostLoaded && mostLoaded.trackId !== leastLoaded.trackId) {
    const leastCount = Number(leastLoaded.teamCount || 0);
    const mostCount = Number(mostLoaded.teamCount || 0);
    const leastMax = leastLoaded.maxTeams == null ? null : Number(leastLoaded.maxTeams);
    const leastHasCapacity = leastMax == null || leastCount < leastMax;
    if (leastHasCapacity && mostCount - leastCount >= 2) {
      suggestions.push({
        severity: "info",
        title: "Track load is uneven",
        message: `Consider moving one suitable team from ${mostLoaded.trackName} to ${leastLoaded.trackName} to balance judging and mentoring workload.`,
      });
    }
  }

  const fullTracks = tracks.filter((track) => track.maxTeams != null && Number(track.teamCount || 0) >= Number(track.maxTeams));
  fullTracks.forEach((track) => {
    suggestions.push({
      severity: "error",
      title: `${track.trackName} is full`,
      message: "Avoid assigning more teams here unless you increase this track's max team capacity.",
    });
  });

  return suggestions.slice(0, 4);
}

function matchesTeamQuery(team, query) {
  if (!query) return true;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const values = [
    team.teamName,
    team.trackName,
    team.leaderName,
    team.validationMessage,
    ...(team.members || []).flatMap((member) => [
      member.fullName,
      member.username,
      member.email,
    ]),
  ];

  return values.some((value) => String(value || "").toLowerCase().includes(normalized));
}

function TeamCard({
  team,
  minTeamSize,
  maxTeamSize,
  mentorNames,
  expanded,
  onToggle,
}) {
  const members = team.members || [];
  const openSlots = Math.max(0, Number(maxTeamSize || 5) - Number(team.memberCount || 0));
  const mentorLabel = mentorNames || (team.trackId ? "No mentor assigned" : "Assign a track first");

  return (
    <Box
      sx={{
        borderRadius: brand.radius.lg,
        border: `1px solid ${expanded ? brand.colors.orange : brand.colors.line}`,
        bgcolor: "#FFFFFF",
        boxShadow: expanded ? brand.shadow.sm : "none",
        overflow: "hidden",
        transition: `border-color ${brand.motion.base}, box-shadow ${brand.motion.base}`,
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        sx={{
          p: 1.6,
          bgcolor: team.membershipValid ? "#FCFEFD" : "#FFFAF4",
          cursor: "pointer",
        }}
      >
        <Stack direction={{ xs: "column", xl: "row" }} justifyContent="space-between" spacing={1.2}>
          <Stack spacing={0.8} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} flexWrap="wrap" useFlexGap>
              <Typography sx={{ color: brand.colors.text, fontWeight: 950, fontSize: 17 }}>
                {team.teamName}
              </Typography>
              <Chip
                size="small"
                color={team.membershipValid ? "success" : "warning"}
                label={team.membershipValid ? "Ready" : "Needs members"}
                sx={{ fontWeight: 850 }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${team.memberCount}/${maxTeamSize} members`}
                sx={{ fontWeight: 800 }}
              />
            </Stack>
            <Typography sx={{ color: brand.colors.muted, fontSize: 13.5 }}>
              Leader: {team.leaderName || "N/A"} | Track: {team.trackName || "No track assigned"}
            </Typography>
            <Typography sx={{ color: brand.colors.muted, fontSize: 13.5 }}>
              Mentor: {mentorLabel}
            </Typography>
            <Typography sx={{ color: team.membershipValid ? "#15803D" : brand.colors.orange, fontSize: 12.5 }}>
              {team.validationMessage}
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
            <Chip size="small" label={`${openSlots} open slot(s)`} />
            <Chip
              size="small"
              variant="outlined"
              label={team.trackName ? "Track set during event registration" : "Track pending event registration"}
              sx={{ fontWeight: 800 }}
            />
            <Button
              variant={expanded ? "contained" : "outlined"}
              onClick={(event) => {
                event.stopPropagation();
                onToggle();
              }}
              endIcon={expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
              sx={{ borderRadius: 999, fontWeight: 850, whiteSpace: "nowrap" }}
            >
              {expanded ? "Hide details" : "View details"}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <Stack spacing={1.5} sx={{ p: 1.6, bgcolor: "#FFFCF8" }}>
          <Stack direction={{ xs: "column", xl: "row" }} spacing={1.5}>
            <Box
              sx={{
                flex: 1,
                p: 1.4,
                borderRadius: brand.radius.md,
                border: `1px solid ${brand.colors.line}`,
                bgcolor: "#FFFFFF",
              }}
            >
              <Typography sx={{ color: brand.colors.text, fontWeight: 900, mb: 1 }}>Team overview</Typography>
              <Stack spacing={0.8}>
                {[
                  ["Leader", team.leaderName || "N/A"],
                  ["Current track", team.trackName || "No track assigned"],
                  ["Assigned mentor", mentorLabel],
                  ["Join code", team.joinCode || "Not available"],
                  ["Team size rule", `${minTeamSize}-${maxTeamSize} members`],
                  ["Created", formatDateTime(team.createdAt)],
                ].map(([label, value]) => (
                  <Stack key={label} direction={{ xs: "column", sm: "row" }} spacing={0.5}>
                    <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, fontWeight: 850, minWidth: 128 }}>
                      {label}
                    </Typography>
                    <Typography sx={{ color: brand.colors.text, fontSize: 13.5, fontWeight: 600 }}>
                      {value}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Box
              sx={{
                flex: 1.2,
                p: 1.4,
                borderRadius: brand.radius.md,
                border: `1px solid ${brand.colors.line}`,
                bgcolor: "#FFFFFF",
              }}
            >
              <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>Members</Typography>
                <Chip size="small" label={`${members.length} listed`} sx={{ fontWeight: 800 }} />
              </Stack>
              <Stack spacing={1}>
                {members.map((member) => (
                  <Box
                    key={member.userRoleId}
                    sx={{
                      p: 1.1,
                      borderRadius: brand.radius.md,
                      border: `1px solid ${brand.colors.line}`,
                      bgcolor: member.leader ? "#FFF7ED" : brand.colors.surfaceSoft,
                    }}
                  >
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.8}>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography sx={{ color: brand.colors.text, fontWeight: 850 }}>
                            {member.fullName || member.username}
                          </Typography>
                          {member.leader ? <Chip size="small" color="warning" label="Leader" sx={{ fontWeight: 800 }} /> : null}
                        </Stack>
                        <Typography sx={{ color: brand.colors.muted, fontSize: 13, mt: 0.3 }}>
                          @{member.username} | {member.email}
                        </Typography>
                      </Box>
                      <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, whiteSpace: "nowrap" }}>
                        Joined {formatDateTime(member.joinedAt)}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>

          <Typography sx={{ color: brand.colors.muted, fontSize: 12.5 }}>
            Compare teams by opening each card to inspect members, current track, and assigned mentors.
          </Typography>
        </Stack>
      </Collapse>
    </Box>
  );
}

export default function TeamFormationPanel() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState({});
  const [selectedWaitingIds, setSelectedWaitingIds] = useState([]);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [teamQuery, setTeamQuery] = useState("");
  const [teamTrackFilter, setTeamTrackFilter] = useState("ALL");
  const [teamStatusFilter, setTeamStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const teamsWithSlots = useMemo(
    () => (dashboard?.teams || [])
      .filter((team) => Number(team.memberCount || 0) < Number(dashboard?.maxTeamSize || 5))
      .sort((left, right) => {
        const minSize = Number(dashboard?.minTeamSize || 3);
        const leftMissing = Math.max(0, minSize - Number(left.memberCount || 0));
        const rightMissing = Math.max(0, minSize - Number(right.memberCount || 0));
        if (left.membershipValid !== right.membershipValid) return left.membershipValid ? 1 : -1;
        if (leftMissing !== rightMissing) return leftMissing - rightMissing;
        return Number(right.memberCount || 0) - Number(left.memberCount || 0);
      }),
    [dashboard]
  );

  const mentorNamesByTrackId = useMemo(
    () => Object.fromEntries((dashboard?.tracks || []).map((track) => [String(track.trackId), track.mentorNames])),
    [dashboard]
  );

  const filteredTeams = useMemo(
    () => (dashboard?.teams || [])
      .filter((team) => matchesTeamQuery(team, teamQuery))
      .filter((team) => teamTrackFilter === "ALL" || String(team.trackId || "UNASSIGNED") === teamTrackFilter)
      .filter((team) => {
        if (teamStatusFilter === "READY") return team.membershipValid;
        if (teamStatusFilter === "FORMING") return !team.membershipValid;
        if (teamStatusFilter === "UNASSIGNED_TRACK") return !team.trackId;
        return true;
      })
      .sort((left, right) => {
        const leftTrack = String(left.trackName || "ZZZ");
        const rightTrack = String(right.trackName || "ZZZ");
        const trackCompare = leftTrack.localeCompare(rightTrack);
        if (trackCompare !== 0) return trackCompare;
        return String(left.teamName || "").localeCompare(String(right.teamName || ""));
      }),
    [dashboard, teamQuery, teamTrackFilter, teamStatusFilter]
  );

  const recommendedTeamId = teamsWithSlots[0]?.teamId;
  const urgentActionCount = dashboard?.actionRequired?.filter((item) => item.severity === "error").length || 0;
  const warningActionCount = dashboard?.actionRequired?.filter((item) => item.severity !== "error").length || 0;
  const incompleteTeamCount = dashboard?.teams?.filter((team) => !team.membershipValid).length || 0;
  const fullTrackCount = dashboard?.tracks?.filter((track) => track.maxTeams && track.teamCount >= track.maxTeams).length || 0;
  const trackBalancingSuggestions = useMemo(() => buildTrackBalancingSuggestions(dashboard), [dashboard]);

  const loadEvents = async () => {
    const response = await http.get("/api/coordinator/events");
    const nextEvents = response.data?.data || [];
    setEvents(nextEvents);
    setSelectedEventId((current) => current || (nextEvents[0]?.eventId ? String(nextEvents[0].eventId) : ""));
  };

  const loadDashboard = async (eventId = selectedEventId) => {
    if (!eventId) {
      setDashboard(null);
      return;
    }
    const response = await http.get(`/api/coordinator/events/${eventId}/team-formation`);
    setDashboard(response.data?.data || null);
  };

  const loadWorkspace = async () => {
    setLoading(true);
    setError("");
    try {
      await loadEvents();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load team management workspace"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setError("");
    loadDashboard(selectedEventId).catch((err) => {
      setError(getApiErrorMessage(err, "Failed to load team management dashboard"));
    });
  }, [selectedEventId]);

  useEffect(() => {
    if (!dashboard?.waitingIndividuals?.length || !recommendedTeamId) return;
    setAssignmentTarget((current) => {
      const next = { ...current };
      dashboard.waitingIndividuals.forEach((registration) => {
        if (!next[registration.individualRegistrationId]) {
          next[registration.individualRegistrationId] = recommendedTeamId;
        }
      });
      return next;
    });
  }, [dashboard, recommendedTeamId]);

  useEffect(() => {
    const waitingIds = new Set((dashboard?.waitingIndividuals || []).map((item) => item.individualRegistrationId));
    setSelectedWaitingIds((current) => current.filter((id) => waitingIds.has(id)));
  }, [dashboard]);

  useEffect(() => {
    if (!expandedTeamId) return;
    if (!(dashboard?.teams || []).some((team) => team.teamId === expandedTeamId)) {
      setExpandedTeamId(null);
    }
  }, [dashboard, expandedTeamId]);

  const refresh = async () => {
    setActionLoading(true);
    try {
      await loadDashboard();
    } finally {
      setActionLoading(false);
    }
  };

  const autoMatch = async () => {
    if (!selectedEventId) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await http.post(`/api/coordinator/events/${selectedEventId}/team-formation/auto-match`);
      setDashboard(response.data?.data || null);
      setSuccess("Waiting individuals were auto-matched where possible.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to auto-match individuals"));
    } finally {
      setActionLoading(false);
    }
  };

  const assignIndividual = async (registrationId) => {
    const teamId = assignmentTarget[registrationId];
    if (!teamId) {
      setError("Choose a target team first.");
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await http.post(
        `/api/coordinator/events/${selectedEventId}/team-formation/individual-registrations/${registrationId}/assign`,
        { teamId: Number(teamId) }
      );
      setDashboard(response.data?.data || null);
      setSuccess("Individual assigned to team.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to assign individual"));
    } finally {
      setActionLoading(false);
    }
  };

  const bulkAssignIndividuals = async () => {
    if (!selectedWaitingIds.length) {
      setError("Choose at least one waiting student first.");
      return;
    }
    const targetTeamIds = new Set(selectedWaitingIds.map((id) => assignmentTarget[id]).filter(Boolean));
    if (targetTeamIds.size !== 1) {
      setError("Choose the same target team for all selected students before bulk assigning.");
      return;
    }
    const teamId = Number(Array.from(targetTeamIds)[0]);
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await http.post(
        `/api/coordinator/events/${selectedEventId}/team-formation/individual-registrations/bulk-assign`,
        { individualRegistrationIds: selectedWaitingIds, teamId }
      );
      setDashboard(response.data?.data || null);
      setSelectedWaitingIds([]);
      setSuccess(`${selectedWaitingIds.length} waiting student(s) assigned to team.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to bulk assign waiting students"));
    } finally {
      setActionLoading(false);
    }
  };

  const toggleWaitingSelection = (registrationId) => {
    setSelectedWaitingIds((current) => (
      current.includes(registrationId)
        ? current.filter((id) => id !== registrationId)
        : [...current, registrationId]
    ));
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <CenteredNotification
        message={error || success}
        severity={error ? "error" : "success"}
        onClose={() => {
          setError("");
          setSuccess("");
        }}
      />

      <ModulePageHeader
        eyebrow="Registration Operations"
        title="Team Management"
        description="Review every team in the event, see member count, current track, assigned mentor, and open each team for full member details. Track assignment is controlled during event registration."
        actions={(
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={refresh} disabled={actionLoading} sx={{ width: { xs: "100%", sm: "auto" } }}>
              Refresh
            </Button>
            <Button variant="contained" startIcon={<AutoFixHighRoundedIcon />} onClick={autoMatch} disabled={actionLoading || !selectedEventId} sx={{ width: { xs: "100%", sm: "auto" } }}>
              Auto-match waiting students
            </Button>
          </Stack>
        )}
      />

      <Stack spacing={2}>
        <Card className="ms-data-card">
          <CardContent>
            <TextField
              select
              label="Event"
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              fullWidth
            >
              {events.map((event) => (
                <MenuItem key={event.eventId} value={String(event.eventId)}>
                  {event.name} - {event.status}
                </MenuItem>
              ))}
            </TextField>
          </CardContent>
        </Card>

        {dashboard ? (
          <>
            <Card className="ms-data-card">
              <CardContent>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems="stretch">
                  {[
                    {
                      label: "Must fix",
                      value: urgentActionCount,
                      helper: urgentActionCount
                        ? "Resolve these before teams can confidently move into competition."
                        : "No blocking issues detected.",
                      color: urgentActionCount ? "#DC2626" : "#15803D",
                      bg: urgentActionCount ? "#FEF2F2" : "#F0FDF4",
                    },
                    {
                      label: "Warnings",
                      value: warningActionCount,
                      helper: warningActionCount
                        ? "Review these soon, especially after registration closes."
                        : "No warning items right now.",
                      color: warningActionCount ? brand.colors.orange : "#15803D",
                      bg: warningActionCount ? "#FFF7ED" : "#F0FDF4",
                    },
                    {
                      label: "Incomplete teams",
                      value: incompleteTeamCount,
                      helper: `${dashboard.minTeamSize}-${dashboard.maxTeamSize} members required per team.`,
                      color: incompleteTeamCount ? brand.colors.orange : "#15803D",
                      bg: incompleteTeamCount ? "#FFF7ED" : "#F0FDF4",
                    },
                    {
                      label: "Full tracks",
                      value: fullTrackCount,
                      helper: fullTrackCount ? "Assign new teams to tracks with available capacity." : "Track capacity is still available.",
                      color: fullTrackCount ? "#DC2626" : "#15803D",
                      bg: fullTrackCount ? "#FEF2F2" : "#F0FDF4",
                    },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        flex: 1,
                        p: 1.6,
                        borderRadius: brand.radius.md,
                        border: `1px solid ${brand.colors.line}`,
                        bgcolor: item.bg,
                      }}
                    >
                      <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ color: item.color, fontSize: 30, fontWeight: 950, lineHeight: 1.1, mt: 0.5 }}>
                        {item.value}
                      </Typography>
                      <Typography sx={{ color: brand.colors.muted, fontSize: 12.8, lineHeight: 1.45, mt: 0.7 }}>
                        {item.helper}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <Card className="ms-data-card" sx={{ flex: 1 }}>
                <CardContent>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 13, fontWeight: 850 }}>Team Size Rule</Typography>
                  <Typography sx={{ color: brand.colors.text, fontSize: 28, fontWeight: 950 }}>
                    {dashboard.minTeamSize}-{dashboard.maxTeamSize}
                  </Typography>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                    Registration deadline: {formatDateTime(dashboard.registrationEndAt)}
                  </Typography>
                </CardContent>
              </Card>
              <Card className="ms-data-card" sx={{ flex: 1 }}>
                <CardContent>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 13, fontWeight: 850 }}>Waiting Individuals</Typography>
                  <Typography sx={{ color: brand.colors.text, fontSize: 28, fontWeight: 950 }}>
                    {dashboard.waitingIndividuals.length}
                  </Typography>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                    {dashboard.registrationClosed ? "Coordinator action may be needed after deadline." : "System will auto-match when enough students are waiting."}
                  </Typography>
                </CardContent>
              </Card>
              <Card className="ms-data-card" sx={{ flex: 1 }}>
                <CardContent>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 13, fontWeight: 850 }}>Track Mode</Typography>
                  <Typography sx={{ color: brand.colors.text, fontSize: 28, fontWeight: 950 }}>
                    {dashboard.trackSelectionMode || "TEAM_SELECT"}
                  </Typography>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                    Tracks show current team capacity and mentor coverage.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>

            <Card className="ms-data-card">
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 1.3 }}>
                  <Box>
                    <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950 }}>
                      Action Required
                    </Typography>
                    <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                      Issues that may need coordinator action before teams can compete.
                    </Typography>
                  </Box>
                  <Chip
                    label={`${dashboard.actionRequired?.length || 0} item(s)`}
                    color={(dashboard.actionRequired?.length || 0) ? "warning" : "success"}
                    sx={{ alignSelf: { xs: "flex-start", sm: "center" }, fontWeight: 850 }}
                  />
                </Stack>
                <Stack spacing={1}>
                  {dashboard.actionRequired?.length ? dashboard.actionRequired.map((item, index) => (
                    <Box
                      key={`${item.type}-${item.teamId || item.trackId || item.individualRegistrationId || index}`}
                      sx={{
                        p: 1.2,
                        borderRadius: brand.radius.md,
                        border: `1px solid ${item.severity === "error" ? "#FCA5A5" : brand.colors.line}`,
                        bgcolor: item.severity === "error" ? "#FEF2F2" : "#FFFBEB",
                      }}
                    >
                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                        <Typography sx={{ color: brand.colors.text, fontWeight: 850 }}>{item.message}</Typography>
                        <Chip size="small" label={item.type} color={item.severity === "error" ? "error" : "warning"} />
                      </Stack>
                    </Box>
                  )) : (
                    <Box className="ms-empty">
                      <Typography fontWeight={850}>No action needed right now</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Teams satisfy member rules, waiting students are handled, and track setup has no blocking issue.
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card className="ms-data-card">
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 1.3 }}>
                  <Box>
                    <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950 }}>
                      Track Balancing Suggestions
                    </Typography>
                    <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                      Quick hints for keeping track capacity, minimum team count, and mentor workload easier to manage.
                    </Typography>
                  </Box>
                  <Chip
                    label={`${trackBalancingSuggestions.length} suggestion(s)`}
                    color={trackBalancingSuggestions.length ? "info" : "success"}
                    sx={{ alignSelf: { xs: "flex-start", sm: "center" }, fontWeight: 850 }}
                  />
                </Stack>
                {trackBalancingSuggestions.length ? (
                  <Stack spacing={1}>
                    {trackBalancingSuggestions.map((item) => (
                      <Box
                        key={`${item.title}-${item.message}`}
                        sx={{
                          p: 1.25,
                          borderRadius: brand.radius.md,
                          border: `1px solid ${item.severity === "error" ? "#FCA5A5" : item.severity === "warning" ? "#FDBA74" : "#BAE6FD"}`,
                          bgcolor: item.severity === "error" ? "#FEF2F2" : item.severity === "warning" ? "#FFF7ED" : "#F0F9FF",
                        }}
                      >
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                          <Box>
                            <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>{item.title}</Typography>
                            <Typography sx={{ color: brand.colors.muted, fontSize: 13, mt: 0.25 }}>{item.message}</Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={item.severity === "error" ? "Capacity" : item.severity === "warning" ? "Minimum" : "Balance"}
                            color={item.severity === "error" ? "error" : item.severity === "warning" ? "warning" : "info"}
                            sx={{ alignSelf: { xs: "flex-start", sm: "center" }, fontWeight: 850 }}
                          />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Box className="ms-empty">
                    <Typography fontWeight={850}>Tracks look balanced right now</Typography>
                    <Typography color="text.secondary" variant="body2">
                      No track is below minimum, full, or noticeably uneven.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card className="ms-data-card">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <RouteRoundedIcon sx={{ color: brand.colors.orange }} />
                  <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950 }}>Track Capacity</Typography>
                </Stack>
                <Stack spacing={1.2}>
                  {dashboard.tracks.map((track) => {
                    const capacityState = getTrackCapacityState(track);
                    return (
                      <Box
                        key={track.trackId}
                        sx={{
                          p: 1.4,
                          borderRadius: brand.radius.md,
                          border: `1px solid ${capacityState.border}`,
                          bgcolor: capacityState.bg,
                        }}
                      >
                        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Typography sx={{ fontWeight: 900 }}>{track.trackName}</Typography>
                              <Chip size="small" label={capacityState.label} color={capacityState.color} />
                            </Stack>
                            <Typography sx={{ color: brand.colors.muted, fontSize: 13, mt: 0.4 }}>
                              Mentor(s): {track.mentorNames}
                            </Typography>
                            <Typography sx={{ color: brand.colors.text, fontSize: 12.8, mt: 0.5, fontWeight: 750 }}>
                              {capacityState.helper}
                            </Typography>
                          </Box>
                          <Chip
                            icon={<GroupsRoundedIcon />}
                            label={`${track.teamCount}/${track.maxTeams || "unlimited"} teams | min ${track.minTeams || 0}`}
                            sx={{ alignSelf: { xs: "flex-start", md: "center" }, fontWeight: 850, bgcolor: "#FFFFFF" }}
                          />
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>

            <Card className="ms-data-card">
              <CardContent>
                <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={1.2} sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950 }}>
                      Teams In Event
                    </Typography>
                    <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                      Review each team at a glance, then open it to inspect members, leader, mentor, and join details. Track choice or system assignment happens in event registration, not here.
                    </Typography>
                  </Box>
                  <Chip
                    label={`${filteredTeams.length}/${dashboard.teams.length} team(s) shown`}
                    color={filteredTeams.length ? "info" : "default"}
                    sx={{ alignSelf: { xs: "flex-start", lg: "center" }, fontWeight: 850 }}
                  />
                </Stack>

                <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2} sx={{ mb: 1.5 }}>
                  <TextField
                    value={teamQuery}
                    onChange={(event) => setTeamQuery(event.target.value)}
                    label="Search team, leader, member, or email"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon sx={{ color: brand.colors.muted }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    select
                    label="Track filter"
                    value={teamTrackFilter}
                    onChange={(event) => setTeamTrackFilter(event.target.value)}
                    sx={{ minWidth: { xs: "100%", lg: 220 } }}
                  >
                    <MenuItem value="ALL">All tracks</MenuItem>
                    <MenuItem value="UNASSIGNED">No track assigned</MenuItem>
                    {dashboard.tracks.map((track) => (
                      <MenuItem key={track.trackId} value={String(track.trackId)}>
                        {track.trackName}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Status filter"
                    value={teamStatusFilter}
                    onChange={(event) => setTeamStatusFilter(event.target.value)}
                    sx={{ minWidth: { xs: "100%", lg: 220 } }}
                  >
                    <MenuItem value="ALL">All teams</MenuItem>
                    <MenuItem value="READY">Ready teams</MenuItem>
                    <MenuItem value="FORMING">Teams needing members</MenuItem>
                    <MenuItem value="UNASSIGNED_TRACK">Teams without track</MenuItem>
                  </TextField>
                </Stack>

                <Stack spacing={1.2}>
                  {filteredTeams.length ? filteredTeams.map((team) => (
                    <TeamCard
                      key={team.teamId}
                      team={team}
                      minTeamSize={dashboard.minTeamSize}
                      maxTeamSize={dashboard.maxTeamSize}
                      mentorNames={mentorNamesByTrackId[String(team.trackId)]}
                      expanded={expandedTeamId === team.teamId}
                      onToggle={() => setExpandedTeamId((current) => (current === team.teamId ? null : team.teamId))}
                    />
                  )) : (
                    <Box className="ms-empty">
                      <Typography fontWeight={850}>No teams match the current filter</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Try clearing the search or switching track/status filters to see more teams.
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card className="ms-data-card">
              <CardContent>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950 }}>
                      Waiting Individual Registrations
                    </Typography>
                    <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                      Select multiple students only when they share the same suggested target team.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={bulkAssignIndividuals}
                    disabled={actionLoading || !selectedWaitingIds.length}
                    sx={{ alignSelf: { xs: "stretch", md: "center" }, borderRadius: 999, fontWeight: 850 }}
                  >
                    Assign selected ({selectedWaitingIds.length})
                  </Button>
                </Stack>
                <Stack spacing={1.2}>
                  {dashboard.waitingIndividuals.length ? dashboard.waitingIndividuals.map((registration) => (
                    <Box key={registration.individualRegistrationId} sx={{ p: 1.4, borderRadius: brand.radius.md, border: `1px solid ${brand.colors.line}`, bgcolor: "#FFFFFF" }}>
                      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.2}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <Checkbox
                            checked={selectedWaitingIds.includes(registration.individualRegistrationId)}
                            onChange={() => toggleWaitingSelection(registration.individualRegistrationId)}
                            sx={{ p: 0.2, mt: 0.2 }}
                          />
                          <Box>
                            <Typography sx={{ fontWeight: 900 }}>{registration.fullName || registration.username}</Typography>
                            <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                              {registration.email} | waiting since {formatDateTime(registration.createdAt)}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField
                            select
                            size="small"
                            label="Suggest team"
                            value={assignmentTarget[registration.individualRegistrationId] || ""}
                            onChange={(event) => setAssignmentTarget((current) => ({
                              ...current,
                              [registration.individualRegistrationId]: event.target.value,
                            }))}
                            sx={{ minWidth: 220 }}
                          >
                            {teamsWithSlots.map((team) => (
                              <MenuItem key={team.teamId} value={team.teamId}>
                                {team.teamName} ({team.memberCount}/{dashboard.maxTeamSize})
                                {team.teamId === recommendedTeamId ? " - Recommended" : ""}
                              </MenuItem>
                            ))}
                          </TextField>
                          <Button
                            variant="outlined"
                            onClick={() => assignIndividual(registration.individualRegistrationId)}
                            disabled={actionLoading || !assignmentTarget[registration.individualRegistrationId]}
                            sx={{ borderRadius: 999, fontWeight: 850, width: { xs: "100%", sm: "auto" } }}
                          >
                            Add to team
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  )) : (
                    <Box className="ms-empty">
                      <Typography fontWeight={850}>No waiting individuals</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Students who register individually will appear here until auto-match or coordinator assignment handles them.
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </>
        ) : null}
      </Stack>
    </Box>
  );
}
