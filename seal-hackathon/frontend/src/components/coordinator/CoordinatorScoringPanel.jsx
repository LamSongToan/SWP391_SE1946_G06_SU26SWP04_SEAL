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
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import { getApiErrorMessage, http } from "../../api/http";
import CenteredNotification from "../layout/CenteredNotification";
import ConfirmActionDialog from "../layout/ConfirmActionDialog";
import ModulePageHeader from "../layout/ModulePageHeader";
import { brand } from "../../styles/designTokens";
import { useSearchParams } from "react-router-dom";

function createBlankCriterion() {
  return {
    criteriaId: null,
    criteriaName: "",
    weight: "",
    criteriaType: "",
  };
}

function normalizeCriteriaRows(rows) {
  return rows.map((row) => ({
    criteriaId: row.criteriaId ?? null,
    criteriaName: String(row.criteriaName || "").trim(),
    weight: Number(row.weight || 0),
    criteriaType: String(row.criteriaType || "").trim(),
  }));
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMetric(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return number.toFixed(2);
}

function formatPrizeAmountVnd(value) {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return "0 VND";
  return `${amount.toLocaleString("vi-VN")} VND`;
}

function normalizeEventStatus(value) {
  return String(value || "")
    .trim()
    .replace(/[\s_]+/g, "")
    .toLowerCase();
}

function pickPreferredEvent(events = []) {
  if (!events.length) return null;
  return events.find((event) => normalizeEventStatus(event.status) === "ongoing") || events[0] || null;
}

function pickPreferredRound(rounds = []) {
  if (!rounds.length) return null;
  const sorted = [...rounds].sort((left, right) => Number(left.roundOrder || 0) - Number(right.roundOrder || 0));
  const now = Date.now();
  const activeRound = sorted.find((round) => {
    const start = new Date(round.startAt).getTime();
    const end = new Date(round.endAt || round.submissionDeadline).getTime();
    return Number.isFinite(start) && start <= now && (!Number.isFinite(end) || now <= end);
  });
  if (activeRound) return activeRound;

  const startedRounds = sorted.filter((round) => {
    const start = new Date(round.startAt).getTime();
    return Number.isFinite(start) && start <= now;
  });
  if (startedRounds.length) return startedRounds[startedRounds.length - 1];

  const upcomingRound = sorted.find((round) => Number.isFinite(new Date(round.startAt).getTime()));
  if (upcomingRound) return upcomingRound;

  const unlocked = sorted.filter((round) => round.scoreLocked !== true);
  if (unlocked.length) {
    return unlocked[0];
  }
  return sorted[sorted.length - 1] || null;
}

const EVENT_STATUS_TONE = {
  Ongoing: { bg: "#FFF2E8", color: "#E17C32" },
  Ended: { bg: "#EEF1F6", color: "#64748B" },
  Draft: { bg: "#F4F6FB", color: "#16213E" },
};

function hasScoreValue(item) {
  return item?.totalScore !== null && item?.totalScore !== undefined && item?.totalScore !== "";
}

const TOOL_BUTTON_SX = {
  borderRadius: 999,
  minHeight: 38,
  px: 1.6,
  textTransform: "none",
  fontWeight: 900,
  boxShadow: "none",
  whiteSpace: "nowrap",
  "&:hover": {
    boxShadow: "none",
  },
};

function ActionCluster({ children }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        flexWrap: "wrap",
        px: 0.6,
        py: 0.55,
        border: `1px solid ${brand.colors.line}`,
        borderRadius: 999,
        bgcolor: "rgba(255,255,255,0.82)",
      }}
    >
      {children}
    </Box>
  );
}

function StatusStrip({ tone = "info", label, children }) {
  const tones = {
    success: { bg: "#ECFDF5", border: "#BDEBD8", color: "#047857" },
    warning: { bg: "#FFF8E7", border: "#FFE1A6", color: "#B45309" },
    info: { bg: brand.colors.surfaceInfo, border: "#CFE0FF", color: brand.colors.navyMuted },
    danger: { bg: "#FFF1F0", border: "#FFC9C2", color: brand.colors.danger },
  };
  const palette = tones[tone] || tones.info;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", md: "center" },
        justifyContent: "space-between",
        flexDirection: { xs: "column", md: "row" },
        gap: 0.8,
        px: 1.35,
        py: 1,
        border: `1px solid ${palette.border}`,
        borderRadius: brand.radius.md,
        bgcolor: palette.bg,
      }}
    >
      <Chip
        size="small"
        label={label}
        sx={{
          height: 26,
          bgcolor: "#FFFFFF",
          color: palette.color,
          fontWeight: 950,
          border: `1px solid ${palette.border}`,
        }}
      />
      <Typography sx={{ color: palette.color, fontSize: 12.5, fontWeight: 780, lineHeight: 1.45 }}>
        {children}
      </Typography>
    </Box>
  );
}

function MetricTile({ label, value, tone = "default" }) {
  const accent = tone === "hot" ? brand.colors.orange : tone === "good" ? brand.colors.green : brand.colors.blue;
  return (
    <Box
      sx={{
        p: 1.55,
        borderRadius: brand.radius.md,
        border: `1px solid ${brand.colors.line}`,
        bgcolor: "#FFFFFF",
        boxShadow: brand.shadow.xs,
        position: "relative",
        overflow: "hidden",
        minHeight: 92,
        "&:before": {
          content: '""',
          position: "absolute",
          inset: "0 auto 0 0",
          width: 4,
          bgcolor: accent,
        },
      }}
    >
      <Typography sx={{ color: brand.colors.muted, fontSize: 11.5, fontWeight: 950, textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Typography sx={{ color: brand.colors.text, fontSize: 22, fontWeight: 950, mt: 0.7, lineHeight: 1.08 }}>
        {value}
      </Typography>
    </Box>
  );
}

function getLeaderboardPresentation(item, finalization) {
  const normalizedQualificationStatus = String(item.qualificationStatus || "").toLowerCase();
  const isDisqualified = normalizedQualificationStatus === "disqualified";
  const qualificationApplied = finalization.qualificationCalculated;
  const advancementApplied = finalization.advancementApplied;
  const isTopTeam = qualificationApplied
    && !isDisqualified
    && (item.qualifiedNextRound || normalizedQualificationStatus === "qualified");
  let resultLabel = "Pending";
  let resultColor = isTopTeam ? "success" : "default";
  if (isDisqualified) {
    resultLabel = "Disqualified";
    resultColor = "error";
  }
  if (qualificationApplied) {
    if (!isDisqualified && normalizedQualificationStatus === "qualified") {
      resultLabel = advancementApplied ? "Promoted" : "Qualified";
      resultColor = "success";
    } else if (normalizedQualificationStatus === "eliminated") {
      resultLabel = "Eliminated";
      resultColor = "default";
    } else if (normalizedQualificationStatus === "not applicable") {
      resultLabel = "N/A";
      resultColor = "default";
    }
  } else if (!isDisqualified && item.projectedQualifiedNextRound === true) {
    resultLabel = "Projected Top";
    resultColor = "default";
  } else if (!isDisqualified && item.projectedQualifiedNextRound === false) {
    resultLabel = "Projected Out";
    resultColor = "default";
  }
  return { isDisqualified, isTopTeam, resultLabel, resultColor };
}

function getBreakdownStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "qualified") return { label: "Qualified", color: "success" };
  if (normalized === "eliminated") return { label: "Eliminated", color: "default" };
  if (normalized === "disqualified") return { label: "Disqualified", color: "error" };
  if (normalized === "not applicable") return { label: "Published", color: "info" };
  return { label: value || "Pending", color: "default" };
}

