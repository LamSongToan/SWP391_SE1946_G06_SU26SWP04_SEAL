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
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import Grid2 from "@mui/material/Grid2";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import { getApiErrorMessage, http } from "../../api/http";

const CREATE_STEPS = [
  { key: "semester", label: "Semester & Event", caption: "Semester, year, and event identity" },
  { key: "dates", label: "Dates", caption: "Registration and competition timeline" },
];

const TRACK_ASSIGNMENT_OPTIONS = [
  { value: "TEAM_SELECT", label: "Teams choose their track" },
  { value: "SYSTEM_ASSIGN", label: "System assigns track automatically (balanced)" },
];

const FINAL_ROUND_RANKING_METHOD = "FINAL_SCORE";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "15", "30", "45"];
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

const QUALIFIER_CRITERIA_TEMPLATE = [
  { criterionName: "Technical Quality", weight: 34 },
  { criterionName: "Innovation", weight: 33 },
  { criterionName: "Feasibility", weight: 33 },
];

const FINAL_CRITERIA_TEMPLATE = [
  { criterionName: "Presentation", weight: 25 },
  { criterionName: "Q&A", weight: 25 },
  { criterionName: "Product Demo", weight: 25 },
  { criterionName: "Business Impact", weight: 25 },
];

const STATUS_TONE = {
  Draft: { bg: "#F4F6FB", color: "#16213E" },
  Ongoing: { bg: "#FFF2E8", color: "#E17C32" },
  Ended: { bg: "#EEF1F6", color: "#64748B" },
};

const ORANGE_BUTTON_SX = {
  borderRadius: 999,
  px: 2.2,
  py: 1.25,
  textTransform: "none",
  fontWeight: 800,
  boxShadow: "none",
  bgcolor: "#E17C32",
  "&:hover": {
    bgcolor: "#C96928",
    boxShadow: "none",
  },
};

const CONFIG_FIELD_SX = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    bgcolor: "#FFFFFF",
  },
};

const CONFIG_SECTION_SX = {
  borderRadius: 2,
  border: "1px solid #D9E2EF",
  bgcolor: "#FFFFFF",
  boxShadow: "none",
};

const CONFIG_SUBSECTION_SX = {
  borderRadius: 2,
  border: "1px solid #E2E8F0",
  bgcolor: "#F8FAFC",
  boxShadow: "none",
};

const ROUND_ITEM_SX = {
  borderRadius: 2.5,
  border: "1px solid #E5ECF5",
  bgcolor: "#FFFFFF",
  p: { xs: 1.75, md: 2 },
};

const ROUND_INNER_SECTION_SX = {
  pt: 1.6,
  borderTop: "1px solid #E8EEF6",
};

function buildSemesterOptions() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const semesters = ["Spring", "Summer", "Fall"];
  const years = [currentYear, currentYear + 1, currentYear + 2];

  const semesterOrder = (semester) => {
    if (semester === "Spring") return 1;
    if (semester === "Summer") return 2;
    return 3;
  };

  const currentSemesterOrder = (() => {
    if (currentMonth <= 4) return 1;
    if (currentMonth <= 8) return 2;
    return 3;
  })();

  return years
    .flatMap((year) => semesters.map((semester) => ({ semester, year, label: `${semester} ${year}` })))
    .filter((option) => option.year > currentYear || semesterOrder(option.semester) >= currentSemesterOrder);
}

function normalizeSemesterName(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "spring") return "Spring";
  if (raw === "summer") return "Summer";
  if (raw === "fall") return "Fall";
  return String(value || "").trim();
}

function semesterValue(semester, year) {
  if (!semester || !year) return "";
  return `${normalizeSemesterName(semester)}|${String(year).trim()}`;
}

function resolveSemesterFromMonth(monthIndex) {
  if (monthIndex >= 1 && monthIndex <= 4) return "Spring";
  if (monthIndex >= 5 && monthIndex <= 8) return "Summer";
  return "Fall";
}

function inferSemesterSelectionFromEvent(event) {
  if (!event) return "";
  const directValue = semesterValue(event.semester, event.year);
  if (directValue) return directValue;

  const sourceDate =
    event.competitionStartAt ||
    event.registrationStartAt ||
    event.startDate ||
    event.endDate ||
    event.competitionEndAt ||
    event.registrationEndAt;

  if (sourceDate) {
    const parsedDate = new Date(sourceDate);
    if (!Number.isNaN(parsedDate.getTime())) {
      const inferredSemester = resolveSemesterFromMonth(parsedDate.getMonth() + 1);
      return semesterValue(inferredSemester, parsedDate.getFullYear());
    }
  }

  const nameMatch = String(event.name || "").match(/\b(Spring|Summer|Fall)\s+(\d{4})\b/i);
  if (nameMatch) {
    return semesterValue(nameMatch[1], nameMatch[2]);
  }

  return "";
}

function parseSemesterValue(value) {
  if (!value) return { semester: "", year: "" };
  const [semester, year] = String(value).split("|");
  return { semester: semester || "", year: year || "" };
}

function createTrack(track = {}) {
  return {
    trackId: track.trackId ?? null,
    name: track.name || "",
    minTeams: track.minTeams ?? "",
    maxTeams: track.maxTeams ?? "",
  };
}

function normalizeFinalRoundName(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase() === "grand final") return "Final";
  return raw;
}

function createCriterion(criterion = "") {
  return {
    criterionName: typeof criterion === "string" ? criterion : criterion?.criterionName || "",
    description: typeof criterion === "string" ? criterion : criterion?.description || "",
    weight: typeof criterion === "string" ? null : criterion?.weight ?? null,
  };
}

function roundCriteriaOrTemplate(criteria, template) {
  return criteria && criteria.length ? criteria : template;
}

function createQualifyingRound(round = {}, fallbackOrder = 1) {
  return {
    roundId: round.roundId ?? null,
    roundName: round.roundName || "",
    submissionDeadline: round.submissionDeadline ? toDateTimeInput(round.submissionDeadline) : "",
    topNPerTrack: round.promotionRuleTopN ?? 1,
    roundOrder: round.roundOrder ?? fallbackOrder,
    criteria: roundCriteriaOrTemplate(round.criteria, QUALIFIER_CRITERIA_TEMPLATE).map(createCriterion),
  };
}

function createFinalRound(round = {}) {
  return {
    roundId: round.roundId ?? null,
    roundName: normalizeFinalRoundName(round.roundName),
    submissionDeadline: round.submissionDeadline ? toDateTimeInput(round.submissionDeadline) : "",
    criteria: roundCriteriaOrTemplate(round.criteria, FINAL_CRITERIA_TEMPLATE).map(createCriterion),
  };
}

function createAward(award = {}) {
  return {
    awardName: award.awardName || "",
    quantity: award.quantity ?? 1,
  };
}

function createEmptyWizard() {
  return {
    eventId: null,
    name: "",
    description: "",
    semesterSelection: "",
    registrationStartAt: "",
    registrationEndAt: "",
    competitionStartAt: "",
    competitionEndAt: "",
    trackAssignmentMode: "TEAM_SELECT",
    minTeamSize: 3,
    maxTeamSize: 5,
    tracks: [],
    qualifyingRounds: [],
    finalRound: createFinalRound(),
    rankingMethod: FINAL_ROUND_RANKING_METHOD,
    awards: [createAward({ awardName: "Champion", quantity: 1 })],
    status: "Draft",
    published: false,
    editable: true,
    canDelete: true,
    hasParticipants: false,
  };
}

