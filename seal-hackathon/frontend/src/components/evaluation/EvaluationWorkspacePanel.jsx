import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import CommitRoundedIcon from "@mui/icons-material/CommitRounded";
import ForkRightRoundedIcon from "@mui/icons-material/ForkRightRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import GitHubIcon from "@mui/icons-material/GitHub";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { getApiErrorMessage, http } from "../../api/http";
import CenteredNotification from "../layout/CenteredNotification";
import ConfirmActionDialog from "../layout/ConfirmActionDialog";
import ModulePageHeader from "../layout/ModulePageHeader";
import "./evaluation-workspace.css";

function formatDateTime(value) {
  if (!value) return "No deadline";
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

function formatStatusLabel(value) {
  if (!value) return "Unknown";
  if (value === "NotStarted") return "Not started";
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function buildScoreState(criteria = []) {
  return Object.fromEntries(
    criteria.map((item) => [
      item.criteriaId,
      {
        scoreValue: item.scoreValue ?? "",
        comment: item.comment || "",
      },
    ])
  );
}

function sanitizeScoreInput(value) {
  if (value === "" || value == null) return "";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "";
  if (numeric < 0) return 0;
  if (numeric > 10) return 10;
  return numeric;
}

const STATUS_GUIDE = [
  ["Not started", "#cbd5e1", "No score has been saved for this submission."],
  ["In progress", "#1677ff", "Scoring work has started."],
  ["Draft", "#f59e0b", "Draft scores are saved but not finalized."],
  ["Ready", "#18b984", "Submission is available for judging."],
  ["Finalized", "#64748b", "Scores are locked after finalization."],
  ["Disqualified", "#ef4444", "Submission is not eligible for scoring."],
];

function StatTile({ label, value, icon, helper, tone = "default" }) {
  return (
    <Box className="eval-stat">
      <Box className="eval-stat-icon">{icon}</Box>
      <Box className="eval-stat-body">
        <Typography className="eval-stat-label">{label}</Typography>
        <Typography className="eval-stat-value">{value}</Typography>
        {helper ? (
          <Typography className={`eval-stat-helper ${tone === "success" ? "is-success" : tone === "warning" ? "is-warning" : ""}`}>
            {helper}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

function LinkButton({ href, children }) {
  if (!href) return null;
  return (
    <Button
      href={href}
      target="_blank"
      rel="noreferrer"
      size="small"
      variant="outlined"
      endIcon={<OpenInNewRoundedIcon fontSize="small" />}
    >
      {children}
    </Button>
  );
}

function GitMetadataCard({ submissionId, repositoryUrl }) {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!submissionId) return;
    let mounted = true;
    setLoading(true);
    setError("");
    http.get(`/api/submissions/${submissionId}/git-metadata`)
      .then((response) => {
        if (mounted) {
          setMeta(response.data?.data || null);
        }
      })
      .catch(() => {
        if (mounted) {
          setMeta(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [submissionId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      const response = await http.post(`/api/submissions/${submissionId}/git-metadata/refresh`);
      setMeta(response.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 1 }}>
        <LinearProgress sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  const stats = meta
    ? [
        [StarBorderRoundedIcon, meta.stars ?? "-", "Stars"],
        [ForkRightRoundedIcon, meta.forks ?? "-", "Forks"],
        [CommitRoundedIcon, meta.commitCount ?? "-", "Commits"],
        [BugReportRoundedIcon, meta.openIssues ?? "-", "Open issues"],
      ]
    : [];

  const extraDetails = meta
    ? [
        meta.language ? ["Language", meta.language] : null,
        meta.lastPushedAt ? ["Last push", formatDateTime(meta.lastPushedAt)] : null,
        meta.license ? ["License", meta.license] : null,
      ].filter(Boolean)
    : [];

  return (
    <Box className="eval-git-card">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        gap={1.4}
        className="eval-git-header"
      >
        <Stack direction="row" spacing={1.1} alignItems="flex-start" minWidth={0}>
          <Box className="eval-git-icon">
            <GitHubIcon fontSize="small" />
          </Box>
          <Box minWidth={0}>
            <Stack direction="row" spacing={0.8} alignItems="center" minWidth={0}>
              <Typography className="eval-git-repo-name" noWrap>
                {meta?.repoName || "Repository"}
              </Typography>
              {meta?.platform ? (
                <Chip size="small" label={meta.platform} className="eval-git-platform" />
              ) : null}
            </Stack>
            {meta?.description ? (
              <Typography className="eval-git-description">{meta.description}</Typography>
            ) : (
              <Typography className="eval-git-description">Repository metadata snapshot for this submission.</Typography>
            )}
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.75} className="eval-git-actions">
          <Tooltip title="Refresh metadata">
            <Button
              size="small"
              onClick={handleRefresh}
              disabled={refreshing}
              startIcon={refreshing ? <CircularProgress size={12} /> : <RefreshRoundedIcon sx={{ fontSize: 14 }} />}
              className="eval-git-action"
            >
              Refresh
            </Button>
          </Tooltip>
          {repositoryUrl ? (
            <Button
              size="small"
              component="a"
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 13 }} />}
              className="eval-git-action is-primary"
            >
              View
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 1, py: 0.5 }}>{error}</Alert> : null}

      {meta ? (
        <>
          <Box className="eval-git-metric-grid">
            {stats.map(([Icon, value, label]) => (
              <Box key={label} className="eval-git-metric">
                <Icon className="eval-git-metric-icon" />
                <Box minWidth={0}>
                  <Typography className="eval-git-metric-value" noWrap>{value}</Typography>
                  <Typography className="eval-git-metric-label" noWrap>{label}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {extraDetails.length ? (
            <Box className="eval-git-detail-grid">
              {extraDetails.map(([label, value]) => (
                <Box key={label} className="eval-git-detail">
                  <Typography className="eval-git-detail-label">{label}</Typography>
                  <Typography className="eval-git-detail-value">{value}</Typography>
                </Box>
              ))}
            </Box>
          ) : null}
        </>
      ) : (
        <Box className="eval-git-empty">
          {refreshing ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={14} />
              <Typography>Fetching repository metadata...</Typography>
            </Stack>
          ) : (
            <Typography>
              No metadata cached yet. Click Refresh to fetch from{" "}
              {repositoryUrl ? (
                <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">
                  {repositoryUrl}
                </a>
              ) : (
                "the repository"
              )}
              .
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

function FeedbackHistory({ items = [] }) {
  return (
    <Stack spacing={1.1}>
      {items.length === 0 ? (
        <Box className="eval-empty-inline">
          <Typography fontWeight={700}>No feedback yet</Typography>
          <Typography variant="body2" color="text.secondary">
            Feedback entries will stay here as an audit trail.
          </Typography>
        </Box>
      ) : items.map((item) => (
        <Box key={item.feedbackId} className="eval-feedback-item">
          <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
            <Typography fontWeight={800}>{item.authorName || "Unknown"}</Typography>
            <Chip size="small" label={item.authorRole || "Feedback"} />
          </Stack>
          <Typography sx={{ whiteSpace: "pre-wrap", mt: 0.7 }}>{item.feedbackText}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDateTime(item.createdAt)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function ScoreInputForm({
  form,
  scoreState,
  setScoreState,
  onSaveDraft,
  onFinalize,
  saving,
}) {
  const criteria = form?.criteria || [];
  const editable = Boolean(form?.editable);
  const completedCriteria = criteria.filter((item) => {
    const raw = scoreState[item.criteriaId]?.scoreValue;
    const value = Number(raw);
    return raw !== "" && !Number.isNaN(value) && value >= 0 && value <= 10;
  });
  const complete = criteria.every((item) => {
    const raw = scoreState[item.criteriaId]?.scoreValue;
    const value = Number(raw);
    return raw !== "" && !Number.isNaN(value) && value >= 0 && value <= 10;
  });
  const entered = criteria.filter((item) => scoreState[item.criteriaId]?.scoreValue !== "");
  const weightedTotal = entered.reduce((total, item) => {
    const value = Number(scoreState[item.criteriaId]?.scoreValue);
    return total + (Number.isNaN(value) ? 0 : value * Number(item.weight || 0) / 100);
  }, 0);
  const weightTotal = criteria.reduce((total, item) => total + Number(item.weight || 0), 0);
  const completionPercent = criteria.length ? Math.round((completedCriteria.length / criteria.length) * 100) : 0;
  const maxWeightedTotal = weightTotal / 10;

  return (
    <Box className="eval-score-card">
      <Box className="eval-score-content">
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} gap={1.5} className="eval-score-form-header">
          <Box>
            <Typography variant="h6" fontWeight={850}>Score Input Form</Typography>
            <Typography color="text.secondary">
              Round-specific rubric for {form?.submission?.roundName || "selected round"}.
            </Typography>
          </Box>
        </Stack>

        {!editable && form?.lockedReason ? (
          <Box className="eval-warning">
            <Typography fontWeight={800}>Score editing is locked</Typography>
            <Typography variant="body2">{form.lockedReason}</Typography>
          </Box>
        ) : null}

        <Stack spacing={1.5} className="eval-criteria-list">
          {criteria.map((criterion) => {
            const current = scoreState[criterion.criteriaId] || { scoreValue: "", comment: "" };
            const numericScore = Number(current.scoreValue);
            const criterionComplete = current.scoreValue !== "" && !Number.isNaN(numericScore) && numericScore >= 0 && numericScore <= 10;
            const weightedValue = Number.isNaN(numericScore) ? 0 : numericScore * Number(criterion.weight || 0) / 100;
            const weightedMax = Number(criterion.weight || 0) / 10;
            return (
              <Box key={criterion.criteriaId} className={`eval-criterion-card ${criterionComplete ? "is-complete" : ""}`}>
                <Box className="eval-criterion-info">
                  <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography className="eval-criterion-title">
                      <span>Criterion:</span>
                      {criterion.criteriaName}
                    </Typography>
                    <Chip size="small" label={`${criterion.weight}%`} className="eval-weight-chip" />
                  </Stack>
                  <Typography className="eval-criterion-helper">
                    <span>Description:</span>
                    {criterion.description || criterion.criteriaDescription || "Evaluate this criterion based on the submitted repository, demo, and materials."}
                  </Typography>
                </Box>

                <Box className="eval-criterion-controls">
                  <TextField
                    className="eval-score-field"
                    label="Score"
                    type="number"
                    size="small"
                    value={current.scoreValue}
                    disabled={!editable}
                    inputProps={{ min: 0, max: 10, step: 0.25 }}
                    helperText="0-10"
                    onChange={(event) => setScoreState((state) => ({
                      ...state,
                      [criterion.criteriaId]: {
                        ...state[criterion.criteriaId],
                        scoreValue: sanitizeScoreInput(event.target.value),
                      },
                    }))}
                  />
                  <TextField
                    className="eval-comment-field"
                    label="Criterion comment"
                    size="small"
                    value={current.comment}
                    disabled={!editable}
                    placeholder="Explain your score..."
                    helperText={`${current.comment?.length || 0}/1000`}
                    multiline
                    minRows={2}
                    onChange={(event) => setScoreState((state) => ({
                      ...state,
                      [criterion.criteriaId]: {
                        ...state[criterion.criteriaId],
                        comment: event.target.value,
                      },
                    }))}
                  />
                  <Box className="eval-weighted-box">
                    <Typography className="eval-field-caption">Weighted</Typography>
                    <Typography className="eval-weighted-value">{weightedValue.toFixed(2)} / {weightedMax.toFixed(2)}</Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Stack>

        <Box className="eval-score-summary">
          <Box className="eval-summary-main">
            <Typography className="eval-summary-label">Weighted score</Typography>
            <Typography className="eval-summary-score">{weightedTotal.toFixed(2)} / {maxWeightedTotal.toFixed(2)}</Typography>
          </Box>
          <Box className="eval-summary-item">
            <Typography className="eval-summary-label">Criteria completed</Typography>
            <Typography fontWeight={850}>{completedCriteria.length}/{criteria.length}</Typography>
            <LinearProgress
              variant="determinate"
              value={completionPercent}
              color={complete ? "success" : "warning"}
              className="eval-completion-progress"
            />
          </Box>
          <Box className="eval-summary-item">
            <Typography className="eval-summary-label">Rubric weight</Typography>
            <Typography className={weightTotal === 100 ? "eval-summary-ready" : "eval-summary-warning"}>
              {weightTotal}%
            </Typography>
          </Box>
          <Box className="eval-summary-note">
            {complete ? "Ready to finalize scores." : "Complete all criteria to finalize scores."}
          </Box>
        </Box>

        {(form?.scoreHistory || []).length > 0 ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography fontWeight={850} sx={{ mb: 1 }}>Score History</Typography>
            <Box className="eval-history-list">
              {form.scoreHistory.slice(0, 8).map((item) => (
                <Box key={item.scoreHistoryId} className="eval-history-row">
                  <Box>
                    <Typography fontWeight={800}>{item.criteriaName}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDateTime(item.createdAt)}</Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={item.actionType === "FINALIZE"
                      ? "Finalized"
                      : item.actionType === "REOPEN"
                        ? "Reopened"
                        : "Draft saved"}
                  />
                  <Typography fontWeight={850}>
                    {item.oldScoreValue == null ? "New" : item.oldScoreValue} {"->"} {item.newScoreValue}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        ) : null}

        <Box className="eval-score-action-spacer" />
        <Box className="eval-score-action-bar">
          <Box className="eval-action-summary">
            <Typography className="eval-action-score"><TaskAltRoundedIcon fontSize="small" /> Draft autosaved</Typography>
            <Typography className="eval-action-meta">
              Score: {weightedTotal.toFixed(2)} / {maxWeightedTotal.toFixed(2)} - Completed: {completedCriteria.length}/{criteria.length}
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} className="eval-action-buttons">
            <Button
              variant="outlined"
              startIcon={<SaveRoundedIcon />}
              disabled={!editable || entered.length === 0 || saving}
              onClick={onSaveDraft}
            >
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              variant="contained"
              startIcon={<TaskAltRoundedIcon />}
              disabled={!editable || !complete || saving}
              onClick={onFinalize}
            >
              Finalize Scores
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

export default function EvaluationWorkspacePanel({ role, type }) {
  const isJudge = role === "JUDGE";
  const judgeWorkspaceRef = useRef(null);
  const submissionQueueRef = useRef(null);
  const feedbackSectionRef = useRef(null);
  const [dashboard, setDashboard] = useState(null);
  const [mentorTracks, setMentorTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [scoreForm, setScoreForm] = useState(null);
  const [scoreState, setScoreState] = useState({});
  const [feedbackText, setFeedbackText] = useState("");
  const [mentorFeedbackText, setMentorFeedbackText] = useState("");
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [calibrationSessions, setCalibrationSessions] = useState([]);
  const [selectedCalibrationSessionId, setSelectedCalibrationSessionId] = useState(null);
  const [calibrationAnalytics, setCalibrationAnalytics] = useState(null);
  const [calibrationScoreDraft, setCalibrationScoreDraft] = useState({ criteriaId: "", scoreValue: "", comment: "" });
  const [calibrationSaving, setCalibrationSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roundFilter, setRoundFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [judgeTab, setJudgeTab] = useState("scoring");
  const [queueSearch, setQueueSearch] = useState("");

  const submissions = useMemo(() => {
    if (isJudge) return dashboard?.submissions || [];
    return (dashboard?.teams || []).flatMap((team) => team.submissions || []);
  }, [dashboard, isJudge]);

  const filterOptions = useMemo(() => ({
    rounds: [...new Map(submissions.map((item) => [item.roundId, item.roundName])).entries()],
    tracks: [...new Map(submissions.map((item) => [item.trackId, item.trackName])).entries()],
  }), [submissions]);

  const filteredSubmissions = useMemo(() => submissions.filter((item) => {
    if (roundFilter !== "all" && String(item.roundId) !== roundFilter) return false;
    if (trackFilter !== "all" && String(item.trackId) !== trackFilter) return false;
    if (statusFilter !== "all") {
      const itemStatus = isJudge ? item.evaluationStatus : item.submissionStatus;
      if (itemStatus !== statusFilter) return false;
    }
    const search = queueSearch.trim().toLowerCase();
    if (search) {
      const haystack = [
        item.teamName,
        item.roundName,
        item.trackName,
        item.eventName,
        item.submissionStatus,
        item.evaluationStatus,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  }), [isJudge, queueSearch, roundFilter, statusFilter, submissions, trackFilter]);

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const requests = [http.get(isJudge ? "/api/judge/dashboard" : "/api/mentor/dashboard")];
      if (!isJudge) {
        requests.push(http.get("/api/mentor/tracks"));
      }
      const [dashboardResponse, mentorTracksResponse] = await Promise.all(requests);
      const nextDashboard = dashboardResponse.data?.data || null;
      setDashboard(nextDashboard);
      if (!isJudge) {
        setMentorTracks(mentorTracksResponse?.data?.data || []);
      }
      const nextSubmissions = isJudge
        ? nextDashboard?.submissions || []
        : (nextDashboard?.teams || []).flatMap((team) => team.submissions || []);
      if (!selectedSubmission && nextSubmissions.length > 0) {
        setSelectedSubmission(nextSubmissions[0]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, `Failed to load ${isJudge ? "judge" : "mentor"} dashboard`));
      setDashboard(null);
      if (!isJudge) {
        setMentorTracks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadScoreForm = async (submission) => {
    if (!submission?.submissionId) return;
    setSelectedSubmission(submission);
    setScoreForm(null);
    setFeedbackText("");
    try {
      const response = await http.get(`/api/judge/submissions/${submission.submissionId}/score-form`);
      const form = response.data?.data || null;
      setScoreForm(form);
      setScoreState(buildScoreState(form?.criteria || []));
      setFeedbackHistory(form?.feedbackHistory || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load score form"));
    }
  };

  const loadFeedback = async (submission = selectedSubmission) => {
    if (!submission?.submissionId) return;
    try {
      const response = await http.get(`/api/submissions/${submission.submissionId}/feedback`);
      setFeedbackHistory(response.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load feedback"));
    }
  };

  const loadCalibrationSessions = async (roundId) => {
    if (!roundId) {
      setCalibrationSessions([]);
      setSelectedCalibrationSessionId(null);
      setCalibrationAnalytics(null);
      return;
    }
    try {
      const response = await http.get(`/api/coordinator/scoring/rounds/${roundId}/calibration-sessions`);
      const nextSessions = response.data?.data || [];
      setCalibrationSessions(nextSessions);
      setSelectedCalibrationSessionId((current) => {
        if (current && nextSessions.some((session) => session.sessionId === current)) {
          return current;
        }
        return nextSessions[0]?.sessionId || null;
      });
    } catch (err) {
      setCalibrationSessions([]);
      setSelectedCalibrationSessionId(null);
      setCalibrationAnalytics(null);
      setError(getApiErrorMessage(err, "Failed to load calibration sessions"));
    }
  };

  const loadCalibrationAnalytics = async (sessionId) => {
    if (!sessionId) {
      setCalibrationAnalytics(null);
      return;
    }
    try {
      const response = await http.get(`/api/coordinator/scoring/calibration-sessions/${sessionId}/analytics`);
      setCalibrationAnalytics(response.data?.data || null);
    } catch (err) {
      setCalibrationAnalytics(null);
      setError(getApiErrorMessage(err, "Failed to load calibration analytics"));
    }
  };

  const saveCalibrationScore = async () => {
    if (!selectedSubmission?.submissionId || !selectedCalibrationSessionId || !calibrationScoreDraft.criteriaId) return;
    setCalibrationSaving(true);
    setError("");
    try {
      await http.post(`/api/coordinator/scoring/calibration-sessions/${selectedCalibrationSessionId}/scores`, {
        submissionId: selectedSubmission.submissionId,
        criteriaId: Number(calibrationScoreDraft.criteriaId),
        judgeAssignmentId: scoreForm?.judgeAssignmentId,
        scoreValue: Number(calibrationScoreDraft.scoreValue),
        comment: calibrationScoreDraft.comment.trim() || null,
      });
      setCalibrationScoreDraft({ criteriaId: calibrationScoreDraft.criteriaId, scoreValue: "", comment: "" });
      setSuccess("Calibration score saved.");
      await loadCalibrationAnalytics(selectedCalibrationSessionId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save calibration score"));
    } finally {
      setCalibrationSaving(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [role]);

  useEffect(() => {
    if (!selectedSubmission?.submissionId) {
      setScoreForm(null);
      setFeedbackHistory([]);
      return;
    }
    if (isJudge) {
      loadScoreForm(selectedSubmission);
    } else {
      loadFeedback(selectedSubmission);
    }
  }, [selectedSubmission?.submissionId, isJudge]);

  useEffect(() => {
    if (isJudge) {
      setJudgeTab("scoring");
    }
  }, [isJudge, selectedSubmission?.submissionId]);

  useEffect(() => {
    if (!isJudge) {
      setCalibrationSessions([]);
      setSelectedCalibrationSessionId(null);
      setCalibrationAnalytics(null);
      return;
    }
    if (!selectedSubmission?.roundId) {
      setCalibrationSessions([]);
      setSelectedCalibrationSessionId(null);
      setCalibrationAnalytics(null);
      return;
    }
    loadCalibrationSessions(selectedSubmission.roundId);
  }, [isJudge, selectedSubmission?.roundId]);

  useEffect(() => {
    if (!isJudge) return;
    if (!selectedCalibrationSessionId) {
      setCalibrationAnalytics(null);
      return;
    }
    loadCalibrationAnalytics(selectedCalibrationSessionId);
  }, [isJudge, selectedCalibrationSessionId]);

  useEffect(() => {
    if (scoreForm?.criteria?.length && !calibrationScoreDraft.criteriaId) {
      setCalibrationScoreDraft((current) => ({
        ...current,
        criteriaId: String(scoreForm.criteria[0].criteriaId),
      }));
    }
  }, [scoreForm?.criteria]);

  useEffect(() => {
    if (loading) return;
    const target = isJudge ? judgeWorkspaceRef.current : submissionQueueRef.current;
    const timeoutId = window.setTimeout(() => {
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timeoutId);
  }, [isJudge, loading, type]);

  useEffect(() => {
    const scrollToRequestedSection = (event) => {
      const section = event.detail?.section;
      const target = section === "judging"
        ? judgeWorkspaceRef.current
        : section === "mentor-workspace"
          ? submissionQueueRef.current
          : null;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("seal-scroll-evaluation-section", scrollToRequestedSection);
    return () => window.removeEventListener("seal-scroll-evaluation-section", scrollToRequestedSection);
  }, []);

  const submitScores = async (finalizeScores) => {
    if (!scoreForm?.submission?.submissionId) return;
    setSaving(true);
    setError("");
    try {
      const criteriaToSubmit = (scoreForm.criteria || []).filter((criterion) => (
        finalizeScores || scoreState[criterion.criteriaId]?.scoreValue !== ""
      ));
      const payload = {
        scores: criteriaToSubmit.map((criterion) => ({
          criteriaId: criterion.criteriaId,
          scoreValue: Number(scoreState[criterion.criteriaId]?.scoreValue),
          comment: scoreState[criterion.criteriaId]?.comment || null,
        })),
        feedbackText: feedbackText.trim() || null,
        finalizeScores,
      };
      const response = await http.post(`/api/judge/submissions/${scoreForm.submission.submissionId}/scores`, payload);
      const form = response.data?.data || null;
      setScoreForm(form);
      setScoreState(buildScoreState(form?.criteria || []));
      setFeedbackHistory(form?.feedbackHistory || []);
      setFeedbackText("");
      setSuccess(finalizeScores ? "Scores finalized and locked." : "Draft scores saved.");
      await loadDashboard();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to submit scores"));
    } finally {
      setSaving(false);
    }
  };

  const submitMentorFeedback = async () => {
    if (!selectedSubmission?.submissionId || !mentorFeedbackText.trim()) return;
    setSaving(true);
    setError("");
    try {
      await http.post(`/api/submissions/${selectedSubmission.submissionId}/feedback`, {
        feedbackText: mentorFeedbackText.trim(),
      });
      setMentorFeedbackText("");
      setSuccess("Feedback added.");
      await loadFeedback(selectedSubmission);
      await loadDashboard();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add feedback"));
    } finally {
      setSaving(false);
    }
  };

  const submitJudgeFeedback = async () => {
    if (!selectedSubmission?.submissionId || !feedbackText.trim()) return;
    setSaving(true);
    setError("");
    try {
      await http.post(`/api/submissions/${selectedSubmission.submissionId}/feedback`, {
        feedbackText: feedbackText.trim(),
      });
      setFeedbackText("");
      setSuccess("Feedback added.");
      await loadFeedback(selectedSubmission);
      await loadDashboard();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add feedback"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box className="eval-loading"><CircularProgress /></Box>;
  }

  const headerCopy = isJudge
    ? {
        eyebrow: "Judge Workspace",
        title: "Judging Workspace",
        description: "Review assigned rounds, open submissions after the deadline, and score each team in one place.",
      }
    : {
        eyebrow: "Mentor Workspace",
        title: "Mentor Workspace",
        description: "Track assigned tracks, review mentored submissions, and keep feedback in one place.",
      };

  return (
    <Box>
      <CenteredNotification
        open={Boolean(error || success)}
        severity={error ? "error" : "success"}
        message={error || success}
        onClose={() => {
          setError("");
          setSuccess("");
        }}
      />

      <Stack spacing={2}>
        <ModulePageHeader
          eyebrow={headerCopy.eyebrow}
          title={headerCopy.title}
          description={headerCopy.description}
          actions={(
            <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={loadDashboard}>
              Refresh
            </Button>
          )}
        />

        <Box className="eval-stat-grid">
          {isJudge ? (
            <>
              <StatTile
                label="Assigned Rounds"
                value={dashboard?.assignedRoundCount || 0}
                helper={(dashboard?.assignedRounds || [])[0]?.roundName || "No assigned round"}
                tone="success"
                icon={<GavelRoundedIcon />}
              />
              <StatTile
                label="Assigned Submissions"
                value={dashboard?.assignedSubmissionCount || 0}
                helper="All tracks"
                icon={<AssignmentTurnedInRoundedIcon />}
              />
              <StatTile
                label="Pending Scores"
                value={dashboard?.pendingSubmissionCount || 0}
                helper="Ready to score"
                tone="warning"
                icon={<HistoryRoundedIcon />}
              />
              <StatTile
                label="Score Records"
                value={dashboard?.submittedScoreCount || 0}
                helper="Finalized"
                icon={<SaveRoundedIcon />}
              />
            </>
          ) : (
            <>
              <StatTile label="Assigned Tracks" value={dashboard?.assignedTrackCount || 0} icon={<PsychologyRoundedIcon />} />
              <StatTile label="Mentored Teams" value={dashboard?.mentoredTeamCount || 0} icon={<AssignmentTurnedInRoundedIcon />} />
              <StatTile label="Submissions" value={dashboard?.submissionCount || 0} icon={<GavelRoundedIcon />} />
              <StatTile label="Feedback Entries" value={dashboard?.feedbackCount || 0} icon={<HistoryRoundedIcon />} />
            </>
          )}
        </Box>

        {isJudge ? (
          <Card className="eval-card eval-scroll-target" ref={judgeWorkspaceRef}>
            <CardContent>
              <Box className="eval-judge-layout">
                <Box className="eval-judge-sidebar">
                  <Box className="eval-subpanel eval-nav-panel eval-scroll-target" ref={submissionQueueRef}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.4 }}>
                      <Typography
                        component="h2"
                        className="eval-panel-title"
                        sx={{ fontWeight: 900, fontSize: 20, color: "#071a2f" }}
                      >
                        Submission Queue
                      </Typography>
                    </Stack>
                    <Box className="eval-filter-bar">
                      <FormControl size="small">
                        <InputLabel>Track</InputLabel>
                        <Select label="Track" value={trackFilter} onChange={(event) => setTrackFilter(event.target.value)}>
                          <MenuItem value="all">All tracks</MenuItem>
                          {filterOptions.tracks.map(([id, name]) => <MenuItem key={id} value={String(id)}>{name}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControl size="small">
                        <InputLabel>Status</InputLabel>
                        <Select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                          <MenuItem value="all">All status</MenuItem>
                          {["NotStarted", "Draft", "Finalized"].map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        value={queueSearch}
                        onChange={(event) => setQueueSearch(event.target.value)}
                        placeholder="Search team or track..."
                        className="eval-queue-search"
                        inputProps={{ "aria-label": "Search team or track" }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchRoundedIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                    <Typography className="eval-filter-count" sx={{ mb: 1.3 }}>
                      Showing {filteredSubmissions.length} of {submissions.length}
                    </Typography>
                    {filteredSubmissions.length === 0 ? (
                      <Box className="eval-empty-inline">No submissions available.</Box>
                    ) : (
                      <Box className="eval-list">
                        {filteredSubmissions.map((submission) => {
                          const selected = selectedSubmission?.submissionId === submission.submissionId;
                          return (
                            <Box
                              key={submission.submissionId}
                              className={`eval-list-row eval-clickable ${selected ? "is-selected" : ""}`}
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Box className="eval-submission-main">
                                <Typography className="eval-row-title">
                                  <span>Team:</span>
                                  {submission.teamName}
                                </Typography>
                                <Box className="eval-row-meta-list">
                                  <Typography className="eval-row-meta">
                                    <span>Track:</span>
                                    {submission.trackName}
                                  </Typography>
                                  <Typography className="eval-row-meta">
                                    <span>Round:</span>
                                    {submission.roundName}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box className="eval-submission-status">
                                <Chip
                                  size="small"
                                  color={submission.evaluationStatus === "Finalized" ? "success" : submission.evaluationStatus === "Draft" ? "warning" : "default"}
                                  label={formatStatusLabel(submission.evaluationStatus)}
                                />
                                <Box className="eval-criteria-count">
                                  <strong>{submission.scoredCriteriaCount}/{submission.totalCriteriaCount}</strong>
                                  <span>criteria</span>
                                </Box>
                              </Box>
                              <Typography className="eval-row-chevron">{">"}</Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                    <Box className="eval-status-legend" aria-label="Submission status legend">
                      {STATUS_GUIDE.map(([label, color]) => (
                        <Box key={label} component="span">
                          <i style={{ background: color }} />
                          {label}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>

                <Box className="eval-detail-stack">
                  {selectedSubmission ? (
                    <>
                      <Box className="eval-subpanel eval-selected-card eval-team-overview">
                        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "flex-start" }} gap={1.5}>
                          <Box>
                            <Typography className="eval-team-title">{selectedSubmission.teamName}</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap className="eval-team-meta-line">
                              <Typography>{selectedSubmission.trackName}</Typography>
                              <span>-</span>
                              <Typography>{selectedSubmission.roundName}</Typography>
                              <Chip size="small" label={`Deadline: ${formatDateTime(selectedSubmission.submissionDeadline)}`} className="eval-deadline-chip" />
                              <Chip
                                size="small"
                                color={selectedSubmission.editable ? "success" : "default"}
                                label={selectedSubmission.editable ? "Submission status: Ready to score" : (scoreForm?.lockedReason || "Locked")}
                              />
                            </Stack>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap className="eval-submission-links">
                            <LinkButton href={selectedSubmission.repositoryUrl}>Repository</LinkButton>
                            <LinkButton href={selectedSubmission.demoUrl}>Demo</LinkButton>
                            <LinkButton href={selectedSubmission.slideUrl}>Slides</LinkButton>
                          </Stack>
                        </Stack>
                        <GitMetadataCard
                          submissionId={selectedSubmission.submissionId}
                          repositoryUrl={selectedSubmission.repositoryUrl}
                        />
                      </Box>

                      <Box className="eval-subpanel eval-workflow-panel eval-scroll-target" ref={feedbackSectionRef}>
                        <Tabs
                          value={judgeTab}
                          onChange={(_, nextTab) => setJudgeTab(nextTab)}
                          className="eval-tabs"
                          variant="scrollable"
                          allowScrollButtonsMobile
                        >
                          <Tab value="scoring" label="Scoring" />
                          <Tab value="overview" label="Submission Details" />
                          <Tab value="calibration" label="Calibration" />
                          <Tab value="feedback" label="Feedback History" />
                        </Tabs>

                        {judgeTab === "scoring" ? (
                          scoreForm ? (
                            <ScoreInputForm
                              form={scoreForm}
                              scoreState={scoreState}
                              setScoreState={setScoreState}
                              onSaveDraft={() => submitScores(false)}
                              onFinalize={() => setConfirmFinalize(true)}
                              saving={saving}
                            />
                          ) : (
                            <Box className="eval-empty-inline">Score form is loading for this submission.</Box>
                          )
                        ) : null}

                        {judgeTab === "overview" ? (
                          <Box className="eval-tab-content">
                            <Typography variant="h6" fontWeight={850} sx={{ mb: 1 }}>Submission Overview</Typography>
                            <TextField
                              label="Written feedback for the team"
                              minRows={4}
                              multiline
                              fullWidth
                              className="eval-general-feedback"
                              value={feedbackText}
                              onChange={(event) => setFeedbackText(event.target.value)}
                              helperText={`${feedbackText.length}/4000`}
                            />
                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
                              <Button
                                variant="contained"
                                startIcon={<SaveRoundedIcon />}
                                onClick={submitJudgeFeedback}
                                disabled={saving || !feedbackText.trim()}
                              >
                                {saving ? "Saving..." : "Save Feedback"}
                              </Button>
                            </Stack>
                          </Box>
                        ) : null}

                        {judgeTab === "calibration" ? (
                          <Box className="eval-tab-content">
                            <Typography variant="h6" fontWeight={850} sx={{ mb: 1.2 }}>Calibration Session</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.4 }}>
                              Use a shared session to align your mindset before final scoring.
                            </Typography>
                            {calibrationSessions.length === 0 ? (
                              <Box className="eval-empty-inline">No calibration sessions are available for this round yet.</Box>
                            ) : (
                              <>
                                <FormControl size="small" fullWidth sx={{ mb: 1.4 }}>
                                  <InputLabel>Session</InputLabel>
                                  <Select
                                    label="Session"
                                    value={selectedCalibrationSessionId || ""}
                                    onChange={(event) => setSelectedCalibrationSessionId(event.target.value)}
                                  >
                                    {calibrationSessions.map((session) => (
                                      <MenuItem key={session.sessionId} value={session.sessionId}>
                                        {session.title || `Session ${session.sessionId}`}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                <Stack direction={{ xs: "column", md: "row" }} spacing={1.4} sx={{ mb: 1.4 }}>
                                  <FormControl size="small" sx={{ minWidth: 220 }}>
                                    <InputLabel>Criterion</InputLabel>
                                    <Select
                                      label="Criterion"
                                      value={calibrationScoreDraft.criteriaId}
                                      onChange={(event) => setCalibrationScoreDraft((current) => ({ ...current, criteriaId: event.target.value }))}
                                    >
                                      {(scoreForm?.criteria || []).map((criterion) => (
                                        <MenuItem key={criterion.criteriaId} value={String(criterion.criteriaId)}>
                                          {criterion.criteriaName}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                  <TextField
                                    size="small"
                                    label="Score"
                                    type="number"
                                    inputProps={{ min: 0, max: 10, step: 0.25 }}
                                    value={calibrationScoreDraft.scoreValue}
                                    onChange={(event) => setCalibrationScoreDraft((current) => ({ ...current, scoreValue: event.target.value }))}
                                  />
                                </Stack>
                                <TextField
                                  size="small"
                                  label="Calibration note"
                                  fullWidth
                                  multiline
                                  minRows={2}
                                  value={calibrationScoreDraft.comment}
                                  onChange={(event) => setCalibrationScoreDraft((current) => ({ ...current, comment: event.target.value }))}
                                  sx={{ mb: 1.4 }}
                                />
                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                                  <Typography variant="body2" color="text.secondary">
                                    {calibrationAnalytics ? `${calibrationAnalytics.scoreCount} score(s) - avg ${formatMetric(calibrationAnalytics.averageScore)} - range ${formatMetric(calibrationAnalytics.minScore)}-${formatMetric(calibrationAnalytics.maxScore)}` : "No analytics yet."}
                                  </Typography>
                                  <Button variant="outlined" size="small" onClick={() => saveCalibrationScore()} disabled={calibrationSaving || !calibrationScoreDraft.criteriaId || calibrationScoreDraft.scoreValue === ""}>
                                    {calibrationSaving ? "Saving..." : "Save calibration score"}
                                  </Button>
                                </Stack>
                              </>
                            )}
                          </Box>
                        ) : null}

                        {judgeTab === "feedback" ? (
                          <Box className="eval-tab-content">
                            <Typography variant="h6" fontWeight={850} sx={{ mb: 1 }}>Your Feedback History</Typography>
                            <FeedbackHistory items={feedbackHistory} />
                          </Box>
                        ) : null}
                      </Box>

                    </>
                  ) : (
                    <Box className="eval-empty-inline">
                      Select a submission from the queue to review links, scores, and your own feedback history.
                    </Box>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card className="eval-card eval-scroll-target" ref={submissionQueueRef}>
            <CardContent>
              <Box className="eval-judge-layout">
                <Box className="eval-judge-sidebar">
                  <Box className="eval-subpanel">
                    <Typography variant="h6" fontWeight={850} sx={{ mb: 1.4 }}>
                      Assigned Tracks
                    </Typography>
                    {(mentorTracks || []).length === 0 ? (
                      <Box className="eval-empty-inline">
                        <Typography fontWeight={700}>No assigned tracks yet</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Track assignments will appear here after the coordinator links you to an event track.
                        </Typography>
                      </Box>
                    ) : (
                      <Box className="eval-list">
                        {mentorTracks.map((track) => (
                          <Box key={track.trackMentorId} className="eval-list-row">
                            <Box>
                              <Typography fontWeight={850}>{track.trackName}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {track.eventName}
                                {track.specialization ? ` - ${track.specialization}` : ""}
                              </Typography>
                            </Box>
                            <Chip size="small" label={`Assigned ${formatDateTime(track.assignedAt)}`} />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>

                  <Box className="eval-subpanel">
                    <Typography variant="h6" fontWeight={850} sx={{ mb: 1.4 }}>
                      Mentored Submissions
                    </Typography>
                    <Box className="eval-filter-bar">
                      <FormControl size="small">
                        <InputLabel>Round</InputLabel>
                        <Select label="Round" value={roundFilter} onChange={(event) => setRoundFilter(event.target.value)}>
                          <MenuItem value="all">All rounds</MenuItem>
                          {filterOptions.rounds.map(([id, name]) => <MenuItem key={id} value={String(id)}>{name}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControl size="small">
                        <InputLabel>Track</InputLabel>
                        <Select label="Track" value={trackFilter} onChange={(event) => setTrackFilter(event.target.value)}>
                          <MenuItem value="all">All tracks</MenuItem>
                          {filterOptions.tracks.map(([id, name]) => <MenuItem key={id} value={String(id)}>{name}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControl size="small">
                        <InputLabel>Status</InputLabel>
                        <Select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                          <MenuItem value="all">All statuses</MenuItem>
                          {["Submitted", "Evaluating", "Qualified", "Eliminated", "Disqualified"].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <Typography variant="body2" color="text.secondary" className="eval-filter-count">
                        Showing {filteredSubmissions.length} of {submissions.length}
                      </Typography>
                    </Box>
                    {filteredSubmissions.length === 0 ? (
                      <Box className="eval-empty-inline">
                        No mentored submissions available.
                      </Box>
                    ) : (
                      <Box className="eval-list">
                        {filteredSubmissions.map((submission) => {
                          const selected = selectedSubmission?.submissionId === submission.submissionId;
                          return (
                            <Box
                              key={submission.submissionId}
                              className={`eval-list-row eval-clickable ${selected ? "is-selected" : ""}`}
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Box className="eval-submission-main">
                                <Typography className="eval-row-title">
                                  <span>Team:</span>
                                  {submission.teamName}
                                </Typography>
                                <Box className="eval-row-meta-list">
                                  <Typography className="eval-row-meta">
                                    <span>Track:</span>
                                    {submission.trackName}
                                  </Typography>
                                  <Typography className="eval-row-meta">
                                    <span>Round:</span>
                                    {submission.roundName}
                                  </Typography>
                                </Box>
                              </Box>
                              <Chip size="small" variant="outlined" label={submission.submissionStatus} />
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box className="eval-detail-stack eval-scroll-target" ref={feedbackSectionRef}>
                  {selectedSubmission ? (
                    <>
                      <Box className="eval-subpanel eval-selected-card">
                        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5}>
                          <Box>
                            <Typography variant="h6" fontWeight={850}>{selectedSubmission.teamName}</Typography>
                            <Typography color="text.secondary">
                              {selectedSubmission.eventName} - {selectedSubmission.roundName}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={selectedSubmission.trackName} />
                            <Chip size="small" variant="outlined" label={selectedSubmission.submissionStatus} />
                          </Stack>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                          <LinkButton href={selectedSubmission.repositoryUrl}>Repository</LinkButton>
                          <LinkButton href={selectedSubmission.demoUrl}>Demo</LinkButton>
                          <LinkButton href={selectedSubmission.slideUrl}>Slides</LinkButton>
                        </Stack>
                        <GitMetadataCard
                          submissionId={selectedSubmission.submissionId}
                          repositoryUrl={selectedSubmission.repositoryUrl}
                        />
                      </Box>

                      <Box className="eval-subpanel">
                        <Typography variant="h6" fontWeight={850} sx={{ mb: 1 }}>
                          Mentor Feedback
                        </Typography>
                        <TextField
                          label="Write feedback for this team"
                          minRows={4}
                          multiline
                          fullWidth
                          value={mentorFeedbackText}
                          onChange={(event) => setMentorFeedbackText(event.target.value)}
                        />
                        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.4 }}>
                          <Button
                            variant="contained"
                            disabled={saving || !mentorFeedbackText.trim()}
                            onClick={submitMentorFeedback}
                          >
                            {saving ? "Saving..." : "Add Feedback"}
                          </Button>
                        </Stack>
                      </Box>

                      <Box className="eval-subpanel">
                        <Typography variant="h6" fontWeight={850} sx={{ mb: 1 }}>
                          Feedback History
                        </Typography>
                        <FeedbackHistory items={feedbackHistory} />
                      </Box>
                    </>
                  ) : (
                    <Box className="eval-empty-inline">
                      <Typography fontWeight={700}>Select a mentored submission</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pick a submission from the left column to review its links and leave mentor feedback in one place.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>
      <ConfirmActionDialog
        open={confirmFinalize}
        title="Finalize scores?"
        message="After finalizing, these scores are locked. Only a coordinator can reopen the evaluation."
        confirmLabel="Finalize"
        onCancel={() => setConfirmFinalize(false)}
        onConfirm={() => {
          setConfirmFinalize(false);
          submitScores(true);
        }}
      />
    </Box>
  );
}
