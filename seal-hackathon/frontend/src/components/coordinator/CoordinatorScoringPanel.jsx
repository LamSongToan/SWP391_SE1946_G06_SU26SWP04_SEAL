import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  Checkbox,
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
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import { getApiErrorMessage, http } from "../../api/http";
import CenteredNotification from "../layout/CenteredNotification";
import ConfirmActionDialog from "../layout/ConfirmActionDialog";
import ModulePageHeader from "../layout/ModulePageHeader";
import { brand } from "../../styles/designTokens";

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
  if (!value) return "Not finalized yet";
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

const EVENT_STATUS_TONE = {
  Ongoing: { bg: "#FFF2E8", color: "#E17C32" },
  Ended: { bg: "#EEF1F6", color: "#64748B" },
  Draft: { bg: "#F4F6FB", color: "#16213E" },
};

const EXPORT_UNAVAILABLE_MESSAGE = "No criterion-level scores available to export.";

function hasScoreValue(item) {
  return item?.totalScore !== null && item?.totalScore !== undefined && item?.totalScore !== "";
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
  const [events, setEvents] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [viewMode, setViewMode] = useState("events");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [finalization, setFinalization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roundLoading, setRoundLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [includeCalibrationExport, setIncludeCalibrationExport] = useState(true);
  const [confirmState, setConfirmState] = useState({ open: false, mode: null, templateId: null, templateName: "" });
  const [manualEliminationState, setManualEliminationState] = useState({
    open: false,
    submissionId: null,
    teamName: "",
    reason: "",
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

  const rankingGroups = useMemo(() => {
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
  }, [finalization]);

  const activeRankingGroup = useMemo(
    () => rankingGroups.find((group) => group.trackId === selectedTrackId) || rankingGroups[0] || null,
    [rankingGroups, selectedTrackId]
  );
  const hasRoundExportableScores = useMemo(
    () => (finalization?.submissions || []).some(hasScoreValue),
    [finalization]
  );
  const activeTrackHasExportableScores = useMemo(
    () => (activeRankingGroup?.items || []).some(hasScoreValue),
    [activeRankingGroup]
  );

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

  const loadBootstrap = async () => {
    setLoading(true);
    setError("");
    try {
      const eventResponse = await http.get("/api/coordinator/events");
      const nextEvents = eventResponse.data?.data || [];
      setEvents(nextEvents);
      if (!selectedEventId || !nextEvents.some((event) => event.eventId === selectedEventId)) {
        setSelectedEventId(null);
        setRounds([]);
        setSelectedRoundId(null);
        setFinalization(null);
        setViewMode("events");
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
        setSelectedRoundId((current) => (
          current && nextRounds.some((round) => round.roundId === current)
            ? current
            : nextRounds[0]?.roundId || null
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
    if (rankingGroups.length === 0) {
      setSelectedTrackId(null);
      return;
    }
    if (!rankingGroups.some((group) => group.trackId === selectedTrackId)) {
      setSelectedTrackId(rankingGroups[0].trackId);
    }
  }, [rankingGroups, selectedTrackId]);

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
      await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/finalize`);
      setSuccess("Round scores finalized and locked.");
      await loadRoundWorkspace(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to finalize round scores"));
    }
  };

  const handleReopenRound = async () => {
    if (!selectedRoundId) return;
    setError("");
    try {
      await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/reopen`);
      setSuccess("Round finalization reopened.");
      await loadRoundWorkspace(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reopen round finalization"));
    }
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
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to promote teams to the next round"));
    }
  };

  const handleExportResearchDataset = async ({ trackId = null } = {}) => {
    if (!selectedRoundId) return;
    const targetGroup = trackId ? rankingGroups.find((group) => group.trackId === trackId) : null;
    const canExport = trackId
      ? (targetGroup?.items || []).some(hasScoreValue)
      : hasRoundExportableScores;
    if (!canExport) {
      setError(EXPORT_UNAVAILABLE_MESSAGE);
      setSuccess("");
      return;
    }
    setError("");
    setExportLoading(true);
    try {
      const params = {
        includeCalibration: includeCalibrationExport,
      };
      if (trackId) {
        params.trackId = trackId;
      }
      const response = await http.get(
        `/api/coordinator/scoring/rounds/${selectedRoundId}/research-dataset.csv`,
        { responseType: "blob", params }
      );
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = trackId
        ? `seal-round-${selectedRoundId}-track-${trackId}-anonymized-scoring.csv`
        : `seal-round-${selectedRoundId}-anonymized-scoring.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      setSuccess("Anonymized scoring dataset exported.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to export anonymized scoring dataset"));
    } finally {
      setExportLoading(false);
    }
  };

  const handleManualElimination = async () => {
    if (!selectedRoundId || !manualEliminationState.submissionId) return;
    const reason = String(manualEliminationState.reason || "").trim();
    if (!reason) {
      setError("Elimination reason is required.");
      return;
    }
    setError("");
    try {
      await http.post(
        `/api/coordinator/scoring/rounds/${selectedRoundId}/submissions/${manualEliminationState.submissionId}/disqualify`,
        { reason }
      );
      setSuccess("Team disqualified and leaderboard recalculated.");
      setManualEliminationState({ open: false, submissionId: null, teamName: "", reason: "" });
      await loadRoundWorkspace(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to manually disqualify team"));
    }
  };

  const handleUndoManualElimination = async (submissionId, teamName) => {
    if (!selectedRoundId || !submissionId) return;
    setError("");
    try {
      await http.post(
        `/api/coordinator/scoring/rounds/${selectedRoundId}/submissions/${submissionId}/undo-disqualify`
      );
      setSuccess(`${teamName} has been restored to the leaderboard.`);
      await loadRoundWorkspace(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to undo team disqualification"));
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
                      "& .MuiButton-root": { minHeight: 38 },
                    }}
                  >
                    <Button
                      variant="outlined"
                      startIcon={<RefreshRoundedIcon />}
                      onClick={() => loadRoundWorkspace(selectedRoundId)}
                    >
                      Refresh
                    </Button>
                    <FormControlLabel
                      control={(
                        <Checkbox
                          size="small"
                          checked={includeCalibrationExport}
                          onChange={(event) => setIncludeCalibrationExport(event.target.checked)}
                        />
                      )}
                      label="Include calibration"
                      sx={{
                        mr: 0.3,
                        px: 1,
                        border: `1px solid ${brand.colors.line}`,
                        borderRadius: 999,
                        bgcolor: "#FFFFFF",
                        "& .MuiFormControlLabel-label": { fontSize: 13, fontWeight: 800, color: brand.colors.muted },
                      }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<DownloadRoundedIcon />}
                      disabled={exportLoading || !hasRoundExportableScores}
                      title={!hasRoundExportableScores ? EXPORT_UNAVAILABLE_MESSAGE : ""}
                      onClick={() => handleExportResearchDataset()}
                    >
                      {exportLoading ? "Exporting..." : "Export Round CSV"}
                    </Button>
                    {activeRankingGroup?.trackId ? (
                      <Button
                        variant="outlined"
                        startIcon={<DownloadRoundedIcon />}
                        disabled={exportLoading || !activeTrackHasExportableScores}
                        title={!activeTrackHasExportableScores ? EXPORT_UNAVAILABLE_MESSAGE : ""}
                        onClick={() => handleExportResearchDataset({ trackId: activeRankingGroup.trackId })}
                      >
                        Export Track CSV
                      </Button>
                    ) : null}
                    {!hasRoundExportableScores ? (
                      <Typography
                        sx={{
                          flexBasis: "100%",
                          color: brand.colors.danger,
                          fontSize: 12.5,
                          fontWeight: 750,
                          textAlign: { xs: "left", lg: "right" },
                        }}
                      >
                        {EXPORT_UNAVAILABLE_MESSAGE}
                      </Typography>
                    ) : null}
                    {finalization.scoreLocked ? (
                      <>
                        {!finalization.advancementApplied ? (
                          <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<GavelRoundedIcon />}
                            onClick={() => setConfirmState({ open: true, mode: "reopen-round" })}
                          >
                            Reopen Finalization
                          </Button>
                        ) : null}
                        {!finalization.qualificationCalculated
                        && finalization.nextRoundId
                        && Number(finalization.promotionRuleTopN || 0) > 0 ? (
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<AutoFixHighRoundedIcon />}
                            onClick={() => setConfirmState({ open: true, mode: "qualification-round" })}
                          >
                            Calculate Qualification
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
                            Promote To Next Round
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<AssignmentTurnedInRoundedIcon />}
                        disabled={!finalization.canFinalize}
                        onClick={() => setConfirmState({ open: true, mode: "finalize-round" })}
                      >
                        Finalize Round
                      </Button>
                    )}
                  </Stack>
                )}
              >
                <Box
                  sx={{
                    border: `1px solid ${brand.colors.line}`,
                    borderRadius: brand.radius.md,
                    overflow: "hidden",
                    bgcolor: "#FFFFFF",
                  }}
                >
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
                              const firstDisqualifiedIndex = activeRankingGroup.items.findIndex(
                                (entry) => String(entry.qualificationStatus || "").toLowerCase() === "disqualified"
                              );
                              const isFirstDisqualifiedRow = isDisqualified && firstDisqualifiedIndex === activeRankingGroup.items.indexOf(item);
                              return (
                                <TableRow
                                  key={item.submissionId}
                                  sx={{
                                    bgcolor: isTopTeam ? "#EAF8EE" : "#FFFFFF",
                                    "& td, & th": {
                                      borderTop: isFirstDisqualifiedRow ? "2px dashed #E2E8F0" : undefined,
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
                                      color={resultColor}
                                      label={resultLabel}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ textAlign: "right" }}>
                                    {!finalization.advancementApplied && !isDisqualified ? (
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
                                          submissionId: item.submissionId,
                                          teamName: item.teamName,
                                          reason: "",
                                        })}
                                      >
                                        Disqualify
                                      </Button>
                                    ) : !finalization.advancementApplied && isDisqualified ? (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="inherit"
                                        startIcon={<UndoRoundedIcon />}
                                        onClick={() => handleUndoManualElimination(item.submissionId, item.teamName)}
                                        sx={{
                                          minWidth: 126,
                                          whiteSpace: "nowrap",
                                          justifyContent: "center",
                                        }}
                                      >
                                        Undo
                                      </Button>
                                    ) : null}
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
                                border: `1px solid ${isTopTeam ? "#B9E7C6" : brand.colors.line}`,
                                borderTop: isFirstDisqualifiedRow ? "2px dashed #CBD5E1" : undefined,
                                bgcolor: isTopTeam ? "#EAF8EE" : "#FFFFFF",
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
                                </Box>
                                <Chip size="small" color={resultColor} label={resultLabel} />
                              </Stack>

                              {isDisqualified && item.qualificationNote ? (
                                <Typography sx={{ color: brand.colors.danger, fontSize: 12.5, mt: 1 }}>
                                  {item.qualificationNote}
                                </Typography>
                              ) : null}

                              {!finalization.advancementApplied ? (
                                <Box sx={{ mt: 1.3 }}>
                                  {!isDisqualified ? (
                                    <Button
                                      fullWidth
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      startIcon={<BlockRoundedIcon />}
                                      onClick={() => setManualEliminationState({
                                        open: true,
                                        submissionId: item.submissionId,
                                        teamName: item.teamName,
                                        reason: "",
                                      })}
                                    >
                                      Disqualify
                                    </Button>
                                  ) : (
                                    <Button
                                      fullWidth
                                      size="small"
                                      variant="outlined"
                                      color="inherit"
                                      startIcon={<UndoRoundedIcon />}
                                      onClick={() => handleUndoManualElimination(item.submissionId, item.teamName)}
                                    >
                                      Undo
                                    </Button>
                                  )}
                                </Box>
                              ) : null}
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
            ? "This will lock the round and save leaderboard rankings for every track."
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
        open={manualEliminationState.open}
        onClose={() => setManualEliminationState({ open: false, submissionId: null, teamName: "", reason: "" })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Manual Elimination
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography sx={{ color: brand.colors.text }}>
              Disqualify <strong>{manualEliminationState.teamName}</strong> from this round. A reason is required.
            </Typography>
            <TextField
              label="Elimination Reason"
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
          <Button onClick={() => setManualEliminationState({ open: false, submissionId: null, teamName: "", reason: "" })}>
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