function formatCompetitionWindow(event) {
  const start = event?.competitionStartAt || event?.registrationStartAt || event?.startDate;
  const end = event?.competitionEndAt || event?.registrationEndAt || event?.endDate;
  if (!start || !end) return "Timeline not configured yet";
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

function SectionCard({ title, description, action, children }) {
  const hasHeader = Boolean(title || description || action);
  return (
    <Card
      sx={{
        borderRadius: brand.radius.lg,
        border: `1px solid ${brand.colors.line}`,
        boxShadow: brand.shadow.sm,
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        {hasHeader ? (
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "center" }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography sx={{ color: brand.colors.text, fontSize: 22, fontWeight: 950 }}>
                {title}
              </Typography>
              <Typography sx={{ color: brand.colors.muted, fontSize: 14 }}>
                {description}
              </Typography>
            </Box>
            {action}
          </Stack>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}

function EventSelectionList({
  events,
  onOpenEvent,
}) {
  return (
    <Stack spacing={2}>
      {events.map((event) => {
        const tone = EVENT_STATUS_TONE[event.status] || EVENT_STATUS_TONE.Draft;
        return (
          <Card
            key={event.eventId}
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(226, 232, 240, 0.95)",
              boxShadow: "0 20px 48px rgba(15, 23, 42, 0.08)",
              overflow: "hidden",
              bgcolor: "#FFFFFF",
            }}
          >
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                justifyContent="space-between"
                sx={{ minHeight: 188 }}
              >
                <Box sx={{ flex: 1, p: { xs: 2.35, md: 3 } }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.1 }}>
                    <Chip label={event.status} size="small" sx={{ bgcolor: tone.bg, color: tone.color, fontWeight: 900, height: 28 }} />
                    {event.semester && event.year ? (
                      <Chip label={`${event.semester}${event.year ? ` ${event.year}` : ""}`} size="small" sx={{ bgcolor: "#FFF6EE", color: "#E17C32", fontWeight: 900, height: 28 }} />
                    ) : null}
                  </Stack>
                  <Typography sx={{ color: brand.colors.text, fontWeight: 950, fontSize: { xs: 24, md: 30 }, lineHeight: 1.12, mb: 0.7 }}>
                    {event.name}
                  </Typography>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 14.5, lineHeight: 1.55, mb: 2 }}>
                    {event.description || "Open this event to review scoring rounds and leaderboards."}
                  </Typography>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.2,
                        px: 1.6,
                        py: 1.1,
                        borderRadius: 2.5,
                        bgcolor: "#FFFFFF",
                        border: "1px solid #E7ECF3",
                        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                        minWidth: { xs: "100%", sm: 320 },
                      }}
                    >
                      <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: "#FFF2E8", color: "#E17C32", display: "grid", placeItems: "center", flex: "0 0 34px" }}>
                        <CalendarMonthRoundedIcon sx={{ fontSize: 19 }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          Competition Window
                        </Typography>
                        <Typography sx={{ color: brand.colors.text, fontWeight: 850, mt: 0.35, lineHeight: 1.25 }}>
                          {formatCompetitionWindow(event)}
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
                        bgcolor: "#FFFFFF",
                        border: "1px solid #E7ECF3",
                        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                        minWidth: { xs: "100%", sm: 220 },
                      }}
                    >
                      <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: "#EEF4FF", color: "#4A7BFF", display: "grid", placeItems: "center", flex: "0 0 34px" }}>
                        <HubRoundedIcon sx={{ fontSize: 19 }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          Structure
                        </Typography>
                        <Typography sx={{ color: brand.colors.text, fontWeight: 850, mt: 0.35, lineHeight: 1.25 }}>
                          {event.trackCount} tracks / {event.roundCount} rounds
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    width: { xs: "100%", lg: 230 },
                    borderLeft: { xs: "none", lg: "1px solid #E7ECF3" },
                    borderTop: { xs: "1px solid #E7ECF3", lg: "none" },
                    bgcolor: "#FFFFFF",
                    p: { xs: 2.2, md: 2.5 },
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 1.6,
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#94A3B8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6, mb: 1 }}>
                      Quick View
                    </Typography>
                    <Stack spacing={0.9}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1.2, py: 1, borderRadius: 999, bgcolor: "#FFF6EE" }}>
                        <Typography sx={{ color: brand.colors.text, fontWeight: 900, fontSize: 17 }}>{event.trackCount}</Typography>
                        <Typography sx={{ color: brand.colors.muted, fontWeight: 800, fontSize: 13 }}>tracks</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1.2, py: 1, borderRadius: 999, bgcolor: "#F5F8FE" }}>
                        <Typography sx={{ color: brand.colors.text, fontWeight: 900, fontSize: 17 }}>{event.roundCount}</Typography>
                        <Typography sx={{ color: brand.colors.muted, fontWeight: 800, fontSize: 13 }}>rounds</Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Button
                    variant="contained"
                    endIcon={<OpenInNewRoundedIcon />}
                    onClick={() => onOpenEvent(event.eventId)}
                    sx={{
                      borderRadius: 999,
                      px: 2.2,
                      py: 1.25,
                      textTransform: "none",
                      fontWeight: 800,
                      boxShadow: "none",
                      bgcolor: brand.colors.navy,
                      "&:hover": {
                        bgcolor: brand.colors.navySoft,
                        boxShadow: "none",
                      },
                    }}
                  >
                    Open leaderboard
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

