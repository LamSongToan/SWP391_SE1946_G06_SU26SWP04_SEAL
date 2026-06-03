import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid2 from "@mui/material/Grid2";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSearchParams } from "react-router-dom";
import { getApiErrorMessage, http } from "../../api/http";

const EVENT_STATUS_OPTIONS = [
  "Draft",
  "Configured",
  "RegistrationOpen",
  "Ongoing",
  "Scoring",
  "ResultPublished",
  "Closed",
  "Cancelled",
];

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
const EVENT_DRAFT_STORAGE_PREFIX = "seal-event-config-draft:";
let initialRoundDraftSequence = 0;

function getEventDraftStorageKey(eventId) {
  return `${EVENT_DRAFT_STORAGE_PREFIX}${eventId}`;
}

function readEventDraft(eventId) {
  if (!eventId) return null;
  try {
    const raw = sessionStorage.getItem(getEventDraftStorageKey(eventId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearEventDraft(eventId) {
  if (!eventId) return;
  sessionStorage.removeItem(getEventDraftStorageKey(eventId));
}

function nextInitialRoundDraftId() {
  initialRoundDraftSequence += 1;
  return `draft-round-${initialRoundDraftSequence}`;
}

function createEmptyDateParts(defaultYear = String(CURRENT_YEAR)) {
  return { day: "", month: "", year: defaultYear };
}

function createEmptyDateTimeParts(defaultYear = String(CURRENT_YEAR)) {
  return { day: "", month: "", year: defaultYear, hour: "23", minute: "59" };
}

function parseDateParts(raw, fallbackYear = String(CURRENT_YEAR)) {
  if (!raw) return createEmptyDateParts(fallbackYear);
  const [year, month, day] = raw.split("-");
  return {
    day: day || "",
    month: month || "",
    year: year || fallbackYear,
  };
}

function parseDateTimeParts(raw, fallbackYear = String(CURRENT_YEAR)) {
  if (!raw) return createEmptyDateTimeParts(fallbackYear);
  const [datePart = "", timePart = "23:59"] = raw.split("T");
  const [year, month, day] = datePart.split("-");
  const [hour = "23", minute = "59"] = timePart.split(":");
  return {
    day: day || "",
    month: month || "",
    year: year || fallbackYear,
    hour,
    minute,
  };
}

function getDaysInMonth(year, month) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

function getDayOptions(parts) {
  const totalDays = getDaysInMonth(parts.year, parts.month);
  return Array.from({ length: totalDays }, (_, index) => String(index + 1).padStart(2, "0"));
}

function normalizeDateParts(parts, key, value) {
  const next = { ...parts, [key]: value };
  if (key === "month" || key === "year") {
    const maxDay = getDaysInMonth(next.year, next.month);
    if (next.day && Number(next.day) > maxDay) {
      next.day = String(maxDay).padStart(2, "0");
    }
  }
  return next;
}

function isValidDateParts(parts) {
  if (!parts.day || !parts.month || !parts.year) return false;
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  const maxDay = getDaysInMonth(parts.year, parts.month);
  return day >= 1 && day <= maxDay;
}

function isValidDateTimeParts(parts) {
  if (!isValidDateParts(parts)) return false;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function buildDateValue(parts) {
  if (!isValidDateParts(parts)) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function buildDateTimeValue(parts) {
  if (!isValidDateTimeParts(parts)) return "";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function getYearOptions(...candidateYears) {
  const sanitized = candidateYears
    .flat()
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 2000);
  const minYear = Math.min(CURRENT_YEAR - 1, ...(sanitized.length ? sanitized.map((value) => value - 1) : [CURRENT_YEAR - 1]));
  const maxYear = Math.max(CURRENT_YEAR + 6, ...(sanitized.length ? sanitized.map((value) => value + 1) : [CURRENT_YEAR + 6]));
  return Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
}

const EMPTY_EVENT_FORM = {
  name: "",
  season: "Summer",
  year: String(CURRENT_YEAR),
  startDateParts: createEmptyDateParts(),
  endDateParts: createEmptyDateParts(),
  status: "Draft",
  description: "",
};

function createEventFormFromEvent(event) {
  return {
    name: event?.name || "",
    season: event?.season || "Summer",
    year: String(event?.year || CURRENT_YEAR),
    startDateParts: parseDateParts(event?.startDate, String(event?.year || CURRENT_YEAR)),
    endDateParts: parseDateParts(event?.endDate, String(event?.year || CURRENT_YEAR)),
    status: event?.status || "Draft",
    description: event?.description || "",
  };
}

const EMPTY_ROUND_FORM = {
  roundName: "",
  roundOrder: 1,
  submissionDeadlineParts: createEmptyDateTimeParts(),
  promotionRuleTopN: 1,
};

const createInitialTrack = () => ({ name: "" });
const createInitialRound = (order = 1, defaultYear = String(CURRENT_YEAR)) => ({
  draftId: nextInitialRoundDraftId(),
  roundName: "",
  roundOrder: order,
  submissionDeadlineParts: createEmptyDateTimeParts(defaultYear),
  promotionRuleTopN: 1,
});

const createTrackDraft = (track = null) => ({
  draftId: track?.trackId ? `track-${track.trackId}` : `draft-track-${crypto.randomUUID()}`,
  trackId: track?.trackId ?? null,
  name: track?.name || "",
});

const createRoundDraft = (round = null, fallbackYear = String(CURRENT_YEAR)) => ({
  draftId: round?.roundId ? `round-${round.roundId}` : nextInitialRoundDraftId(),
  roundId: round?.roundId ?? null,
  roundName: round?.roundName || "",
  roundOrder: Number(round?.roundOrder || 1),
  submissionDeadlineParts: round?.submissionDeadline
    ? parseDateTimeParts(toDateTimeInput(round.submissionDeadline), fallbackYear)
    : createEmptyDateTimeParts(fallbackYear),
  promotionRuleTopN: Number(round?.promotionRuleTopN || 1),
});

function toDateRange(startDate, endDate) {
  const format = (raw) => (raw ? new Date(raw).toLocaleDateString("en-GB") : "N/A");
  return `${format(startDate)} - ${format(endDate)}`;
}

function toDateTimeInput(raw) {
  if (!raw) return "";
  return raw.length >= 16 ? raw.slice(0, 16) : raw;
}

function formatDateTime(raw) {
  if (!raw) return "N/A";
  return new Date(raw).toLocaleString("en-GB");
}

function clampMinimumOne(value) {
  if (value === "" || value === null || value === undefined) return "1";
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) return "1";
  return String(parsed);
}

function reindexRounds(rounds) {
  return rounds.map((round, index) => ({ ...round, roundOrder: index + 1 }));
}

function SortableContainer({ id, children, sx }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      sx={{
        position: "relative",
        zIndex: isDragging ? 2 : 1,
        opacity: isDragging ? 0.9 : 1,
        ...sx,
      }}
    >
      {children({
        dragHandleProps: {
          ...attributes,
          ...listeners,
        },
        isDragging,
      })}
    </Box>
  );
}

function validateEventForm(form) {
  const startDate = buildDateValue(form.startDateParts);
  const endDate = buildDateValue(form.endDateParts);

  const errors = {
    startDate: startDate ? "" : "Select a valid start date.",
    endDate: endDate ? "" : "Select a valid end date.",
  };

  if (!errors.startDate && !errors.endDate && endDate <= startDate) {
    errors.endDate = "End date must be after start date.";
  }

  return {
    startDate,
    endDate,
    errors,
    hasError: Boolean(errors.startDate || errors.endDate),
  };
}

function validateDeadlineParts(parts, startDate, endDate) {
  const value = buildDateTimeValue(parts);
  if (!value) {
    return {
      value: "",
      error: "Select a valid submission deadline with date and time.",
    };
  }

  const datePortion = value.slice(0, 10);
  if (startDate && endDate && (datePortion < startDate || datePortion > endDate)) {
    return {
      value,
      error: "Submission deadline must stay within the event date range.",
    };
  }

  return { value, error: "" };
}

function DateSelectFields({ label, parts, yearOptions, error, onChange }) {
  return (
    <Stack spacing={0.8}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
        <TextField select label="Day" value={parts.day} onChange={onChange("day")} error={Boolean(error)} fullWidth>
          {getDayOptions(parts).map((day) => (
            <MenuItem key={`${label}-day-${day}`} value={day}>{day}</MenuItem>
          ))}
        </TextField>
        <TextField select label="Month" value={parts.month} onChange={onChange("month")} error={Boolean(error)} fullWidth>
          {MONTH_OPTIONS.map((month) => (
            <MenuItem key={`${label}-month-${month.value}`} value={month.value}>{month.label}</MenuItem>
          ))}
        </TextField>
        <TextField select label="Year" value={parts.year} onChange={onChange("year")} error={Boolean(error)} fullWidth>
          {yearOptions.map((year) => (
            <MenuItem key={`${label}-year-${year}`} value={String(year)}>{year}</MenuItem>
          ))}
        </TextField>
      </Stack>
      {error ? <Typography variant="caption" color="error.main">{error}</Typography> : null}
    </Stack>
  );
}

function DateTimeSelectFields({ label, parts, yearOptions, error, onChange }) {
  return (
    <Stack spacing={0.8}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap" useFlexGap>
        <TextField select label="Day" value={parts.day} onChange={onChange("day")} error={Boolean(error)} fullWidth>
          {getDayOptions(parts).map((day) => (
            <MenuItem key={`${label}-day-${day}`} value={day}>{day}</MenuItem>
          ))}
        </TextField>
        <TextField select label="Month" value={parts.month} onChange={onChange("month")} error={Boolean(error)} fullWidth>
          {MONTH_OPTIONS.map((month) => (
            <MenuItem key={`${label}-month-${month.value}`} value={month.value}>{month.label}</MenuItem>
          ))}
        </TextField>
        <TextField select label="Year" value={parts.year} onChange={onChange("year")} error={Boolean(error)} fullWidth>
          {yearOptions.map((year) => (
            <MenuItem key={`${label}-year-${year}`} value={String(year)}>{year}</MenuItem>
          ))}
        </TextField>
        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 210 } }}>
          <TextField select label="Hour" value={parts.hour} onChange={onChange("hour")} error={Boolean(error)} sx={{ width: { xs: "50%", sm: 96 } }}>
            {HOUR_OPTIONS.map((hour) => (
              <MenuItem key={`${label}-hour-${hour}`} value={hour}>{hour}</MenuItem>
            ))}
          </TextField>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "text.secondary", mt: { xs: 0.5, sm: 0.75 }, lineHeight: 1 }}>
            :
          </Typography>
          <TextField select label="Minute" value={parts.minute} onChange={onChange("minute")} error={Boolean(error)} sx={{ width: { xs: "50%", sm: 96 } }}>
            {MINUTE_OPTIONS.map((minute) => (
              <MenuItem key={`${label}-minute-${minute}`} value={minute}>{minute}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>
      {error ? <Typography variant="caption" color="error.main">{error}</Typography> : null}
    </Stack>
  );
}

export default function EventConfigurationPanel({ onDirtyChange = () => {} }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [draftTracks, setDraftTracks] = useState([]);
  const [draftRounds, setDraftRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [eventDialogError, setEventDialogError] = useState("");

  const [eventDialog, setEventDialog] = useState({ open: false, mode: "create", eventId: null });
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [managedEventForm, setManagedEventForm] = useState(EMPTY_EVENT_FORM);
  const [initialRounds, setInitialRounds] = useState([createInitialRound(1, EMPTY_EVENT_FORM.year)]);
  const [initialTracks, setInitialTracks] = useState([createInitialTrack()]);
  const [eventTouched, setEventTouched] = useState({});
  const [managedEventTouched, setManagedEventTouched] = useState({});
  const [initialRoundTouched, setInitialRoundTouched] = useState([{}]);
  const [draftRoundTouched, setDraftRoundTouched] = useState({});
  const selectedEventId = searchParams.get("eventId") || "";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selectedEvent = useMemo(
    () => events.find((event) => String(event.eventId) === String(selectedEventId)) || null,
    [events, selectedEventId]
  );

  const selectedEventSummary = useMemo(() => ({
    roundCount: draftRounds.length,
    trackCount: draftTracks.length,
    deadlineCount: draftRounds.filter((round) => buildDateTimeValue(round.submissionDeadlineParts)).length,
    promotionRuleCount: draftRounds.filter((round) => Number(round.promotionRuleTopN) > 0).length,
  }), [draftRounds, draftTracks.length]);

  const eventValidation = useMemo(() => validateEventForm(eventForm), [eventForm]);
  const managedEventValidation = useMemo(() => validateEventForm(managedEventForm), [managedEventForm]);
  const createRoundDeadlineChecks = useMemo(
    () => initialRounds.map((round) => validateDeadlineParts(
      round.submissionDeadlineParts,
      eventValidation.startDate,
      eventValidation.endDate
    )),
    [initialRounds, eventValidation.endDate, eventValidation.startDate]
  );
  const eventYearOptions = useMemo(
    () => getYearOptions(
      eventForm.year,
      eventForm.startDateParts.year,
      eventForm.endDateParts.year,
      initialRounds.map((round) => round.submissionDeadlineParts.year)
    ),
    [eventForm, initialRounds]
  );
  const managedEventYearOptions = useMemo(
    () => getYearOptions(
      managedEventForm.year,
      managedEventForm.startDateParts.year,
      managedEventForm.endDateParts.year
    ),
    [managedEventForm]
  );
  const roundYearOptions = useMemo(
    () => getYearOptions(
      managedEventForm.year,
      managedEventForm.startDateParts.year,
      managedEventForm.endDateParts.year,
      draftRounds.map((round) => round.submissionDeadlineParts.year)
    ),
    [draftRounds, managedEventForm]
  );
  const managedEventDirty = useMemo(() => {
    if (!selectedEvent) return false;
    return JSON.stringify({
      name: managedEventForm.name,
      season: managedEventForm.season,
      year: managedEventForm.year,
      startDate: managedEventValidation.startDate,
      endDate: managedEventValidation.endDate,
      status: managedEventForm.status,
      description: managedEventForm.description || "",
    }) !== JSON.stringify({
      name: selectedEvent.name || "",
      season: selectedEvent.season || "Summer",
      year: String(selectedEvent.year || CURRENT_YEAR),
      startDate: selectedEvent.startDate || "",
      endDate: selectedEvent.endDate || "",
      status: selectedEvent.status || "Draft",
      description: selectedEvent.description || "",
    });
  }, [managedEventForm, managedEventValidation.endDate, managedEventValidation.startDate, selectedEvent]);
  const tracksDirty = useMemo(() => (
    JSON.stringify(draftTracks.map((track) => ({
      trackId: track.trackId ?? null,
      name: track.name.trim(),
    }))) !== JSON.stringify(tracks.map((track) => ({
      trackId: track.trackId ?? null,
      name: (track.name || "").trim(),
    })))
  ), [draftTracks, tracks]);
  const roundValidationMap = useMemo(() => Object.fromEntries(
    draftRounds.map((round) => [
      round.draftId,
      validateDeadlineParts(
        round.submissionDeadlineParts,
        managedEventValidation.startDate,
        managedEventValidation.endDate
      ),
    ])
  ), [draftRounds, managedEventValidation.endDate, managedEventValidation.startDate]);
  const roundsDirty = useMemo(() => (
    JSON.stringify(draftRounds.map((round, index) => ({
      roundId: round.roundId ?? null,
      roundName: round.roundName.trim(),
      roundOrder: index + 1,
      submissionDeadline: buildDateTimeValue(round.submissionDeadlineParts),
      promotionRuleTopN: Number(round.promotionRuleTopN),
    }))) !== JSON.stringify(rounds.map((round) => ({
      roundId: round.roundId ?? null,
      roundName: (round.roundName || "").trim(),
      roundOrder: Number(round.roundOrder),
      submissionDeadline: toDateTimeInput(round.submissionDeadline),
      promotionRuleTopN: Number(round.promotionRuleTopN),
    })))
  ), [draftRounds, rounds]);
  const configurationDirty = managedEventDirty || tracksDirty || roundsDirty;
  const configurationHasValidationError = useMemo(() => (
    managedEventValidation.hasError
    || draftTracks.some((track) => !track.name.trim())
    || draftRounds.some((round) => !round.roundName.trim() || roundValidationMap[round.draftId]?.error)
  ), [draftRounds, draftTracks, managedEventValidation.hasError, roundValidationMap]);

  const fetchEvents = async () => {
    const response = await http.get("/api/coordinator/events");
    const data = response.data?.data || [];
    setEvents(data);
    if (data.length === 0) {
      setSearchParams({ section: "event-config" }, { replace: true });
      setTracks([]);
      setRounds([]);
      setDraftTracks([]);
      setDraftRounds([]);
      return;
    }
    if (selectedEventId && !data.some((event) => String(event.eventId) === String(selectedEventId))) {
      setSearchParams({ section: "event-config" }, { replace: true });
      setTracks([]);
      setRounds([]);
      setDraftTracks([]);
      setDraftRounds([]);
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

  const fetchRounds = async (eventId) => {
    if (!eventId) {
      setRounds([]);
      return;
    }
    const response = await http.get(`/api/coordinator/events/${eventId}/rounds`);
    setRounds(response.data?.data || []);
  };

  const refreshEventList = async () => {
    setLoading(true);
    setError("");
    try {
      await fetchEvents();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load event configuration"));
    } finally {
      setLoading(false);
    }
  };

  const refreshSelectedEventData = async (eventId) => {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      await Promise.all([fetchRounds(eventId), fetchTracks(eventId)]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load event details"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshEventList();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    refreshSelectedEventData(selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEvent) {
      setManagedEventForm(EMPTY_EVENT_FORM);
      setManagedEventTouched({});
      setDraftTracks([]);
      setDraftRounds([]);
      setDraftRoundTouched({});
      return;
    }
    const storedDraft = readEventDraft(selectedEvent.eventId);
    const nextManagedEventForm = storedDraft?.managedEventForm || createEventFormFromEvent(selectedEvent);
    const nextDraftTracks = storedDraft?.draftTracks?.length
      ? storedDraft.draftTracks
      : tracks.map((track) => createTrackDraft(track));
    const nextDraftRounds = storedDraft?.draftRounds?.length
      ? storedDraft.draftRounds
      : rounds.map((round) => createRoundDraft(round, String(selectedEvent.year || CURRENT_YEAR)));

    setManagedEventForm(nextManagedEventForm);
    setManagedEventTouched({});
    setDraftTracks(nextDraftTracks);
    setDraftRounds(reindexRounds(nextDraftRounds));
    setDraftRoundTouched({});
  }, [selectedEvent, rounds, tracks]);

  useEffect(() => {
    onDirtyChange(configurationDirty);
  }, [configurationDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  useEffect(() => {
    if (!selectedEvent?.eventId) return;
    if (!configurationDirty) {
      clearEventDraft(selectedEvent.eventId);
      return;
    }

    sessionStorage.setItem(
      getEventDraftStorageKey(selectedEvent.eventId),
      JSON.stringify({
        managedEventForm,
        draftTracks,
        draftRounds,
      })
    );
  }, [configurationDirty, draftRounds, draftTracks, managedEventForm, selectedEvent?.eventId]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!configurationDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [configurationDirty]);

  const openEventConfiguration = (eventId) => {
    setSearchParams({ section: "event-config", eventId: String(eventId) });
  };

  const backToEventList = () => {
    if (configurationDirty) {
      const discard = window.confirm("You have unsaved event changes. Leave this event without saving?");
      if (!discard) return;
      clearEventDraft(selectedEvent?.eventId);
    }
    window.dispatchEvent(new CustomEvent("seal-skip-next-search-guard"));
    setSearchParams({ section: "event-config" });
  };

  const resetCreateSetup = () => {
    setInitialRounds([createInitialRound(1, eventForm.year || String(CURRENT_YEAR))]);
    setInitialTracks([createInitialTrack()]);
    setInitialRoundTouched([{}]);
  };

  const openCreateEvent = () => {
    setEventDialogError("");
    setEventDialog({ open: true, mode: "create", eventId: null });
    const nextForm = {
      ...EMPTY_EVENT_FORM,
      startDateParts: createEmptyDateParts(EMPTY_EVENT_FORM.year),
      endDateParts: createEmptyDateParts(EMPTY_EVENT_FORM.year),
    };
    setEventForm(nextForm);
    setInitialRounds([createInitialRound(1, nextForm.year)]);
    setInitialTracks([createInitialTrack()]);
    setEventTouched({});
    setInitialRoundTouched([{}]);
  };

  const closeEventDialog = () => {
    if (saving) return;
    setEventDialogError("");
    setEventDialog({ open: false, mode: "create", eventId: null });
    const nextForm = {
      ...EMPTY_EVENT_FORM,
      startDateParts: createEmptyDateParts(EMPTY_EVENT_FORM.year),
      endDateParts: createEmptyDateParts(EMPTY_EVENT_FORM.year),
    };
    setEventForm(nextForm);
    setInitialRounds([createInitialRound(1, nextForm.year)]);
    setInitialTracks([createInitialTrack()]);
    setEventTouched({});
    setInitialRoundTouched([{}]);
  };

  const onEventChange = (key) => (event) => {
    const nextValue = event.target.value;
    if (key !== "year") {
      setEventForm((prev) => ({ ...prev, [key]: nextValue }));
      return;
    }

    setEventForm((prev) => {
      const previousYear = prev.year;
      const syncYear = (parts) => (!parts.year || parts.year === previousYear ? { ...parts, year: nextValue } : parts);
      return {
        ...prev,
        year: nextValue,
        startDateParts: syncYear(prev.startDateParts),
        endDateParts: syncYear(prev.endDateParts),
      };
    });
    setInitialRounds((prev) => prev.map((round) => ({
      ...round,
      submissionDeadlineParts:
        !round.submissionDeadlineParts.year || round.submissionDeadlineParts.year === eventForm.year
          ? { ...round.submissionDeadlineParts, year: nextValue }
          : round.submissionDeadlineParts,
    })));
  };

  const onEventDatePartChange = (field, part) => (event) => {
    const nextValue = event.target.value;
    setEventTouched((prev) => ({ ...prev, [field]: true }));
    setEventForm((prev) => ({
      ...prev,
      [field]: normalizeDateParts(prev[field], part, nextValue),
    }));
  };

  const onManagedEventChange = (key) => (event) => {
    const nextValue = event.target.value;
    if (key !== "year") {
      setManagedEventForm((prev) => ({ ...prev, [key]: nextValue }));
      return;
    }

    setManagedEventForm((prev) => {
      const previousYear = prev.year;
      const syncYear = (parts) => (!parts.year || parts.year === previousYear ? { ...parts, year: nextValue } : parts);
      return {
        ...prev,
        year: nextValue,
        startDateParts: syncYear(prev.startDateParts),
        endDateParts: syncYear(prev.endDateParts),
      };
    });
    setDraftRounds((prev) => prev.map((round) => ({
      ...round,
      submissionDeadlineParts:
        !round.submissionDeadlineParts.year || round.submissionDeadlineParts.year === managedEventForm.year
          ? { ...round.submissionDeadlineParts, year: nextValue }
          : round.submissionDeadlineParts,
    })));
  };

  const onManagedEventDatePartChange = (field, part) => (event) => {
    const nextValue = event.target.value;
    setManagedEventTouched((prev) => ({ ...prev, [field]: true }));
    setManagedEventForm((prev) => ({
      ...prev,
      [field]: normalizeDateParts(prev[field], part, nextValue),
    }));
  };

  const onInitialRoundChange = (index, key, value) => {
    setInitialRounds((prev) => prev.map((round, currentIndex) => (
      currentIndex === index
        ? {
            ...round,
            [key]: key === "roundOrder" || key === "promotionRuleTopN"
              ? clampMinimumOne(value)
              : value,
          }
        : round
    )));
  };

  const onInitialRoundDeadlinePartChange = (index, part, value) => {
    setInitialRoundTouched((prev) => prev.map((item, currentIndex) => (
      currentIndex === index ? { ...item, submissionDeadlineParts: true } : item
    )));
    setInitialRounds((prev) => prev.map((round, currentIndex) => (
      currentIndex === index
        ? {
            ...round,
            submissionDeadlineParts: part === "hour" || part === "minute"
              ? { ...round.submissionDeadlineParts, [part]: value }
              : normalizeDateParts(round.submissionDeadlineParts, part, value),
          }
        : round
    )));
  };

  const addInitialRound = () => {
    setInitialRounds((prev) => [...prev, createInitialRound(prev.length + 1, eventForm.year)]);
    setInitialRoundTouched((prev) => [...prev, {}]);
  };

  const removeInitialRound = (index) => {
    setInitialRounds((prev) => reindexRounds(prev
      .filter((_, currentIndex) => currentIndex !== index)
    ));
    setInitialRoundTouched((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const reorderInitialRound = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= initialRounds.length) return;
    const nextRounds = reindexRounds(arrayMove(initialRounds, fromIndex, toIndex));
    setInitialRounds(nextRounds);
    setInitialRoundTouched(arrayMove(initialRoundTouched, fromIndex, toIndex));
  };

  const moveInitialRoundByStep = (index, step) => {
    reorderInitialRound(index, index + step);
  };

  const onInitialRoundDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const fromIndex = initialRounds.findIndex((round) => round.draftId === active.id);
    const toIndex = initialRounds.findIndex((round) => round.draftId === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    reorderInitialRound(fromIndex, toIndex);
  };

  const onInitialTrackChange = (index, value) => {
    setInitialTracks((prev) => prev.map((track, currentIndex) => (
      currentIndex === index ? { ...track, name: value } : track
    )));
  };

  const addInitialTrack = () => {
    setInitialTracks((prev) => [...prev, createInitialTrack()]);
  };

  const removeInitialTrack = (index) => {
    setInitialTracks((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const saveEvent = async () => {
    const initialRoundError = createRoundDeadlineChecks.find((result) => result.error)?.error;
    if (eventValidation.hasError || (eventDialog.mode === "create" && initialRoundError)) {
      setEventTouched({ startDateParts: true, endDateParts: true });
      if (eventDialog.mode === "create") {
        setInitialRoundTouched((prev) => prev.map((item) => ({ ...item, submissionDeadlineParts: true })));
      }
      setEventDialogError(initialRoundError || eventValidation.errors.startDate || eventValidation.errors.endDate);
      return;
    }

    setSaving(true);
    setEventDialogError("");
    try {
      const eventPayload = {
        name: eventForm.name,
        season: eventForm.season,
        year: Number(eventForm.year),
        startDate: eventValidation.startDate,
        endDate: eventValidation.endDate,
        status: eventForm.status,
        description: eventForm.description,
      };

      if (eventDialog.mode === "create") {
        await http.post("/api/coordinator/events/setup", {
          event: eventPayload,
          rounds: initialRounds.map((round) => ({
            roundName: round.roundName,
            roundOrder: Number(round.roundOrder),
            promotionRuleTopN: Number(round.promotionRuleTopN),
            submissionDeadline: `${buildDateTimeValue(round.submissionDeadlineParts)}:00`,
          })),
          tracks: initialTracks.map((track) => ({ name: track.name })),
        });
        closeEventDialog();
        await refreshEventList();
      } else {
        await http.put(`/api/coordinator/events/${eventDialog.eventId}`, eventPayload);
        closeEventDialog();
          await refreshEventList();
        }
      } catch (err) {
      setEventDialogError(getApiErrorMessage(err, "Failed to save event"));
    } finally {
      setSaving(false);
    }
  };

  const saveManagedEvent = async () => {
    if (!selectedEvent) return;
    const invalidRoundDeadline = draftRounds
      .map((round) => roundValidationMap[round.draftId])
      .find((result) => result?.error)?.error;
    const hasBlankTrack = draftTracks.some((track) => !track.name.trim());
    const hasBlankRoundName = draftRounds.some((round) => !round.roundName.trim());

    if (managedEventValidation.hasError || invalidRoundDeadline || hasBlankTrack || hasBlankRoundName) {
      setManagedEventTouched({ startDateParts: true, endDateParts: true });
      setDraftRoundTouched(
        Object.fromEntries(draftRounds.map((round) => [round.draftId, { submissionDeadlineParts: true }]))
      );
      setError(
        managedEventValidation.errors.startDate
        || managedEventValidation.errors.endDate
        || invalidRoundDeadline
        || (hasBlankTrack ? "Track name cannot be empty." : "")
        || (hasBlankRoundName ? "Round name cannot be empty." : "")
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      await http.put(`/api/coordinator/events/${selectedEvent.eventId}/configuration`, {
        event: {
          name: managedEventForm.name,
          season: managedEventForm.season,
          year: Number(managedEventForm.year),
          startDate: managedEventValidation.startDate,
          endDate: managedEventValidation.endDate,
          status: managedEventForm.status,
          description: managedEventForm.description,
        },
        tracks: draftTracks.map((track) => ({
          trackId: track.trackId,
          name: track.name,
        })),
        rounds: draftRounds.map((round, index) => ({
          roundId: round.roundId,
          roundName: round.roundName,
          roundOrder: index + 1,
          promotionRuleTopN: Number(round.promotionRuleTopN),
          submissionDeadline: `${roundValidationMap[round.draftId].value}:00`,
        })),
      });
      clearEventDraft(selectedEvent.eventId);
      await refreshEventList();
      await refreshSelectedEventData(selectedEvent.eventId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update event"));
    } finally {
      setSaving(false);
    }
  };

  const resetManagedEventChanges = () => {
    if (!selectedEvent) return;
    clearEventDraft(selectedEvent.eventId);
    setManagedEventForm(createEventFormFromEvent(selectedEvent));
    setManagedEventTouched({});
    setDraftTracks(tracks.map((track) => createTrackDraft(track)));
    setDraftRounds(reindexRounds(rounds.map((round) => createRoundDraft(round, String(selectedEvent.year || CURRENT_YEAR)))));
    setDraftRoundTouched({});
    setError("");
  };

  const deleteEvent = async (eventId) => {
    const yes = window.confirm("Delete this event? Related tracks and rounds will also be removed.");
    if (!yes) return;
    setError("");
    try {
      await http.delete(`/api/coordinator/events/${eventId}`);
      if (String(eventId) === String(selectedEventId)) {
        setSearchParams({ section: "event-config" });
        setTracks([]);
        setRounds([]);
      }
      await refreshEventList();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete event"));
    }
  };

  const addDraftTrack = () => {
    setDraftTracks((prev) => [...prev, createTrackDraft()]);
  };

  const onDraftTrackChange = (draftId, value) => {
    setDraftTracks((prev) => prev.map((track) => (
      track.draftId === draftId ? { ...track, name: value } : track
    )));
  };

  const removeDraftTrack = (draftId) => {
    if (draftTracks.length <= 1) return;
    setDraftTracks((prev) => prev.filter((track) => track.draftId !== draftId));
  };

  const addDraftRound = () => {
    setDraftRounds((prev) => reindexRounds([
      ...prev,
      createRoundDraft(null, String(managedEventForm.year || CURRENT_YEAR)),
    ]));
  };

  const onDraftRoundChange = (draftId, key, value) => {
    setDraftRounds((prev) => prev.map((round) => (
      round.draftId === draftId
        ? {
            ...round,
            [key]: key === "promotionRuleTopN" ? clampMinimumOne(value) : value,
          }
        : round
    )));
  };

  const onDraftRoundDeadlinePartChange = (draftId, part, value) => {
    setDraftRoundTouched((prev) => ({
      ...prev,
      [draftId]: { ...(prev[draftId] || {}), submissionDeadlineParts: true },
    }));
    setDraftRounds((prev) => prev.map((round) => (
      round.draftId === draftId
        ? {
            ...round,
            submissionDeadlineParts: part === "hour" || part === "minute"
              ? { ...round.submissionDeadlineParts, [part]: value }
              : normalizeDateParts(round.submissionDeadlineParts, part, value),
          }
        : round
    )));
  };

  const removeDraftRound = (draftId) => {
    if (draftRounds.length <= 1) return;
    setDraftRounds((prev) => reindexRounds(prev.filter((round) => round.draftId !== draftId)));
    setDraftRoundTouched((prev) => {
      const next = { ...prev };
      delete next[draftId];
      return next;
    });
  };

  const reorderDraftRounds = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= draftRounds.length) return;
    setDraftRounds((prev) => reindexRounds(arrayMove(prev, fromIndex, toIndex)));
  };

  const moveRoundByStep = (draftId, step) => {
    const currentIndex = draftRounds.findIndex((round) => round.draftId === draftId);
    if (currentIndex === -1) return;
    reorderDraftRounds(currentIndex, currentIndex + step);
  };

  const onPersistedRoundDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const fromIndex = draftRounds.findIndex((round) => round.draftId === active.id);
    const toIndex = draftRounds.findIndex((round) => round.draftId === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    reorderDraftRounds(fromIndex, toIndex);
  };

  return (
    <Box>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ py: 5, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      ) : !selectedEvent ? (
        <Card className="ms-data-card">
          <CardContent>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", lg: "center" }}
              spacing={1.2}
              sx={{ mb: 1.8 }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Hackathon Events</Typography>
                <Typography color="text.secondary">
                  Pick one event below to move into detailed configuration.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`${events.length} event${events.length === 1 ? "" : "s"}`} variant="outlined" />
                <Button variant="outlined" onClick={refreshEventList} disabled={loading}>
                  Refresh
                </Button>
                <Button variant="contained" onClick={openCreateEvent}>
                  Create Event
                </Button>
              </Stack>
            </Stack>

            {events.length === 0 ? (
              <Box sx={{ py: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>No hackathon events yet</Typography>
                <Typography color="text.secondary">
                  Use Create Event to add the first season. The event list will appear here once one has been created.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {events.map((event) => (
                  <Card key={event.eventId} variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Stack
                        direction={{ xs: "column", lg: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", lg: "center" }}
                        spacing={1.5}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.8 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {event.name}
                            </Typography>
                            <Chip
                              label={event.status}
                              size="small"
                              color={event.status === "Configured" ? "success" : "default"}
                            />
                          </Stack>
                          <Typography color="text.secondary" sx={{ mb: 0.5 }}>
                            {event.season} {event.year} - {toDateRange(event.startDate, event.endDate)}
                          </Typography>
                          <Typography color="text.secondary">
                            {event.description?.trim() || "No description has been added for this event yet."}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                          <Button variant="contained" onClick={() => openEventConfiguration(event.eventId)}>
                            Edit
                          </Button>
                          <Button color="error" variant="outlined" onClick={() => deleteEvent(event.eventId)}>
                            Delete
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          <Card className="ms-data-card">
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={1.2}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Managing Event</Typography>
                  <Typography color="text.secondary">
                    You are now configuring <strong style={{ color: "#0f172a" }}>{selectedEvent.name}</strong>.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" onClick={() => refreshSelectedEventData(selectedEventId)} disabled={loading}>
                    Refresh
                  </Button>
                  <Button variant="outlined" onClick={backToEventList}>
                    Back to Event List
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card className="ms-data-card">
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Event Details</Typography>
                  <Typography color="text.secondary">
                    Update the core event information here. Changes stay local on this page until you confirm them with the Update Event button below.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" color="error" variant="outlined" onClick={() => deleteEvent(selectedEvent.eventId)}>
                    Delete Event
                  </Button>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                <Chip label={`Status: ${managedEventForm.status}`} color={managedEventForm.status === "Configured" ? "success" : "default"} />
                <Chip label={`${selectedEventSummary.roundCount} rounds`} variant="outlined" />
                <Chip label={`${selectedEventSummary.trackCount} tracks`} variant="outlined" />
                <Chip label={`${selectedEventSummary.deadlineCount} deadlines`} variant="outlined" />
                <Chip label={`${selectedEventSummary.promotionRuleCount} top-N rules`} variant="outlined" />
              </Stack>
              {managedEventDirty ? (
                <Alert severity="warning" variant="outlined" sx={{ mb: 1.5 }}>
                  You have unsaved event changes. Click <strong>Update Event</strong> at the bottom to keep them.
                </Alert>
              ) : null}
              <Stack spacing={1.5} sx={{ mb: 1.5 }}>
                <TextField label="Event Name" value={managedEventForm.name} onChange={onManagedEventChange("name")} fullWidth />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField select label="Season" value={managedEventForm.season} onChange={onManagedEventChange("season")} fullWidth>
                    <MenuItem value="Spring">Spring</MenuItem>
                    <MenuItem value="Summer">Summer</MenuItem>
                    <MenuItem value="Fall">Fall</MenuItem>
                  </TextField>
                  <TextField select label="Year" value={managedEventForm.year} onChange={onManagedEventChange("year")} fullWidth>
                    {managedEventYearOptions.map((year) => (
                      <MenuItem key={`managed-event-year-${year}`} value={String(year)}>{year}</MenuItem>
                    ))}
                  </TextField>
                  <TextField select label="Status" value={managedEventForm.status} onChange={onManagedEventChange("status")} fullWidth>
                    {EVENT_STATUS_OPTIONS.map((status) => (
                      <MenuItem key={`managed-event-status-${status}`} value={status}>{status}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
                <DateSelectFields
                  label="Start Date"
                  parts={managedEventForm.startDateParts}
                  yearOptions={managedEventYearOptions}
                  error={managedEventTouched.startDateParts ? managedEventValidation.errors.startDate : ""}
                  onChange={(part) => onManagedEventDatePartChange("startDateParts", part)}
                />
                <DateSelectFields
                  label="End Date"
                  parts={managedEventForm.endDateParts}
                  yearOptions={managedEventYearOptions}
                  error={managedEventTouched.endDateParts ? managedEventValidation.errors.endDate : ""}
                  onChange={(part) => onManagedEventDatePartChange("endDateParts", part)}
                />
                <TextField
                  label="Description"
                  value={managedEventForm.description}
                  onChange={onManagedEventChange("description")}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Stack>

            </CardContent>
          </Card>

          <Card className="ms-data-card">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Rounds</Typography>
                  <Typography color="text.secondary">
                    Define the shared stages of the event. Each round advances the top N teams of every track into the next round.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.7 }}>
                    Order is read from top to bottom. Round 1 is the first stage, rounds below are later stages, and the sequence must stay consecutive without gaps.
                    Drag a block or use the arrows to reorder.
                  </Typography>
                </Box>
                <Button variant="contained" size="small" onClick={addDraftRound}>Add Round</Button>
              </Stack>

              {draftRounds.length === 0 ? (
                <Typography color="text.secondary">No rounds yet. Add at least one round before marking this event as Configured.</Typography>
              ) : (
                <>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onPersistedRoundDragEnd}>
                    <SortableContext items={draftRounds.map((round) => round.draftId)} strategy={verticalListSortingStrategy}>
                      <Stack spacing={1.2}>
                        {draftRounds.map((round) => (
                          <SortableContainer key={round.draftId} id={round.draftId}>
                            {({ dragHandleProps, isDragging }) => (
                              <Card
                                variant="outlined"
                                sx={{
                                  borderRadius: 3,
                                  borderColor: isDragging ? "primary.main" : "divider",
                                  boxShadow: isDragging ? "0 18px 40px rgba(37,99,235,0.18)" : "none",
                                  backgroundColor: isDragging ? "rgba(37, 99, 235, 0.04)" : "background.paper",
                                }}
                              >
                                <CardContent sx={{ p: 2 }}>
                                  <Stack spacing={1.5}>
                                    <Stack
                                      direction={{ xs: "column", md: "row" }}
                                      justifyContent="space-between"
                                      alignItems={{ xs: "flex-start", md: "center" }}
                                      spacing={1.2}
                                    >
                                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                        <Box
                                          {...dragHandleProps}
                                          sx={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            p: 0.7,
                                            borderRadius: 999,
                                            backgroundColor: "action.hover",
                                            cursor: "grab",
                                            touchAction: "none",
                                          }}
                                        >
                                          <DragIndicatorRoundedIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                        </Box>
                                        <Typography sx={{ fontWeight: 700 }}>{round.roundName || `Round ${round.roundOrder}`}</Typography>
                                        <Chip size="small" label={`Order ${round.roundOrder}`} color="primary" variant="outlined" />
                                      </Stack>
                                        <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap>
                                          <Tooltip title="Move earlier">
                                            <span>
                                              <IconButton
                                                size="small"
                                                onClick={() => moveRoundByStep(round.draftId, -1)}
                                                disabled={saving || Number(round.roundOrder) === 1}
                                                sx={{ border: "1px solid", borderColor: "divider" }}
                                              >
                                                <ArrowUpwardRoundedIcon fontSize="small" />
                                              </IconButton>
                                            </span>
                                          </Tooltip>
                                          <Tooltip title="Move later">
                                            <span>
                                              <IconButton
                                                size="small"
                                                onClick={() => moveRoundByStep(round.draftId, 1)}
                                                disabled={saving || Number(round.roundOrder) === draftRounds.length}
                                                sx={{ border: "1px solid", borderColor: "divider" }}
                                              >
                                                <ArrowDownwardRoundedIcon fontSize="small" />
                                              </IconButton>
                                            </span>
                                          </Tooltip>
                                          <Button
                                            size="small"
                                            color="error"
                                            variant="outlined"
                                            disabled={draftRounds.length <= 1}
                                            onClick={() => removeDraftRound(round.draftId)}
                                          >
                                          Delete
                                        </Button>
                                      </Stack>
                                    </Stack>

                                    <Grid2 container spacing={2} alignItems="flex-start">
                                      <Grid2 size={{ xs: 12, lg: 5 }}>
                                        <Stack spacing={1.5}>
                                          <TextField
                                            label="Round Name"
                                            value={round.roundName}
                                            onChange={(event) => onDraftRoundChange(round.draftId, "roundName", event.target.value)}
                                            fullWidth
                                          />
                                          <TextField
                                            label="Top N Teams Per Track"
                                            type="number"
                                            value={round.promotionRuleTopN}
                                            onChange={(event) => onDraftRoundChange(round.draftId, "promotionRuleTopN", event.target.value)}
                                            inputProps={{ min: 1, step: 1 }}
                                            fullWidth
                                          />
                                        </Stack>
                                      </Grid2>
                                      <Grid2 size={{ xs: 12, lg: 7 }}>
                                        <DateTimeSelectFields
                                          label="Submission Deadline"
                                          parts={round.submissionDeadlineParts}
                                          yearOptions={roundYearOptions}
                                          error={draftRoundTouched[round.draftId]?.submissionDeadlineParts ? roundValidationMap[round.draftId]?.error : ""}
                                          onChange={(part) => (event) => onDraftRoundDeadlinePartChange(round.draftId, part, event.target.value)}
                                        />
                                      </Grid2>
                                    </Grid2>
                                  </Stack>
                                </CardContent>
                              </Card>
                            )}
                          </SortableContainer>
                        ))}
                      </Stack>
                    </SortableContext>
                  </DndContext>
                  {draftRounds.length <= 1 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      Each event must keep at least one round.
                    </Typography>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="ms-data-card">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Tracks</Typography>
                  <Typography color="text.secondary">
                    Tracks classify subject areas such as AI, Web, Mobile, or IoT. Teams register into one track, then compete inside the shared round structure.
                  </Typography>
                </Box>
                <Button variant="contained" size="small" onClick={addDraftTrack}>Add Track</Button>
              </Stack>

              {draftTracks.length === 0 ? (
                <Typography color="text.secondary">No tracks yet. Add at least one track so teams have a category to register into.</Typography>
              ) : (
                <>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {draftTracks.map((track, index) => (
                        <TableRow key={track.draftId} hover>
                          <TableCell>
                            <TextField
                              label={`Track ${index + 1}`}
                              value={track.name}
                              onChange={(event) => onDraftTrackChange(track.draftId, event.target.value)}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                disabled={draftTracks.length <= 1}
                                onClick={() => removeDraftTrack(track.draftId)}
                              >
                                Delete
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {draftTracks.length <= 1 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                      Each event must keep at least one track.
                    </Typography>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="ms-data-card">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.8 }}>Judging Setup</Typography>
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                Tracks only classify theme areas. Judging should still rely on a common rubric across tracks if you want one overall champion for the whole event.
              </Typography>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Rubric & Scoring Criteria</Typography>
                      <Typography color="text.secondary">
                        Planned per round so coordinators can keep one shared judging framework even when teams belong to different tracks.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Judge Assignment</Typography>
                      <Typography color="text.secondary">
                        Planned for assigning judges by round while still preserving fair comparison through common criteria.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid2>
              </Grid2>
            </CardContent>
          </Card>

          <Card className="ms-data-card">
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Update Event</Typography>
                  <Typography color="text.secondary">
                    Save event details, rounds, and tracks together when you are ready.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={resetManagedEventChanges} disabled={!configurationDirty || saving}>
                    Reset Changes
                  </Button>
                  <Button
                    variant="contained"
                    onClick={saveManagedEvent}
                    disabled={saving || configurationHasValidationError || !configurationDirty}
                  >
                    {saving ? "Updating..." : "Update Event"}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Dialog open={eventDialog.open} onClose={closeEventDialog} maxWidth="md" fullWidth>
        <DialogTitle>{eventDialog.mode === "create" ? "Create Event" : "Edit Event"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {eventDialogError ? <Alert severity="error">{eventDialogError}</Alert> : null}
            <TextField label="Event Name" value={eventForm.name} onChange={onEventChange("name")} fullWidth />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField select label="Season" value={eventForm.season} onChange={onEventChange("season")} fullWidth>
                <MenuItem value="Spring">Spring</MenuItem>
                <MenuItem value="Summer">Summer</MenuItem>
                <MenuItem value="Fall">Fall</MenuItem>
              </TextField>
              <TextField select label="Year" value={eventForm.year} onChange={onEventChange("year")} fullWidth>
                {eventYearOptions.map((year) => (
                  <MenuItem key={`event-year-${year}`} value={String(year)}>{year}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <DateSelectFields
              label="Start Date"
              parts={eventForm.startDateParts}
              yearOptions={eventYearOptions}
              error={eventTouched.startDateParts ? eventValidation.errors.startDate : ""}
              onChange={(part) => onEventDatePartChange("startDateParts", part)}
            />
            <DateSelectFields
              label="End Date"
              parts={eventForm.endDateParts}
              yearOptions={eventYearOptions}
              error={eventTouched.endDateParts ? eventValidation.errors.endDate : ""}
              onChange={(part) => onEventDatePartChange("endDateParts", part)}
            />
            <TextField
              select
              label="Status"
              value={eventForm.status}
              onChange={onEventChange("status")}
              fullWidth
              disabled={eventDialog.mode === "create"}
              helperText={eventDialog.mode === "create" ? "New events always start as Draft." : ""}
            >
              {EVENT_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={eventForm.description}
              onChange={onEventChange("description")}
              fullWidth
              multiline
              rows={3}
            />

            {eventDialog.mode === "create" ? (
              <>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Initial Rounds</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Every new event must start with at least one round. The top block becomes Round 1, and blocks below it become later rounds in sequence.
                        </Typography>
                      </Box>
                      <Button variant="text" onClick={addInitialRound}>Add Round</Button>
                    </Stack>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onInitialRoundDragEnd}>
                      <SortableContext items={initialRounds.map((round) => round.draftId)} strategy={verticalListSortingStrategy}>
                        <Stack spacing={1.2}>
                          {initialRounds.map((round, index) => (
                            <SortableContainer key={round.draftId} id={round.draftId}>
                              {({ dragHandleProps, isDragging }) => (
                                <Card
                                  variant="outlined"
                                  sx={{
                                    borderRadius: 3,
                                    borderColor: isDragging ? "primary.main" : "divider",
                                    boxShadow: isDragging ? "0 18px 40px rgba(37,99,235,0.18)" : "none",
                                    backgroundColor: isDragging ? "rgba(37, 99, 235, 0.04)" : "background.paper",
                                  }}
                                >
                                  <CardContent sx={{ p: 2 }}>
                                    <Stack spacing={1.2}>
                                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                          <Box
                                            {...dragHandleProps}
                                            sx={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              p: 0.7,
                                              borderRadius: 999,
                                              backgroundColor: "action.hover",
                                              cursor: "grab",
                                              touchAction: "none",
                                            }}
                                          >
                                            <DragIndicatorRoundedIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                          </Box>
                                          <Typography sx={{ fontWeight: 700 }}>Round {index + 1}</Typography>
                                          <Chip size="small" label={`Order ${index + 1}`} variant="outlined" color="primary" />
                                        </Stack>
                                        <Stack direction="row" spacing={0.6} alignItems="center">
                                          <Tooltip title="Move earlier">
                                            <span>
                                              <IconButton
                                                size="small"
                                                onClick={() => moveInitialRoundByStep(index, -1)}
                                                disabled={index === 0}
                                                sx={{ border: "1px solid", borderColor: "divider" }}
                                              >
                                                <ArrowUpwardRoundedIcon fontSize="small" />
                                              </IconButton>
                                            </span>
                                          </Tooltip>
                                          <Tooltip title="Move later">
                                            <span>
                                              <IconButton
                                                size="small"
                                                onClick={() => moveInitialRoundByStep(index, 1)}
                                                disabled={index === initialRounds.length - 1}
                                                sx={{ border: "1px solid", borderColor: "divider" }}
                                              >
                                                <ArrowDownwardRoundedIcon fontSize="small" />
                                              </IconButton>
                                            </span>
                                          </Tooltip>
                                          <Button
                                            color="error"
                                            variant="outlined"
                                            size="small"
                                            disabled={initialRounds.length <= 1}
                                            onClick={() => removeInitialRound(index)}
                                          >
                                            Remove
                                          </Button>
                                        </Stack>
                                      </Stack>
                                      <TextField
                                        label="Round Name"
                                        value={round.roundName}
                                        onChange={(event) => onInitialRoundChange(index, "roundName", event.target.value)}
                                        fullWidth
                                      />
                                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                                        <TextField
                                          label="Top N teams per track"
                                          type="number"
                                          value={round.promotionRuleTopN}
                                          onChange={(event) => onInitialRoundChange(index, "promotionRuleTopN", event.target.value)}
                                          inputProps={{ min: 1, step: 1 }}
                                          fullWidth
                                        />
                                      </Stack>
                                      <DateTimeSelectFields
                                        label="Submission Deadline"
                                        parts={round.submissionDeadlineParts}
                                        yearOptions={eventYearOptions}
                                        error={initialRoundTouched[index]?.submissionDeadlineParts ? createRoundDeadlineChecks[index]?.error : ""}
                                        onChange={(part) => (event) => onInitialRoundDeadlinePartChange(index, part, event.target.value)}
                                      />
                                    </Stack>
                                  </CardContent>
                                </Card>
                              )}
                            </SortableContainer>
                          ))}
                        </Stack>
                      </SortableContext>
                    </DndContext>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Initial Tracks</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Every new event must start with at least one track.
                        </Typography>
                      </Box>
                      <Button variant="text" onClick={addInitialTrack}>Add Track</Button>
                    </Stack>
                    <Stack spacing={1.2}>
                      {initialTracks.map((track, index) => (
                        <Stack key={`initial-track-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField
                            label={`Track ${index + 1}`}
                            value={track.name}
                            onChange={(event) => onInitialTrackChange(index, event.target.value)}
                            fullWidth
                          />
                          <Button
                            color="error"
                            variant="outlined"
                            disabled={initialTracks.length <= 1}
                            onClick={() => removeInitialTrack(index)}
                          >
                            Remove
                          </Button>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEventDialog} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveEvent}
            disabled={saving || eventValidation.hasError || (
              eventDialog.mode === "create" && createRoundDeadlineChecks.some((result) => result.error)
            )}
          >
            {saving ? "Saving..." : "Save Event"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}




