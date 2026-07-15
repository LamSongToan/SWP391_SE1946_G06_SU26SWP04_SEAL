import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { getApiErrorMessage, http } from "../../api/http";
import { brand } from "../../styles/designTokens";
import CenteredNotification from "../layout/CenteredNotification";
import ModulePageHeader from "../layout/ModulePageHeader";
import EventAwardsSection from "../event/EventAwardsSection";

function formatDateTime(value) {
  if (!value) return "Not scheduled";
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

function getAwardedTeamCount(event) {
  return (event?.awards || []).reduce((sum, award) => sum + (award?.winners?.length || 0), 0);
}

export default function AwardCenterPanel() {
  const [events, setEvents] = useState([]);
  const [ownedTeamIds, setOwnedTeamIds] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => String(event.eventId) === String(selectedEventId)) || events[0] || null,
    [events, selectedEventId]
  );

  useEffect(() => {
    if (selectedEvent) {
      return;
    }
    setSelectedEventId("");
  }, [selectedEvent]);

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const [eventResult, teamResult] = await Promise.allSettled([
        http.get("/api/public/events/catalog"),
        http.get("/api/teams/my"),
      ]);
      if (eventResult.status === "rejected") {
        throw eventResult.reason;
      }
      const response = eventResult.value;
      const nextEvents = response.data?.data || [];
      const nextTeams = teamResult.status === "fulfilled" ? teamResult.value.data?.data || [] : [];
      setEvents(nextEvents);
      setOwnedTeamIds(nextTeams.map((team) => team.teamId).filter((teamId) => teamId != null));
      if (nextEvents.length) {
        setSelectedEventId((current) => {
          if (current && nextEvents.some((event) => String(event.eventId) === String(current))) {
            return current;
          }
          return String(nextEvents[0].eventId);
        });
      } else {
        setSelectedEventId("");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load award center"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const clearNotification = () => setError("");

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
        message={error}
        severity="error"
        autoHideDuration={4500}
        onClose={clearNotification}
      />

      <ModulePageHeader
        eyebrow="Awards & Results"
        title="Award Center"
        description="Review planned prizes for upcoming events and published winners for completed results."
        actions={(
          <Button startIcon={<RefreshRoundedIcon />} onClick={loadEvents} variant="outlined">
            Refresh
          </Button>
        )}
      />

      {!events.length ? (
        <Box className="ms-empty">
          <Typography fontWeight={900}>No events available</Typography>
          <Typography color="text.secondary" variant="body2">
            Event awards will appear here after the coordinator publishes events to the catalog.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          <Card className="ms-data-card">
            <CardContent>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={1.4} justifyContent="space-between" alignItems={{ xs: "stretch", lg: "flex-end" }}>
                <TextField
                  select
                  label="Event"
                  value={selectedEvent ? String(selectedEvent.eventId) : ""}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                  sx={{ minWidth: { xs: "100%", lg: 360 } }}
                >
                  {events.map((event) => (
                    <MenuItem key={event.eventId} value={String(event.eventId)}>
                      {event.name}
                    </MenuItem>
                  ))}
                </TextField>

                {selectedEvent ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip icon={<EmojiEventsRoundedIcon fontSize="small" />} label={selectedEvent.status} variant="outlined" />
                    <Chip icon={<WorkspacePremiumRoundedIcon fontSize="small" />} label={`${selectedEvent.awards?.length || 0} award type${(selectedEvent.awards?.length || 0) === 1 ? "" : "s"}`} variant="outlined" />
                    <Chip
                      label={selectedEvent.awardResultsPublished
                        ? `${getAwardedTeamCount(selectedEvent)} awarded team(s)`
                        : `Competition ends ${formatDateTime(selectedEvent.competitionEndAt)}`}
                      color={selectedEvent.awardResultsPublished ? "success" : "warning"}
                      variant={selectedEvent.awardResultsPublished ? "filled" : "outlined"}
                    />
                  </Stack>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          {selectedEvent ? (
            <Card className="ms-data-card">
              <CardContent>
                <Stack spacing={1.2} sx={{ mb: 2 }}>
                  <Typography sx={{ color: brand.colors.text, fontSize: 28, fontWeight: 950 }}>
                    {selectedEvent.name}
                  </Typography>
                  <Typography color="text.secondary">
                    {selectedEvent.awardResultsPublished
                      ? "Winners and prize amounts are now visible for this event."
                      : "This event is still showing planned awards, prize money, and slot counts before final publication."}
                  </Typography>
                </Stack>

                <EventAwardsSection event={selectedEvent} highlightedTeamIds={ownedTeamIds} />
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}
