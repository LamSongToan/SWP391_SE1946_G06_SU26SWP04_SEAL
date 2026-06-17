import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
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

export default function EventRegistrationPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tracksByEvent, setTracksByEvent] = useState({});
  const [registerDialog, setRegisterDialog] = useState({
    open: false,
    event: null,
    teamId: "",
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
      const [eventResponse, teamResponse] = await Promise.all([
        http.get("/api/public/events/catalog"),
        http.get("/api/teams/my"),
      ]);
      setEvents(eventResponse.data?.data || []);
      setTeams(teamResponse.data?.data || []);
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

  const getEventTrackOptions = (eventId) => tracksByEvent[eventId] || [];

  const openRegisterDialog = async (event) => {
    setRegisterDialog({
      open: true,
      event,
      teamId: "",
      trackId: "",
    });

    if (normalizeTrackMode(event.trackSelectionMode) !== "TEAM_SELECT" || tracksByEvent[event.eventId]) {
      return;
    }

    try {
      const response = await http.get(`/api/teams/events/${event.eventId}/tracks`);
      setTracksByEvent((current) => ({ ...current, [event.eventId]: response.data?.data || [] }));
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

  const canRegisterEvent = (event) =>
    event.registrationAvailable && !userRegisteredEventIds.has(String(event.eventId)) && teamOptions.length > 0;

  const registerLabelForEvent = (event) => {
    if (userRegisteredEventIds.has(String(event.eventId))) {
      return "Already joined this event";
    }
    if (!event.registrationAvailable) {
      return "Registration closed";
    }
    if (!teamOptions.length) {
      return "Need a ready team";
    }
    return "Register team";
  };

  const disableReasonForEvent = (event) => {
    if (userRegisteredEventIds.has(String(event.eventId))) {
      return "One of your teams is already registered in this event.";
    }
    if (!teamOptions.length) {
      return "Create a ready team with 3 to 5 members first, then come back to register.";
    }
    if (!event.registrationAvailable) {
      return "This event is visible, but the registration window is not open right now.";
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

      <EventCatalogExperience
        events={events}
        mode="student"
        sectionTitle="Choose an event for your team"
        sectionDescription="Use the same event catalog flow as the public site, then register one ready team into the event you want to join."
        onRegister={openRegisterDialog}
        canRegisterEvent={canRegisterEvent}
        registerLabelForEvent={registerLabelForEvent}
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
                helperText="This event allows teams to choose their own track."
                fullWidth
              >
                {getEventTrackOptions(registerDialog.event?.eventId).map((track) => (
                  <MenuItem key={track.trackId} value={String(track.trackId)}>
                    {track.name}
                  </MenuItem>
                ))}
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
                  This event will assign the track automatically after registration.
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
    </Box>
  );
}
