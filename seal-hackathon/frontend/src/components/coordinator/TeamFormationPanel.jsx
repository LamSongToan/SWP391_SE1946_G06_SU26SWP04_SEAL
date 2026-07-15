import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  IconButton,
  Box,
  Button,
  Checkbox,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ModulePageHeader from "../layout/ModulePageHeader";
import CenteredNotification from "../layout/CenteredNotification";
import { getApiErrorMessage, http } from "../../api/http";
import { brand } from "../../styles/designTokens";
import { useSearchParams } from "react-router-dom";

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

function formatTrackModeLabel(value) {
  const normalized = String(value || "TEAM_SELECT").trim().toUpperCase();
  if (normalized === "TEAM_SELECT") return "Team select";
  if (normalized === "SYSTEM_ASSIGN") return "System assign";
  if (normalized === "SINGLE_TRACK") return "Single track";
  return normalized.replaceAll("_", " ").toLowerCase();
}

function isHttpUrl(value) {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getTrackCapacityState(track, eventStarted = false) {
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
    if (eventStarted) {
      return {
        label: "Locked",
        helper: "The event has already started, so this track setup is now treated as final.",
        color: "default",
        bg: "#F8FAFC",
        border: brand.colors.line,
      };
    }
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

function matchesTeamQuery(team, query) {
  if (!query) return true;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const values = [
    team.teamName,
    team.eventName,
    team.trackName,
    team.mentorNames,
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

const ALL_EVENTS_OPTION = {
  eventId: "ALL",
  name: "All teams",
  status: "System",
};

const TeamCard = memo(function TeamCard({
  team,
  submissions,
  maxTeamSize,
  expanded,
  onToggle,
  onRequestRemoveMember,
  onRequestDisqualifyTeam,
  actionLoading,
  rosterEditingLocked,
  actionsDisabled,
}) {
  const detailRef = useRef(null);
  const members = team.members || [];
  const teamSubmissions = submissions || [];
  const mentorLabel = team.mentorNames || (team.trackId ? "No mentor assigned" : "No mentor assigned");
  const normalizedSubmissionStatus = String(team.latestSubmissionStatus || "").toLowerCase();
  const normalizedEventStatus = String(team.eventStatus || "").toLowerCase();
  const canDisqualify = normalizedEventStatus === "ongoing";
  const disqualifyButtonLabel = normalizedEventStatus !== "ongoing"
    ? "Event not ongoing"
    : "Disqualify";
  const [detailHeight, setDetailHeight] = useState(0);

  useLayoutEffect(() => {
    if (!detailRef.current) return;
    setDetailHeight(detailRef.current.scrollHeight);
  }, [
    expanded,
    members.length,
    team.latestSubmissionStatus,
    team.currentRoundName,
    team.submissionDeadline,
    actionsDisabled,
    actionLoading,
    rosterEditingLocked,
  ]);

  return (
    <Box
      sx={{
        borderRadius: brand.radius.lg,
        border: `1px solid ${expanded ? brand.colors.orange : brand.colors.line}`,
        bgcolor: expanded ? "#F7F9FC" : "#F8FAFD",
        boxShadow: expanded ? brand.shadow.sm : "none",
        overflow: "hidden",
        transition: `border-color ${brand.motion.base}, box-shadow ${brand.motion.base}`,
        contain: "layout paint",
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
          p: 2,
          bgcolor: "transparent",
          cursor: "pointer",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: 1.4,
            alignItems: "start",
          }}
        >
          <Box sx={{ gridColumn: { xs: "1 / -1", lg: "1 / span 3" }, minWidth: 0 }}>
            <Typography sx={{ color: brand.colors.text, fontWeight: 950, fontSize: 17 }}>
              {team.teamName}
            </Typography>
          </Box>

          <Box
            sx={{
              gridColumn: { xs: "1 / -1", lg: "4 / 5" },
              display: "flex",
              justifyContent: { xs: "flex-start", lg: "flex-end" },
            }}
          >
            <Chip
              size="small"
              color={team.membershipValid ? "success" : "warning"}
              label={team.membershipValid ? "Ready" : "Needs members"}
              sx={{
                fontWeight: 850,
                "& .MuiChip-label": {
                  px: 1.1,
                },
              }}
            />
          </Box>

          {[
            ["Members", `${team.memberCount}/${maxTeamSize}`],
            ["Event", team.eventName || "No event"],
            ["Track", team.trackName || "No track"],
          ].map(([label, value]) => (
            <Box
              key={`${team.teamId}-${label}`}
              sx={{
                px: 1.35,
                py: 1.1,
                borderRadius: brand.radius.md,
                bgcolor: "#EEF3FA",
                border: `1px solid ${brand.colors.line}`,
                minWidth: 0,
              }}
            >
              <Typography sx={{ color: brand.colors.muted, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase" }}>
                {label}
              </Typography>
              <Typography sx={{ color: brand.colors.text, fontSize: 14, fontWeight: 850, mt: 0.2 }} noWrap>
                {value}
              </Typography>
            </Box>
          ))}

          <Box
            sx={{
              gridColumn: { xs: "1 / -1", lg: "4 / 5" },
              display: "flex",
              flexDirection: "column",
              gap: 1.2,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                px: 1.35,
                py: 1.1,
                borderRadius: brand.radius.md,
                bgcolor: "#EEF3FA",
                border: `1px solid ${brand.colors.line}`,
                minWidth: 0,
              }}
            >
              <Typography sx={{ color: brand.colors.muted, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase" }}>
                Mentor
              </Typography>
              <Typography sx={{ color: brand.colors.text, fontSize: 14, fontWeight: 850, mt: 0.2 }} noWrap>
                {mentorLabel}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: { xs: "flex-start", lg: "flex-end" } }}>
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggle();
                          }}
                          size="small"
                          disableRipple
                          disableFocusRipple
                          aria-label={expanded ? "Hide details" : "View details"}
                          sx={{
                            border: `1px solid ${brand.colors.line}`,
                            bgcolor: "#FFFFFF",
                            color: brand.colors.text,
                            transition: "background-color 120ms ease, border-color 120ms ease, transform 120ms ease",
                            "&:hover": {
                              bgcolor: "#F3F6FB",
                            },
                            "&:active": {
                              transform: "scale(0.96)",
                            },
                          }}
                        >
                {expanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          height: expanded ? `${detailHeight}px` : 0,
          opacity: expanded ? 1 : 0,
          overflow: "hidden",
          transition: expanded
            ? "height 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 120ms ease-out"
            : "opacity 50ms ease-in, height 90ms cubic-bezier(0.4, 0, 1, 1)",
          willChange: "height, opacity",
        }}
      >
        <Box
          ref={detailRef}
          sx={{
            transform: expanded ? "translateY(0)" : "translateY(-4px)",
            transition: expanded
              ? "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)"
              : "transform 70ms ease-in",
            pointerEvents: expanded ? "auto" : "none",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <Divider />
          <Stack spacing={1.6} sx={{ p: 2, bgcolor: "#FDF8F2" }}>
            <Box
              sx={{
                p: 1.5,
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
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8} alignItems={{ xs: "flex-start", sm: "center" }}>
                        <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, whiteSpace: "nowrap" }}>
                          Joined {formatDateTime(member.joinedAt)}
                        </Typography>
                        {!member.leader ? (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            disabled={actionLoading || rosterEditingLocked || actionsDisabled}
                            onClick={() => onRequestRemoveMember(team, member)}
                            sx={{
                              minWidth: 0,
                              px: 1.5,
                              py: 0.55,
                              borderRadius: 999,
                              fontWeight: 850,
                              fontSize: 12.5,
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Remove member
                          </Button>
                        ) : null}
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: brand.radius.md,
                border: `1px solid ${brand.colors.line}`,
                bgcolor: "#FFFFFF",
              }}
            >
              <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={1.2}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: brand.colors.text, fontWeight: 900, mb: 1 }}>Competition status</Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={team.latestSubmissionStatus || "No submission yet"}
                      color={normalizedSubmissionStatus === "disqualified" ? "error" : team.latestSubmissionStatus ? "info" : "default"}
                      sx={{ fontWeight: 850 }}
                    />
                    <Chip size="small" variant="outlined" label={team.currentRoundName || "Round pending"} sx={{ fontWeight: 800 }} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={team.submissionDeadline ? `Deadline ${formatDateTime(team.submissionDeadline)}` : "Deadline pending"}
                      sx={{ fontWeight: 800 }}
                    />
                  </Stack>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 12.8, mt: 1 }}>
                    This removes the team from the ongoing event entirely. Event-specific track, submission, and competition data will no longer remain attached to the team.
                  </Typography>
                </Box>
                <Button
                  color="error"
                  variant="contained"
                  disabled={actionLoading || actionsDisabled || !canDisqualify}
                  onClick={() => onRequestDisqualifyTeam(team)}
                  sx={{
                    alignSelf: { xs: "stretch", lg: "center" },
                    borderRadius: 999,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    px: 2.2,
                  }}
                >
                  {disqualifyButtonLabel}
                </Button>
              </Stack>
              {actionsDisabled ? (
                <Typography sx={{ color: brand.colors.muted, fontSize: 12.4, mt: 1 }}>
                  Open the specific event view to use coordinator actions for this team.
                </Typography>
              ) : null}
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: brand.radius.md,
                border: `1px solid ${brand.colors.line}`,
                bgcolor: "#FFFFFF",
              }}
            >
              <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>Submissions</Typography>
                <Chip size="small" label={`${teamSubmissions.length} listed`} sx={{ fontWeight: 800 }} />
              </Stack>

              {teamSubmissions.length ? (
                <Stack spacing={1}>
                  {teamSubmissions.map((submission) => (
                    <Box
                      key={submission.submissionId}
                      sx={{
                        p: 1.15,
                        borderRadius: brand.radius.md,
                        border: `1px solid ${brand.colors.line}`,
                        bgcolor: brand.colors.surfaceSoft,
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", lg: "row" }}
                        justifyContent="space-between"
                        spacing={1}
                        alignItems={{ xs: "flex-start", lg: "center" }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography sx={{ color: brand.colors.text, fontWeight: 850 }}>
                              {submission.roundName}
                            </Typography>
                            <Chip size="small" label={submission.status || "Submitted"} color="info" sx={{ fontWeight: 800 }} />
                          </Stack>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 12.8, mt: 0.45 }}>
                            Submitted {formatDateTime(submission.submittedAt)} • Deadline {formatDateTime(submission.submissionDeadline)}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                          {isHttpUrl(submission.repositoryUrl) ? (
                            <Button
                              size="small"
                              variant="outlined"
                              href={submission.repositoryUrl}
                              target="_blank"
                              rel="noreferrer"
                              sx={{ borderRadius: 999, fontWeight: 800 }}
                            >
                              Repository
                            </Button>
                          ) : null}
                          {isHttpUrl(submission.demoUrl) ? (
                            <Button
                              size="small"
                              variant="outlined"
                              href={submission.demoUrl}
                              target="_blank"
                              rel="noreferrer"
                              sx={{ borderRadius: 999, fontWeight: 800 }}
                            >
                              Demo
                            </Button>
                          ) : null}
                          {isHttpUrl(submission.slideUrl) ? (
                            <Button
                              size="small"
                              variant="outlined"
                              href={submission.slideUrl}
                              target="_blank"
                              rel="noreferrer"
                              sx={{ borderRadius: 999, fontWeight: 800 }}
                            >
                              Slides
                            </Button>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ color: brand.colors.muted, fontSize: 13.2 }}>
                  No submissions have been created for this team yet.
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => (
  prevProps.team === nextProps.team
  && prevProps.expanded === nextProps.expanded
  && prevProps.actionLoading === nextProps.actionLoading
  && prevProps.rosterEditingLocked === nextProps.rosterEditingLocked
  && prevProps.actionsDisabled === nextProps.actionsDisabled
));

export default function TeamFormationPanel() {
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [eventSubmissions, setEventSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [removeMemberDialog, setRemoveMemberDialog] = useState({
    open: false,
    team: null,
    member: null,
    reason: "",
  });
  const [disqualifyDialog, setDisqualifyDialog] = useState({
    open: false,
    team: null,
    reason: "",
  });
  const [trackChangeDialog, setTrackChangeDialog] = useState({
    open: false,
    team: null,
    targetTrackId: "",
    reason: "",
  });
  const [balanceTrackDialog, setBalanceTrackDialog] = useState({
    open: false,
    reason: "",
  });
  const [mergeTrackDialog, setMergeTrackDialog] = useState({
    open: false,
    sourceTrackIds: [],
    newTrackName: "",
    reason: "",
  });
  const [startEventDialog, setStartEventDialog] = useState({
    open: false,
  });
  const [cancelEventDialog, setCancelEventDialog] = useState({
    open: false,
    reason: "",
  });
  const [teamQuery, setTeamQuery] = useState("");
  const [teamTrackFilter, setTeamTrackFilter] = useState("ALL");
  const [teamStatusFilter, setTeamStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const requestedEventId = searchParams.get("eventId");
  const requestedTeamId = searchParams.get("teamId");

  const isAllEventsView = selectedEventId === "ALL";

  const selectedEventMeta = useMemo(
    () => events.find((event) => String(event.eventId) === String(selectedEventId)) || null,
    [events, selectedEventId]
  );

  const teamTrackOptions = useMemo(() => {
    const options = new Map();
    (dashboard?.teams || []).forEach((team) => {
      if (team?.trackId) {
        options.set(String(team.trackId), team.trackName || "Unnamed track");
      }
    });
    return Array.from(options.entries())
      .map(([trackId, trackName]) => ({ trackId, trackName }))
      .sort((left, right) => left.trackName.localeCompare(right.trackName));
  }, [dashboard]);

  const filteredTeams = useMemo(
    () => (dashboard?.teams || [])
      .filter((team) => matchesTeamQuery(team, teamQuery))
      .filter((team) => (
        isAllEventsView
          ? true
          : (teamTrackFilter === "ALL" || String(team.trackId || "UNASSIGNED") === teamTrackFilter)
      ))
      .filter((team) => {
        if (isAllEventsView) return true;
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
    [dashboard, isAllEventsView, teamQuery, teamTrackFilter, teamStatusFilter]
  );

  const submissionsByTeamId = useMemo(() => {
    const grouped = new Map();
    (eventSubmissions || []).forEach((submission) => {
      const teamId = submission?.teamId;
      if (!teamId) return;
      if (!grouped.has(teamId)) {
        grouped.set(teamId, []);
      }
      grouped.get(teamId).push(submission);
    });
    grouped.forEach((items, teamId) => {
      grouped.set(teamId, items.slice().sort((left, right) => {
        const leftOrder = Number(left?.roundOrder || 0);
        const rightOrder = Number(right?.roundOrder || 0);
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return new Date(right?.submittedAt || 0).getTime() - new Date(left?.submittedAt || 0).getTime();
      }));
    });
    return grouped;
  }, [eventSubmissions]);

  const movableTeams = useMemo(
    () => (dashboard?.teams || [])
      .filter((team) => Boolean(team.trackId))
      .filter((team) => !team.latestSubmissionId)
      .sort((left, right) => String(left.teamName || "").localeCompare(String(right.teamName || ""))),
    [dashboard]
  );

  const mergeableTracks = useMemo(
    () => (dashboard?.tracks || [])
      .slice()
      .sort((left, right) => String(left.trackName || "").localeCompare(String(right.trackName || ""))),
    [dashboard]
  );

  const urgentActionCount = dashboard?.actionRequired?.filter((item) => item.severity === "error").length || 0;
  const warningActionCount = dashboard?.actionRequired?.filter((item) => item.severity !== "error").length || 0;
  const incompleteTeamCount = dashboard?.teams?.filter((team) => !team.membershipValid).length || 0;
  const fullTrackCount = dashboard?.tracks?.filter((track) => track.maxTeams && track.teamCount >= track.maxTeams).length || 0;
  const remainingViolationCount = dashboard?.actionRequired?.length || 0;
  const hasActionRequired = Boolean(dashboard?.actionRequired?.length);
  const eventStartConfirmed = Boolean(dashboard?.eventStartConfirmed);
  const teamsWithoutEventCount = dashboard?.teams?.filter((team) => !team.eventId).length || 0;
  const teamsWithoutTrackCount = dashboard?.teams?.filter((team) => !team.trackId).length || 0;
  const coordinatorTrackActionsEnabled = Boolean(
    dashboard?.registrationClosed
    && dashboard?.eventStatus === "Ongoing"
    && !eventStartConfirmed
  );
  const eventHeaderTitle = isAllEventsView
    ? "All Teams"
    : (dashboard?.eventName || selectedEventMeta?.name || "Event");
  const eventHeaderSubtitle = isAllEventsView
    ? "System-wide team overview, including teams that are not attached to any event yet."
    : "Review this event's teams, track readiness, and post-registration actions from one place.";

  const loadEvents = async () => {
    const response = await http.get("/api/coordinator/events");
    const nextEvents = [ALL_EVENTS_OPTION, ...(response.data?.data || [])];
    setEvents(nextEvents);
    setSelectedEventId((current) => {
      const currentValue = String(current || "");
      if (requestedEventId && nextEvents.some((event) => String(event.eventId) === String(requestedEventId))) {
        return String(requestedEventId);
      }
      if (nextEvents.some((event) => String(event.eventId) === currentValue)) {
        return currentValue;
      }
      return nextEvents[1]?.eventId ? String(nextEvents[1].eventId) : String(ALL_EVENTS_OPTION.eventId);
    });
  };

  const loadDashboard = async (eventId = selectedEventId) => {
    if (!eventId) {
      setDashboard(null);
      return;
    }
    const response = String(eventId) === "ALL"
      ? await http.get("/api/coordinator/team-formation/overview")
      : await http.get(`/api/coordinator/events/${eventId}/team-formation`);
    setDashboard(response.data?.data || null);
  };

  const loadEventSubmissions = async (eventId = selectedEventId) => {
    if (!eventId || String(eventId) === "ALL") {
      setEventSubmissions([]);
      return;
    }
    const response = await http.get(`/api/coordinator/events/${eventId}/submissions`);
    setEventSubmissions(response.data?.data || []);
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
    Promise.all([loadDashboard(selectedEventId), loadEventSubmissions(selectedEventId)]).catch((err) => {
      setError(getApiErrorMessage(err, "Failed to load team management dashboard"));
    });
  }, [selectedEventId]);

  useEffect(() => {
    if (!expandedTeamId) return;
    if (!(dashboard?.teams || []).some((team) => team.teamId === expandedTeamId)) {
      setExpandedTeamId(null);
    }
  }, [dashboard, expandedTeamId]);

  useEffect(() => {
    if (!requestedTeamId || !dashboard?.teams?.length) return;
    const teamId = Number(requestedTeamId);
    if (Number.isNaN(teamId)) return;
    if (dashboard.teams.some((team) => Number(team.teamId) === teamId)) {
      setExpandedTeamId(teamId);
    }
  }, [dashboard, requestedTeamId]);

  useEffect(() => {
    if (!isAllEventsView) return;
    setTeamTrackFilter("ALL");
    setTeamStatusFilter("ALL");
  }, [isAllEventsView]);

  const refresh = async () => {
    setActionLoading(true);
    try {
      await Promise.all([loadDashboard(), loadEventSubmissions()]);
    } finally {
      setActionLoading(false);
    }
  };

  const openRemoveMemberDialog = (team, member) => {
    setRemoveMemberDialog({
      open: true,
      team,
      member,
      reason: "",
    });
  };

  const closeRemoveMemberDialog = () => {
    setRemoveMemberDialog({
      open: false,
      team: null,
      member: null,
      reason: "",
    });
  };

  const openDisqualifyDialog = (team) => {
    setDisqualifyDialog({
      open: true,
      team,
      reason: "",
    });
  };

  const closeDisqualifyDialog = () => {
    setDisqualifyDialog({
      open: false,
      team: null,
      reason: "",
    });
  };

  const openTrackChangeDialog = (team = null) => {
    const selectedTeam = team || movableTeams[0] || null;
    const firstAlternativeTrackId = (dashboard?.tracks || []).find((track) => String(track.trackId) !== String(selectedTeam?.trackId || ""))?.trackId || "";
    setTrackChangeDialog({
      open: true,
      team: selectedTeam,
      targetTrackId: firstAlternativeTrackId,
      reason: "",
    });
  };

  const closeTrackChangeDialog = () => {
    setTrackChangeDialog({
      open: false,
      team: null,
      targetTrackId: "",
      reason: "",
    });
  };

  const openBalanceTrackDialog = () => {
    setBalanceTrackDialog({
      open: true,
      reason: "",
    });
  };

  const closeBalanceTrackDialog = () => {
    setBalanceTrackDialog({
      open: false,
      reason: "",
    });
  };

  const openMergeTrackDialog = () => {
    setMergeTrackDialog({
      open: true,
      sourceTrackIds: mergeableTracks.slice(0, 2).map((track) => String(track.trackId)),
      newTrackName: "",
      reason: "",
    });
  };

  const closeMergeTrackDialog = () => {
    setMergeTrackDialog({
      open: false,
      sourceTrackIds: [],
      newTrackName: "",
      reason: "",
    });
  };

  const openStartEventDialog = () => {
    setStartEventDialog({ open: true });
  };

  const closeStartEventDialog = () => {
    setStartEventDialog({ open: false });
  };

  const openCancelEventDialog = () => {
    setCancelEventDialog({
      open: true,
      reason: "",
    });
  };

  const closeCancelEventDialog = () => {
    setCancelEventDialog({
      open: false,
      reason: "",
    });
  };

  const startEvent = async () => {
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await http.post(`/api/coordinator/events/${selectedEventId}/team-formation/start`);
      setDashboard(response.data?.data || null);
      await loadEventSubmissions();
      setSuccess("Event started and only the final result notification was sent.");
      closeStartEventDialog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to start event from team management"));
    } finally {
      setActionLoading(false);
    }
  };

  const removeMember = async () => {
    const { team, member, reason } = removeMemberDialog;
    const normalizedReason = reason.trim();
    if (!team || !member) return;
    if (!team.eventId) {
      setError("This team is not attached to an event, so coordinator member removal is unavailable here.");
      return;
    }
    if (!normalizedReason) {
      setError("Enter a reason before removing this member.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await http.delete(
        `/api/coordinator/events/${team.eventId}/team-formation/teams/${team.teamId}/members/${member.userRoleId}`,
        {
          data: { reason: normalizedReason },
        }
      );
      await Promise.all([loadDashboard(), loadEventSubmissions()]);
      setSuccess("Team member removed.");
      closeRemoveMemberDialog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to remove team member"));
    } finally {
      setActionLoading(false);
    }
  };

  const disqualifyTeam = async () => {
    const { team, reason } = disqualifyDialog;
    const normalizedReason = reason.trim();
    if (!team?.teamId) return;
    if (!team.eventId) {
      setError("This team is not attached to an event, so disqualification is unavailable here.");
      return;
    }
    if (!normalizedReason) {
      setError("Enter a reason before disqualifying this team.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await http.post(
        `/api/coordinator/events/${team.eventId}/team-formation/teams/${team.teamId}/disqualify`,
        { reason: normalizedReason }
      );
      await Promise.all([loadDashboard(), loadEventSubmissions()]);
      setSuccess("Team disqualified.");
      closeDisqualifyDialog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to disqualify team"));
    } finally {
      setActionLoading(false);
    }
  };

  const changeTeamTrack = async () => {
    const { team, targetTrackId, reason } = trackChangeDialog;
    if (!team?.teamId) return;
    if (!targetTrackId) {
      setError("Choose a target track first.");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason before moving this team.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await http.patch(
        `/api/coordinator/events/${selectedEventId}/team-formation/teams/${team.teamId}/track`,
        { trackId: Number(targetTrackId), reason: reason.trim() }
      );
      setDashboard(response.data?.data || null);
      await loadEventSubmissions();
      setSuccess("Team moved to the selected track.");
      closeTrackChangeDialog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to move team to another track"));
    } finally {
      setActionLoading(false);
    }
  };

  const balanceTracks = async () => {
    const normalizedReason = balanceTrackDialog.reason.trim();
    if (!normalizedReason) {
      setError("Enter a reason before balancing tracks.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await http.post(
        `/api/coordinator/events/${selectedEventId}/team-formation/tracks/balance`,
        { reason: normalizedReason }
      );
      setDashboard(response.data?.data || null);
      await loadEventSubmissions();
      setSuccess("Track balancing completed.");
      closeBalanceTrackDialog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to balance tracks"));
    } finally {
      setActionLoading(false);
    }
  };

  const mergeTrack = async () => {
    const { sourceTrackIds, newTrackName, reason } = mergeTrackDialog;
    if (sourceTrackIds.length < 2) {
      setError("Choose at least two source tracks first.");
      return;
    }
    if (!newTrackName.trim()) {
      setError("Enter a name for the new merged track.");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason before merging this track.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await http.post(
        `/api/coordinator/events/${selectedEventId}/team-formation/tracks/merge`,
        {
          sourceTrackIds: sourceTrackIds.map((trackId) => Number(trackId)),
          newTrackName: newTrackName.trim(),
          reason: reason.trim(),
        }
      );
      setDashboard(response.data?.data || null);
      await loadEventSubmissions();
      setSuccess("Track merged successfully.");
      closeMergeTrackDialog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to merge track"));
    } finally {
      setActionLoading(false);
    }
  };

  const cancelEvent = async () => {
    const normalizedReason = cancelEventDialog.reason.trim();
    if (!normalizedReason) {
      setError("Enter a reason before cancelling this event.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await http.post(`/api/coordinator/events/${selectedEventId}/cancel`, { reason: normalizedReason });
      await loadEvents();
      await Promise.all([loadDashboard(selectedEventId), loadEventSubmissions(selectedEventId)]);
      setSuccess("Event cancelled and all stakeholders were notified.");
      closeCancelEventDialog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to cancel event"));
    } finally {
      setActionLoading(false);
    }
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

      <Dialog open={removeMemberDialog.open} onClose={closeRemoveMemberDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              {removeMemberDialog.member
                ? `${removeMemberDialog.member.fullName || removeMemberDialog.member.username} will be removed from ${removeMemberDialog.team?.teamName}.`
                : "Choose a member to remove."}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              This change stays internal until the coordinator confirms the final event start.
            </Typography>
            <TextField
              label="Reason"
              value={removeMemberDialog.reason}
              onChange={(event) => setRemoveMemberDialog((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Explain why this member is being removed"
              multiline
              minRows={3}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRemoveMemberDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={removeMember}
            disabled={actionLoading || !removeMemberDialog.reason.trim()}
          >
            Remove member
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={disqualifyDialog.open} onClose={closeDisqualifyDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Disqualify Team</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              {disqualifyDialog.team
                ? `Disqualify ${disqualifyDialog.team.teamName} from ${disqualifyDialog.team.eventName || "this event"}.`
                : "Choose a team to disqualify."}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              This will reset the team back to a standalone team. Team members will stop seeing this as their current event, and mentors/team members will be notified.
            </Typography>
            <TextField
              label="Disqualification reason"
              value={disqualifyDialog.reason}
              onChange={(event) => setDisqualifyDialog((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Describe why this team is being disqualified"
              multiline
              minRows={3}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDisqualifyDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={disqualifyTeam}
            disabled={actionLoading || !disqualifyDialog.reason.trim()}
          >
            Disqualify
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={trackChangeDialog.open} onClose={closeTrackChangeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Move Team To Another Track</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              Move one team to another track after registration closes. Teams will only receive the final confirmed result when the event is started.
            </Typography>
            <TextField
              select
              label="Team"
              value={trackChangeDialog.team?.teamId || ""}
              onChange={(event) => {
                const selectedTeam = movableTeams.find((team) => String(team.teamId) === String(event.target.value)) || null;
                const nextTargetTrackId = (dashboard?.tracks || []).find((track) => String(track.trackId) !== String(selectedTeam?.trackId || ""))?.trackId || "";
                setTrackChangeDialog((current) => ({
                  ...current,
                  team: selectedTeam,
                  targetTrackId: nextTargetTrackId,
                }));
              }}
              fullWidth
            >
              {movableTeams.map((team) => (
                <MenuItem key={team.teamId} value={team.teamId}>
                  {team.teamName} ({team.trackName || "No track"})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Target track"
              value={trackChangeDialog.targetTrackId}
              onChange={(event) => setTrackChangeDialog((current) => ({ ...current, targetTrackId: event.target.value }))}
              fullWidth
            >
              {(dashboard?.tracks || [])
                .filter((track) => String(track.trackId) !== String(trackChangeDialog.team?.trackId || ""))
                .map((track) => (
                  <MenuItem key={track.trackId} value={track.trackId}>
                    {track.trackName} ({track.teamCount}/{track.maxTeams || "unlimited"} teams)
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              label="Reason"
              value={trackChangeDialog.reason}
              onChange={(event) => setTrackChangeDialog((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Explain why this team is being rebalanced to another track"
              multiline
              minRows={3}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTrackChangeDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={changeTeamTrack}
            disabled={actionLoading || !trackChangeDialog.team?.teamId || !trackChangeDialog.targetTrackId || !trackChangeDialog.reason.trim()}
          >
            Move team
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={balanceTrackDialog.open} onClose={closeBalanceTrackDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Balance Track</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              Re-distribute eligible teams as evenly as possible across the current tracks. The final confirmed result will only be announced after the coordinator starts the event.
            </Typography>
            <TextField
              label="Reason"
              value={balanceTrackDialog.reason}
              onChange={(event) => setBalanceTrackDialog((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Explain why track balancing is needed"
              multiline
              minRows={3}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBalanceTrackDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={balanceTracks}
            disabled={actionLoading || !balanceTrackDialog.reason.trim()}
          >
            Balance track
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mergeTrackDialog.open} onClose={closeMergeTrackDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Merge Track</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              Merge multiple underfilled tracks into one brand-new track so teams and pending placements move together. The final confirmed result will only be announced after the coordinator starts the event.
            </Typography>
            <TextField
              select
              label="Source tracks"
              value={mergeTrackDialog.sourceTrackIds}
              onChange={(event) => {
                setMergeTrackDialog((current) => ({
                  ...current,
                  sourceTrackIds: typeof event.target.value === "string"
                    ? event.target.value.split(",")
                    : event.target.value.map((value) => String(value)),
                }));
              }}
              fullWidth
              SelectProps={{
                multiple: true,
                renderValue: (selected) => mergeableTracks
                  .filter((track) => selected.includes(String(track.trackId)))
                  .map((track) => track.trackName)
                  .join(", "),
              }}
            >
              {mergeableTracks.map((track) => (
                <MenuItem key={track.trackId} value={String(track.trackId)}>
                  <Checkbox checked={mergeTrackDialog.sourceTrackIds.includes(String(track.trackId))} size="small" />
                  {track.trackName} ({track.teamCount}/{track.maxTeams || "unlimited"} teams)
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="New track name"
              value={mergeTrackDialog.newTrackName}
              onChange={(event) => setMergeTrackDialog((current) => ({ ...current, newTrackName: event.target.value }))}
              placeholder="Example: Product & Platform"
              fullWidth
              required
            />
            <TextField
              label="Reason"
              value={mergeTrackDialog.reason}
              onChange={(event) => setMergeTrackDialog((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Explain why these tracks should become one new track"
              multiline
              minRows={3}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMergeTrackDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={mergeTrack}
            disabled={actionLoading || mergeTrackDialog.sourceTrackIds.length < 2 || !mergeTrackDialog.newTrackName.trim() || !mergeTrackDialog.reason.trim()}
          >
            Merge track
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelEventDialog.open} onClose={closeCancelEventDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Event</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              Cancelling this event will stop registration, submissions, and further coordinator operations for everyone in this event.
            </Typography>
            <TextField
              label="Cancellation reason"
              value={cancelEventDialog.reason}
              onChange={(event) => setCancelEventDialog((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Explain why this event is being cancelled"
              multiline
              minRows={3}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelEventDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={cancelEvent}
            disabled={actionLoading || !cancelEventDialog.reason.trim()}
          >
            Cancel event
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={startEventDialog.open} onClose={closeStartEventDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Start Event</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              Starting this event now confirms the current team-management result immediately. If you do not start it manually, the system will start it automatically when the first round begins only if no unresolved team or track issue remains.
            </Typography>
            <Box
              sx={{
                p: 1.4,
                borderRadius: brand.radius.md,
                border: `1px solid ${remainingViolationCount ? "#FDE68A" : brand.colors.line}`,
                bgcolor: remainingViolationCount ? "#FFFBEB" : "#F8FAFC",
              }}
            >
              <Typography sx={{ fontWeight: 900, color: brand.colors.text }}>
                {remainingViolationCount
                  ? `${remainingViolationCount} unresolved item(s) still remain`
                  : "No unresolved action-required items remain"}
              </Typography>
              <Typography sx={{ color: brand.colors.muted, fontSize: 13, mt: 0.45 }}>
                {remainingViolationCount
                  ? "You can still continue, but these warnings/errors will remain in the final event setup."
                  : "The current setup is ready to move forward."}
              </Typography>
            </Box>
            {remainingViolationCount ? (
              <Stack spacing={1}>
                {dashboard?.actionRequired?.map((item, index) => (
                  <Box
                    key={`${item.type}-${item.teamId || item.trackId || item.individualRegistrationId || index}-start`}
                    sx={{
                      p: 1.05,
                      borderRadius: brand.radius.md,
                      border: `1px solid ${item.severity === "error" ? "#FCA5A5" : "#FDE68A"}`,
                      bgcolor: item.severity === "error" ? "#FEF2F2" : "#FFFBEB",
                    }}
                  >
                    <Typography sx={{ fontWeight: 800, fontSize: 13.2, color: brand.colors.text }}>
                      {item.message}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStartEventDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<PlayArrowRoundedIcon />}
            onClick={startEvent}
            disabled={actionLoading}
            sx={{ borderRadius: 999, fontWeight: 850 }}
          >
            Start event
          </Button>
        </DialogActions>
      </Dialog>

      <ModulePageHeader
        eyebrow="Registration Operations"
        title="Team Management"
        description="Review every team in the event, see member count, current track, assigned mentor, and handle post-registration balancing from one place."
      />

      <Stack spacing={2}>
        <Card className="ms-data-card">
          <CardContent>
            <Stack spacing={dashboard ? 2 : 0}>
              <TextField
                select
                label="Event"
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
                fullWidth
              >
                {events.map((event) => (
                  <MenuItem key={String(event.eventId)} value={String(event.eventId)}>
                    {event.name} - {event.status}
                  </MenuItem>
                ))}
              </TextField>

              {dashboard ? (
                <>
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        p: { xs: 1.6, md: 2 },
                        borderRadius: brand.radius.lg,
                        border: `1px solid ${brand.colors.line}`,
                        bgcolor: "#FFFFFF",
                      }}
                    >
                      <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ xs: "flex-start", lg: "center" }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ color: brand.colors.text, fontSize: { xs: 28, md: 34 }, fontWeight: 980, lineHeight: 1.05 }}>
                            {eventHeaderTitle}
                          </Typography>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 14, mt: 0.7 }}>
                            {eventHeaderSubtitle}
                          </Typography>
                        </Box>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap sx={{ width: { xs: "100%", lg: "auto" } }}>
                          <Button
                            variant="outlined"
                            startIcon={<RefreshRoundedIcon />}
                            onClick={refresh}
                            disabled={actionLoading}
                            sx={{ width: { xs: "100%", sm: "auto" }, borderRadius: 999, fontWeight: 850 }}
                          >
                            Refresh
                          </Button>
                          {!isAllEventsView && dashboard?.registrationClosed && dashboard?.eventStatus === "Ongoing" && !eventStartConfirmed ? (
                            <Button
                              variant="contained"
                              startIcon={<PlayArrowRoundedIcon />}
                              onClick={openStartEventDialog}
                              disabled={actionLoading || !selectedEventId}
                              sx={{ width: { xs: "100%", sm: "auto" }, borderRadius: 999, fontWeight: 850 }}
                            >
                              Start event
                            </Button>
                          ) : null}
                          {!isAllEventsView && dashboard?.eventStatus === "Ongoing" && !eventStartConfirmed ? (
                            <Button
                              variant="contained"
                              color="error"
                              onClick={openCancelEventDialog}
                              disabled={actionLoading || !selectedEventId}
                              sx={{ width: { xs: "100%", sm: "auto" }, borderRadius: 999, fontWeight: 850 }}
                            >
                              Cancel event
                            </Button>
                          ) : null}
                        </Stack>
                      </Stack>

                      <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.7 }}>
                        {isAllEventsView
                          ? [
                            `Total teams: ${dashboard.teams.length}`,
                            `Without event: ${teamsWithoutEventCount}`,
                            `Without track: ${teamsWithoutTrackCount}`,
                            `Teams needing members: ${incompleteTeamCount}`,
                          ].map((item) => (
                            <Chip
                              key={item}
                              label={item}
                              variant="outlined"
                              sx={{
                                height: "auto",
                                "& .MuiChip-label": {
                                  display: "block",
                                  py: 0.8,
                                  px: 1.2,
                                  fontWeight: 700,
                                },
                              }}
                            />
                          ))
                          : [
                            `Status: ${dashboard.eventStatus || "Unknown"}`,
                            `Team size: ${dashboard.minTeamSize}-${dashboard.maxTeamSize}`,
                            `Registration deadline: ${formatDateTime(dashboard.registrationEndAt)}`,
                            `Track mode: ${formatTrackModeLabel(dashboard.trackSelectionMode)}`,
                            `${urgentActionCount} must fix`,
                            `${warningActionCount} warnings`,
                            `${fullTrackCount} full tracks`,
                          ].map((item) => (
                            <Chip
                              key={item}
                              label={item}
                              variant="outlined"
                              sx={{
                                height: "auto",
                                "& .MuiChip-label": {
                                  display: "block",
                                  py: 0.8,
                                  px: 1.2,
                                  fontWeight: 700,
                                },
                              }}
                            />
                          ))}
                        {!isAllEventsView && eventStartConfirmed ? (
                          <Chip color="success" label="Event started" sx={{ fontWeight: 850 }} />
                        ) : null}
                      </Stack>

                      {!isAllEventsView && dashboard.registrationClosed ? (
                        <Typography sx={{ color: brand.colors.muted, fontSize: 12.8, mt: 1.2 }}>
                          {dashboard.registrationClosed
                            ? eventStartConfirmed
                              ? "Registration has closed and the event has already been started with the final confirmed setup."
                              : "Registration has closed. Coordinators can now rebalance tracks, move teams, merge underfilled tracks, or cancel the event. If the first round begins with no unresolved issue, the system will start the event automatically."
                            : null}
                        </Typography>
                      ) : null}
                    </Box>

                    {!isAllEventsView && !eventStartConfirmed && (hasActionRequired || coordinatorTrackActionsEnabled) ? (
                      <Box>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 1.1 }}>
                          <Box>
                            <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950 }}>
                              Action required
                            </Typography>
                            <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                              Review violations first, then use the coordinator actions below to finalize track handling.
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                            <Chip
                              label={`${dashboard.actionRequired.length} item(s)`}
                              color="warning"
                              sx={{ alignSelf: { xs: "flex-start", sm: "center" }, fontWeight: 850 }}
                            />
                            {coordinatorTrackActionsEnabled ? (
                              <>
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  onClick={openBalanceTrackDialog}
                                  disabled={actionLoading || mergeableTracks.length < 2}
                                  sx={{ borderRadius: 999, fontWeight: 850 }}
                                >
                                  Balance track
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  onClick={() => openTrackChangeDialog()}
                                  disabled={actionLoading || !movableTeams.length}
                                  sx={{ borderRadius: 999, fontWeight: 850 }}
                                >
                                  Move team
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  onClick={() => openMergeTrackDialog()}
                                  disabled={actionLoading || mergeableTracks.length < 2}
                                  sx={{ borderRadius: 999, fontWeight: 850 }}
                                >
                                  Merge track
                                </Button>
                              </>
                            ) : null}
                          </Stack>
                        </Stack>
                        <Stack spacing={1}>
                          {dashboard.actionRequired.length ? dashboard.actionRequired.map((item, index) => (
                            <Box
                              key={`${item.type}-${item.teamId || item.trackId || item.individualRegistrationId || index}`}
                              sx={{
                                p: 1.15,
                                borderRadius: brand.radius.md,
                                border: `1px solid ${item.severity === "error" ? "#FCA5A5" : "#FDE68A"}`,
                                bgcolor: item.severity === "error" ? "#FEF2F2" : "#FFFBEB",
                              }}
                            >
                              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.8}>
                                <Typography sx={{ color: brand.colors.text, fontWeight: 850, fontSize: 13.5 }}>{item.message}</Typography>
                                <Chip size="small" label={item.type} color={item.severity === "error" ? "error" : "warning"} />
                              </Stack>
                            </Box>
                          )) : (
                            <Box className="ms-empty">
                              <Typography fontWeight={850}>No blocking action right now</Typography>
                              <Typography color="text.secondary" variant="body2">
                                {eventStartConfirmed
                                  ? "The event has already been started with the final confirmed team-management result."
                                  : "The coordinator tools still stay here so all post-registration handling remains in one place."}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    ) : null}

                    {!isAllEventsView && dashboard.tracks.length ? (
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                          <RouteRoundedIcon sx={{ color: brand.colors.orange }} />
                          <Typography sx={{ color: brand.colors.text, fontSize: 17, fontWeight: 900 }}>
                            Track capacity
                          </Typography>
                        </Stack>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
                            gap: 1,
                          }}
                        >
                          {dashboard.tracks.map((track) => {
                            const capacityState = getTrackCapacityState(track, eventStartConfirmed);
                            return (
                              <Box
                                key={track.trackId}
                                sx={{
                                  p: 1.2,
                                  borderRadius: brand.radius.md,
                                  border: `1px solid ${capacityState.border}`,
                                  bgcolor: capacityState.bg,
                                }}
                              >
                                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                      <Typography sx={{ fontWeight: 900 }}>{track.trackName}</Typography>
                                      <Chip size="small" label={capacityState.label} color={capacityState.color} />
                                    </Stack>
                                    <Typography sx={{ color: brand.colors.muted, fontSize: 13, mt: 0.35 }}>
                                      Mentor(s): {track.mentorNames}
                                    </Typography>
                                    <Typography sx={{ color: brand.colors.text, fontSize: 12.6, mt: 0.45, fontWeight: 750 }}>
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
                        </Box>
                      </Box>
                    ) : null}

                    <Box>
                      <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={1.2} sx={{ mb: 1.5 }}>
                        <Box>
                          <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950 }}>
                            {isAllEventsView ? "All teams in system" : "Teams in event"}
                          </Typography>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                            {isAllEventsView
                              ? "Review every team across the whole system, including teams that are not attached to any event yet."
                              : "At a glance you can now see team name, member count, event, track, and mentor before opening details."}
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
                          label="Search team, event, track, member, or email"
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchRoundedIcon sx={{ color: brand.colors.muted }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                        {!isAllEventsView ? (
                          <>
                            <TextField
                              select
                              label="Track filter"
                              value={teamTrackFilter}
                              onChange={(event) => setTeamTrackFilter(event.target.value)}
                              sx={{ minWidth: { xs: "100%", lg: 220 } }}
                            >
                              <MenuItem value="ALL">All tracks</MenuItem>
                              <MenuItem value="UNASSIGNED">No track assigned</MenuItem>
                              {teamTrackOptions.map((track) => (
                                <MenuItem key={track.trackId} value={track.trackId}>
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
                          </>
                        ) : null}
                      </Stack>

                      <Stack spacing={1.8}>
                        {filteredTeams.length ? filteredTeams.map((team) => (
                          <TeamCard
                            key={team.teamId}
                            team={team}
                            submissions={submissionsByTeamId.get(team.teamId) || []}
                            maxTeamSize={dashboard.maxTeamSize}
                            expanded={expandedTeamId === team.teamId}
                            onToggle={() => setExpandedTeamId((current) => (current === team.teamId ? null : team.teamId))}
                            onRequestRemoveMember={openRemoveMemberDialog}
                            onRequestDisqualifyTeam={openDisqualifyDialog}
                            actionLoading={actionLoading}
                            rosterEditingLocked={eventStartConfirmed}
                            actionsDisabled={isAllEventsView}
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
                    </Box>

                  </Stack>
                </>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