function mapEventToWizard(detail) {
  const normalizedTrackAssignmentMode = detail.trackSelectionMode === "SYSTEM_ASSIGN" ? "SYSTEM_ASSIGN" : "TEAM_SELECT";
  return {
    eventId: detail.eventId,
    name: detail.name || "",
    description: detail.description || "",
    semesterSelection: semesterValue(detail.semester, detail.year),
    registrationStartAt: detail.registrationStartAt ? toDateTimeInput(detail.registrationStartAt) : "",
    registrationEndAt: detail.registrationEndAt ? toDateTimeInput(detail.registrationEndAt) : "",
    competitionStartAt: detail.competitionStartAt ? toDateTimeInput(detail.competitionStartAt) : "",
    competitionEndAt: detail.competitionEndAt ? toDateTimeInput(detail.competitionEndAt) : "",
    trackAssignmentMode: normalizedTrackAssignmentMode,
    minTeamSize: 3,
    maxTeamSize: 5,
    tracks: (detail.tracks || []).length ? detail.tracks.map(createTrack) : [],
    qualifyingRounds: (detail.qualifyingRounds || []).length
      ? detail.qualifyingRounds.map((round, index) => createQualifyingRound(round, index + 1))
      : [],
    finalRound: createFinalRound(detail.finalRound || {}),
    rankingMethod: detail.rankingMethod || FINAL_ROUND_RANKING_METHOD,
    awards: (detail.awards || []).length ? detail.awards.map(createAward) : [createAward({ awardName: "Champion", quantity: 1 })],
    status: detail.status || "Draft",
    published: Boolean(detail.published),
    editable: Boolean(detail.editable),
    canDelete: Boolean(detail.canDelete),
    hasParticipants: Boolean(detail.hasParticipants),
  };
}

function toDateTimeInput(value) {
  if (!value) return "";
  const raw = String(value);
  return raw.length >= 16 ? raw.slice(0, 16) : raw;
}

function formatBrowserDateTimeInput(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getDatePart(value) {
  return value ? String(value).slice(0, 10) : "";
}

function getHourPart(value) {
  return value ? String(value).slice(11, 13) : "";
}

function getMinutePart(value) {
  return value ? String(value).slice(14, 16) : "";
}

function getBoundDatePart(value) {
  return value ? String(value).slice(0, 10) : "";
}

function getBoundHourPart(value, fallback = "08") {
  return value ? String(value).slice(11, 13) : fallback;
}

function getBoundMinutePart(value, fallback = "00") {
  return value ? String(value).slice(14, 16) : fallback;
}

function formatDateTime(value) {
  if (!value) return "Not configured yet";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateRange(event) {
  if (!event.competitionStartAt || !event.competitionEndAt) {
    return "Competition window not configured yet";
  }
  return `${formatDateTime(event.competitionStartAt)} - ${formatDateTime(event.competitionEndAt)}`;
}

function getSemesterWindow(semester, year) {
  if (!semester || !year) return null;
  const numericYear = Number(year);
  if (!numericYear) return null;
  if (semester === "Spring") {
    return {
      start: new Date(`${numericYear}-01-01T00:00`),
      end: new Date(`${numericYear}-04-30T23:59`),
      label: `Spring ${numericYear}: 01/01 - 30/04`,
    };
  }
  if (semester === "Summer") {
    return {
      start: new Date(`${numericYear}-05-01T00:00`),
      end: new Date(`${numericYear}-08-31T23:59`),
      label: `Summer ${numericYear}: 01/05 - 31/08`,
    };
  }
  if (semester === "Fall") {
    return {
      start: new Date(`${numericYear}-09-01T00:00`),
      end: new Date(`${numericYear}-12-31T23:59`),
      label: `Fall ${numericYear}: 01/09 - 31/12`,
    };
  }
  return null;
}

function inWindow(dateValue, window) {
  if (!dateValue || !window) return false;
  const date = new Date(dateValue);
  return date >= window.start && date <= window.end;
}

function validateCriteriaBlock(criteria, label, issues) {
  const validCriteria = (criteria || []).filter((criterion) => criterion.criterionName.trim());
  if (!validCriteria.length) {
    issues.push(`${label} needs at least one criterion.`);
    return;
  }

  let totalWeight = 0;
  validCriteria.forEach((criterion, index) => {
    const weight = Number(criterion.weight || 0);
    if (!criterion.criterionName.trim()) {
      issues.push(`${label} criterion ${index + 1} needs a name.`);
    }
    if (weight < 1) {
      issues.push(`${label} criterion ${index + 1} needs weight greater than 0%.`);
    }
    totalWeight += weight;
  });

  if (totalWeight !== 100) {
    issues.push(`${label} criteria weights must total 100%.`);
  }
}

function buildPayload(form) {
  const { semester, year } = parseSemesterValue(form.semesterSelection);
  return {
    name: form.name.trim(),
    semester,
    year: year ? Number(year) : null,
    description: form.description.trim(),
    registrationStartAt: form.registrationStartAt || null,
    registrationEndAt: form.registrationEndAt || null,
    competitionStartAt: form.competitionStartAt || null,
    competitionEndAt: form.competitionEndAt || null,
    trackSelectionMode: form.trackAssignmentMode,
    minTeamSize: 3,
    maxTeamSize: 5,
    tracks: form.tracks
      .filter((track) => track.name.trim())
      .map((track) => ({
        trackId: track.trackId,
        name: track.name.trim(),
        minTeams: track.minTeams === "" || track.minTeams == null ? null : Number(track.minTeams),
        maxTeams: track.maxTeams === "" || track.maxTeams == null ? null : Number(track.maxTeams),
      })),
    qualifyingRounds: form.qualifyingRounds
      .filter((round) => round.roundName.trim())
      .map((round, index) => ({
        roundId: round.roundId,
        roundName: round.roundName.trim(),
        roundOrder: index + 1,
        submissionDeadline: round.submissionDeadline || null,
        promotionRuleTopN: Number(round.topNPerTrack || 0),
        finalRound: false,
        criteria: (round.criteria || [])
          .filter((criterion) => criterion.criterionName.trim())
          .map((criterion) => ({
            criterionName: criterion.criterionName.trim(),
            description: criterion.description?.trim() || "",
            weight: criterion.weight === "" || criterion.weight == null ? null : Number(criterion.weight),
          })),
      })),
    finalRound: form.finalRound.roundName.trim()
      ? {
          roundId: form.finalRound.roundId,
          roundName: normalizeFinalRoundName(form.finalRound.roundName),
          roundOrder: form.qualifyingRounds.filter((round) => round.roundName.trim()).length + 1,
          submissionDeadline: form.finalRound.submissionDeadline || null,
          finalRound: true,
          criteria: (form.finalRound.criteria || [])
            .filter((criterion) => criterion.criterionName.trim())
            .map((criterion) => ({
              criterionName: criterion.criterionName.trim(),
              description: criterion.description?.trim() || "",
              weight: criterion.weight === "" || criterion.weight == null ? null : Number(criterion.weight),
            })),
        }
      : null,
    rankingMethod: FINAL_ROUND_RANKING_METHOD,
    awards: form.awards
      .filter((award) => award.awardName.trim())
      .map((award) => ({ awardName: award.awardName.trim(), quantity: Number(award.quantity || 0) })),
  };
}

function getStepIssues(stepIndex, form) {
  const issues = [];
  const { semester, year } = parseSemesterValue(form.semesterSelection);
  const semesterWindow = getSemesterWindow(semester, year);

  if (stepIndex === 0) {
    if (!form.semesterSelection) issues.push("Choose the event semester.");
    if (!form.name.trim()) issues.push("Event name is required.");
    return issues;
  }

  if (stepIndex === 1) {
    if (!form.registrationStartAt || !form.registrationEndAt || !form.competitionStartAt || !form.competitionEndAt) {
      issues.push("Complete all registration and competition dates.");
      return issues;
    }
    if (!semesterWindow) {
      issues.push("Choose the semester first.");
      return issues;
    }
    if (!inWindow(form.registrationStartAt, semesterWindow)) issues.push("Registration start must stay inside the selected semester.");
    if (!inWindow(form.registrationEndAt, semesterWindow)) issues.push("Registration end must stay inside the selected semester.");
    if (!inWindow(form.competitionStartAt, semesterWindow)) issues.push("Competition start must stay inside the selected semester.");
    if (!inWindow(form.competitionEndAt, semesterWindow)) issues.push("Competition end must stay inside the selected semester.");
    if (new Date(form.registrationEndAt) < new Date(form.registrationStartAt)) issues.push("Registration end must be after registration start.");
    if (new Date(form.competitionEndAt) < new Date(form.competitionStartAt)) issues.push("Competition end must be after competition start.");
    if (new Date(form.competitionStartAt) < new Date(form.registrationEndAt)) issues.push("Competition must start after registration ends.");
    return issues;
  }

  if (stepIndex === 2) {
    const validTracks = form.tracks.filter((track) => track.name.trim());
    if (!validTracks.length) issues.push("Create at least one track.");
    const uniqueNames = new Set(validTracks.map((track) => track.name.trim().toLowerCase()));
    if (uniqueNames.size !== validTracks.length) issues.push("Track names must be unique.");
    validTracks.forEach((track, index) => {
      if (track.minTeams !== "" && Number(track.minTeams) < 1) issues.push(`Track ${index + 1} minimum teams must be at least 1.`);
      if (track.maxTeams !== "" && Number(track.maxTeams) < Number(track.minTeams || 1)) issues.push(`Track ${index + 1} maximum teams must be greater than or equal to minimum teams.`);
    });
    return issues;
  }

  if (stepIndex === 3) {
    const qualifyingRounds = form.qualifyingRounds.filter((round) => round.roundName.trim());
    if (!qualifyingRounds.length) issues.push("Add at least one qualifying round.");
    if (!form.finalRound.roundName.trim()) issues.push("Final round name is required.");
    if (!form.competitionStartAt || !form.competitionEndAt) issues.push("Competition dates must be configured before rounds.");
    const competitionStart = form.competitionStartAt ? new Date(form.competitionStartAt) : null;
    const competitionEnd = form.competitionEndAt ? new Date(form.competitionEndAt) : null;
    let previousSubmissionDeadline = null;
    qualifyingRounds.forEach((round, index) => {
      if (!round.submissionDeadline) issues.push(`Qualifying round ${index + 1} needs a submission deadline.`);
      if (competitionStart && competitionEnd && round.submissionDeadline) {
        const submissionDeadline = new Date(round.submissionDeadline);
        if (submissionDeadline < competitionStart || submissionDeadline > competitionEnd) {
          issues.push(`Qualifying round ${index + 1} must stay inside the competition window.`);
        }
        if (previousSubmissionDeadline && submissionDeadline <= previousSubmissionDeadline) {
          issues.push(`Qualifying round ${index + 1} must have a later submission deadline than the previous round.`);
        }
        previousSubmissionDeadline = submissionDeadline;
      }
      if (Number(round.topNPerTrack || 0) < 1) issues.push(`Qualifying round ${index + 1} needs Top N greater than 0.`);
      validateCriteriaBlock(round.criteria, `Qualifying round ${index + 1}`, issues);
    });

    if (!form.finalRound.submissionDeadline) issues.push("Final round needs a submission deadline.");
    validateCriteriaBlock(form.finalRound.criteria, "Final round", issues);
    if (competitionStart && competitionEnd && form.finalRound.submissionDeadline) {
      const finalDeadline = new Date(form.finalRound.submissionDeadline);
      if (finalDeadline < competitionStart || finalDeadline > competitionEnd) {
        issues.push("Final round must stay inside the competition window.");
      }
      if (previousSubmissionDeadline && finalDeadline <= previousSubmissionDeadline) {
        issues.push("Final round must have a later submission deadline than the last qualifying round.");
      }
    }
    return issues;
  }

  if (stepIndex === 4) {
    const validAwards = form.awards.filter((award) => award.awardName.trim());
    if (!validAwards.length) issues.push("Add at least one award.");
    validAwards.forEach((award, index) => {
      if (Number(award.quantity || 0) < 1) {
        issues.push(`Award ${index + 1} needs quantity greater than 0.`);
      }
    });
  }

  return issues;
}

function getAllPublishIssues(form) {
  return [0, 1, 2, 3, 4].flatMap((index) => getStepIssues(index, form));
}

function getEventConfigurationError(error, fallback) {
  const message = getApiErrorMessage(error, fallback);
  const normalized = String(message || "").trim().toLowerCase();
  const genericServerError = normalized === "unexpected server error" || normalized === "request failed";

  if (!genericServerError) {
    return message;
  }

  if (error?.response?.status === 409) {
    return "Event setup conflicts with existing data. Check duplicate semester/year or duplicate track names, then try again.";
  }

  if (error?.response?.status === 400) {
    return "Some event setup values are invalid. Check date order, track capacity min/max, and criteria weights.";
  }

  return "Event setup could not be saved. Please check: semester/year uniqueness, unique track names, registration before competition, track min-max values, and criteria weights.";
}

function StepHeader({ title, description }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: "#64748B" }}>{description}</Typography>
    </Box>
  );
}