function RoundSelectorPanel({
  event,
  rounds,
  selectedRoundId,
  onSelectRound,
  onBack,
}) {
  return (
    <SectionCard
      title={event?.name || "Event Rounds"}
      description="Choose a round to review its leaderboard."
      action={(
        <Button
          variant="outlined"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={onBack}
          sx={{ borderRadius: 999, textTransform: "none", fontWeight: 800 }}
        >
          Back To Events
        </Button>
      )}
    >
      <Box sx={{ maxWidth: 360 }}>
        <TextField
          select
          fullWidth
          label="Round"
          value={selectedRoundId ?? ""}
          onChange={(eventArg) => onSelectRound(Number(eventArg.target.value))}
          disabled={rounds.length === 0}
          helperText={rounds.length === 0 ? "Configure event rounds first before managing scoring." : "Choose a round leaderboard to review."}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              bgcolor: "#FFFFFF",
            },
          }}
        >
          {rounds.map((round) => (
            <MenuItem key={round.roundId} value={round.roundId}>
              {round.roundOrder}. {round.roundName}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </SectionCard>
  );
}

function CriteriaEditor({ rows, setRows, disabled }) {
  const totalWeight = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.weight || 0), 0),
    [rows]
  );

  const updateRow = (index, key, value) => {
    setRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [key]: value } : row
    )));
  };

  const removeRow = (index) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <Stack spacing={1.2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip
          label={`${totalWeight.toFixed(2)}% total weight`}
          color={Math.abs(totalWeight - 100) < 0.001 ? "success" : "warning"}
        />
        <Chip
          variant="outlined"
          label={`${rows.length} criterion${rows.length === 1 ? "" : "a"}`}
        />
      </Stack>

      {rows.map((row, index) => (
        <Box
          key={`${row.criteriaId ?? "new"}-${index}`}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.6fr 0.7fr 0.9fr auto" },
            gap: 1.2,
            alignItems: "start",
            p: 1.4,
            borderRadius: brand.radius.md,
            border: `1px solid ${brand.colors.line}`,
            bgcolor: brand.colors.surfaceSoft,
          }}
        >
          <TextField
            label="Criterion Name"
            value={row.criteriaName}
            disabled={disabled}
            onChange={(event) => updateRow(index, "criteriaName", event.target.value)}
          />
          <TextField
            label="Weight (%)"
            type="number"
            value={row.weight}
            disabled={disabled}
            inputProps={{ min: 0.01, step: 0.25 }}
            onChange={(event) => updateRow(index, "weight", event.target.value)}
          />
          <TextField
            label="Criterion Type"
            value={row.criteriaType}
            disabled={disabled}
            onChange={(event) => updateRow(index, "criteriaType", event.target.value)}
          />
          <IconButton
            onClick={() => removeRow(index)}
            disabled={disabled || rows.length === 1}
            sx={{ color: brand.colors.danger, mt: { xs: 0, md: 0.5 } }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}

      <Button
        variant="outlined"
        startIcon={<AddRoundedIcon />}
        disabled={disabled}
        onClick={() => setRows((current) => [...current, createBlankCriterion()])}
        sx={{ alignSelf: "flex-start", borderRadius: 999 }}
      >
        Add Criterion
      </Button>
    </Stack>
  );
}

