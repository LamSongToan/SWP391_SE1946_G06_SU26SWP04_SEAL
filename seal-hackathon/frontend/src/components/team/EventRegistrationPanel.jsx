import { useEffect, useMemo, useState } from "react";
import {
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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ModulePageHeader from "../layout/ModulePageHeader";
import CenteredNotification from "../layout/CenteredNotification";
import ConfirmActionDialog from "../layout/ConfirmActionDialog";
import EventCatalogExperience from "../event/EventCatalogExperience";
import { getApiErrorMessage, http } from "../../api/http";

function normalizeTrackMode(value) {
  return String(value || "").trim().toUpperCase();
}

function formatDateTime(value) {
  if (!value) return "not scheduled";
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

function registrationUnavailableLabel(event) {
  const status = String(event?.registrationStatus || "").toUpperCase();
  if (status === "NOT_OPEN_YET") {
    return `Registration opens ${formatDateTime(event.registrationStartAt)}`;
  }
  if (status === "CLOSED") {
    return "Registration closed";
  }
  return "Registration unavailable";
}

function registrationUnavailableReason(event) {
  const status = String(event?.registrationStatus || "").toUpperCase();
  if (status === "NOT_OPEN_YET") {
    return `Registration has not opened yet. It opens on ${formatDateTime(event.registrationStartAt)}.`;
  }
  if (status === "CLOSED") {
    return `Registration closed on ${formatDateTime(event.registrationEndAt)}.`;
  }
  return "This event is visible, but registration is not available right now.";
}

export default function EventRegistrationPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [individualSaving, setIndividualSaving] = useState(false);
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [individualRegistrations, setIndividualRegistrations] = useState([]);
  const [tracksByEvent, setTracksByEvent] = useState({});
  const [registerDialog, setRegisterDialog] = useState({
    open: false,
    event: null,
    teamId: "",
    trackId: "",
  });
  const [individualDialog, setIndividualDialog] = useState({
    open: false,
    event: null,
    trackId: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmation, setConfirmation] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmColor: "primary",
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const closeNotification = () => {
    setError("");
    setSuccess("");
  };

  const loadWorkspace = async () => {
    setLoading(true);
    setError("");
    try {
      const [eventResponse, teamResponse, individualResponse] = await Promise.all([
        http.get("/api/public/events/catalog"),
        http.get("/api/teams/my"),
        http.get("/api/teams/my/individual-registrations"),
      ]);
      setEvents(eventResponse.data?.data || []);
      setTeams(teamResponse.data?.data || []);
      setIndividualRegistrations(individualResponse.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load event registration workspace"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const teamOptions = useMemo(
    () => teams.filter((team) => team.currentUserLeader && !team.eventId && team.membershipValid),
    [teams]
  );

  const userRegisteredEventIds = useMemo(
    () => new Set(teams.filter((team) => team.eventId).map((team) => String(team.eventId))),
    [teams]
  );

  const registeredTeams = useMemo(
    () => teams.filter((team) => team.eventId),
    [teams]
  );

  const individualRegistrationByEvent = useMemo(
    () => new Map(individualRegistrations.map((registration) => [String(registration.eventId), registration])),
    [individualRegistrations]
  );

  const getEventTrackOptions = (eventId) => tracksByEvent[eventId] || [];

  const ensureEventTracksLoaded = async (event) => {
    if (!event?.eventId || normalizeTrackMode(event.trackSelectionMode) !== "TEAM_SELECT" || tracksByEvent[event.eventId]) {
      return;
    }

    const response = await http.get(`/api/teams/events/${event.eventId}/tracks`);
    setTracksByEvent((current) => ({ ...current, [event.eventId]: response.data?.data || [] }));
  };

  const openRegisterDialog = async (event) => {
    setRegisterDialog({
      open: true,
      event,
      teamId: "",
      trackId: "",
    });

    try {
      await ensureEventTracksLoaded(event);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load event tracks"));
    }
  };

  const closeRegisterDialog = () => {
    if (saving) return;
    setRegisterDialog({
      open: false,
      event: null,
      teamId: "",
      trackId: "",
    });
  };

  const closeIndividualDialog = () => {
    setIndividualDialog({
      open: false,
      event: null,
      trackId: "",
    });
  };

  const triggerRegisterConfirmation = () => {
    const { event, teamId, trackId } = registerDialog;
    if (!event || !teamId) return;

    if (normalizeTrackMode(event.trackSelectionMode) === "TEAM_SELECT" && !trackId) {
      setError("Choose a track before registering this team.");
      return;
    }

    const selectedTeam = teamOptions.find((team) => String(team.teamId) === String(teamId));
    setConfirmation({
      open: true,
      title: "Register team for event?",
      message: selectedTeam
        ? `${selectedTeam.teamName} will be registered into ${event.name}. After this, the team will move into that event workspace.`
        : `This team will be registered into ${event.name}.`,
      confirmLabel: "Register Team",
      confirmColor: "primary",
    });
  };

  const closeConfirmation = () => {
    if (confirmLoading) return;
    setConfirmation((current) => ({ ...current, open: false }));
  };

  const confirmRegistration = async () => {
    const { event, teamId, trackId } = registerDialog;
    if (!event || !teamId) return;

    setConfirmLoading(true);
    setSaving(true);
    setError("");
    try {
      await http.post(`/api/teams/${teamId}/register-event`, {
        eventId: event.eventId,
        trackId: trackId ? Number(trackId) : null,
      });
      setSuccess("Team registered for event.");
      closeRegisterDialog();
      closeConfirmation();
      await loadWorkspace();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to register team for event"));
    } finally {
      setConfirmLoading(false);
      setSaving(false);
    }
  };

  const submitIndividualRegistration = async (event, trackId = null) => {
    if (!event?.eventId) return;
    setIndividualSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await http.post(`/api/teams/events/${event.eventId}/individual-registration`, {
        trackId: trackId ? Number(trackId) : null,
      });
      const registration = response.data?.data;
      if (registration?.assignedTeamName) {
        setSuccess(`You were automatically matched into ${registration.assignedTeamName}.`);
      } else if (registration?.trackName) {
        setSuccess(`Individual registration saved for ${registration.trackName}. The system will wait until enough students are available, then auto-form a 3-5 member team.`);
      } else {
        setSuccess("Individual registration saved. The system will wait until enough students are available, then auto-form a 3-5 member team for this event.");
      }
      closeIndividualDialog();
      await loadWorkspace();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to register individually"));
    } finally {
      setIndividualSaving(false);
    }
  };

  const openIndividualRegisterDialog = async (event) => {
    if (!event?.eventId) return;
    if (normalizeTrackMode(event.trackSelectionMode) !== "TEAM_SELECT") {
      await submitIndividualRegistration(event, null);
      return;
    }

    setIndividualDialog({
      open: true,
      event,
      trackId: "",
    });

    try {
      await ensureEventTracksLoaded(event);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load event tracks"));
    }
  };

  const confirmIndividualRegistration = async () => {
    const { event, trackId } = individualDialog;
    if (!event) return;
    if (normalizeTrackMode(event.trackSelectionMode) === "TEAM_SELECT" && !trackId) {
      setError("Choose a track before registering individually.");
      return;
    }
    await submitIndividualRegistration(event, trackId);
  };

  const canRegisterEvent = (event) =>
    event.registrationAvailable && !userRegisteredEventIds.has(String(event.eventId)) && teamOptions.length > 0;

  const canRegisterIndividually = (event) =>
    !individualSaving
    && event.registrationAvailable
    && !userRegisteredEventIds.has(String(event.eventId))
    && !individualRegistrationByEvent.has(String(event.eventId));

  const registerLabelForEvent = (event) => {
    if (userRegisteredEventIds.has(String(event.eventId))) {
      return "Already joined this event";
    }
    if (individualRegistrationByEvent.has(String(event.eventId))) {
      return "Individual registration saved";
    }
    if (!event.registrationAvailable) {
      return registrationUnavailableLabel(event);
    }
    if (!teamOptions.length) {
      return "Register individually or create a ready team";
    }
    return "Register team";
  };

  const disableReasonForEvent = (event) => {
    if (userRegisteredEventIds.has(String(event.eventId))) {
      return "One of your teams is already registered in this event.";
    }
    if (individualRegistrationByEvent.has(String(event.eventId))) {
      return "You already registered individually for this event. Check your matching status above.";
    }
    if (!event.registrationAvailable) {
      return registrationUnavailableReason(event);
    }
    if (!teamOptions.length) {
      return "Create a ready team, or register individually so the system can match you into a team.";
    }
    return "";
  };

  if (loading) {
    return (
      <Box className="team-loading">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <CenteredNotification
        message={error || success}
        severity={error ? "error" : "success"}
        autoHideDuration={error ? 5500 : 3500}
        onClose={closeNotification}
      />

      <ConfirmActionDialog
        open={confirmation.open}
        title={confirmation.title}
        message={confirmation.message}
        confirmLabel={confirmation.confirmLabel}
        confirmColor={confirmation.confirmColor}
        confirmLoading={confirmLoading}
        onCancel={closeConfirmation}
        onConfirm={confirmRegistration}
      />

      <ModulePageHeader
        eyebrow="Event Access"
        title="Event Registration"
        description="Browse current and past events, review their competition brief, then register one of your ready teams."
        actions={(
          <Button startIcon={<RefreshRoundedIcon />} onClick={loadWorkspace} variant="outlined">
            Refresh
          </Button>
        )}
      />

      {registeredTeams.length ? (
        <Card className="ms-data-card" sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 1.4 }}>
              <Box>
                <Typography sx={{ fontWeight: 950 }}>My event team status</Typography>
                <Typography color="text.secondary" variant="body2">
                  Quick check for your registered team, assigned track, member readiness, and next submission step.
                </Typography>
              </Box>
              <Chip
                label={`${registeredTeams.length} active event team(s)`}
                color="success"
                variant="outlined"
                sx={{ alignSelf: { xs: "flex-start", sm: "center" }, fontWeight: 850 }}
              />
            </Stack>
            <Stack spacing={1}>
              {registeredTeams.map((team) => (
                <Box
                  key={team.teamId}
                  sx={{
                    p: 1.5,
                    border: "1px solid #e7ebf3",
                    borderRadius: 3,
                    bgcolor: team.membershipValid ? "#F0FDF4" : "#FFF7ED",
                  }}
                >
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} justifyContent="space-between">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 950 }}>{team.teamName}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {team.eventName || "Event pending"} | {team.trackName || "Track pending"} | {team.currentUserLeader ? "Leader" : "Member"}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ mt: 0.45, color: team.membershipValid ? "#15803D" : "#EA580C", fontWeight: 750 }}
                      >
                        {team.validationMessage || "Team membership status is ready."}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignItems: "center" }}>
                      <Chip size="small" label={`Members ${team.memberCount ?? 0}/5`} />
                      <Chip size="small" label={team.latestSubmissionStatus || "No submission yet"} variant="outlined" />
                      <Chip size="small" label={team.currentRoundName || "Round pending"} variant="outlined" />
                      {team.submissionDeadline ? (
                        <Chip size="small" color="warning" label={`Due ${formatDateTime(team.submissionDeadline)}`} />
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {individualRegistrations.length ? (
        <Card className="ms-data-card" sx={{ mb: 2 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 950, mb: 0.5 }}>Individual matching status</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 1.4 }}>
              Follow events where you registered without a team. The system will wait for enough individual registrations, then build a 3-5 member team automatically.
            </Typography>
            <Stack spacing={1}>
              {individualRegistrations.map((registration) => (
                <Box
                  key={registration.individualRegistrationId}
                  sx={{
                    p: 1.4,
                    border: "1px solid #e7ebf3",
                    borderRadius: 3,
                    bgcolor: registration.assignedTeamName ? "#F0FDF4" : "#FFF7ED",
                  }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontWeight: 900 }}>{registration.eventName}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {registration.assignedTeamName
                          ? `Assigned to ${registration.assignedTeamName}. Check Team Management for members, track, and submissions.`
                          : "Waiting for automatic matching. The system will form a 3-5 member team when enough individual registrations are available."}
                      </Typography>
                      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.45 }}>
                        Track: {registration.trackName || "System assignment pending"}
                      </Typography>
                    </Box>
                    <Chip
                      label={registration.assignedTeamName ? "Matched" : "Waiting"}
                      color={registration.assignedTeamName ? "success" : "warning"}
                      sx={{ alignSelf: { xs: "flex-start", sm: "center" }, fontWeight: 850 }}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <EventCatalogExperience
        events={events}
        mode="student"
        sectionTitle="Choose an event for your team"
        sectionDescription="Use the same event catalog flow as the public site, then register one ready team into the event you want to join, or register individually and wait for automatic team matching."
        onRegister={openRegisterDialog}
        onIndividualRegister={openIndividualRegisterDialog}
        canRegisterEvent={canRegisterEvent}
        canRegisterIndividually={canRegisterIndividually}
        registerLabelForEvent={registerLabelForEvent}
        individualRegisterLabelForEvent={(event) => {
          if (individualRegistrationByEvent.has(String(event.eventId))) return "Individual registration saved";
          if (!event.registrationAvailable) return registrationUnavailableLabel(event);
          return individualSaving ? "Registering..." : "Register individually";
        }}
        disableReasonForEvent={disableReasonForEvent}
      />

      <Dialog open={registerDialog.open} onClose={closeRegisterDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Register Team for Event</DialogTitle>
        <DialogContent>
          <Stack spacing={1.6} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              {registerDialog.event?.name}
            </Typography>

            <TextField
              select
              label="Team"
              value={registerDialog.teamId}
              onChange={(event) => setRegisterDialog((current) => ({ ...current, teamId: event.target.value }))}
              helperText={
                teamOptions.length
                  ? "Only your ready teams that are not registered yet are shown here."
                  : "You need a ready team with 3 to 5 members before registering for an event."
              }
              fullWidth
            >
              {teamOptions.map((team) => (
                <MenuItem key={team.teamId} value={String(team.teamId)}>
                  {team.teamName} ({team.memberCount}/5)
                </MenuItem>
              ))}
            </TextField>

            {normalizeTrackMode(registerDialog.event?.trackSelectionMode) === "TEAM_SELECT" ? (
              <TextField
                select
                label="Track"
                value={registerDialog.trackId}
                onChange={(event) => setRegisterDialog((current) => ({ ...current, trackId: event.target.value }))}
                helperText="This event allows teams to choose their own track. Tracks that already reached max capacity cannot be selected."
                fullWidth
              >
                {getEventTrackOptions(registerDialog.event?.eventId).map((track) => {
                  const full = track.maxTeams != null && Number(track.teamCount || 0) >= Number(track.maxTeams);
                  return (
                  <MenuItem key={track.trackId} value={String(track.trackId)} disabled={full}>
                    {track.name} {track.maxTeams != null ? `(${track.teamCount || 0}/${track.maxTeams})` : ""}{full ? " - Full" : ""}
                  </MenuItem>
                );})}
              </TextField>
            ) : (
              <Box
                sx={{
                  p: 1.4,
                  borderRadius: 3,
                  border: "1px solid #e7ebf3",
                  bgcolor: "#fbfcff",
                }}
              >
                <Typography sx={{ fontWeight: 800 }}>Track assignment</Typography>
                <Typography color="text.secondary" variant="body2">
                  This event will assign the track automatically after registration, prioritizing balanced distribution across tracks.
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRegisterDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={triggerRegisterConfirmation}
            disabled={saving || !registerDialog.teamId}
          >
            Register Team
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={individualDialog.open} onClose={closeIndividualDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Register Individually</DialogTitle>
        <DialogContent>
          <Stack spacing={1.6} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              {individualDialog.event?.name}
            </Typography>

            <TextField
              select
              label="Track"
              value={individualDialog.trackId}
              onChange={(event) => setIndividualDialog((current) => ({ ...current, trackId: event.target.value }))}
              helperText="Choose the track you want to wait in. Tracks that already reached max capacity cannot be selected."
              fullWidth
            >
              {getEventTrackOptions(individualDialog.event?.eventId).map((track) => {
                const full = track.maxTeams != null && Number(track.teamCount || 0) >= Number(track.maxTeams);
                return (
                  <MenuItem key={track.trackId} value={String(track.trackId)} disabled={full}>
                    {track.name} {track.maxTeams != null ? `(${track.teamCount || 0}/${track.maxTeams})` : ""}{full ? " - Full" : ""}
                  </MenuItem>
                );
              })}
            </TextField>

            <Typography color="text.secondary" variant="body2">
              The system will wait until enough students choose this track, then auto-form a 3-5 member team inside the same track.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeIndividualDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={confirmIndividualRegistration}
            disabled={individualSaving || !individualDialog.trackId}
          >
            {individualSaving ? "Registering..." : "Register Individually"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