function ConfigSectionHeader({ index, title, description, action = null }) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", md: "center" }}
      spacing={1.4}
      sx={{ mb: 1.8 }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "10px",
            bgcolor: "#FFF6EE",
            color: "#E17C32",
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 950,
            flex: "0 0 30px",
          }}
        >
          {index}
        </Box>
        <Box>
          <Typography sx={{ color: "#16213E", fontSize: 21, fontWeight: 950, lineHeight: 1.15 }}>
            {title}
          </Typography>
          <Typography sx={{ color: "#64748B", fontSize: 14, mt: 0.45, maxWidth: 760 }}>
            {description}
          </Typography>
        </Box>
      </Stack>
      {action}
    </Stack>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
  disabled = false,
  minDateTime = "",
  maxDateTime = "",
  helperText = "",
  framed = true,
}) {
  const minDateValue = getBoundDatePart(minDateTime);
  const maxDateValue = getBoundDatePart(maxDateTime);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState(getBoundHourPart(minDateTime));
  const [minute, setMinute] = useState(getBoundMinutePart(minDateTime));

  useEffect(() => {
    if (!value) {
      setYear(minDateValue ? minDateValue.slice(0, 4) : "");
      setMonth(minDateValue ? minDateValue.slice(5, 7) : "");
      setDay("");
      setHour(getBoundHourPart(minDateTime));
      setMinute(getBoundMinutePart(minDateTime));
      return;
    }

    const datePart = getDatePart(value);
    setYear(datePart.slice(0, 4));
    setMonth(datePart.slice(5, 7));
    setDay(datePart.slice(8, 10));
    setHour(getBoundHourPart(value));
    setMinute(getBoundMinutePart(value));
  }, [value, minDateTime]);

  const minYear = minDateValue ? Number(minDateValue.slice(0, 4)) : new Date().getFullYear();
  const maxYear = maxDateValue ? Number(maxDateValue.slice(0, 4)) : minYear + 2;
  const yearOptions = Array.from({ length: Math.max(maxYear - minYear + 1, 1) }, (_, index) => String(minYear + index));

  const monthOptions = MONTH_OPTIONS.filter((option) => {
    if (!year) return true;
    if (minDateValue && year === minDateValue.slice(0, 4) && option.value < minDateValue.slice(5, 7)) return false;
    if (maxDateValue && year === maxDateValue.slice(0, 4) && option.value > maxDateValue.slice(5, 7)) return false;
    return true;
  });

  const totalDays = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const dayOptions = Array.from({ length: totalDays }, (_, index) => String(index + 1).padStart(2, "0")).filter((option) => {
    if (!year || !month) return true;
    if (minDateValue && year === minDateValue.slice(0, 4) && month === minDateValue.slice(5, 7) && option < minDateValue.slice(8, 10)) return false;
    if (maxDateValue && year === maxDateValue.slice(0, 4) && month === maxDateValue.slice(5, 7) && option > maxDateValue.slice(8, 10)) return false;
    return true;
  });

  const emitValue = (nextParts) => {
    const nextYear = nextParts.year ?? year;
    const nextMonth = nextParts.month ?? month;
    const nextDay = nextParts.day ?? day;
    const nextHour = (nextParts.hour ?? hour) || getBoundHourPart(minDateTime);
    const nextMinute = (nextParts.minute ?? minute) || getBoundMinutePart(minDateTime);

    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);
    setHour(nextHour);
    setMinute(nextMinute);

    if (!nextYear || !nextMonth || !nextDay) {
      onChange("");
      return;
    }

    onChange(`${nextYear}-${nextMonth}-${nextDay}T${nextHour}:${nextMinute}`);
  };

  return (
    <Box sx={framed ? { ...CONFIG_SUBSECTION_SX, p: { xs: 1.5, md: 2 } } : undefined}>
        <Stack spacing={1.2}>
          <Typography sx={{ fontWeight: 800, color: "#16213E" }}>{label}</Typography>
          <Grid2 container spacing={1.25} alignItems="stretch">
            <Grid2 size={{ xs: 12, md: 2.4 }}>
              <TextField
                select
                fullWidth
                label="Day"
                value={day}
                onChange={(event) => emitValue({ day: event.target.value })}
                disabled={disabled}
                sx={CONFIG_FIELD_SX}
              >
                {dayOptions.map((option) => (
                  <MenuItem key={`${label}-day-${option}`} value={option}>
                    {Number(option)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 3.6 }}>
              <TextField
                select
                fullWidth
                label="Month"
                value={month}
                onChange={(event) => emitValue({ month: event.target.value })}
                disabled={disabled}
                sx={CONFIG_FIELD_SX}
              >
                {monthOptions.map((option) => (
                  <MenuItem key={`${label}-month-${option.value}`} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 2.4 }}>
              <TextField
                select
                fullWidth
                label="Year"
                value={year}
                onChange={(event) => emitValue({ year: event.target.value })}
                disabled={disabled}
                sx={CONFIG_FIELD_SX}
              >
                {yearOptions.map((option) => (
                  <MenuItem key={`${label}-year-${option}`} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid2>
            <Grid2 size={{ xs: 6, md: 1.8 }}>
              <TextField
                select
                fullWidth
                label="Hour"
                value={hour}
                onChange={(event) => emitValue({ hour: event.target.value })}
                disabled={disabled || !year || !month || !day}
                sx={CONFIG_FIELD_SX}
              >
                {HOUR_OPTIONS.map((option) => (
                  <MenuItem key={`${label}-hour-${option}`} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid2>
            <Grid2 size={{ xs: 6, md: 1.8 }}>
              <TextField
                select
                fullWidth
                label="Minute"
                value={minute}
                onChange={(event) => emitValue({ minute: event.target.value })}
                disabled={disabled || !year || !month || !day}
                sx={CONFIG_FIELD_SX}
              >
                {MINUTE_OPTIONS.map((option) => (
                  <MenuItem key={`${label}-minute-${option}`} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid2>
          </Grid2>
          {helperText ? (
            <Typography sx={{ color: "#64748B", fontSize: 13 }}>
              {helperText}
            </Typography>
          ) : null}
        </Stack>
    </Box>
  );
}

function EmptyState({ text, compact = false }) {
  return (
    <Box
      sx={{
        border: compact ? "none" : "1px dashed #CBD5E1",
        borderRadius: compact ? 0 : 4,
        minHeight: compact ? 0 : 132,
        display: compact ? "block" : "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: compact ? "center" : "stretch",
        color: compact ? "#64748B" : "#94A3B8",
        textAlign: "center",
        bgcolor: "transparent",
        px: compact ? 0 : 3,
        py: compact ? 0.2 : 0,
        maxWidth: compact ? "100%" : "100%",
        fontSize: compact ? 14 : 16,
        lineHeight: 1.55,
      }}
    >
      {text}
    </Box>
  );
}

export default function EventConfigurationPanel({ onDirtyChange = () => {} }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [wizard, setWizard] = useState(createEmptyWizard());
  const [activeStep, setActiveStep] = useState(0);
  const [stepErrors, setStepErrors] = useState([]);
  const [wizardError, setWizardError] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const allSemesterOptions = useMemo(() => buildSemesterOptions(), []);
  const occupiedSemesterSelections = useMemo(
    () =>
      new Set(
        events
          .map((event) => inferSemesterSelectionFromEvent(event))
          .filter(Boolean)
      ),
    [events]
  );
  const semesterOptions = useMemo(
    () =>
      allSemesterOptions.filter((option) => {
        const optionValue = semesterValue(option.semester, option.year);
        return !occupiedSemesterSelections.has(optionValue) || optionValue === wizard.semesterSelection;
      }),
    [allSemesterOptions, occupiedSemesterSelections, wizard.semesterSelection]
  );

  const loadEvents = async () => {
    setLoading(true);
    setListError("");
    try {
      const response = await http.get("/api/coordinator/events");
      setEvents(response.data?.data || []);
    } catch (error) {
      setListError(getApiErrorMessage(error, "Failed to load events"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const openCreateWizard = () => {
    setViewMode("create");
    setSelectedEventId(null);
    setWizard(createEmptyWizard());
    setActiveStep(0);
    setStepErrors([]);
    setWizardError("");
    setDirty(false);
  };

  const openEventWizard = async (eventId) => {
    setLoading(true);
    setWizardError("");
    setStepErrors([]);
    try {
      const response = await http.get(`/api/coordinator/events/${eventId}/wizard`);
      setWizard(mapEventToWizard(response.data?.data));
      setSelectedEventId(eventId);
      setViewMode("detail");
      setActiveStep(0);
      setDirty(false);
    } catch (error) {
      setListError(getApiErrorMessage(error, "Failed to open event"));
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrentView = async () => {
    await loadEvents();
    if (viewMode === "detail" && selectedEventId) {
      await openEventWizard(selectedEventId);
    }
  };

  const updateWizard = (key, value) => {
    setWizard((current) => ({ ...current, [key]: value }));
    setStepErrors([]);
    setWizardError("");
    setDirty(true);
  };

  const updateTrack = (index, key, value) => {
    const nextTracks = wizard.tracks.map((track, trackIndex) => (trackIndex === index ? { ...track, [key]: value } : track));
    updateWizard("tracks", nextTracks);
  };

  const addTrack = () => updateWizard("tracks", [...wizard.tracks, createTrack()]);
  const removeTrack = (index) => updateWizard("tracks", wizard.tracks.filter((_, itemIndex) => itemIndex !== index));

  const updateQualifyingRound = (index, key, value) => {
    const nextRounds = wizard.qualifyingRounds.map((round, roundIndex) =>
      roundIndex === index ? { ...round, [key]: value } : round
    );
    updateWizard("qualifyingRounds", nextRounds);
  };

  const updateQualifyingCriterion = (roundIndex, criterionIndex, value) => {
    const nextRounds = wizard.qualifyingRounds.map((round, itemIndex) => {
      if (itemIndex !== roundIndex) return round;
      return {
        ...round,
        criteria: round.criteria.map((criterion, itemCriterionIndex) =>
          itemCriterionIndex === criterionIndex ? { ...criterion, ...value } : criterion
        ),
      };
    });
    updateWizard("qualifyingRounds", nextRounds);
  };

  const addQualifyingCriterion = (roundIndex) => {
    const nextRounds = wizard.qualifyingRounds.map((round, itemIndex) =>
      itemIndex === roundIndex ? { ...round, criteria: [...(round.criteria || []), createCriterion()] } : round
    );
    updateWizard("qualifyingRounds", nextRounds);
  };

  const removeQualifyingCriterion = (roundIndex, criterionIndex) => {
    const nextRounds = wizard.qualifyingRounds.map((round, itemIndex) =>
      itemIndex === roundIndex
        ? { ...round, criteria: round.criteria.filter((_, itemCriterionIndex) => itemCriterionIndex !== criterionIndex) }
        : round
    );
    updateWizard("qualifyingRounds", nextRounds);
  };

  const addQualifyingRound = () => {
    updateWizard("qualifyingRounds", [
      ...wizard.qualifyingRounds,
      createQualifyingRound({}, wizard.qualifyingRounds.length + 1),
    ]);
  };

  const removeQualifyingRound = (index) => {
    updateWizard("qualifyingRounds", wizard.qualifyingRounds.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateFinalCriterion = (criterionIndex, value) => {
    updateWizard("finalRound", {
      ...wizard.finalRound,
      criteria: wizard.finalRound.criteria.map((criterion, itemCriterionIndex) =>
        itemCriterionIndex === criterionIndex ? { ...criterion, ...value } : criterion
      ),
    });
  };

  const addFinalCriterion = () => {
    updateWizard("finalRound", {
      ...wizard.finalRound,
      criteria: [...(wizard.finalRound.criteria || []), createCriterion()],
    });
  };

  const removeFinalCriterion = (criterionIndex) => {
    updateWizard("finalRound", {
      ...wizard.finalRound,
      criteria: wizard.finalRound.criteria.filter((_, itemCriterionIndex) => itemCriterionIndex !== criterionIndex),
    });
  };

  const updateAward = (index, key, value) => {
    const nextAwards = wizard.awards.map((award, awardIndex) => (awardIndex === index ? { ...award, [key]: value } : award));
    updateWizard("awards", nextAwards);
  };

  const addAward = () => updateWizard("awards", [...wizard.awards, createAward()]);
  const removeAward = (index) => updateWizard("awards", wizard.awards.filter((_, itemIndex) => itemIndex !== index));

  const currentStepIssues = useMemo(() => getStepIssues(activeStep, wizard), [activeStep, wizard]);
  const semesterWindow = useMemo(() => {
    const { semester, year } = parseSemesterValue(wizard.semesterSelection);
    return getSemesterWindow(semester, year);
  }, [wizard.semesterSelection]);
  const semesterMinDateTime = semesterWindow ? formatBrowserDateTimeInput(semesterWindow.start) : "";
  const semesterMaxDateTime = semesterWindow ? formatBrowserDateTimeInput(semesterWindow.end) : "";
  const competitionMinDateTime = wizard.competitionStartAt || "";
  const competitionMaxDateTime = wizard.competitionEndAt || "";
  const createMode = viewMode === "create";
  const detailMode = viewMode === "detail";

  const saveDraft = async () => {
    const payload = buildPayload(wizard);
    if (createMode) {
      const issues = [0, 1].flatMap((index) => getStepIssues(index, wizard));
      if (issues.length) {
        setStepErrors(issues);
        const firstInvalidStep = CREATE_STEPS.findIndex((_, index) => getStepIssues(index, wizard).length > 0);
        if (firstInvalidStep >= 0) setActiveStep(firstInvalidStep);
        return;
      }
    } else if (!payload.name || !payload.semester || !payload.year) {
      setWizardError("Choose the semester and enter an event name before saving.");
      return;
    }

    setSaving(true);
    setWizardError("");
    setStepErrors([]);
    try {
      let response;
      if (selectedEventId) {
        response = await http.put(`/api/coordinator/events/${selectedEventId}/wizard`, payload);
      } else {
        response = await http.post("/api/coordinator/events/wizard", payload);
      }
      const detail = response.data?.data;
      setWizard(mapEventToWizard(detail));
      setSelectedEventId(detail?.eventId || null);
      setViewMode("detail");
      setDirty(false);
      setStepErrors([]);
      await loadEvents();
      if (detail?.eventId) {
        const refreshed = await http.get(`/api/coordinator/events/${detail.eventId}/wizard`);
        setWizard(mapEventToWizard(refreshed.data?.data));
      }
    } catch (error) {
      setWizardError(getEventConfigurationError(error, "Failed to save draft"));
    } finally {
      setSaving(false);
    }
  };

  const publishEvent = async () => {
    const issues = getAllPublishIssues(wizard);
    if (issues.length) {
      setStepErrors(issues);
      const firstInvalidStep = CREATE_STEPS.findIndex((_, index) => getStepIssues(index, wizard).length > 0);
      if (firstInvalidStep >= 0 && createMode) setActiveStep(firstInvalidStep);
      setPublishDialogOpen(false);
      return;
    }

    setSaving(true);
    setWizardError("");
    setStepErrors([]);
    try {
      let eventId = selectedEventId;
      if (!eventId) {
        const created = await http.post("/api/coordinator/events/wizard", buildPayload(wizard));
        eventId = created.data?.data?.eventId;
      } else {
        await http.put(`/api/coordinator/events/${eventId}/wizard`, buildPayload(wizard));
      }

      const response = await http.post(`/api/coordinator/events/${eventId}/publish`);
      setWizard(mapEventToWizard(response.data?.data));
      setSelectedEventId(eventId);
      setDirty(false);
      setPublishDialogOpen(false);
      await loadEvents();
      const refreshed = await http.get(`/api/coordinator/events/${eventId}/wizard`);
      setWizard(mapEventToWizard(refreshed.data?.data));
    } catch (error) {
      setWizardError(getEventConfigurationError(error, "Failed to publish event"));
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!selectedEventId) return;
    setSaving(true);
    setWizardError("");
    try {
      await http.delete(`/api/coordinator/events/${selectedEventId}`);
      setDeleteDialogOpen(false);
      setViewMode("list");
      setSelectedEventId(null);
      setWizard(createEmptyWizard());
      setDirty(false);
      await loadEvents();
    } catch (error) {
      setWizardError(getApiErrorMessage(error, "Failed to delete event"));
    } finally {
      setSaving(false);
    }
  };

  const goNextStep = () => {
    const issues = getStepIssues(activeStep, wizard);
    if (issues.length) {
      setStepErrors(issues);
      return;
    }
    setStepErrors([]);
    setActiveStep((current) => Math.min(current + 1, CREATE_STEPS.length - 1));
  };

  const goBackStep = () => {
    setStepErrors([]);
    setActiveStep((current) => Math.max(current - 1, 0));
  };

  const editable = wizard.editable;
  const publishButtonLabel = wizard.published ? "Published" : "Publish";

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
      {viewMode === "list" ? (
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ color: "#E17C32", fontWeight: 900, letterSpacing: 0.6, fontSize: 13 }}>
                EVENT SETUP
              </Typography>
              <Typography component="h1" sx={{ fontWeight: 950, color: "#16213E", fontSize: { xs: 26, md: 30 }, lineHeight: 1.14 }}>
                Hackathon Events
              </Typography>
              <Typography sx={{ color: "#64748B", mt: 0.5 }}>
                Create an event, save its draft configuration, and publish it when the structure is ready.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.2}>
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={loadEvents}
                sx={{ borderRadius: 999, px: 2.2, py: 1.25, textTransform: "none", fontWeight: 800 }}
              >
                Refresh
              </Button>
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateWizard} sx={ORANGE_BUTTON_SX}>
                Create Event
              </Button>
            </Stack>
          </Box>

          {listError ? <Alert severity="error">{listError}</Alert> : null}

          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240 }}>
              <CircularProgress />
            </Stack>
          ) : events.length ? (
            <Stack spacing={2}>
              {events.map((event) => {
                const tone = STATUS_TONE[event.status] || STATUS_TONE.Draft;
                return (
                  <Card
                    key={event.eventId}
                    onClick={() => openEventWizard(event.eventId)}
                    sx={{
                      borderRadius: 3,
                      border: "1px solid rgba(226, 232, 240, 0.95)",
                      boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)",
                      cursor: "pointer",
                      overflow: "hidden",
                      bgcolor: "#FFFFFF",
                      transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0 28px 58px rgba(15, 23, 42, 0.12)",
                        borderColor: "rgba(243, 112, 33, 0.28)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                      <Stack
                        direction={{ xs: "column", lg: "row" }}
                        justifyContent="space-between"
                        spacing={0}
                        sx={{ minHeight: 194, position: "relative" }}
                      >
                        <Box
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            p: { xs: 2.35, md: 3 },
                            position: "relative",
                            bgcolor: "#FFFFFF",
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.35, position: "relative" }}>
                            <Chip
                              label={event.status}
                              size="small"
                              sx={{ bgcolor: tone.bg, color: tone.color, fontWeight: 900, height: 28 }}
                            />
                            {event.semester && event.year ? (
                              <Chip
                                label={`${event.semester} ${event.year}`}
                                size="small"
                                sx={{ bgcolor: "#FFF6EE", color: "#E17C32", fontWeight: 900, height: 28 }}
                              />
                            ) : null}
                          </Stack>
                          <Typography
                            component="h2"
                            sx={{
                              fontWeight: 950,
                              color: "#16213E",
                              mb: 0.75,
                              fontSize: { xs: 25, md: 31 },
                              lineHeight: 1.12,
                              position: "relative",
                            }}
                          >
                            {event.name}
                          </Typography>
                          <Typography
                            sx={{
                              color: "#64748B",
                              mb: 2.1,
                              maxWidth: 760,
                              minHeight: 24,
                              fontSize: 14.5,
                              lineHeight: 1.55,
                              position: "relative",
                            }}
                          >
                            {event.description || "No description yet."}
                          </Typography>

                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.2}
                            useFlexGap
                            sx={{ flexWrap: "wrap", position: "relative" }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.2,
                                px: 1.6,
                                py: 1.1,
                                borderRadius: 2.5,
                                bgcolor: "rgba(255,255,255,0.88)",
                                border: "1px solid #E7ECF3",
                                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                                minWidth: { xs: "100%", sm: 308 },
                              }}
                            >
                              <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: "#FFF2E8", color: "#E17C32", display: "grid", placeItems: "center", flex: "0 0 34px" }}>
                                <CalendarMonthRoundedIcon sx={{ fontSize: 19 }} />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                                  Competition Window
                                </Typography>
                                <Typography sx={{ color: "#16213E", fontWeight: 850, mt: 0.35, lineHeight: 1.25 }}>
                                  {formatDateRange(event)}
                                </Typography>
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.2,
                                px: 1.6,
                                py: 1.1,
                                borderRadius: 2.5,
                                bgcolor: "rgba(255,255,255,0.88)",
                                border: "1px solid #E7ECF3",
                                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                                minWidth: { xs: "100%", sm: 230 },
                              }}
                            >
                              <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: "#EEF6FF", color: "#1677FF", display: "grid", placeItems: "center", flex: "0 0 34px" }}>
                                <HubRoundedIcon sx={{ fontSize: 19 }} />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                                  Structure
                                </Typography>
                                <Typography sx={{ color: "#16213E", fontWeight: 850, mt: 0.35, lineHeight: 1.25 }}>
                                  {event.trackCount} track{event.trackCount === 1 ? "" : "s"} / {event.roundCount} round{event.roundCount === 1 ? "" : "s"}
                                </Typography>
                              </Box>
                            </Box>
                          </Stack>
                        </Box>

                        <Stack
                          sx={{
                            width: { xs: "100%", lg: 258 },
                            p: { xs: 2.2, md: 2.6 },
                            justifyContent: "space-between",
                            alignSelf: "stretch",
                            background: "#F8FAFC",
                            borderLeft: { xs: "none", lg: "1px solid rgba(226,232,240,0.95)" },
                            borderTop: "none",
                          }}
                          spacing={2}
                        >
                          <Box>
                            <Typography sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7, mb: 0.8 }}>
                              Quick View
                            </Typography>
                            <Stack spacing={1}>
                              {[
                                [`${event.trackCount}`, `track${event.trackCount === 1 ? "" : "s"}`, "#FFF6EE", "#E17C32"],
                                [`${event.roundCount}`, `round${event.roundCount === 1 ? "" : "s"}`, "#EEF6FF", "#1677FF"],
                              ].map(([value, label, bg, color]) => (
                                <Stack
                                  key={label}
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="space-between"
                                  sx={{
                                    px: 1.25,
                                    py: 1,
                                    borderRadius: 2,
                                    bgcolor: bg,
                                    color,
                                  }}
                                >
                                  <Typography sx={{ fontSize: 22, fontWeight: 950, lineHeight: 1 }}>
                                    {value}
                                  </Typography>
                                  <Typography sx={{ fontSize: 12, fontWeight: 900 }}>
                                    {label}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          </Box>

                          <Button
                            variant="contained"
                            endIcon={<OpenInNewRoundedIcon />}
                            sx={{
                              alignSelf: "stretch",
                              borderRadius: 999,
                              bgcolor: "#16213E",
                              color: "#FFFFFF",
                              fontWeight: 900,
                              py: 1,
                              "&:hover": { bgcolor: "#0B1220" },
                            }}
                          >
                            Open configuration
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          ) : (
            <EmptyState text="No events yet. Use Create Event to start the first semester-based competition." />
          )}
        </Stack>
      ) : createMode ? (
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
            }}
          >
            <Box>
              <Typography component="h1" sx={{ fontWeight: 950, color: "#16213E", fontSize: { xs: 26, md: 30 }, lineHeight: 1.14 }}>
                Create Event
              </Typography>
              <Typography sx={{ color: "#64748B", mt: 0.6 }}>
                Set the event identity and schedule first. Tracks, rounds, scoring criteria, and publishing come next inside the event detail page.
              </Typography>
            </Box>
          </Box>

          {wizardError ? <Alert severity="error">{wizardError}</Alert> : null}
          {stepErrors.length ? (
            <Alert severity="warning">
              <Stack spacing={0.5}>
                {stepErrors.map((issue) => (
                  <span key={issue}>{issue}</span>
                ))}
              </Stack>
            </Alert>
          ) : null}

          <Card
            sx={{
              borderRadius: 2,
              border: "1px solid #D9E2EF",
              boxShadow: "0 18px 34px rgba(15, 23, 42, 0.08)",
              "& .MuiTextField-root": CONFIG_FIELD_SX,
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {CREATE_STEPS.map((step) => (
                  <Step key={step.key}>
                    <StepLabel>
                      <Typography sx={{ fontWeight: 800 }}>{step.label}</Typography>
                      <Typography sx={{ fontSize: 12, color: "#94A3B8" }}>{step.caption}</Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>

              {activeStep === 0 ? (
                <Stack spacing={2.2}>
                  <StepHeader
                    title="Step 1. Choose the semester and name the event"
                    description="Create the event container first. This step defines the semester window it belongs to."
                  />
                  <Grid2 container spacing={2}>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <TextField
                        select
                        fullWidth
                        label="Semester"
                        value={wizard.semesterSelection}
                        onChange={(event) => updateWizard("semesterSelection", event.target.value)}
                      >
                        {semesterOptions.map((option) => (
                          <MenuItem key={option.label} value={semesterValue(option.semester, option.year)}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Event Name"
                        value={wizard.name}
                        onChange={(event) => updateWizard("name", event.target.value)}
                      />
                    </Grid2>
                    <Grid2 size={12}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        label="Description"
                        value={wizard.description}
                        onChange={(event) => updateWizard("description", event.target.value)}
                      />
                    </Grid2>
                  </Grid2>
                </Stack>
              ) : null}

              {activeStep === 1 ? (
                <Stack spacing={2.2}>
                  <StepHeader
                    title="Step 2. Configure registration and competition dates"
                    description={semesterWindow ? `Allowed window: ${semesterWindow.label}` : "Choose the semester first so the allowed date range can be validated."}
                  />
                  <Grid2 container spacing={2}>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <DateTimeField
                        label="Registration Start"
                        value={wizard.registrationStartAt}
                        onChange={(nextValue) => updateWizard("registrationStartAt", nextValue)}
                        minDateTime={semesterMinDateTime}
                        maxDateTime={semesterMaxDateTime}
                        helperText="Pick when teams can start registering."
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <DateTimeField
                        label="Registration End"
                        value={wizard.registrationEndAt}
                        onChange={(nextValue) => updateWizard("registrationEndAt", nextValue)}
                        minDateTime={semesterMinDateTime}
                        maxDateTime={semesterMaxDateTime}
                        helperText="Registration must close before competition starts."
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <DateTimeField
                        label="Competition Start"
                        value={wizard.competitionStartAt}
                        onChange={(nextValue) => updateWizard("competitionStartAt", nextValue)}
                        minDateTime={semesterMinDateTime}
                        maxDateTime={semesterMaxDateTime}
                        helperText="This is when the event competition begins."
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <DateTimeField
                        label="Competition End"
                        value={wizard.competitionEndAt}
                        onChange={(nextValue) => updateWizard("competitionEndAt", nextValue)}
                        minDateTime={semesterMinDateTime}
                        maxDateTime={semesterMaxDateTime}
                        helperText="This is when the event competition finishes."
                      />
                    </Grid2>
                  </Grid2>
                </Stack>
              ) : null}
            </CardContent>
          </Card>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button
              variant="text"
              onClick={() => {
                setViewMode("list");
                setStepErrors([]);
                setWizardError("");
              }}
              sx={{ borderRadius: 999, px: 1.2, py: 1.1, textTransform: "none", fontWeight: 800, color: "#64748B" }}
            >
              Cancel
            </Button>
            <Stack direction="row" spacing={1.2}>
              <Button
                variant="outlined"
                onClick={goBackStep}
                disabled={activeStep === 0}
                sx={{ borderRadius: 999, px: 2.2, py: 1.25, textTransform: "none", fontWeight: 800 }}
              >
                Back
              </Button>
              <Button
                variant={activeStep === CREATE_STEPS.length - 1 ? "contained" : "outlined"}
                onClick={activeStep === CREATE_STEPS.length - 1 ? saveDraft : goNextStep}
                disabled={saving}
                startIcon={activeStep === CREATE_STEPS.length - 1 ? <SaveRoundedIcon /> : null}
                sx={activeStep === CREATE_STEPS.length - 1
                  ? ORANGE_BUTTON_SX
                  : { borderRadius: 999, px: 2.2, py: 1.25, textTransform: "none", fontWeight: 800 }}
              >
                {activeStep === CREATE_STEPS.length - 1 ? (saving ? "Creating..." : "Create Event") : "Next"}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                <Typography
                  component="h1"
                  sx={{ fontWeight: 950, color: "#16213E", fontSize: { xs: 26, md: 31 }, lineHeight: 1.12 }}
                >
                  {wizard.name || "Event Detail"}
                </Typography>
                <Chip
                  label={wizard.status}
                  size="small"
                  sx={{ bgcolor: (STATUS_TONE[wizard.status] || STATUS_TONE.Draft).bg, color: (STATUS_TONE[wizard.status] || STATUS_TONE.Draft).color, fontWeight: 900 }}
                />
                {wizard.semesterSelection ? (
                  <Chip
                    label={wizard.semesterSelection.replace("|", " ")}
                    size="small"
                    sx={{ bgcolor: "#FFF6EE", color: "#E17C32", fontWeight: 900 }}
                  />
                ) : null}
              </Stack>
              <Typography sx={{ color: "#64748B" }}>
                {wizard.description || "Configure tracks, rounds, scoring criteria, and publishing readiness here."}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={refreshCurrentView}
                sx={{ borderRadius: 999, px: 2.2, py: 1.25, textTransform: "none", fontWeight: 800 }}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineRoundedIcon />}
                onClick={() => setDeleteDialogOpen(true)}
                disabled={!wizard.canDelete}
                sx={{ borderRadius: 999, px: 2.2, py: 1.25, textTransform: "none", fontWeight: 800 }}
              >
                Delete Event
              </Button>
              <Button
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => {
                  setViewMode("list");
                  setStepErrors([]);
                  setWizardError("");
                }}
                sx={{ borderRadius: 999, px: 2.2, py: 1.25, textTransform: "none", fontWeight: 800 }}
              >
                Back to List
              </Button>
            </Stack>
          </Box>

          {wizardError ? <Alert severity="error">{wizardError}</Alert> : null}
          {stepErrors.length ? (
            <Alert severity="warning">
              <Stack spacing={0.5}>
                {stepErrors.map((issue) => (
                  <span key={issue}>{issue}</span>
                ))}
              </Stack>
            </Alert>
          ) : null}

          <Card
            sx={{
              borderRadius: 2,
              border: "1px solid #D9E2EF",
              boxShadow: "0 18px 34px rgba(15, 23, 42, 0.08)",
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack spacing={3.2}>
                <Box>
                  <ConfigSectionHeader
                    index="1"
                    title="Tracks"
                    description="Split the event into tracks and decide whether teams choose their own track or the system assigns it automatically."
                  />
                  <TextField
                    select
                    fullWidth
                    label="Track assignment mode"
                    value={wizard.trackAssignmentMode}
                    onChange={(event) => updateWizard("trackAssignmentMode", event.target.value)}
                    disabled={!editable}
                    sx={{ mb: 2, ...CONFIG_FIELD_SX }}
                  >
                    {TRACK_ASSIGNMENT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Stack spacing={1.5}>
                    {wizard.tracks.map((track, index) => (
                      <Card key={`track-${track.trackId || index}`} variant="outlined" sx={CONFIG_SUBSECTION_SX}>
                        <CardContent sx={{ p: 1.75 }}>
                          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                            <TextField
                              fullWidth
                              label={`Track ${index + 1}`}
                              value={track.name}
                              onChange={(event) => updateTrack(index, "name", event.target.value)}
                              disabled={!editable}
                              sx={CONFIG_FIELD_SX}
                            />
                            <TextField
                              label="Min teams"
                              type="number"
                              value={track.minTeams}
                              onChange={(event) => updateTrack(index, "minTeams", event.target.value)}
                              disabled={!editable}
                              inputProps={{ min: 1 }}
                              sx={{ ...CONFIG_FIELD_SX, width: { xs: "100%", md: 140 } }}
                            />
                            <TextField
                              label="Max teams"
                              type="number"
                              value={track.maxTeams}
                              onChange={(event) => updateTrack(index, "maxTeams", event.target.value)}
                              disabled={!editable}
                              inputProps={{ min: 1 }}
                              sx={{ ...CONFIG_FIELD_SX, width: { xs: "100%", md: 140 } }}
                            />
                            {editable ? (
                              <Button
                                variant="outlined"
                                color="error"
                                onClick={() => removeTrack(index)}
                                sx={{ minWidth: 132, borderRadius: 999, textTransform: "none", fontWeight: 800 }}
                              >
                                Delete
                              </Button>
                            ) : null}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                  {editable ? (
                    <Button variant="text" startIcon={<AddRoundedIcon />} onClick={addTrack} sx={{ mt: 1.4, textTransform: "none", fontWeight: 800 }}>
                      Add Track
                    </Button>
                  ) : null}
                </Box>

                <Box sx={{ mb: 2 }}>
                      <ConfigSectionHeader
                        index="2"
                        title="Qualifying Rounds"
                        description="Each qualifying round defines the Top N teams per track that advance to the next stage."
                        action={editable ? (
                          <Button variant="text" startIcon={<AddRoundedIcon />} onClick={addQualifyingRound} sx={{ textTransform: "none", fontWeight: 800 }}>
                            Add Round
                          </Button>
                        ) : null}
                      />

                      <Stack spacing={1.5}>
                        {wizard.qualifyingRounds.length === 0 ? (
                          <EmptyState compact text="No qualifying rounds yet. Add the first round to start defining the promotion path." />
                        ) : wizard.qualifyingRounds.map((round, index) => (
                          <Box key={`qualifying-round-${round.roundId || index}`} sx={ROUND_ITEM_SX}>
                              <Stack spacing={1.6}>
                                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                                  <TextField
                                    fullWidth
                                    label={`Qualifying Round ${index + 1} Name`}
                                    value={round.roundName}
                                    onChange={(event) => updateQualifyingRound(index, "roundName", event.target.value)}
                                    disabled={!editable}
                                    sx={CONFIG_FIELD_SX}
                                  />
                                  <TextField
                                    label="Top N per track"
                                    type="number"
                                    value={round.topNPerTrack}
                                    onChange={(event) => updateQualifyingRound(index, "topNPerTrack", event.target.value)}
                                    disabled={!editable}
                                    inputProps={{ min: 1 }}
                                    sx={{ width: { xs: "100%", md: 200 }, ...CONFIG_FIELD_SX }}
                                  />
                                  {editable ? (
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      onClick={() => removeQualifyingRound(index)}
                                      sx={{ borderRadius: 999, minWidth: 132, textTransform: "none", fontWeight: 800 }}
                                    >
                                      Delete
                                    </Button>
                                  ) : null}
                                </Stack>
                                <DateTimeField
                                  label="Submission Deadline"
                                  value={round.submissionDeadline}
                                  onChange={(nextValue) => updateQualifyingRound(index, "submissionDeadline", nextValue)}
                                  minDateTime={competitionMinDateTime}
                                  maxDateTime={competitionMaxDateTime}
                                  helperText="This is the submission cut-off for the round and must stay inside the competition window."
                                  disabled={!editable}
                                  framed={false}
                                />
                                <Box sx={ROUND_INNER_SECTION_SX}>
                                    <Stack spacing={1.4}>
                                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box>
                                          <Typography sx={{ fontWeight: 800, color: "#16213E" }}>
                                            Scoring Criteria
                                          </Typography>
                                          <Typography sx={{ color: "#64748B", fontSize: 13 }}>
                                            Start from the qualifier template, then adjust criteria for this round if needed.
                                          </Typography>
                                        </Box>
                                        {editable ? (
                                          <Button
                                            variant="text"
                                            startIcon={<AddRoundedIcon />}
                                            onClick={() => addQualifyingCriterion(index)}
                                            sx={{ textTransform: "none", fontWeight: 800 }}
                                          >
                                            Add Criterion
                                          </Button>
                                        ) : null}
                                      </Stack>
                                      <Stack spacing={1.2}>
                                        {(round.criteria || []).map((criterion, criterionIndex) => (
                                          <Stack key={`qualifying-criterion-${index}-${criterionIndex}`} direction={{ xs: "column", md: "row" }} spacing={1.2}>
                                            <TextField
                                              fullWidth
                                              label={`Criterion ${criterionIndex + 1}`}
                                              value={criterion.criterionName}
                                              onChange={(event) => updateQualifyingCriterion(index, criterionIndex, { criterionName: event.target.value })}
                                              disabled={!editable}
                                              sx={CONFIG_FIELD_SX}
                                            />
                                            <TextField
                                              label="Weight (%)"
                                              type="number"
                                              value={criterion.weight ?? ""}
                                              onChange={(event) => updateQualifyingCriterion(index, criterionIndex, { weight: event.target.value })}
                                              disabled={!editable}
                                              inputProps={{ min: 1, max: 100 }}
                                              sx={{ width: { xs: "100%", md: 160 }, ...CONFIG_FIELD_SX }}
                                            />
                                            {editable ? (
                                              <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => removeQualifyingCriterion(index, criterionIndex)}
                                                disabled={(round.criteria || []).length <= 1}
                                                sx={{ minWidth: 132, borderRadius: 999, textTransform: "none", fontWeight: 800 }}
                                              >
                                                Delete
                                              </Button>
                                            ) : null}
                                          </Stack>
                                        ))}
                                      </Stack>
                                    </Stack>
                                </Box>
                              </Stack>
                          </Box>
                        ))}
                      </Stack>
                </Box>

                <Box>
                        <ConfigSectionHeader
                          index="3"
                          title="Final Round"
                          description="Finalists from every track join one shared final round instead of competing inside track boundaries."
                        />
                        <Stack spacing={1.5}>
                          <TextField
                            fullWidth
                            label="Final Round Name"
                            value={wizard.finalRound.roundName}
                            onChange={(event) => updateWizard("finalRound", { ...wizard.finalRound, roundName: normalizeFinalRoundName(event.target.value) })}
                            disabled={!editable}
                            sx={CONFIG_FIELD_SX}
                          />
                          <DateTimeField
                            label="Submission Deadline"
                            value={wizard.finalRound.submissionDeadline}
                            onChange={(nextValue) => updateWizard("finalRound", { ...wizard.finalRound, submissionDeadline: nextValue })}
                            minDateTime={competitionMinDateTime}
                            maxDateTime={competitionMaxDateTime}
                            helperText="This is the final submission cut-off before judges begin the final assessment."
                            disabled={!editable}
                            framed={false}
                          />
                          <Box sx={ROUND_INNER_SECTION_SX}>
                              <Stack spacing={1.4}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Box>
                                    <Typography sx={{ fontWeight: 800, color: "#16213E" }}>
                                      Scoring Criteria
                                    </Typography>
                                    <Typography sx={{ color: "#64748B", fontSize: 13 }}>
                                      Start from the final-round template, then adjust the judging criteria for the live Q&amp;A round.
                                    </Typography>
                                  </Box>
                                  {editable ? (
                                    <Button
                                      variant="text"
                                      startIcon={<AddRoundedIcon />}
                                      onClick={addFinalCriterion}
                                      sx={{ textTransform: "none", fontWeight: 800 }}
                                    >
                                      Add Criterion
                                    </Button>
                                  ) : null}
                                </Stack>
                                <Stack spacing={1.2}>
                                  {(wizard.finalRound.criteria || []).map((criterion, criterionIndex) => (
                                    <Stack key={`final-criterion-${criterionIndex}`} direction={{ xs: "column", md: "row" }} spacing={1.2}>
                                      <TextField
                                        fullWidth
                                        label={`Criterion ${criterionIndex + 1}`}
                                        value={criterion.criterionName}
                                        onChange={(event) => updateFinalCriterion(criterionIndex, { criterionName: event.target.value })}
                                        disabled={!editable}
                                        sx={CONFIG_FIELD_SX}
                                      />
                                      <TextField
                                        label="Weight (%)"
                                        type="number"
                                        value={criterion.weight ?? ""}
                                        onChange={(event) => updateFinalCriterion(criterionIndex, { weight: event.target.value })}
                                        disabled={!editable}
                                        inputProps={{ min: 1, max: 100 }}
                                        sx={{ width: { xs: "100%", md: 160 }, ...CONFIG_FIELD_SX }}
                                      />
                                      {editable ? (
                                        <Button
                                          variant="outlined"
                                          color="error"
                                          onClick={() => removeFinalCriterion(criterionIndex)}
                                          disabled={(wizard.finalRound.criteria || []).length <= 1}
                                          sx={{ minWidth: 132, borderRadius: 999, textTransform: "none", fontWeight: 800 }}
                                        >
                                          Delete
                                        </Button>
                                      ) : null}
                                    </Stack>
                                  ))}
                                </Stack>
                              </Stack>
                          </Box>
                          <Box sx={ROUND_INNER_SECTION_SX}>
                              <Stack spacing={1.4}>
                                <Box>
                                  <Typography sx={{ fontWeight: 800, color: "#16213E" }}>
                                    Awards
                                  </Typography>
                                  <Typography sx={{ color: "#64748B", fontSize: 13 }}>
                                    Configure the final awards here. Finalists are ranked automatically by their final-round score.
                                  </Typography>
                                </Box>
                                <Chip
                                  label="Ranking: Final round score"
                                  sx={{ alignSelf: "flex-start", bgcolor: "#FFF6EE", color: "#E17C32", fontWeight: 800 }}
                                />
                                <Stack spacing={1.2}>
                                  {wizard.awards.map((award, index) => (
                                    <Stack key={`award-${index}`} direction={{ xs: "column", md: "row" }} spacing={1.2}>
                                      <TextField
                                        fullWidth
                                        label={`Award ${index + 1}`}
                                        value={award.awardName}
                                        onChange={(event) => updateAward(index, "awardName", event.target.value)}
                                        disabled={!editable}
                                        sx={CONFIG_FIELD_SX}
                                      />
                                      <TextField
                                        label="Quantity"
                                        type="number"
                                        value={award.quantity}
                                        onChange={(event) => updateAward(index, "quantity", event.target.value)}
                                        inputProps={{ min: 1 }}
                                        disabled={!editable}
                                        sx={{ width: { xs: "100%", md: 160 }, ...CONFIG_FIELD_SX }}
                                      />
                                      {editable ? (
                                        <Button
                                          variant="outlined"
                                          color="error"
                                          onClick={() => removeAward(index)}
                                          disabled={wizard.awards.length <= 1}
                                          sx={{ minWidth: 132, borderRadius: 999, textTransform: "none", fontWeight: 800 }}
                                        >
                                          Delete
                                        </Button>
                                      ) : null}
                                    </Stack>
                                  ))}
                                </Stack>
                                {editable ? (
                                  <Button variant="text" startIcon={<AddRoundedIcon />} onClick={addAward} sx={{ textTransform: "none", fontWeight: 800, alignSelf: "flex-start" }}>
                                    Add Award
                                  </Button>
                                ) : null}
                              </Stack>
                          </Box>
                        </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction="row" justifyContent="flex-end" spacing={1.2}>
            <Button
              variant="outlined"
              startIcon={<SaveRoundedIcon />}
              onClick={saveDraft}
              disabled={saving || !editable}
              sx={{ borderRadius: 999, px: 2.2, py: 1.25, textTransform: "none", fontWeight: 800 }}
            >
              Save
            </Button>
            <Button
              variant="contained"
              startIcon={<PublishRoundedIcon />}
              onClick={() => setPublishDialogOpen(true)}
              disabled={saving || wizard.published}
              sx={ORANGE_BUTTON_SX}
            >
              {publishButtonLabel}
            </Button>
          </Stack>
        </Stack>
      )}

      <Dialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Publish Event</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#475569" }}>
            Publishing will make this event visible to users and lock further editing. Are you sure the latest information is ready?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setPublishDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={publishEvent} disabled={saving} sx={ORANGE_BUTTON_SX}>
            {saving ? "Publishing..." : "Publish"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Event</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#475569" }}>
            Delete this event permanently? This is allowed only when no teams have joined it yet.
          </Typography>
          {wizard.hasParticipants ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This event already has participating teams, so deletion is blocked.
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="outlined"
            color="error"
            onClick={deleteEvent}
            disabled={saving || !wizard.canDelete}
            startIcon={<DeleteOutlineRoundedIcon />}
            sx={{ borderRadius: 999, px: 2.2, py: 1.25, textTransform: "none", fontWeight: 800 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