function TemplateDialog({ open, mode, initialValue, onClose, onSubmit, saving }) {
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [criteriaRows, setCriteriaRows] = useState([createBlankCriterion()]);

  useEffect(() => {
    if (!open) return;
    setTemplateName(initialValue?.templateName || "");
    setDescription(initialValue?.description || "");
    setCriteriaRows(
      (initialValue?.criteria || []).length > 0
        ? initialValue.criteria.map((item) => ({
            criteriaId: item.criteriaId ?? null,
            criteriaName: item.criteriaName || "",
            weight: item.weight ?? "",
            criteriaType: item.criteriaType || "",
          }))
        : [createBlankCriterion()]
    );
  }, [initialValue, open]);

  const handleSubmit = () => {
    onSubmit({
      templateName,
      description,
      criteria: normalizeCriteriaRows(criteriaRows),
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>
        {mode === "edit" ? "Update Criteria Template" : "Create Criteria Template"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Template Name"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            disabled={saving}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={saving}
            multiline
            minRows={2}
          />
          <CriteriaEditor rows={criteriaRows} setRows={setCriteriaRows} disabled={saving} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : mode === "edit" ? "Update Template" : "Create Template"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CoordinatorScoringPanel() {
  const [, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [viewMode, setViewMode] = useState("events");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [finalization, setFinalization] = useState(null);
  const [resultPublication, setResultPublication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roundLoading, setRoundLoading] = useState(false);
  const [reportExportLoading, setReportExportLoading] = useState(false);
  const [didAutoOpenInitialEvent, setDidAutoOpenInitialEvent] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, mode: null, templateId: null, templateName: "" });
  const [extendScoringState, setExtendScoringState] = useState({ open: false, days: "1" });
  const [manualEliminationState, setManualEliminationState] = useState({
    open: false,
    teamId: null,
    submissionId: null,
    teamName: "",
    reason: "",
  });
  const [breakdownState, setBreakdownState] = useState({
    open: false,
    loading: false,
    data: null,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentRound = useMemo(
    () => rounds.find((round) => round.roundId === selectedRoundId) || null,
    [rounds, selectedRoundId]
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.eventId === selectedEventId) || null,
    [events, selectedEventId]
  );
  const isSelectedRoundFinal = Boolean(currentRound && !finalization?.nextRoundId);

  const rankingGroups = useMemo(() => {
    if (isSelectedRoundFinal) {
      return [{
        trackId: null,
        trackName: "All finalists",
        items: finalization?.submissions || [],
      }];
    }
    const grouped = new Map();
    for (const item of finalization?.submissions || []) {
      const key = `${item.trackId}-${item.trackName}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          trackId: item.trackId,
          trackName: item.trackName,
          items: [],
        });
      }
      grouped.get(key).items.push(item);
    }
    return Array.from(grouped.values()).sort((left, right) => (
      left.trackName.localeCompare(right.trackName)
    ));
  }, [finalization, isSelectedRoundFinal]);

  const activeRankingGroup = useMemo(
    () => rankingGroups.find((group) => group.trackId === selectedTrackId) || rankingGroups[0] || null,
    [rankingGroups, selectedTrackId]
  );
  const canDisqualifyFromEvent = String(selectedEvent?.status || "").toLowerCase() === "ongoing";
  const hasReportableRanking = Boolean(finalization?.scoreLocked) && Boolean((finalization?.submissions || []).length);
  const publishReadinessNote = resultPublication?.publishReadinessNote
    || resultPublication?.message
    || "Load result publication status before publishing.";
  const canAttemptPublishResults = Boolean(selectedEventId) && !resultPublication?.resultPublished;
  const publishFlowCompleted = Boolean(finalization?.scoreLocked)
    && (isSelectedRoundFinal || Boolean(finalization?.advancementApplied));
  const canPublishResults = Boolean(resultPublication?.canPublish)
    && canAttemptPublishResults
    && publishFlowCompleted;
  const publicationStatusLabel = resultPublication?.resultPublished
    ? "Published"
    : canPublishResults ? "Ready to publish" : "Round not ready";
  const publicationStatusTone = resultPublication?.resultPublished || canPublishResults ? "success" : "warning";
  const finalAwardPlacements = resultPublication?.awards || [];
  const finalAwardByTeamId = useMemo(() => {
    const placements = new Map();
    for (const award of finalAwardPlacements) {
      for (const winner of award.winners || []) {
        placements.set(String(winner.teamId), {
          awardName: award.awardName,
          prizeAmountVnd: award.prizeAmountVnd,
        });
      }
    }
    return placements;
  }, [finalAwardPlacements]);
  const canFinalizeRound = Boolean(finalization?.canFinalize || finalization?.forceFinalizeAllowed);
  const showUnfinishedWarning = Boolean(finalization?.overdueWarningMessage && !finalization?.scoreLocked);

  const loadRoundWorkspace = async (roundId) => {
    if (!roundId) {
      setFinalization(null);
      return;
    }
    setRoundLoading(true);
    try {
      const response = await http.get(`/api/coordinator/scoring/rounds/${roundId}/finalization`);
      setFinalization(response.data?.data || null);
    } finally {
      setRoundLoading(false);
    }
  };

  const loadResultPublication = async (roundId) => {
    if (!roundId) {
      setResultPublication(null);
      return;
    }
    try {
      const response = await http.get(`/api/coordinator/scoring/rounds/${roundId}/result-publication`);
      setResultPublication(response.data?.data || null);
    } catch {
      setResultPublication(null);
    }
  };

  const loadBootstrap = async () => {
    setLoading(true);
    setError("");
    try {
      const eventResponse = await http.get("/api/coordinator/events");
      const nextEvents = eventResponse.data?.data || [];
      setEvents(nextEvents);
      const hasSelectedEvent = selectedEventId && nextEvents.some((event) => event.eventId === selectedEventId);
      if (!hasSelectedEvent) {
        const nextPreferredEvent = pickPreferredEvent(nextEvents);
        const shouldAutoOpen = !didAutoOpenInitialEvent && Boolean(nextPreferredEvent);
        setSelectedEventId(shouldAutoOpen ? nextPreferredEvent?.eventId || null : null);
        setRounds([]);
        setSelectedRoundId(null);
        setFinalization(null);
        setViewMode(shouldAutoOpen ? "leaderboard" : "events");
        if (shouldAutoOpen) {
          setDidAutoOpenInitialEvent(true);
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load scoring workspace"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBootstrap();
  }, []);

  useEffect(() => {
    loadResultPublication(selectedRoundId);
  }, [selectedRoundId]);

  useEffect(() => {
    let mounted = true;
    const loadRounds = async () => {
      if (!selectedEventId) {
        setRounds([]);
        setSelectedRoundId(null);
        return;
      }
      setRoundLoading(true);
      setError("");
      try {
        const response = await http.get(`/api/coordinator/events/${selectedEventId}/rounds`);
        if (!mounted) return;
        const nextRounds = (response.data?.data || []).slice().sort((a, b) => a.roundOrder - b.roundOrder);
        setRounds(nextRounds);
        const preferredRound = pickPreferredRound(nextRounds);
        setSelectedRoundId((current) => (
          current && nextRounds.some((round) => round.roundId === current)
            ? current
            : preferredRound?.roundId || null
        ));
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, "Failed to load rounds for scoring"));
          setRounds([]);
          setSelectedRoundId(null);
        }
      } finally {
        if (mounted) {
          setRoundLoading(false);
        }
      }
    };

    loadRounds();
    return () => {
      mounted = false;
    };
  }, [selectedEventId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedRoundId) {
        setFinalization(null);
        return;
      }
      setError("");
      try {
        await loadRoundWorkspace(selectedRoundId);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load round scoring details"));
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedRoundId]);

  useEffect(() => {
    if (isSelectedRoundFinal) {
      setSelectedTrackId(null);
      return;
    }
    if (rankingGroups.length === 0) {
      setSelectedTrackId(null);
      return;
    }
    if (!rankingGroups.some((group) => group.trackId === selectedTrackId)) {
      setSelectedTrackId(rankingGroups[0].trackId);
    }
  }, [rankingGroups, selectedTrackId, isSelectedRoundFinal]);

  const openEventLeaderboard = (eventId) => {
    setSelectedEventId(eventId);
    setSelectedRoundId(null);
    setFinalization(null);
    setSelectedTrackId(null);
    setViewMode("leaderboard");
  };

  const returnToEventSelection = () => {
    setViewMode("events");
    setSelectedEventId(null);
    setSelectedRoundId(null);
    setSelectedTrackId(null);
    setRounds([]);
    setFinalization(null);
  };

  const handleFinalizeRound = async () => {
    if (!selectedRoundId) return;
    setError("");
    try {
      const force = Boolean(finalization?.forceFinalizeAllowed && !finalization?.canFinalize);
      await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/finalize`, null, {
        params: force ? { force: true } : undefined,
      });
      setSuccess(force ? "Round force-finalized with unresolved scoring issues." : "Round scores finalized and locked.");
      await loadRoundWorkspace(selectedRoundId);
      await loadResultPublication(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to finalize round scores"));
    }
  };

  const handleExtendScoringWindow = async () => {
    if (!selectedRoundId) return;
    const days = Number(extendScoringState.days);
    if (!Number.isInteger(days) || days < 1) {
      setError("Enter a valid number of days to extend scoring.");
      return;
    }
    setError("");
    try {
      await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/extend-scoring`, { days });
      setSuccess(`Scoring window extended by ${days} day(s), and assigned judges were notified.`);
      setExtendScoringState({ open: false, days: "1" });
      await loadBootstrap();
      await loadRoundWorkspace(selectedRoundId);
      await loadResultPublication(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to extend the scoring window"));
    }
  };

  const handleReopenRound = async () => {
    if (!selectedRoundId) return;
    setError("");
    try {
      await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/reopen`);
      setSuccess("Round finalization reopened.");
      await loadRoundWorkspace(selectedRoundId);
      await loadResultPublication(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reopen round finalization"));
    }
  };

  const openSubmissionBreakdown = async (submissionId) => {
    if (!submissionId) return;
    setBreakdownState({ open: true, loading: true, data: null });
    try {
      const response = await http.get(`/api/coordinator/scoring/submissions/${submissionId}/breakdown`);
      setBreakdownState({
        open: true,
        loading: false,
        data: response.data?.data || null,
      });
    } catch (err) {
      setBreakdownState({ open: false, loading: false, data: null });
      setError(getApiErrorMessage(err, "Failed to load submission score breakdown"));
    }
  };

  const closeSubmissionBreakdown = () => {
    setBreakdownState({ open: false, loading: false, data: null });
  };

  const openSubmissionInTeamManagement = (item) => {
    if (!item?.teamId || !selectedEventId) return;
    setSearchParams({
      section: "team-formation",
      eventId: String(selectedEventId),
      teamId: String(item.teamId),
    });
  };

  const handleCalculateQualification = async () => {
    if (!selectedRoundId) return;
    setError("");
    try {
      await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/qualification`);
      setSuccess("Qualification results calculated and saved.");
      await loadRoundWorkspace(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to calculate qualification results"));
    }
  };

  const handleAdvanceRound = async () => {
    if (!selectedRoundId) return;
    setError("");
    try {
      await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/advance`);
      setSuccess("Qualified teams promoted and the remaining teams eliminated.");
      await loadRoundWorkspace(selectedRoundId);
      await loadResultPublication(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to promote teams to the next round"));
    }
  };

  const downloadBlob = (data, filename, mimeType) => {
    const blob = new Blob([data], { type: mimeType });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  };

  const handlePublishResults = async () => {
    if (!selectedEventId || !selectedRoundId) return;
    setError("");
    if (!canPublishResults) {
      setError(publishReadinessNote);
      return;
    }
    try {
      const response = await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/publish-results`);
      const data = response.data?.data || null;
      setResultPublication(data);
      setSuccess(data?.message || "Results published.");
      await loadBootstrap();
      await loadResultPublication(selectedRoundId);
      const finalizationResponse = await http.get(`/api/coordinator/scoring/rounds/${selectedRoundId}/finalization`);
      if (finalizationResponse?.data?.data) {
        setFinalization(finalizationResponse.data.data);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to publish round results"));
    }
  };

  const handleExportRankingReport = async (format, { trackId = null } = {}) => {
    if (!selectedRoundId) return;
    if (!hasReportableRanking) {
      setError("Finalize this round before exporting ranking reports.");
      setSuccess("");
      return;
    }
    setError("");
    setReportExportLoading(true);
    try {
      const params = {};
      if (trackId) {
        params.trackId = trackId;
      }
      const response = await http.get(
        `/api/coordinator/scoring/rounds/${selectedRoundId}/ranking-report.${format}`,
        { responseType: "blob", params }
      );
      const suffix = trackId ? `track-${trackId}` : "round";
      downloadBlob(
        response.data,
        `seal-round-${selectedRoundId}-${suffix}-ranking-report.${format}`,
        format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8"
      );
      setSuccess(format === "csv" ? "Ranking CSV report exported." : "Excel report exported.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to export ranking report"));
    } finally {
      setReportExportLoading(false);
    }
  };

  const handleManualElimination = async () => {
    if (!selectedEventId || !selectedRoundId || !manualEliminationState.teamId) return;
    const reason = String(manualEliminationState.reason || "").trim();
    if (!reason) {
      setError("Disqualification reason is required.");
      return;
    }
    setError("");
    try {
      await http.post(
        `/api/coordinator/events/${selectedEventId}/team-formation/teams/${manualEliminationState.teamId}/disqualify`,
        { reason }
      );
      setSuccess("Team disqualified from the event.");
      setManualEliminationState({ open: false, teamId: null, submissionId: null, teamName: "", reason: "" });
      await loadRoundWorkspace(selectedRoundId);
      await loadResultPublication(selectedRoundId);
      await loadBootstrap();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to disqualify team from event"));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: brand.colors.orange }} />
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

      <Stack spacing={2}>
        {viewMode === "events" ? (
          <ModulePageHeader
            eyebrow="Scoring Finalization"
            title="Hackathon Events"
            description="Choose an event to open its round leaderboard page."
            actions={(
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={loadBootstrap}
                sx={{ borderRadius: 999, px: 2.2, py: 1.25, textTransform: "none", fontWeight: 800 }}
              >
                Refresh
              </Button>
            )}
          />
        ) : (
          <ModulePageHeader
            eyebrow="Scoring Finalization"
            title="Round Leaderboards"
            description="Choose a round inside the selected event to review rankings and finalize scoring."
          />
        )}

        {events.length === 0 ? (
          <Box className="ms-empty">
            <Typography fontWeight={800}>No events configured</Typography>
            <Typography variant="body2" color="text.secondary">
              Create an event and configure rounds before managing scoring.
            </Typography>
          </Box>
        ) : null}

        {roundLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: brand.colors.orange }} />
          </Box>
        ) : viewMode === "events" ? (
          <EventSelectionList
            events={events}
            onOpenEvent={openEventLeaderboard}
          />
        ) : (
          <>
            <RoundSelectorPanel
              event={selectedEvent}
              rounds={rounds}
              selectedRoundId={selectedRoundId}
              onSelectRound={setSelectedRoundId}
              onBack={returnToEventSelection}
            />

            {currentRound && finalization && rankingGroups.length > 0 ? (
              <SectionCard
                title="Leaderboard"
                description={`${currentRound.roundOrder}. ${currentRound.roundName}`}
                action={(
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{
                      justifyContent: { xs: "flex-start", lg: "flex-end" },
                      alignItems: "center",
                      maxWidth: 1060,
                      "& .MuiButton-root": TOOL_BUTTON_SX,
                    }}
                  >
                    <ActionCluster>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshRoundedIcon />}
                        onClick={() => loadRoundWorkspace(selectedRoundId)}
                      >
                        Refresh
                      </Button>
                    </ActionCluster>
                    <ActionCluster>
                      <Button
                        variant="outlined"
                        startIcon={<TableChartRoundedIcon />}
                        disabled={reportExportLoading || !hasReportableRanking}
                        title={!hasReportableRanking ? "Finalize this round before exporting reports." : ""}
                        onClick={() => handleExportRankingReport("csv")}
                      >
                        Ranking CSV
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<TableChartRoundedIcon />}
                        disabled={reportExportLoading || !hasReportableRanking}
                        title={!hasReportableRanking ? "Finalize this round before exporting reports." : ""}
                        onClick={() => handleExportRankingReport("xls")}
                      >
                        Excel
                      </Button>
                    </ActionCluster>
                    {resultPublication?.resultPublished || canPublishResults ? (
                      <ActionCluster>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<PublishRoundedIcon />}
                          disabled={!selectedEventId || resultPublication?.resultPublished}
                          onClick={handlePublishResults}
                        >
                          {resultPublication?.resultPublished ? "Published" : "Publish"}
                        </Button>
                      </ActionCluster>
                    ) : null}
                    <ActionCluster>
                      {finalization.scoreLocked ? (
                        <>
                          {!finalization.advancementApplied && !resultPublication?.resultPublished ? (
                            <Button
                              variant="outlined"
                              color="warning"
                              startIcon={<GavelRoundedIcon />}
                              onClick={() => setConfirmState({ open: true, mode: "reopen-round" })}
                            >
                              Reopen
                            </Button>
                          ) : null}
                          {!finalization.qualificationCalculated
                          && finalization.nextRoundId
                          && finalization.promotionRulesConfigured ? (
                            <Button
                              variant="contained"
                              color="success"
                              startIcon={<AutoFixHighRoundedIcon />}
                              onClick={() => setConfirmState({ open: true, mode: "qualification-round" })}
                            >
                              Qualify
                            </Button>
                          ) : null}
                          {finalization.qualificationCalculated
                          && !finalization.advancementApplied
                          && finalization.nextRoundId ? (
                            <Button
                              variant="contained"
                              startIcon={<AssignmentTurnedInRoundedIcon />}
                              onClick={() => setConfirmState({ open: true, mode: "advance-round" })}
                            >
                              Promote
                            </Button>
                          ) : null}
                        </>
                      ) : (
                        <>
                          {showUnfinishedWarning && finalization.canExtendScoring ? (
                            <Button
                              variant="outlined"
                              color="warning"
                              startIcon={<CalendarMonthRoundedIcon />}
                              onClick={() => setExtendScoringState({ open: true, days: "1" })}
                            >
                              Extend scoring
                            </Button>
                          ) : null}
                          <Button
                            variant="contained"
                            startIcon={<AssignmentTurnedInRoundedIcon />}
                            disabled={!canFinalizeRound}
                            onClick={() => setConfirmState({ open: true, mode: "finalize-round" })}
                          >
                            Finalize
                          </Button>
                        </>
                      )}
                    </ActionCluster>
                  </Stack>
                )}
              >
                <Stack spacing={1.1} sx={{ mb: 1.5 }}>
                  {resultPublication ? (
                    <StatusStrip tone={publicationStatusTone} label={publicationStatusLabel}>
                      {publishReadinessNote}
                    </StatusStrip>
                  ) : null}
                  {showUnfinishedWarning ? (
                    <StatusStrip tone="warning" label="Scoring warning">
                      {finalization.overdueWarningMessage}
                    </StatusStrip>
                  ) : null}
                </Stack>
                <Box
                  sx={{
                    border: `1px solid ${brand.colors.line}`,
                    borderRadius: brand.radius.md,
                    overflow: "hidden",
                    bgcolor: "#FFFFFF",
                  }}
                >
                  {isSelectedRoundFinal ? (
                    <Box
                      sx={{
                        px: 2,
                        py: 1.4,
                        borderBottom: `1px solid ${brand.colors.line}`,
                        bgcolor: brand.colors.surfaceSoft,
                      }}
                    >
                      <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 900 }}>
                        Final leaderboard across all tracks
                      </Typography>
                      <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.35 }}>
                        Finalists are ranked together. Award positions are highlighted as soon as the final ranking is finalized.
                      </Typography>
                    </Box>
                  ) : (
                    <Tabs
                      value={activeRankingGroup?.trackId ?? false}
                      onChange={(_, value) => setSelectedTrackId(value)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{
                        px: 1,
                        borderBottom: `1px solid ${brand.colors.line}`,
                        bgcolor: brand.colors.surfaceSoft,
                        "& .MuiTab-root": {
                          textTransform: "none",
                          fontWeight: 800,
                          minHeight: 52,
                        },
                        "& .Mui-selected": {
                          color: brand.colors.navy,
                        },
                        "& .MuiTabs-indicator": {
                          backgroundColor: brand.colors.orange,
                          height: 3,
                        },
                      }}
                    >
                      {rankingGroups.map((group) => (
                        <Tab
                          key={group.trackId}
                          value={group.trackId}
                          label={`${group.trackName} (${group.items.length})`}
                        />
                      ))}
                    </Tabs>
                  )}

                  {activeRankingGroup ? (
                    <>
                      <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: "#FBFCFE" }}>
                              <TableCell sx={{ fontWeight: 900, width: 90 }}>Rank</TableCell>
                              <TableCell sx={{ fontWeight: 900 }}>Team</TableCell>
                              <TableCell sx={{ fontWeight: 900, width: 160 }}>Score</TableCell>
                              <TableCell sx={{ fontWeight: 900, width: 180 }}>Status</TableCell>
                              <TableCell sx={{ fontWeight: 900, width: 170, textAlign: "right" }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {activeRankingGroup.items.map((item) => {
                              const { isDisqualified, isTopTeam, resultLabel, resultColor } = getLeaderboardPresentation(item, finalization);
                              const awardPlacement = finalAwardByTeamId.get(String(item.teamId));
                              const isAwardWinner = Boolean(isSelectedRoundFinal && finalization?.scoreLocked && awardPlacement);
                              const firstDisqualifiedIndex = activeRankingGroup.items.findIndex(
                                (entry) => String(entry.qualificationStatus || "").toLowerCase() === "disqualified"
                              );
                              const isFirstDisqualifiedRow = isDisqualified && firstDisqualifiedIndex === activeRankingGroup.items.indexOf(item);
                              return (
                                <TableRow
                                  key={item.submissionId}
                                  sx={{
                                    bgcolor: isAwardWinner ? "#FFF8E1" : isTopTeam ? "#EAF8EE" : "#FFFFFF",
                                    "& td, & th": {
                                      borderTop: isFirstDisqualifiedRow ? "2px dashed #E2E8F0" : undefined,
                                    },
                                    "& td:first-of-type": {
                                      borderLeft: isAwardWinner ? "4px solid #F4B740" : undefined,
                                    },
                                    "&:last-child td, &:last-child th": { borderBottom: 0 },
                                  }}
                                >
                                  <TableCell sx={{ color: brand.colors.text, fontWeight: 900 }}>
                                    {item.rankPosition ? `#${item.rankPosition}` : "--"}
                                  </TableCell>
                                  <TableCell>
                                    <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>
                                      {item.teamName}
                                    </Typography>
                                    {isAwardWinner ? (
                                      <Typography sx={{ color: "#A16207", fontSize: 12.5, fontWeight: 850, mt: 0.35 }}>
                                        {awardPlacement.awardName} • {formatPrizeAmountVnd(awardPlacement.prizeAmountVnd)}
                                      </Typography>
                                    ) : null}
                                    {isDisqualified && item.qualificationNote ? (
                                      <Typography sx={{ color: brand.colors.danger, fontSize: 12.5, mt: 0.45 }}>
                                        {item.qualificationNote}
                                      </Typography>
                                    ) : null}
                                  </TableCell>
                                  <TableCell sx={{ color: brand.colors.text, fontWeight: 800 }}>
                                    {item.totalScore ?? "--"}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      color={isAwardWinner ? "warning" : resultColor}
                                      label={isAwardWinner ? awardPlacement.awardName : resultLabel}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ textAlign: "right" }}>
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => openSubmissionInTeamManagement(item)}
                                        sx={{
                                          minWidth: 138,
                                          whiteSpace: "nowrap",
                                          justifyContent: "center",
                                        }}
                                      >
                                        View submission
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => openSubmissionBreakdown(item.submissionId)}
                                        sx={{
                                          minWidth: 120,
                                          whiteSpace: "nowrap",
                                          justifyContent: "center",
                                        }}
                                      >
                                        Score details
                                      </Button>
                                      {canDisqualifyFromEvent && !isDisqualified ? (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          color="error"
                                          startIcon={<BlockRoundedIcon />}
                                          sx={{
                                            minWidth: 126,
                                            whiteSpace: "nowrap",
                                            justifyContent: "center",
                                          }}
                                          onClick={() => setManualEliminationState({
                                            open: true,
                                            teamId: item.teamId,
                                            submissionId: item.submissionId,
                                            teamName: item.teamName,
                                            reason: "",
                                          })}
                                        >
                                          Disqualify
                                        </Button>
                                      ) : null}
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Stack spacing={1.2} sx={{ display: { xs: "flex", md: "none" }, p: 1.2 }}>
                        {activeRankingGroup.items.map((item) => {
                          const { isDisqualified, isTopTeam, resultLabel, resultColor } = getLeaderboardPresentation(item, finalization);
                          const awardPlacement = finalAwardByTeamId.get(String(item.teamId));
                          const isAwardWinner = Boolean(isSelectedRoundFinal && finalization?.scoreLocked && awardPlacement);
                          const firstDisqualifiedIndex = activeRankingGroup.items.findIndex(
                            (entry) => String(entry.qualificationStatus || "").toLowerCase() === "disqualified"
                          );
                          const isFirstDisqualifiedRow = isDisqualified && firstDisqualifiedIndex === activeRankingGroup.items.indexOf(item);
                          return (
                            <Box
                              key={`mobile-leaderboard-${item.submissionId}`}
                              sx={{
                                p: 1.5,
                                borderRadius: brand.radius.md,
                                border: `1px solid ${isAwardWinner ? "#F4CF72" : isTopTeam ? "#B9E7C6" : brand.colors.line}`,
                                borderLeft: isAwardWinner ? "4px solid #F4B740" : undefined,
                                borderTop: isFirstDisqualifiedRow ? "2px dashed #CBD5E1" : undefined,
                                bgcolor: isAwardWinner ? "#FFF8E1" : isTopTeam ? "#EAF8EE" : "#FFFFFF",
                                boxShadow: brand.shadow.xs,
                              }}
                            >
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.2}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950 }}>
                                    {item.rankPosition ? `#${item.rankPosition}` : "--"} {item.teamName}
                                  </Typography>
                                  <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.45 }}>
                                    Score: <strong>{item.totalScore ?? "--"}</strong>
                                  </Typography>
                                  {isAwardWinner ? (
                                    <Typography sx={{ color: "#A16207", fontSize: 12.5, fontWeight: 850, mt: 0.35 }}>
                                      {awardPlacement.awardName} • {formatPrizeAmountVnd(awardPlacement.prizeAmountVnd)}
                                    </Typography>
                                  ) : null}
                                </Box>
                                <Chip
                                  size="small"
                                  color={isAwardWinner ? "warning" : resultColor}
                                  label={isAwardWinner ? awardPlacement.awardName : resultLabel}
                                />
                              </Stack>

                              {isDisqualified && item.qualificationNote ? (
                                <Typography sx={{ color: brand.colors.danger, fontSize: 12.5, mt: 1 }}>
                                  {item.qualificationNote}
                                </Typography>
                              ) : null}

                              {canDisqualifyFromEvent ? (
                                <Box sx={{ mt: 1.3 }}>
                                  <Stack spacing={1}>
                                    <Button
                                      fullWidth
                                      size="small"
                                      variant="outlined"
                                      onClick={() => openSubmissionInTeamManagement(item)}
                                    >
                                      View submission
                                    </Button>
                                    <Button
                                      fullWidth
                                      size="small"
                                      variant="outlined"
                                      onClick={() => openSubmissionBreakdown(item.submissionId)}
                                    >
                                      Score details
                                    </Button>
                                    {!isDisqualified ? (
                                      <Button
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={<BlockRoundedIcon />}
                                        onClick={() => setManualEliminationState({
                                          open: true,
                                          teamId: item.teamId,
                                          submissionId: item.submissionId,
                                          teamName: item.teamName,
                                          reason: "",
                                        })}
                                      >
                                        Disqualify
                                      </Button>
                                    ) : null}
                                  </Stack>
                                </Box>
                              ) : (
                                <Box sx={{ mt: 1.3 }}>
                                  <Stack spacing={1}>
                                    <Button
                                      fullWidth
                                      size="small"
                                      variant="outlined"
                                      onClick={() => openSubmissionInTeamManagement(item)}
                                    >
                                      View submission
                                    </Button>
                                    <Button
                                      fullWidth
                                      size="small"
                                      variant="outlined"
                                      onClick={() => openSubmissionBreakdown(item.submissionId)}
                                    >
                                      Score details
                                    </Button>
                                  </Stack>
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </>
                  ) : null}
                </Box>
              </SectionCard>
            ) : null}


          </>
        )}
      </Stack>

      <ConfirmActionDialog
        open={confirmState.open}
        title={
          confirmState.mode === "finalize-round"
            ? "Finalize round scores?"
            : confirmState.mode === "qualification-round"
            ? "Calculate qualification results?"
            : confirmState.mode === "advance-round"
            ? "Promote qualified teams to the next round?"
            : "Reopen round finalization?"
        }
        message={
          confirmState.mode === "finalize-round"
            ? finalization?.forceFinalizeAllowed && !finalization?.canFinalize
              ? `There are still ${finalization?.unresolvedSubmissionCount || 0} incomplete submission(s). If you continue, the round will be finalized anyway and those incomplete teams will stay at the bottom with incomplete scoring ignored.`
              : "This will lock the round and save leaderboard rankings for every track."
            : confirmState.mode === "qualification-round"
            ? "This will apply the configured Top N rule per track and decide which teams are qualified or eliminated."
            : confirmState.mode === "advance-round"
            ? "This will promote the qualified teams to the next round, unlock their submission access there, and mark all remaining teams as eliminated."
            : "This will unlock the round and clear the saved ranking snapshot for this round."
        }
        confirmLabel={
          confirmState.mode === "finalize-round"
            ? "Finalize"
            : confirmState.mode === "qualification-round"
            ? "Calculate"
            : confirmState.mode === "advance-round"
            ? "Promote"
            : "Reopen"
        }
        confirmColor="primary"
        onCancel={() => setConfirmState({ open: false, mode: null, templateId: null, templateName: "" })}
        onConfirm={async () => {
          const mode = confirmState.mode;
          setConfirmState({ open: false, mode: null, templateId: null, templateName: "" });
          if (mode === "finalize-round") {
            await handleFinalizeRound();
          } else if (mode === "qualification-round") {
            await handleCalculateQualification();
          } else if (mode === "advance-round") {
            await handleAdvanceRound();
          } else if (mode === "reopen-round") {
            await handleReopenRound();
          }
        }}
      />

      <Dialog
        open={extendScoringState.open}
        onClose={() => setExtendScoringState((current) => ({ ...current, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Extend Scoring Window
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.4} sx={{ mt: 0.5 }}>
            <Typography color="text.secondary">
              Delay the next round start so judges have extra time to finish scoring. Assigned judges will receive a reminder notification.
            </Typography>
            <TextField
              label="Extra days"
              type="number"
              value={extendScoringState.days}
              onChange={(event) => setExtendScoringState({ open: true, days: event.target.value })}
              inputProps={{ min: 1 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setExtendScoringState((current) => ({ ...current, open: false }))}>
            Cancel
          </Button>
          <Button variant="contained" color="warning" onClick={handleExtendScoringWindow}>
            Extend
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={breakdownState.open}
        onClose={closeSubmissionBreakdown}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Submission Score Breakdown
        </DialogTitle>
        <DialogContent>
          {breakdownState.loading ? (
            <Box className="team-loading">
              <CircularProgress />
            </Box>
          ) : breakdownState.data ? (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5}>
                <Box>
                  <Typography sx={{ color: brand.colors.text, fontSize: 22, fontWeight: 900 }}>
                    {breakdownState.data.teamName}
                  </Typography>
                  <Typography color="text.secondary">
                    Round {breakdownState.data.roundName} / {breakdownState.data.trackName}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Rank ${breakdownState.data.rankPosition ? `#${breakdownState.data.rankPosition}` : "--"}`} variant="outlined" />
                  <Chip label={`Total ${formatMetric(breakdownState.data.totalScore)}`} variant="outlined" />
                  <Chip
                    label={getBreakdownStatus(breakdownState.data.qualificationStatus).label}
                    color={getBreakdownStatus(breakdownState.data.qualificationStatus).color}
                  />
                </Stack>
              </Stack>

              {breakdownState.data.qualificationNote ? (
                <StatusStrip tone="info" label="Advancement status">
                  {breakdownState.data.qualificationNote}
                </StatusStrip>
              ) : null}

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                  gap: 1.2,
                }}
              >
                {(breakdownState.data.criteria || []).map((criterion) => (
                  <Box
                    key={criterion.criteriaId}
                    sx={{
                      p: 1.5,
                      border: `1px solid ${brand.colors.line}`,
                      borderRadius: brand.radius.md,
                      bgcolor: brand.colors.surfaceSoft,
                    }}
                  >
                    <Typography sx={{ color: brand.colors.muted, fontSize: 11.5, fontWeight: 900, textTransform: "uppercase" }}>
                      {criterion.criteriaName}
                    </Typography>
                    <Typography sx={{ color: brand.colors.text, fontSize: 24, fontWeight: 900, mt: 0.6 }}>
                      {formatMetric(criterion.averageScore)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Weight {formatMetric(criterion.weight)}%
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Stack spacing={1.2}>
                <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 900 }}>
                  Judge Scores
                </Typography>
                {(breakdownState.data.judgeScores || []).map((judge) => (
                  <Box
                    key={judge.judgeAssignmentId}
                    sx={{
                      p: 1.6,
                      border: `1px solid ${brand.colors.line}`,
                      borderRadius: brand.radius.md,
                      bgcolor: "#FFFFFF",
                    }}
                  >
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1}>
                      <Box>
                        <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>
                          {judge.judgeName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {judge.finalized ? `Submitted ${formatDateTime(judge.finalizedAt)}` : "Not submitted yet"}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={judge.finalized ? "Submitted" : "Draft"} color={judge.finalized ? "success" : "default"} size="small" />
                        <Chip label={`Total ${formatMetric(judge.totalScore)}`} variant="outlined" size="small" />
                      </Stack>
                    </Stack>

                    <Box
                      sx={{
                        mt: 1.4,
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                        gap: 1,
                      }}
                    >
                      {(judge.criteria || []).map((criterion) => (
                        <Box
                          key={`${judge.judgeAssignmentId}-${criterion.criteriaId}`}
                          sx={{
                            p: 1.2,
                            borderRadius: brand.radius.sm,
                            border: `1px solid ${brand.colors.line}`,
                            bgcolor: brand.colors.surfaceSoft,
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Typography sx={{ fontWeight: 800 }}>{criterion.criteriaName}</Typography>
                            <Typography sx={{ fontWeight: 900 }}>{formatMetric(criterion.scoreValue)}</Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            Weight {formatMetric(criterion.weight)}%
                          </Typography>
                          {criterion.comment ? (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.7, whiteSpace: "pre-wrap" }}>
                              {criterion.comment}
                            </Typography>
                          ) : null}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Box className="ms-empty">
              <Typography fontWeight={850}>No breakdown available</Typography>
              <Typography variant="body2" color="text.secondary">
                This submission does not have a readable score snapshot yet.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeSubmissionBreakdown}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={manualEliminationState.open}
        onClose={() => setManualEliminationState({ open: false, teamId: null, submissionId: null, teamName: "", reason: "" })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Disqualify Team
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography sx={{ color: brand.colors.text }}>
              Disqualify <strong>{manualEliminationState.teamName}</strong> from <strong>{selectedEvent?.name || "this event"}</strong>. This will remove the team from the event and notify team members and mentors.
            </Typography>
            <TextField
              label="Disqualification Reason"
              value={manualEliminationState.reason}
              onChange={(event) => setManualEliminationState((current) => ({
                ...current,
                reason: event.target.value,
              }))}
              multiline
              minRows={3}
              required
              placeholder="Describe the rule violation or reason for disqualification"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setManualEliminationState({ open: false, teamId: null, submissionId: null, teamName: "", reason: "" })}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleManualElimination}>
            Disqualify Team
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
