import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import MilitaryTechRoundedIcon from "@mui/icons-material/MilitaryTechRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { isAuthSessionValid } from "../../api/http";
import { brand } from "../../styles/designTokens";

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

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSemesterLabel(event) {
  const semester = String(event?.semester || "").trim();
  const year = event?.year ? String(event.year).trim() : "";

  if (semester && year) return `${semester} ${year}`;
  if (semester) return semester;
  if (year) return year;
  return "Schedule pending";
}

function getEventBucket(event) {
  const now = Date.now();
  const status = String(event.status || "").toLowerCase();
  if (status === "ended") {
    return "past";
  }
  const endAt = event.competitionEndAt ? new Date(event.competitionEndAt).getTime() : null;
  if (endAt && endAt < now) {
    return "past";
  }
  return "upcoming";
}

function getStatusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "ongoing") {
    return { bg: "#ecfdf3", color: "#15803d" };
  }
  if (normalized === "ended") {
    return { bg: "#f3f4f6", color: "#475467" };
  }
  return { bg: "#fff7ed", color: "#ea580c" };
}

function buildCriteriaSummary(rounds) {
  const criterionMap = new Map();
  (rounds || []).forEach((round) => {
    (round.criteria || []).forEach((criterion) => {
      const key = `${criterion.criteriaName}-${criterion.criteriaType}-${criterion.weight ?? "na"}`;
      if (!criterionMap.has(key)) {
        criterionMap.set(key, criterion);
      }
    });
  });
  return Array.from(criterionMap.values());
}

