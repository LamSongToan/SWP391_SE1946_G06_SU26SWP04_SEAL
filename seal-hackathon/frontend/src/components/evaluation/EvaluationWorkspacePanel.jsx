import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
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
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import { getApiErrorMessage, http } from "../../api/http";
import CenteredNotification from "../layout/CenteredNotification";
import ConfirmActionDialog from "../layout/ConfirmActionDialog";
import ModulePageHeader from "../layout/ModulePageHeader";
import { brand } from "../../styles/designTokens";
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

function StatTile({ label, value, icon }) {
  return (
    <Box className="eval-stat">
      <Box>
        <Typography className="eval-stat-label">{label}</Typography>
        <Typography className="eval-stat-value">{value}</Typography>
      </Box>
      <Box className="eval-stat-icon">{icon}</Box>
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

  return (
    <Box
      sx={{
        mt: 1.5,
        p: 1.6,
        borderRadius: brand.radius.md,
        bgcolor: "#F8FAFF",
        border: `1px solid ${brand.colors.line}`,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <GitHubIcon sx={{ fontSize: 16, color: brand.colors.text }} />
          <Typography sx={{ color: brand.colors.text, fontSize: 13, fontWeight: 800 }}>
            {meta?.repoName || "Repository"}
            {meta?.platform ? (
              <Chip size="small" label={meta.platform} sx={{ ml: 0.8, height: 18, fontSize: 11 }} />
            ) : null}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Refresh metadata">
            <Button
              size="small"
              onClick={handleRefresh}
              disabled={refreshing}
              startIcon={refreshing ? <CircularProgress size={12} /> : <RefreshRoundedIcon sx={{ fontSize: 14 }} />}
              sx={{ minWidth: 0, px: 1, fontSize: 12, color: brand.colors.muted }}
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
              sx={{ minWidth: 0, px: 1, fontSize: 12, color: brand.colors.orange }}
            >
              View
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 1, py: 0.5 }}>{error}</Alert> : null}

      {meta ? (
        <>
          {meta.description ? (
            <Typography sx={{ color: brand.colors.muted, fontSize: 12, mb: 1 }}>{meta.description}</Typography>
          ) : null}
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {stats.map(([Icon, value, label]) => (
              <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                <Icon sx={{ fontSize: 14, color: brand.colors.muted }} />
                <Typography sx={{ color: brand.colors.text, fontSize: 12, fontWeight: 800 }}>{value}</Typography>
                <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>{label}</Typography>
              </Stack>
            ))}
            {meta.language ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>Lang:</Typography>
                <Typography sx={{ color: brand.colors.text, fontSize: 12, fontWeight: 800 }}>{meta.language}</Typography>
              </Stack>
            ) : null}
            {meta.lastPushedAt ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>Last push:</Typography>
                <Typography sx={{ color: brand.colors.text, fontSize: 12, fontWeight: 800 }}>
                  {meta.lastPushedAt}
                </Typography>
              </Stack>
            ) : null}
            {meta.license ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>License:</Typography>
                <Typography sx={{ color: brand.colors.text, fontSize: 12, fontWeight: 800 }}>{meta.license}</Typography>
              </Stack>
            ) : null}
          </Stack>
        </>
      ) : (
        <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>
          No metadata cached yet. Click Refresh to fetch from{" "}
          {repositoryUrl ? (
            <a href={repositoryUrl} target="_blank" rel="noopener noreferrer" style={{ color: brand.colors.orange }}>
              {repositoryUrl}
            </a>
          ) : (
            "the repository"
          )}
          .
        </Typography>
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
  feedbackText,
  setFeedbackText,
  onSaveDraft,
  onFinalize,
  saving,
}) {
  const criteria = form?.criteria || [];
  const editable = Boolean(form?.editable);
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

  return (
    <Card className="eval-card">
      <CardContent>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={850}>Score Input Form</Typography>
            <Typography color="text.secondary">
              Round-specific rubric for {form?.submission?.roundName || "selected round"}.
            </Typography>
          </Box>
          <Chip
            color={form?.evaluationStatus === "Finalized" ? "success" : editable ? "warning" : "default"}
            label={form?.evaluationStatus || (editable ? "Draft" : "Locked")}
            variant={editable ? "filled" : "outlined"}
          />
        </Stack>

        {!editable && form?.lockedReason ? (
          <Box className="eval-warning">
            <Typography fontWeight={800}>Score editing is locked</Typography>
            <Typography variant="body2">{form.lockedReason}</Typography>
          </Box>
        ) : null}

        <Stack spacing={1.4}>
          {criteria.map((criterion) => {
            const current = scoreState[criterion.criteriaId] || { scoreValue: "", comment: "" };
            return (
              <Box key={criterion.criteriaId} className="eval-criterion-row">
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography fontWeight={850}>{criterion.criteriaName}</Typography>
                    <Chip size="small" label={`${criterion.weight}%`} />
                    <Chip size="small" variant="outlined" label={criterion.criteriaType} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Score is stored separately for this criterion and current judge.
                  </Typography>
                </Box>
                <TextField
                  label="Score"
                  type="number"
                  size="small"
                  value={current.scoreValue}
                  disabled={!editable}
                  inputProps={{ min: 0, max: 10, step: 0.25 }}
                  helperText="0 to 10"
                  onChange={(event) => setScoreState((state) => ({
                    ...state,
                    [criterion.criteriaId]: {
                      ...state[criterion.criteriaId],
                      scoreValue: sanitizeScoreInput(event.target.value),
                    },
                  }))}
                />
                <TextField
                  label="Criterion comment"
                  size="small"
                  value={current.comment}
                  disabled={!editable}
                  onChange={(event) => setScoreState((state) => ({
                    ...state,
                    [criterion.criteriaId]: {
                      ...state[criterion.criteriaId],
                      comment: event.target.value,
                    },
                  }))}
                />
              </Box>
            );
          })}
        </Stack>

        <Box className="eval-score-summary">
          <Box>
            <Typography variant="caption" color="text.secondary">Weighted score</Typography>
            <Typography variant="h5" fontWeight={900}>{weightedTotal.toFixed(2)} / 10</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Rubric weight</Typography>
            <Typography fontWeight={850} color={weightTotal === 100 ? "success.main" : "warning.main"}>
              {weightTotal}% {weightTotal === 100 ? "Ready" : "Needs coordinator review"}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Criteria completed</Typography>
            <Typography fontWeight={850}>{entered.length}/{criteria.length}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        <TextField
          label="Written feedback for the team"
          minRows={3}
          multiline
          fullWidth
          value={feedbackText}
          disabled={!editable}
          onChange={(event) => setFeedbackText(event.target.value)}
          helperText="Optional. Saved as a separate feedback history entry."
        />
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.6 }}>
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
            startIcon={<SaveRoundedIcon />}
            disabled={!editable || !complete || saving}
            onClick={onFinalize}
          >
            Finalize Scores
          </Button>
        </Stack>

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
      </CardContent>
    </Card>
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roundFilter, setRoundFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmFinalize, setConfirmFinalize] = useState(false);

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
    return true;
  }), [isJudge, roundFilter, statusFilter, submissions, trackFilter]);

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
      const target = ["judging", "judge-rounds", "scoring"].includes(section)
        ? judgeWorkspaceRef.current
        : ["mentor-workspace", "mentor-tracks", "mentor-teams", "mentor-notes"].includes(section)
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
              <StatTile label="Assigned Rounds" value={dashboard?.assignedRoundCount || 0} icon={<GavelRoundedIcon />} />
              <StatTile label="Assigned Submissions" value={dashboard?.assignedSubmissionCount || 0} icon={<AssignmentTurnedInRoundedIcon />} />
              <StatTile label="Pending Scores" value={dashboard?.pendingSubmissionCount || 0} icon={<HistoryRoundedIcon />} />
              <StatTile label="Score Records" value={dashboard?.submittedScoreCount || 0} icon={<SaveRoundedIcon />} />
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
                  <Box className="eval-subpanel">
                    <Typography variant="h6" fontWeight={850} sx={{ mb: 1.4 }}>Assigned Rounds</Typography>
                    <Box className="eval-list">
                      {(dashboard?.assignedRounds || []).length === 0 ? (
                        <Box className="eval-empty-inline">No assigned rounds yet.</Box>
                      ) : dashboard.assignedRounds.map((round) => (
                        <Box key={round.judgeAssignmentId} className="eval-list-row">
                          <Box>
                            <Typography fontWeight={850}>{round.roundName} - {round.trackName}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {round.eventName} - Deadline {formatDateTime(round.submissionDeadline)}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={`${round.scoredSubmissionCount}/${round.submissionCount} scored`} />
                            <Chip size="small" color={round.scoreLocked ? "default" : "success"} label={round.scoreLocked ? "Locked" : "Open"} />
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box className="eval-subpanel eval-scroll-target" ref={submissionQueueRef}>
                    <Typography variant="h6" fontWeight={850} sx={{ mb: 1.4 }}>Submission Queue</Typography>
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
                          {["NotStarted", "Draft", "Finalized"].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <Typography variant="body2" color="text.secondary" className="eval-filter-count">
                        Showing {filteredSubmissions.length} of {submissions.length}
                      </Typography>
                    </Box>
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
                              <Box>
                                <Typography fontWeight={850}>{submission.teamName}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {submission.roundName} - {submission.trackName}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  size="small"
                                  color={submission.evaluationStatus === "Finalized" ? "success" : submission.evaluationStatus === "Draft" ? "warning" : "default"}
                                  label={submission.evaluationStatus === "NotStarted"
                                    ? `${submission.scoredCriteriaCount}/${submission.totalCriteriaCount}`
                                    : submission.evaluationStatus}
                                />
                                <Chip size="small" variant="outlined" label={submission.submissionStatus} />
                              </Stack>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box className="eval-detail-stack">
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
                            <Chip
                              color={selectedSubmission.editable ? "success" : "default"}
                              label={selectedSubmission.editable ? "Ready to score" : (scoreForm?.lockedReason || "Locked")}
                            />
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
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                          Submission deadline: {formatDateTime(selectedSubmission.submissionDeadline)}
                        </Typography>
                      </Box>

                      {scoreForm ? (
                        <ScoreInputForm
                          form={scoreForm}
                          scoreState={scoreState}
                          setScoreState={setScoreState}
                          feedbackText={feedbackText}
                          setFeedbackText={setFeedbackText}
                          onSaveDraft={() => submitScores(false)}
                          onFinalize={() => setConfirmFinalize(true)}
                          saving={saving}
                        />
                      ) : null}

                      <Box className="eval-subpanel eval-scroll-target" ref={feedbackSectionRef}>
                        <Typography variant="h6" fontWeight={850} sx={{ mb: 1 }}>Your Feedback History</Typography>
                        <FeedbackHistory items={feedbackHistory} />
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
                          {["Submitted", "Evaluating", "Qualified", "Eliminated"].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
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
                              <Box>
                                <Typography fontWeight={850}>{submission.teamName}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {submission.roundName} - {submission.trackName}
                                </Typography>
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
