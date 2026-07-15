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
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
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

function formatCount(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return number.toLocaleString("en-US");
}

function formatStatusLabel(value) {
  if (!value) return "Unknown";
  if (value === "NotStarted") return "Not started";
  if (value === "Finalized") return "Submitted";
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

function normalizeEventStatus(value) {
  return String(value || "")
    .trim()
    .replace(/[\s_]+/g, "")
    .toUpperCase();
}

function pickNearestByDeadline(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = left?.scoringDeadline ? new Date(left.scoringDeadline).getTime() : Number.POSITIVE_INFINITY;
    const rightTime = right?.scoringDeadline ? new Date(right.scoringDeadline).getTime() : Number.POSITIVE_INFINITY;
    return leftTime - rightTime;
  })[0] || null;
}

const STATUS_GUIDE = [
  ["Not started", "#cbd5e1", "No score has been saved for this submission."],
  ["In progress", "#1677ff", "Scoring work has started."],
  ["Draft", "#f59e0b", "Draft scores are saved but are not available for coordinator finalization."],
  ["Ready", "#18b984", "Submission is available for judging."],
  ["Submitted", "#64748b", "Scores were submitted to the coordinator and remain editable until the round is finalized."],
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

function supportsRepositoryMetadata(repositoryUrl) {
  if (!repositoryUrl) return false;
  try {
    const host = new URL(repositoryUrl).hostname.toLowerCase();
    return host === "github.com" || host === "gitlab.com";
  } catch {
    return false;
  }
}

function ExternalResourceCard({ title, href, description }) {
  if (!href) {
    return (
      <Box className="eval-resource-link-card">
        <Typography className="eval-resource-link-title">{title}</Typography>
        <Typography className="eval-resource-link-copy">No link provided for this resource.</Typography>
      </Box>
    );
  }
  return (
    <Box className="eval-resource-link-card">
      <Typography className="eval-resource-link-title">{title}</Typography>
      <Typography className="eval-resource-link-copy">{description}</Typography>
      <Button
        href={href}
        target="_blank"
        rel="noreferrer"
        variant="outlined"
        endIcon={<OpenInNewRoundedIcon fontSize="small" />}
        className="eval-resource-link-button"
      >
        Open link
      </Button>
      <Typography className="eval-resource-link-url">{href}</Typography>
    </Box>
  );
}

function SubmissionResourceTabs({ submissionId, repositoryUrl, demoUrl, slideUrl }) {
  const tabs = [
    repositoryUrl ? { key: "repository", label: "Repository" } : null,
    demoUrl ? { key: "demo", label: "Demo" } : null,
    slideUrl ? { key: "slides", label: "Slides" } : null,
  ].filter(Boolean);
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "repository");

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(tabs[0]?.key || "repository");
    }
  }, [activeTab, tabs]);

  if (tabs.length === 0) return null;

  return (
    <Box className="eval-resource-panel">
      <Tabs
        value={activeTab}
        onChange={(_, nextTab) => setActiveTab(nextTab)}
        className="eval-resource-tabs"
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {tabs.map((tab) => (
          <Tab key={tab.key} value={tab.key} label={tab.label} />
        ))}
      </Tabs>

      <Box className="eval-resource-body">
        {activeTab === "repository" ? (
          supportsRepositoryMetadata(repositoryUrl) ? (
            <GitMetadataCard submissionId={submissionId} repositoryUrl={repositoryUrl} />
          ) : (
            <ExternalResourceCard
              title="Repository link"
              href={repositoryUrl}
              description="Open the submitted repository directly."
            />
          )
        ) : null}

        {activeTab === "demo" ? (
          <ExternalResourceCard
            title="Demo link"
            href={demoUrl}
            description="Open the submitted demo, deployed app, or video."
          />
        ) : null}

        {activeTab === "slides" ? (
          <ExternalResourceCard
            title="Slides / report link"
            href={slideUrl}
            description="Open the submitted slide deck or supporting report."
          />
        ) : null}
      </Box>
    </Box>
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

  const repoTitle = meta?.owner && meta?.repoName
    ? `${meta.owner}/${meta.repoName}`
    : meta?.repoName || "Repository";
  const visibility = meta?.visibility || null;
  const summaryTags = [
    meta?.language || null,
    visibility || null,
    meta?.defaultBranch ? meta.defaultBranch : null,
  ].filter(Boolean);
  const stats = meta
    ? [
        ["Last Push", meta.lastPushedAt ? formatDateTime(meta.lastPushedAt) : "--", null],
        ["Contributors", formatCount(meta.contributorCount), GroupRoundedIcon],
        ["Commits", formatCount(meta.commitCount), CommitRoundedIcon],
        ["Repository Size", meta.repositorySizeMb != null ? `${formatMetric(meta.repositorySizeMb)} MB` : "--", StorageRoundedIcon],
      ]
    : [];

  return (
    <Box className="eval-git-card">
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.2} className="eval-git-headline">
        <Box>
          <Typography className="eval-git-eyebrow">Repository</Typography>
        </Box>
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
        </Stack>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 1, py: 0.5 }}>{error}</Alert> : null}

      {meta ? (
        <Box className="eval-git-layout">
          <Box className="eval-git-main">
            <Stack direction="row" spacing={1.1} alignItems="flex-start" minWidth={0}>
              <Box className="eval-git-icon">
                <GitHubIcon fontSize="small" />
              </Box>
              <Box minWidth={0} className="eval-git-main-copy">
                <Typography className="eval-git-repo-name">
                  {repoTitle}
                </Typography>
                <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {meta?.platform ? (
                    <Chip size="small" label={String(meta.platform).charAt(0).toUpperCase() + String(meta.platform).slice(1)} className="eval-git-platform" />
                  ) : null}
                  {summaryTags.map((tag) => (
                    <Chip
                      key={tag}
                      size="small"
                      label={tag}
                      icon={tag === visibility ? (visibility === "Private" ? <LockRoundedIcon /> : <PublicRoundedIcon />) : undefined}
                      className="eval-git-tag"
                    />
                  ))}
                </Stack>
                <Typography className="eval-git-description">
                  {meta?.description || "Repository metadata snapshot for this submission."}
                </Typography>

                <Box className="eval-git-secondary-grid">
                  <Box className="eval-git-secondary-item">
                    <Typography className="eval-git-secondary-label">Stars</Typography>
                    <Stack direction="row" spacing={0.7} alignItems="center">
                      <StarBorderRoundedIcon className="eval-git-secondary-icon" />
                      <Typography className="eval-git-secondary-value">{formatCount(meta.stars)}</Typography>
                    </Stack>
                  </Box>
                  <Box className="eval-git-secondary-item">
                    <Typography className="eval-git-secondary-label">Forks</Typography>
                    <Stack direction="row" spacing={0.7} alignItems="center">
                      <ForkRightRoundedIcon className="eval-git-secondary-icon" />
                      <Typography className="eval-git-secondary-value">{formatCount(meta.forks)}</Typography>
                    </Stack>
                  </Box>
                  <Box className="eval-git-secondary-item">
                    <Typography className="eval-git-secondary-label">Open Issues</Typography>
                    <Stack direction="row" spacing={0.7} alignItems="center">
                      <BugReportRoundedIcon className="eval-git-secondary-icon" />
                      <Typography className="eval-git-secondary-value">{formatCount(meta.openIssues)}</Typography>
                    </Stack>
                  </Box>
                  <Box className="eval-git-secondary-item">
                    <Typography className="eval-git-secondary-label">License</Typography>
                    <Typography className="eval-git-secondary-value">{meta.license || "--"}</Typography>
                  </Box>
                </Box>
              </Box>
            </Stack>
          </Box>

          <Box className="eval-git-summary">
            <Box className="eval-git-stats-list">
              {stats.map(([label, value, Icon]) => (
                <Box key={label} className="eval-git-stat-row">
                  <Box className="eval-git-stat-copy">
                    <Typography className="eval-git-stat-label">{label}</Typography>
                    <Typography className="eval-git-stat-value">{value}</Typography>
                  </Box>
                  {Icon ? (
                    <Box className="eval-git-stat-icon">
                      <Icon fontSize="inherit" />
                    </Box>
                  ) : null}
                </Box>
              ))}
            </Box>

            {repositoryUrl ? (
              <Button
                size="small"
                component="a"
                href={repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 16 }} />}
                className="eval-git-open-button"
              >
                Open Repository
              </Button>
            ) : null}
          </Box>
        </Box>
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
  const scoreHistoryGroups = useMemo(() => {
    const items = form?.scoreHistory || [];
    if (items.length === 0) return [];
    const criteriaById = new Map(criteria.map((item) => [item.criteriaId, item]));
    const sortedItems = [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    const groups = [];
    sortedItems.forEach((item) => {
      const createdAtTime = new Date(item.createdAt).getTime();
      const lastGroup = groups[groups.length - 1];
      const isSameAttempt = lastGroup
        && lastGroup.actionType === item.actionType
        && Math.abs(lastGroup.anchorTime - createdAtTime) <= 3000;
      if (isSameAttempt) {
        lastGroup.entries.push(item);
        lastGroup.anchorTime = Math.min(lastGroup.anchorTime, createdAtTime);
        return;
      }
      groups.push({
        id: item.scoreHistoryId,
        actionType: item.actionType,
        createdAt: item.createdAt,
        anchorTime: createdAtTime,
        entries: [item],
      });
    });
    return groups.slice(0, 8).map((group) => {
      const scoredEntries = group.entries.filter((entry) => entry.newScoreValue != null);
      const weightedSnapshot = scoredEntries.reduce((total, entry) => {
        const criterion = criteriaById.get(entry.criteriaId);
        return total + (Number(entry.newScoreValue) * Number(criterion?.weight || 0) / 100);
      }, 0);
      return {
        ...group,
        weightedSnapshot,
      };
    });
  }, [criteria, form?.scoreHistory]);

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
                </Box>
              </Box>
            );
          })}
        </Stack>

        <Box className="eval-score-summary">
          <Box className="eval-summary-item">
            <Typography className="eval-summary-label">Criteria completed</Typography>
            <Typography className="eval-summary-score">{completedCriteria.length}/{criteria.length}</Typography>
            <LinearProgress
              variant="determinate"
              value={completionPercent}
              color={complete ? "success" : "warning"}
              className="eval-completion-progress"
            />
          </Box>
          <Box className="eval-summary-main">
            <Typography className="eval-summary-label">Weighted score</Typography>
            <Typography className="eval-summary-score">
              <span className="eval-summary-score-strong">{weightedTotal.toFixed(2)}</span>
              {" / "}
              {maxWeightedTotal.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {scoreHistoryGroups.length > 0 ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography fontWeight={850} sx={{ mb: 1 }}>Score History</Typography>
            <Box className="eval-history-list">
              {scoreHistoryGroups.map((group) => (
                <Box key={group.id} className="eval-history-block">
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
                    <Box>
                      <Typography className="eval-history-title">
                        {group.actionType === "FINALIZE"
                          ? "Submitted to coordinator"
                          : group.actionType === "REOPEN"
                            ? "Reopened scoring"
                            : "Draft save"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{formatDateTime(group.createdAt)}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={group.actionType === "FINALIZE"
                          ? "Submitted"
                          : group.actionType === "REOPEN"
                            ? "Reopened"
                            : "Draft"}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={(
                          <span className="eval-history-chip-label">
                            Weighted: <strong>{group.weightedSnapshot.toFixed(2)}</strong>
                          </span>
                        )}
                      />
                    </Stack>
                  </Stack>
                  <Box className="eval-history-score-grid">
                    {group.entries
                      .sort((left, right) => left.criteriaId - right.criteriaId)
                      .map((entry) => (
                        <Box key={entry.scoreHistoryId} className="eval-history-score-card">
                          <Typography className="eval-history-score-label">{entry.criteriaName}</Typography>
                          <Typography className="eval-history-score-value">
                            <strong>
                              {entry.newScoreValue == null ? "--" : Number(entry.newScoreValue).toFixed(2)}
                            </strong>
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        ) : null}

        <Box className="eval-score-action-spacer" />
        <Box className="eval-score-action-bar">
          <Box className="eval-action-summary">
            <Typography className="eval-action-score"><TaskAltRoundedIcon fontSize="small" /> Draft autosaved</Typography>
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
              Submit to Coordinator
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
  const [selectedMentorTeamId, setSelectedMentorTeamId] = useState(null);
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
  const [eventFilter, setEventFilter] = useState("all");
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

  const mentorEventOptions = useMemo(() => {
    if (isJudge) return [];
    const eventsById = new Map();
    (mentorTracks || []).forEach((track) => {
      if (!track.eventId) return;
      eventsById.set(track.eventId, {
        eventId: track.eventId,
        eventName: track.eventName,
        eventStatus: track.eventStatus,
        feedbackEnabled: track.feedbackEnabled !== false,
      });
    });
    (dashboard?.teams || []).forEach((team) => {
      if (!team.eventId) return;
      eventsById.set(team.eventId, {
        eventId: team.eventId,
        eventName: team.eventName,
        eventStatus: team.eventStatus,
        feedbackEnabled: team.feedbackEnabled !== false,
      });
    });
    return [...eventsById.values()];
  }, [dashboard, isJudge, mentorTracks]);

  const defaultMentorEventId = useMemo(() => {
    if (isJudge || mentorEventOptions.length === 0) return "all";
    const ongoing = mentorEventOptions.find((event) => (
      normalizeEventStatus(event.eventStatus) === "ONGOING" && event.feedbackEnabled
    ));
    const editable = mentorEventOptions.find((event) => event.feedbackEnabled);
    return String((ongoing || editable || mentorEventOptions[0]).eventId);
  }, [isJudge, mentorEventOptions]);

  const selectedMentorEvent = useMemo(() => (
    mentorEventOptions.find((event) => String(event.eventId) === eventFilter) || null
  ), [eventFilter, mentorEventOptions]);

  const mentorTeamsForEvent = useMemo(() => (
    (dashboard?.teams || []).filter((team) => String(team.eventId) === eventFilter)
  ), [dashboard, eventFilter]);

  const selectedMentorTeam = useMemo(() => (
    mentorTeamsForEvent.find((team) => team.teamId === selectedMentorTeamId) || null
  ), [mentorTeamsForEvent, selectedMentorTeamId]);

  const mentorTracksForEvent = useMemo(() => (
    (mentorTracks || []).filter((track) => String(track.eventId) === eventFilter)
  ), [eventFilter, mentorTracks]);

  const mentorSubmissionCount = useMemo(() => (
    mentorTeamsForEvent.reduce((total, team) => total + (team.submissions || []).length, 0)
  ), [mentorTeamsForEvent]);

  const mentorFeedbackEnabled = selectedMentorEvent?.feedbackEnabled === true
    && normalizeEventStatus(selectedMentorEvent?.eventStatus) !== "ENDED";

  const judgeRoundHelper = useMemo(() => {
    if (!isJudge) return "";
    const judgeSubmissions = dashboard?.submissions || [];
    const roundNames = [...new Map(judgeSubmissions.map((item) => [item.roundId, item.roundName])).values()];
    const trackNames = [...new Map(judgeSubmissions.map((item) => [item.trackId, item.trackName])).values()];
    const finalRounds = judgeSubmissions.filter((item) => item.finalRound);
    if (roundNames.length === 0) {
      return "No active scoring round";
    }
    if (roundNames.length === 1) {
      if (finalRounds.length === judgeSubmissions.length) {
        return `${roundNames[0]} - all finalists`;
      }
      const trackLabel = `${trackNames.length} track${trackNames.length === 1 ? "" : "s"}`;
      return `${roundNames[0]} - ${trackLabel}`;
    }
    return `${roundNames.length} active rounds - ${trackNames.length} tracks`;
  }, [dashboard, isJudge]);

  const nearestScoringDeadline = useMemo(() => {
    if (!isJudge) return null;
    return (dashboard?.submissions || [])
      .map((item) => item.scoringDeadline)
      .filter(Boolean)
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] || null;
  }, [dashboard, isJudge]);

  const activeScoringDeadline = selectedSubmission?.scoringDeadline || nearestScoringDeadline || null;

  const judgeEventOptions = useMemo(() => (
    [...new Map(
      (dashboard?.submissions || []).map((item) => [item.eventId, item.eventName])
    ).entries()]
  ), [dashboard]);

  const judgeRoundOptions = useMemo(() => {
    const source = (dashboard?.submissions || []).filter((item) => (
      eventFilter === "all" || String(item.eventId) === eventFilter
    ));
    return [...new Map(source.map((item) => [item.roundId, item.roundName])).entries()];
  }, [dashboard, eventFilter]);

  const judgeTrackOptions = useMemo(() => {
    const source = submissions.filter((item) => {
      if (!isJudge) return false;
      if (eventFilter !== "all" && String(item.eventId) !== eventFilter) return false;
      if (roundFilter !== "all" && String(item.roundId) !== roundFilter) return false;
      return true;
    });
    if (source.length > 0 && source.every((item) => item.finalRound)) {
      return [];
    }
    return [...new Map(source.map((item) => [item.trackId, item.trackName])).entries()];
  }, [eventFilter, isJudge, roundFilter, submissions]);

  const selectedJudgeRoundIsFinal = useMemo(() => {
    if (!isJudge) return false;
    const source = submissions.filter((item) => {
      if (eventFilter !== "all" && String(item.eventId) !== eventFilter) return false;
      if (roundFilter !== "all" && String(item.roundId) !== roundFilter) return false;
      return true;
    });
    return source.length > 0 && source.every((item) => item.finalRound);
  }, [eventFilter, isJudge, roundFilter, submissions]);

  const defaultJudgeEventId = useMemo(() => {
    if (!isJudge) return "all";
    const judgeSubmissions = dashboard?.submissions || [];
    if (judgeSubmissions.length === 0) return "all";
    const ongoingEventSubmission = pickNearestByDeadline(
      judgeSubmissions.filter((item) => normalizeEventStatus(item.eventStatus) === "ONGOING")
    );
    if (ongoingEventSubmission?.eventId) return String(ongoingEventSubmission.eventId);
    const unlockedEventSubmission = pickNearestByDeadline(
      judgeSubmissions.filter((item) => item.scoreLocked !== true)
    );
    if (unlockedEventSubmission?.eventId) return String(unlockedEventSubmission.eventId);
    return String(judgeSubmissions[0].eventId);
  }, [dashboard, isJudge]);

  const defaultJudgeRoundId = useMemo(() => {
    if (!isJudge) return "all";
    const judgeSubmissions = (dashboard?.submissions || []).filter((item) => (
      (eventFilter === "all" ? defaultJudgeEventId : eventFilter) === "all"
        || String(item.eventId) === (eventFilter === "all" ? defaultJudgeEventId : eventFilter)
    ));
    if (judgeSubmissions.length === 0) return "all";
    const ongoingRoundSubmission = pickNearestByDeadline(
      judgeSubmissions.filter((item) => item.scoreLocked !== true && item.editable !== false)
    );
    if (ongoingRoundSubmission?.roundId) return String(ongoingRoundSubmission.roundId);
    const unlockedRoundSubmission = pickNearestByDeadline(
      judgeSubmissions.filter((item) => item.scoreLocked !== true)
    );
    if (unlockedRoundSubmission?.roundId) return String(unlockedRoundSubmission.roundId);
    return String(judgeSubmissions[0].roundId);
  }, [dashboard, defaultJudgeEventId, eventFilter, isJudge]);

  const filterOptions = useMemo(() => ({
    rounds: [...new Map(submissions
      .filter((item) => eventFilter === "all" || String(item.eventId) === eventFilter)
      .map((item) => [item.roundId, item.roundName])).entries()],
    tracks: [...new Map(submissions
      .filter((item) => eventFilter === "all" || String(item.eventId) === eventFilter)
      .map((item) => [item.trackId, item.trackName])).entries()],
  }), [eventFilter, submissions]);

  const filteredSubmissions = useMemo(() => submissions.filter((item) => {
    if (eventFilter !== "all" && String(item.eventId) !== eventFilter) return false;
    if (roundFilter !== "all" && String(item.roundId) !== roundFilter) return false;
    if (!selectedJudgeRoundIsFinal && trackFilter !== "all" && String(item.trackId) !== trackFilter) return false;
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
  }), [eventFilter, isJudge, queueSearch, roundFilter, selectedJudgeRoundIsFinal, statusFilter, submissions, trackFilter]);

  const judgeSelectionLabel = useMemo(() => {
    if (!isJudge) return "";
    const selectedEventName = judgeEventOptions.find(([id]) => String(id) === eventFilter)?.[1];
    const selectedRoundName = judgeRoundOptions.find(([id]) => String(id) === roundFilter)?.[1];
    if (selectedEventName && selectedRoundName) {
      return `${selectedEventName} - ${selectedRoundName}`;
    }
    if (selectedEventName) {
      return selectedEventName;
    }
    if (selectedRoundName) {
      return selectedRoundName;
    }
    return "All assigned events and rounds";
  }, [eventFilter, isJudge, judgeEventOptions, judgeRoundOptions, roundFilter]);

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
      if (isJudge && !selectedSubmission && nextSubmissions.length > 0) {
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
    if (isJudge) return;
    if (mentorEventOptions.length === 0) {
      setEventFilter("all");
      setSelectedMentorTeamId(null);
      setSelectedSubmission(null);
      return;
    }
    const selectedEventExists = mentorEventOptions.some((event) => String(event.eventId) === eventFilter);
    if (!selectedEventExists) {
      setEventFilter(defaultMentorEventId);
      return;
    }

    const nextTeam = mentorTeamsForEvent.find((team) => team.teamId === selectedMentorTeamId)
      || mentorTeamsForEvent[0]
      || null;
    if (nextTeam?.teamId !== selectedMentorTeamId) {
      setSelectedMentorTeamId(nextTeam?.teamId || null);
    }
    const teamSubmissions = nextTeam?.submissions || [];
    const selectedSubmissionIsVisible = teamSubmissions.some((item) => (
      item.submissionId === selectedSubmission?.submissionId
    ));
    if (!selectedSubmissionIsVisible) {
      setSelectedSubmission(teamSubmissions[0] || null);
      setMentorFeedbackText("");
    }
  }, [
    defaultMentorEventId,
    eventFilter,
    isJudge,
    mentorEventOptions,
    mentorTeamsForEvent,
    selectedMentorTeamId,
    selectedSubmission?.submissionId,
  ]);

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
    if (!isJudge) return;
    if (eventFilter === "all" && defaultJudgeEventId !== "all") {
      setEventFilter(defaultJudgeEventId);
    }
  }, [defaultJudgeEventId, eventFilter, isJudge]);

  useEffect(() => {
    if (!isJudge) return;
    if (eventFilter !== "all" && !judgeEventOptions.some(([id]) => String(id) === eventFilter)) {
      setEventFilter(defaultJudgeEventId);
    }
  }, [defaultJudgeEventId, eventFilter, isJudge, judgeEventOptions]);

  useEffect(() => {
    if (!isJudge) return;
    if (roundFilter === "all" && defaultJudgeRoundId !== "all") {
      setRoundFilter(defaultJudgeRoundId);
    }
  }, [defaultJudgeRoundId, isJudge, roundFilter]);

  useEffect(() => {
    if (!isJudge) return;
    if (roundFilter !== "all" && !judgeRoundOptions.some(([id]) => String(id) === roundFilter)) {
      setRoundFilter(defaultJudgeRoundId);
    }
  }, [defaultJudgeRoundId, isJudge, judgeRoundOptions, roundFilter]);

  useEffect(() => {
    if (!isJudge) return;
    if (selectedJudgeRoundIsFinal && trackFilter !== "all") {
      setTrackFilter("all");
      return;
    }
    if (trackFilter !== "all" && !judgeTrackOptions.some(([id]) => String(id) === trackFilter)) {
      setTrackFilter("all");
    }
  }, [isJudge, judgeTrackOptions, selectedJudgeRoundIsFinal, trackFilter]);

  useEffect(() => {
    if (!isJudge) return;
    if (filteredSubmissions.length === 0) {
      setSelectedSubmission(null);
      return;
    }
    if (!selectedSubmission?.submissionId) {
      setSelectedSubmission(filteredSubmissions[0]);
      return;
    }
    const stillVisible = filteredSubmissions.some((item) => item.submissionId === selectedSubmission.submissionId);
    if (!stillVisible) {
      setSelectedSubmission(filteredSubmissions[0]);
    }
  }, [filteredSubmissions, isJudge, selectedSubmission?.submissionId]);

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
      setSuccess(finalizeScores
        ? "Scores submitted to the coordinator. You can still edit them until the coordinator finalizes the round."
        : "Draft scores saved. Submit them again when they are ready for coordinator finalization.");
      await loadDashboard();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to submit scores"));
    } finally {
      setSaving(false);
    }
  };

  const submitMentorFeedback = async () => {
    if (!mentorFeedbackEnabled || !selectedSubmission?.submissionId || !mentorFeedbackText.trim()) return;
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
          description: "Choose an event, review the teams assigned to your track, and leave feedback while the event is active.",
        };

  return (
    <Box className="eval-shell">
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
                label="Scoring Rounds"
                value={dashboard?.assignedRoundCount || 0}
                helper={judgeRoundHelper}
                tone="success"
                icon={<GavelRoundedIcon />}
              />
              <StatTile
                label="Assigned Submissions"
                value={dashboard?.assignedSubmissionCount || 0}
                helper={selectedJudgeRoundIsFinal ? "All finalists" : "By track assignment"}
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
                helper="Submitted to coordinator"
                icon={<SaveRoundedIcon />}
              />
            </>
          ) : (
            <>
              <StatTile label="Assigned Tracks" value={mentorTracksForEvent.length} icon={<PsychologyRoundedIcon />} />
              <StatTile label="Mentored Teams" value={mentorTeamsForEvent.length} icon={<AssignmentTurnedInRoundedIcon />} />
              <StatTile label="Submissions" value={mentorSubmissionCount} icon={<GavelRoundedIcon />} />
              <StatTile
                label="Event Access"
                value={mentorFeedbackEnabled ? "Active" : "Read only"}
                helper={mentorFeedbackEnabled ? "Feedback is available" : "Event has ended"}
                tone={mentorFeedbackEnabled ? "success" : "default"}
                icon={mentorFeedbackEnabled ? <TaskAltRoundedIcon /> : <LockRoundedIcon />}
              />
            </>
          )}
        </Box>

        {isJudge && activeScoringDeadline ? (
          <Alert severity="info" className="eval-deadline-alert">
            Judging deadline: <strong>{formatDateTime(activeScoringDeadline)}</strong>. Please finish your assigned scores before this cutoff.
          </Alert>
        ) : null}

        <Card className="eval-card">
          <CardContent className="eval-judge-event-select-card">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
              <FormControl size="small" className="eval-judge-event-select">
                <InputLabel>Event</InputLabel>
                <Select
                  label="Event"
                  value={eventFilter}
                  onChange={(event) => {
                    setEventFilter(event.target.value);
                    setRoundFilter("all");
                    setTrackFilter("all");
                    setStatusFilter("all");
                    setSelectedMentorTeamId(null);
                    setSelectedSubmission(null);
                  }}
                >
                  {isJudge ? <MenuItem value="all">All events</MenuItem> : null}
                  {!isJudge && mentorEventOptions.length === 0 ? (
                    <MenuItem value="all">No assigned events</MenuItem>
                  ) : null}
                  {isJudge
                    ? judgeEventOptions.map(([id, name]) => <MenuItem key={id} value={String(id)}>{name}</MenuItem>)
                    : mentorEventOptions.map((event) => (
                      <MenuItem key={event.eventId} value={String(event.eventId)}>
                        {event.eventName} - {event.feedbackEnabled ? "Active" : "Ended"}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {!isJudge && selectedMentorEvent ? (
                <Chip
                  icon={mentorFeedbackEnabled ? <TaskAltRoundedIcon /> : <LockRoundedIcon />}
                  color={mentorFeedbackEnabled ? "success" : "default"}
                  label={mentorFeedbackEnabled ? "Feedback open" : "Ended - read only"}
                />
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        {isJudge ? (
          <Card className="eval-card eval-scroll-target" ref={judgeWorkspaceRef}>
            <CardContent>
              <Box className="eval-judge-layout">
                <Box className="eval-judge-sidebar">
                  <Box className="eval-subpanel eval-nav-panel eval-scroll-target" ref={submissionQueueRef}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.4 }}>
                      <Box>
                        <Typography
                          component="h2"
                          className="eval-panel-title"
                          sx={{ fontWeight: 900, fontSize: 20, color: "#071a2f" }}
                        >
                          Submission Queue
                        </Typography>
                        <Typography className="eval-panel-caption">
                          {judgeSelectionLabel}
                        </Typography>
                      </Box>
                    </Stack>
                    <Box className="eval-filter-bar">
                      <FormControl size="small">
                        <InputLabel>Round</InputLabel>
                        <Select label="Round" value={roundFilter} onChange={(event) => setRoundFilter(event.target.value)}>
                          <MenuItem value="all">All rounds</MenuItem>
                          {judgeRoundOptions.map(([id, name]) => <MenuItem key={id} value={String(id)}>{name}</MenuItem>)}
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
                    {selectedJudgeRoundIsFinal ? (
                      <Box className="eval-empty-inline" sx={{ mb: 1.3, py: 1.4 }}>
                        Final round judging is event-wide. Track tabs are hidden because every finalist submission is scored together.
                      </Box>
                    ) : (
                      <Tabs
                        value={trackFilter}
                        onChange={(_, nextValue) => setTrackFilter(nextValue)}
                        className="eval-track-tabs"
                        variant="scrollable"
                        allowScrollButtonsMobile
                      >
                        <Tab value="all" label="All tracks" />
                        {judgeTrackOptions.map(([id, name]) => (
                          <Tab key={id} value={String(id)} label={name} />
                        ))}
                      </Tabs>
                    )}
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
                                    <span>Event:</span>
                                    {submission.eventName}
                                  </Typography>
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
                              <Typography>{selectedSubmission.eventName}</Typography>
                              <span>-</span>
                              <Typography>{selectedSubmission.trackName}</Typography>
                              <span>-</span>
                              <Typography>{selectedSubmission.roundName}</Typography>
                              <Chip size="small" label={`Deadline: ${formatDateTime(selectedSubmission.submissionDeadline)}`} className="eval-deadline-chip" />
                              <Chip size="small" label={`Scoring deadline: ${formatDateTime(selectedSubmission.scoringDeadline)}`} className="eval-scoring-deadline-chip" />
                              <Chip
                                size="small"
                                color={selectedSubmission.editable ? "success" : "default"}
                                label={selectedSubmission.editable ? "Submission status: Ready to score" : (scoreForm?.lockedReason || "Locked")}
                              />
                            </Stack>
                          </Box>
                        </Stack>
                        <SubmissionResourceTabs
                          submissionId={selectedSubmission.submissionId}
                          repositoryUrl={selectedSubmission.repositoryUrl}
                          demoUrl={selectedSubmission.demoUrl}
                          slideUrl={selectedSubmission.slideUrl}
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
                      Assigned Track
                    </Typography>
                    {mentorTracksForEvent.length === 0 ? (
                      <Box className="eval-empty-inline">
                        <Typography fontWeight={700}>No track assigned for this event</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Select another event or wait for the coordinator to assign a track.
                        </Typography>
                      </Box>
                    ) : (
                      <Box className="eval-list">
                        {mentorTracksForEvent.map((track) => (
                          <Box key={track.trackMentorId} className="eval-list-row">
                            <Box>
                              <Typography fontWeight={850}>{track.trackName}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {track.eventName}
                              </Typography>
                            </Box>
                            <Chip size="small" label={mentorFeedbackEnabled ? "Active" : "Ended"} />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>

                  <Box className="eval-subpanel">
                    <Typography variant="h6" fontWeight={850} sx={{ mb: 1.4 }}>
                      Mentored Teams
                    </Typography>
                    {mentorTeamsForEvent.length === 0 ? (
                      <Box className="eval-empty-inline">
                        No teams are currently assigned to your track in this event.
                      </Box>
                    ) : (
                      <Box className="eval-list">
                        {mentorTeamsForEvent.map((team) => {
                          const selected = selectedMentorTeam?.teamId === team.teamId;
                          return (
                            <Box
                              key={team.teamId}
                              className={`eval-list-row eval-clickable ${selected ? "is-selected" : ""}`}
                              onClick={() => {
                                setSelectedMentorTeamId(team.teamId);
                                setSelectedSubmission((team.submissions || [])[0] || null);
                                setMentorFeedbackText("");
                              }}
                            >
                              <Box className="eval-submission-main">
                                <Typography className="eval-row-title">
                                  {team.teamName}
                                </Typography>
                                <Box className="eval-row-meta-list">
                                  <Typography className="eval-row-meta">
                                    <span>Track:</span>
                                    {team.trackName}
                                  </Typography>
                                  <Typography className="eval-row-meta">
                                    <span>Members:</span>
                                    {team.memberCount}
                                  </Typography>
                                </Box>
                              </Box>
                              <Chip size="small" variant="outlined" label={`${(team.submissions || []).length} submission(s)`} />
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box className="eval-detail-stack eval-scroll-target" ref={feedbackSectionRef}>
                  {selectedMentorTeam ? (
                    <>
                      <Box className="eval-subpanel eval-selected-card">
                        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5}>
                          <Box>
                            <Typography variant="h6" fontWeight={850}>{selectedMentorTeam.teamName}</Typography>
                            <Typography color="text.secondary">
                              {selectedMentorTeam.eventName} - {selectedMentorTeam.trackName}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={`${selectedMentorTeam.memberCount} members`} />
                            <Chip size="small" variant="outlined" label={selectedMentorTeam.teamStatus} />
                          </Stack>
                        </Stack>
                        {(selectedMentorTeam.submissions || []).length > 0 ? (
                          <FormControl size="small" fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Round submission</InputLabel>
                            <Select
                              label="Round submission"
                              value={selectedSubmission?.submissionId ? String(selectedSubmission.submissionId) : ""}
                              onChange={(event) => {
                                const nextSubmission = (selectedMentorTeam.submissions || []).find((item) => (
                                  String(item.submissionId) === event.target.value
                                ));
                                setSelectedSubmission(nextSubmission || null);
                                setMentorFeedbackText("");
                              }}
                            >
                              {(selectedMentorTeam.submissions || []).map((submission) => (
                                <MenuItem key={submission.submissionId} value={String(submission.submissionId)}>
                                  {submission.roundName} - {submission.submissionStatus}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : null}
                        {selectedSubmission ? (
                          <SubmissionResourceTabs
                            submissionId={selectedSubmission.submissionId}
                            repositoryUrl={selectedSubmission.repositoryUrl}
                            demoUrl={selectedSubmission.demoUrl}
                            slideUrl={selectedSubmission.slideUrl}
                          />
                        ) : (
                          <Box className="eval-empty-inline" sx={{ mt: 2 }}>
                            This team has not submitted an entry for this event yet.
                          </Box>
                        )}
                      </Box>

                      {selectedSubmission && mentorFeedbackEnabled ? (
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
                      ) : selectedSubmission ? (
                        <Alert severity="info" icon={<LockRoundedIcon />}>
                          This event has ended. Mentor feedback is read-only and no new feedback can be added.
                        </Alert>
                      ) : null}

                      {selectedSubmission ? (
                        <Box className="eval-subpanel">
                          <Typography variant="h6" fontWeight={850} sx={{ mb: 1 }}>
                            Feedback History
                          </Typography>
                          <FeedbackHistory items={feedbackHistory} />
                        </Box>
                      ) : null}
                    </>
                  ) : (
                    <Box className="eval-empty-inline">
                      <Typography fontWeight={700}>Select a mentored team</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Choose a team from this event to review its submissions and feedback history.
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
        title="Submit scores to coordinator?"
        message="These scores will be used when the coordinator finalizes this round. You can still edit them until the round is finalized; saving later changes as a draft will require you to submit again."
        confirmLabel="Submit"
        onCancel={() => setConfirmFinalize(false)}
        onConfirm={() => {
          setConfirmFinalize(false);
          submitScores(true);
        }}
      />
    </Box>
  );
}