export default function EventCatalogExperience({
  events = [],
  mode = "public",
  onRegister,
  canRegisterEvent,
  registerLabelForEvent,
  disableReasonForEvent,
  sectionTitle = "Event Catalog",
  sectionDescription = "Browse events and open one to review the full brief.",
  upcomingEmptyTitle = "No upcoming events yet",
  upcomingEmptyDescription = "New events will appear here once coordinators publish them.",
  pastEmptyTitle = "No past events yet",
  pastEmptyDescription = "Completed events will move here automatically.",
}) {
  const [activeBucket, setActiveBucket] = useState("upcoming");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [detailTab, setDetailTab] = useState("about");

  const groupedEvents = useMemo(() => {
    const upcoming = [];
    const past = [];
    events.forEach((event) => {
      if (getEventBucket(event) === "past") {
        past.push(event);
      } else {
        upcoming.push(event);
      }
    });
    return { upcoming, past };
  }, [events]);

  const visibleEvents = activeBucket === "past" ? groupedEvents.past : groupedEvents.upcoming;

  useEffect(() => {
    if (!visibleEvents.length) {
      setSelectedEventId(null);
      return;
    }
    const stillVisible = visibleEvents.some((event) => String(event.eventId) === String(selectedEventId));
    if (!stillVisible) {
      setSelectedEventId(visibleEvents[0].eventId);
    }
  }, [visibleEvents, selectedEventId]);

  const selectedEvent =
    visibleEvents.find((event) => String(event.eventId) === String(selectedEventId)) || visibleEvents[0] || null;

  const criteriaSummary = useMemo(
    () => buildCriteriaSummary(selectedEvent?.rounds || []),
    [selectedEvent]
  );

  const publicActionProps = useMemo(() => {
    const authenticated = isAuthSessionValid();
    if (authenticated) {
      return {
        component: RouterLink,
        to: "/dashboard?section=event-registration",
        label: "Open registration workspace",
      };
    }
    return {
      component: RouterLink,
      to: "/login",
      label: "Sign in to register",
    };
  }, []);

  const renderPrimaryAction = () => {
    if (!selectedEvent) return null;

    if (mode === "student") {
      const disabled = canRegisterEvent ? !canRegisterEvent(selectedEvent) : false;
      const label = registerLabelForEvent
        ? registerLabelForEvent(selectedEvent)
        : "Register team";
      return (
        <Button
          variant="contained"
          startIcon={<HowToRegRoundedIcon />}
          onClick={() => onRegister?.(selectedEvent)}
          disabled={disabled}
          sx={{
            minWidth: 220,
            height: 48,
            bgcolor: brand.colors.orange,
            "&:hover": { bgcolor: brand.colors.orangeDark },
          }}
        >
          {label}
        </Button>
      );
    }

    return (
      <Button
        variant="contained"
        component={publicActionProps.component}
        to={publicActionProps.to}
        endIcon={<KeyboardArrowRightRoundedIcon />}
        sx={{
          minWidth: 220,
          height: 48,
          bgcolor: brand.colors.orange,
          "&:hover": { bgcolor: brand.colors.orangeDark },
        }}
      >
        {publicActionProps.label}
      </Button>
    );
  };

  const renderEventList = () => {
    if (!visibleEvents.length) {
      return (
        <Box className="ms-empty" sx={{ minHeight: 280 }}>
          <Typography fontWeight={900}>
            {activeBucket === "past" ? pastEmptyTitle : upcomingEmptyTitle}
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 420 }}>
            {activeBucket === "past" ? pastEmptyDescription : upcomingEmptyDescription}
          </Typography>
        </Box>
      );
    }

    return (
      <Stack spacing={1.25}>
        {visibleEvents.map((event) => {
          const active = String(event.eventId) === String(selectedEvent?.eventId);
          const tone = getStatusTone(event.status);
          return (
            <Box
              key={event.eventId}
              component="button"
              type="button"
              onClick={() => setSelectedEventId(event.eventId)}
              sx={{
                width: "100%",
                textAlign: "left",
                p: 2,
                borderRadius: 3,
                border: active ? `1.5px solid ${brand.colors.orange}` : "1px solid #e7ebf3",
                bgcolor: active ? "#fffaf5" : "#fff",
                cursor: "pointer",
                transition: "all 160ms ease",
                boxShadow: active ? "0 18px 36px rgba(243,112,33,0.12)" : "none",
                "&:hover": {
                  borderColor: brand.colors.orange,
                  bgcolor: "#fffaf5",
                },
              }}
            >
              <Stack spacing={1.15}>
                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={event.status}
                      size="small"
                      sx={{ bgcolor: tone.bg, color: tone.color, fontWeight: 800 }}
                    />
                    <Chip
                      label={formatSemesterLabel(event)}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                  {event.registrationAvailable ? (
                    <Chip
                      label="Open"
                      size="small"
                      color="success"
                      icon={<TaskAltRoundedIcon fontSize="small" />}
                    />
                  ) : null}
                </Stack>
                <Typography sx={{ fontSize: 18, fontWeight: 900, color: "text.primary", lineHeight: 1.2 }}>
                  {event.name}
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 14, lineHeight: 1.6 }}>
                  {event.description || "No event description provided yet."}
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ color: "text.secondary", fontSize: 13 }}>
                  <Stack direction="row" spacing={0.7} alignItems="center">
                    <EventAvailableRoundedIcon sx={{ fontSize: 16 }} />
                    <span>{formatDate(event.registrationStartAt)}</span>
                  </Stack>
                  <Stack direction="row" spacing={0.7} alignItems="center">
                    <GroupsRoundedIcon sx={{ fontSize: 16 }} />
                    <span>{event.rounds?.length || 0} rounds</span>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    );
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", lg: "flex-end" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography sx={{ color: brand.colors.orange, fontSize: 13, fontWeight: 950, letterSpacing: 1.3 }}>
            EVENT CATALOG
          </Typography>
          <Typography sx={{ color: brand.colors.text, fontSize: { xs: 30, md: 42 }, fontWeight: 950, mt: 0.8 }}>
            {sectionTitle}
          </Typography>
          <Typography sx={{ color: brand.colors.muted, mt: 1, maxWidth: 760, lineHeight: 1.7 }}>
            {sectionDescription}
          </Typography>
        </Box>

        <Tabs
          value={activeBucket}
          onChange={(_, nextValue) => setActiveBucket(nextValue)}
          sx={{
            minHeight: 0,
            "& .MuiTabs-indicator": { display: "none" },
          }}
        >
          <Tab
            disableRipple
            value="past"
            label={`Past Events (${groupedEvents.past.length})`}
            sx={{
              minHeight: 42,
              textTransform: "none",
              borderRadius: 999,
              px: 2.2,
              mr: 1,
              color: brand.colors.text,
              fontWeight: 800,
              border: "1px solid #d7deea",
              "&.Mui-selected": {
                bgcolor: brand.colors.navy,
                color: "#fff",
                borderColor: brand.colors.navy,
              },
            }}
          />
          <Tab
            disableRipple
            value="upcoming"
            label={`Upcoming & Ongoing (${groupedEvents.upcoming.length})`}
            sx={{
              minHeight: 42,
              textTransform: "none",
              borderRadius: 999,
              px: 2.2,
              color: brand.colors.text,
              fontWeight: 800,
              border: "1px solid #d7deea",
              "&.Mui-selected": {
                bgcolor: brand.colors.navy,
                color: "#fff",
                borderColor: brand.colors.navy,
              },
            }}
          />
        </Tabs>
      </Stack>

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2.5} alignItems="stretch">
        <Box
          sx={{
            width: { xs: "100%", xl: 390 },
            flexShrink: 0,
            p: 2,
            borderRadius: 5,
            border: "1px solid #e7ebf3",
            bgcolor: "#fff",
            boxShadow: "0 24px 48px rgba(15,23,42,0.06)",
          }}
        >
          {renderEventList()}
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 2.2, md: 3 },
            borderRadius: 5,
            border: "1px solid #e7ebf3",
            bgcolor: "#fff",
            boxShadow: "0 24px 48px rgba(15,23,42,0.06)",
          }}
        >
          {!selectedEvent ? (
            <Box className="ms-empty" sx={{ minHeight: 520 }}>
              <Typography fontWeight={900}>Select an event</Typography>
              <Typography color="text.secondary" variant="body2">
                Pick an event from the list to review its details and registration requirements.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              <Box
                sx={{
                  p: { xs: 2.2, md: 3 },
                  borderRadius: 4,
                  color: "#fff",
                  background:
                    "linear-gradient(135deg, rgba(10,27,51,1) 0%, rgba(18,52,86,0.96) 54%, rgba(243,112,33,0.86) 100%)",
                }}
              >
                <Stack
                  direction={{ xs: "column", lg: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", lg: "center" }}
                  spacing={2.5}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.3 }}>
                      <Chip
                        label={selectedEvent.status}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.16)",
                          color: "#fff",
                          fontWeight: 900,
                        }}
                      />
                      <Chip
                        label={formatSemesterLabel(selectedEvent)}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.92)",
                          fontWeight: 800,
                        }}
                      />
                    </Stack>
                    <Typography sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 950, lineHeight: 1.04 }}>
                      {selectedEvent.name}
                    </Typography>
                    <Typography sx={{ mt: 1.25, color: "rgba(255,255,255,0.82)", maxWidth: 760, lineHeight: 1.7 }}>
                      {selectedEvent.description || "No event description provided yet."}
                    </Typography>
                  </Box>
                  {renderPrimaryAction()}
                </Stack>

                {mode === "student" && disableReasonForEvent?.(selectedEvent) ? (
                  <Typography sx={{ mt: 1.4, color: "rgba(255,255,255,0.72)", fontSize: 13.5 }}>
                    {disableReasonForEvent(selectedEvent)}
                  </Typography>
                ) : null}
              </Box>

              <Stack
                direction={{ xs: "column", md: "row" }}
                divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />}
                sx={{
                  borderRadius: 4,
                  border: "1px solid #e7ebf3",
                  overflow: "hidden",
                }}
              >
                {[
                  {
                    icon: <AccessTimeRoundedIcon sx={{ color: brand.colors.orange }} />,
                    title: "Registration window",
                    body: `${formatDateTime(selectedEvent.registrationStartAt)} - ${formatDateTime(selectedEvent.registrationEndAt)}`,
                  },
                  {
                    icon: <EventAvailableRoundedIcon sx={{ color: brand.colors.orange }} />,
                    title: "Competition window",
                    body: `${formatDateTime(selectedEvent.competitionStartAt)} - ${formatDateTime(selectedEvent.competitionEndAt)}`,
                  },
                  {
                    icon: <MilitaryTechRoundedIcon sx={{ color: brand.colors.orange }} />,
                    title: "Competition structure",
                    body: `${selectedEvent.rounds?.length || 0} rounds published`,
                  },
                ].map((item) => (
                  <Stack
                    key={item.title}
                    direction="row"
                    spacing={1.3}
                    sx={{ flex: 1, p: 2.2, alignItems: "flex-start", bgcolor: "#fff" }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 2.5,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "#fff5ed",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: "text.secondary" }}>
                        {item.title}
                      </Typography>
                      <Typography sx={{ mt: 0.6, fontWeight: 900, color: "text.primary", lineHeight: 1.5 }}>
                        {item.body}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>

              <Tabs
                value={detailTab}
                onChange={(_, nextValue) => setDetailTab(nextValue)}
                sx={{
                  minHeight: 0,
                  "& .MuiTabs-indicator": { display: "none" },
                  "& .MuiTab-root": {
                    minHeight: 40,
                    textTransform: "none",
                    px: 1.7,
                    mr: 1,
                    borderRadius: 999,
                    border: "1px solid #d7deea",
                    fontWeight: 800,
                    color: brand.colors.text,
                  },
                  "& .Mui-selected": {
                    bgcolor: "#fff5ed",
                    borderColor: "#ffd5b3",
                    color: brand.colors.orange,
                  },
                }}
              >
                <Tab value="about" label="About" />
                <Tab value="rounds" label={`Rounds (${selectedEvent.rounds?.length || 0})`} />
                <Tab value="criteria" label={`Criteria (${criteriaSummary.length})`} />
              </Tabs>

              {detailTab === "about" ? (
                <Stack spacing={2.25}>
                  <Typography sx={{ fontSize: 15.5, color: "text.secondary", lineHeight: 1.8 }}>
                    {selectedEvent.description || "This event description will be published by the coordinator."}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selectedEvent.registrationAvailable ? (
                      <Chip
                        color="success"
                        icon={<CheckCircleRoundedIcon fontSize="small" />}
                        label="Registration is currently open"
                      />
                    ) : (
                      <Chip variant="outlined" label="Registration is not open right now" />
                    )}
                    <Chip variant="outlined" label={formatSemesterLabel(selectedEvent)} />
                    <Chip variant="outlined" label={`${selectedEvent.rounds?.length || 0} published rounds`} />
                  </Stack>
                </Stack>
              ) : null}

              {detailTab === "rounds" ? (
                <Stack spacing={1.5}>
                  {(selectedEvent.rounds || []).length === 0 ? (
                    <Box className="ms-empty">
                      <Typography fontWeight={900}>No rounds published yet</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Round structure and scoring information will appear here after the coordinator publishes them.
                      </Typography>
                    </Box>
                  ) : (
                    selectedEvent.rounds.map((round) => (
                      <Box
                        key={round.roundId}
                        sx={{
                          p: 2,
                          borderRadius: 3.5,
                          border: "1px solid #e7ebf3",
                          bgcolor: "#fff",
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", md: "row" }}
                          justifyContent="space-between"
                          spacing={1.5}
                          sx={{ mb: 1.2 }}
                        >
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Typography sx={{ fontSize: 18, fontWeight: 900 }}>
                                Round {round.roundOrder}: {round.roundName}
                              </Typography>
                              {round.finalRound ? <Chip size="small" color="warning" label="Final round" /> : null}
                            </Stack>
                            <Typography sx={{ mt: 0.6, color: "text.secondary" }}>
                              Submission deadline: {formatDateTime(round.submissionDeadline)}
                            </Typography>
                          </Box>
                          <Chip
                            variant="outlined"
                            label={`${round.criteria?.length || 0} criteria`}
                            sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
                          />
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {(round.criteria || []).map((criterion) => (
                            <Chip
                              key={criterion.criteriaId || `${round.roundId}-${criterion.criteriaName}`}
                              label={`${criterion.criteriaName}${criterion.weight ? ` ${criterion.weight}%` : ""}`}
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Stack>
                      </Box>
                    ))
                  )}
                </Stack>
              ) : null}

              {detailTab === "criteria" ? (
                <Stack spacing={2}>
                  {criteriaSummary.length === 0 ? (
                    <Box className="ms-empty">
                      <Typography fontWeight={900}>No scoring criteria published yet</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Judges and students will see the published criteria here once the event setup is complete.
                      </Typography>
                    </Box>
                  ) : (
                    criteriaSummary.map((criterion) => (
                      <Box
                        key={criterion.criteriaId || `${criterion.criteriaName}-${criterion.criteriaType}`}
                        sx={{
                          p: 2,
                          borderRadius: 3.5,
                          border: "1px solid #e7ebf3",
                          bgcolor: "#fff",
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          spacing={1}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 900 }}>{criterion.criteriaName}</Typography>
                            <Typography sx={{ color: "text.secondary", mt: 0.4 }}>
                              Type: {criterion.criteriaType || "General"}
                            </Typography>
                          </Box>
                          <Chip
                            label={criterion.weight ? `${criterion.weight}%` : "Weight pending"}
                            sx={{
                              bgcolor: "#fff5ed",
                              color: brand.colors.orange,
                              fontWeight: 900,
                            }}
                          />
                        </Stack>
                      </Box>
                    ))
                  )}
                </Stack>
              ) : null}
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
