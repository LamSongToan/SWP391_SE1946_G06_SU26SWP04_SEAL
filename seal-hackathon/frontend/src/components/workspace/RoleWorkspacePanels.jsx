import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import GitHubIcon from "@mui/icons-material/GitHub";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import ForkRightRoundedIcon from "@mui/icons-material/ForkRightRounded";
import CommitRoundedIcon from "@mui/icons-material/CommitRounded";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import { http } from "../../api/http";
import ModulePageHeader from "../layout/ModulePageHeader";
import { brand } from "../../styles/designTokens";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
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
      .then((r) => { if (mounted) setMeta(r.data?.data || null); })
      .catch(() => { if (mounted) setMeta(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [submissionId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      const r = await http.post(`/api/submissions/${submissionId}/git-metadata/refresh`);
      setMeta(r.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return (
    <Box sx={{ py: 1 }}><LinearProgress sx={{ borderRadius: 1 }} /></Box>
  );

  const stats = meta ? [
    [StarBorderRoundedIcon, meta.stars ?? "—", "Stars"],
    [ForkRightRoundedIcon, meta.forks ?? "—", "Forks"],
    [CommitRoundedIcon, meta.commitCount ?? "—", "Commits"],
    [BugReportRoundedIcon, meta.openIssues ?? "—", "Open issues"],
  ] : [];

  return (
    <Box sx={{ mt: 1.5, p: 1.6, borderRadius: brand.radius.md, bgcolor: "#F8FAFF", border: `1px solid ${brand.colors.line}` }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <GitHubIcon sx={{ fontSize: 16, color: brand.colors.text }} />
          <Typography sx={{ color: brand.colors.text, fontSize: 13, fontWeight: 800 }}>
            {meta?.repoName || "Repository"}
            {meta?.platform ? <Chip size="small" label={meta.platform} sx={{ ml: 0.8, height: 18, fontSize: 11 }} /> : null}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Refresh metadata">
            <Button size="small" onClick={handleRefresh} disabled={refreshing}
              startIcon={refreshing ? <CircularProgress size={12} /> : <RefreshRoundedIcon sx={{ fontSize: 14 }} />}
              sx={{ minWidth: 0, px: 1, fontSize: 12, color: brand.colors.muted }}>
              Refresh
            </Button>
          </Tooltip>
          {repositoryUrl ? (
            <Button size="small" component="a" href={repositoryUrl} target="_blank" rel="noopener noreferrer"
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 13 }} />}
              sx={{ minWidth: 0, px: 1, fontSize: 12, color: brand.colors.orange }}>
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
                <Typography sx={{ color: brand.colors.text, fontSize: 12, fontWeight: 800 }}>{meta.lastPushedAt}</Typography>
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
          {repositoryUrl ? <a href={repositoryUrl} target="_blank" rel="noopener noreferrer" style={{ color: brand.colors.orange }}>{repositoryUrl}</a> : "the repository"}.
        </Typography>
      )}
    </Box>
  );
}

function ScoreSubmitDialog({ submission, criteria, open, onClose, onScored }) {
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setScores({}); setComments({}); setError(""); }
  }, [open]);

  const handleSubmit = async () => {
    const missing = criteria.filter((c) => scores[c.criteriaId] === undefined || scores[c.criteriaId] === "");
    if (missing.length > 0) { setError("Please score all criteria before submitting."); return; }
    setLoading(true);
    setError("");
    try {
      for (const c of criteria) {
        await http.post(`/api/submissions/${submission.submissionId}/scores`, {
          criteriaId: c.criteriaId,
          scoreValue: Number(scores[c.criteriaId]),
          comment: comments[c.criteriaId] || undefined,
        });
      }
      onScored(submission.submissionId);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Scoring failed");
    } finally {
      setLoading(false);
    }
  };

  if (!submission) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>
        Score Submission — {submission.teamName}
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2, fontSize: 14 }}>
          {submission.roundName} · {submission.eventName}
        </Typography>
        {criteria.length === 0 ? (
          <Alert severity="warning">No scoring criteria configured for this round.</Alert>
        ) : (
          <Stack spacing={2}>
            {criteria.map((c) => (
              <Box key={c.criteriaId}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{c.criteriaName}</Typography>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <Chip size="small" label={c.criteriaType} sx={{ fontSize: 11 }} />
                    <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>Weight: {c.weight}</Typography>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <TextField
                    label="Score (0–10)"
                    type="number"
                    inputProps={{ min: 0, max: 10, step: 0.5 }}
                    value={scores[c.criteriaId] ?? ""}
                    onChange={(e) => setScores((prev) => ({ ...prev, [c.criteriaId]: e.target.value }))}
                    size="small"
                    sx={{ width: 130 }}
                    required
                  />
                  <TextField
                    label="Comment (optional)"
                    value={comments[c.criteriaId] ?? ""}
                    onChange={(e) => setComments((prev) => ({ ...prev, [c.criteriaId]: e.target.value }))}
                    size="small"
                    fullWidth
                    multiline
                    maxRows={2}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || criteria.length === 0}
          sx={{ bgcolor: brand.colors.orange, "&:hover": { bgcolor: brand.colors.orangeDark } }}>
          {loading ? <CircularProgress size={18} color="inherit" /> : "Submit Scores"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Judge: Assigned Rounds ───────────────────────────────────────────────────
export function JudgeAssignedRoundsPanel() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    http.get("/api/judge/assignments")
      .then((r) => { if (mounted) setAssignments(r.data?.data || []); })
      .catch((err) => { if (mounted) setError(err?.response?.data?.message || "Failed to load assignments"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <Box>
      <ModulePageHeader
        eyebrow="Your Work"
        title="Assigned Rounds"
        description="Rounds and tracks you have been assigned to judge."
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: brand.colors.orange }} />
        </Box>
      ) : assignments.length === 0 ? (
        <Box className="ms-empty">
          <GavelRoundedIcon sx={{ fontSize: 40, color: brand.colors.muted, mb: 1 }} />
          <Typography fontWeight={800}>No assigned rounds yet</Typography>
          <Typography color="text.secondary" variant="body2">
            Assigned rounds will appear here after the Event Coordinator publishes the judging setup.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {assignments.map((a) => (
            <Box key={a.judgeAssignmentId}
              sx={{ p: 2.2, borderRadius: brand.radius.lg, border: `1px solid ${brand.colors.line}`, bgcolor: brand.colors.surface, boxShadow: brand.shadow.sm }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
                <Box>
                  <Typography sx={{ color: brand.colors.text, fontWeight: 900, fontSize: 16 }}>{a.roundName}</Typography>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                    {a.eventName} · Track: <strong>{a.trackName}</strong>
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  {a.judgeType ? <Chip size="small" label={a.judgeType} sx={{ fontWeight: 800 }} /> : null}
                  <Chip size="small" label={`Assigned ${formatDate(a.assignedAt)}`}
                    sx={{ bgcolor: brand.colors.surfaceSoft, color: brand.colors.muted, fontWeight: 700 }} />
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ─── Judge: Scoring Queue ─────────────────────────────────────────────────────
export function JudgeScoringQueuePanel() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scoreTarget, setScoreTarget] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [scoredIds, setScoredIds] = useState(new Set());

  useEffect(() => {
    let mounted = true;
    http.get("/api/judge/submissions")
      .then((r) => { if (mounted) setSubmissions(r.data?.data || []); })
      .catch((err) => { if (mounted) setError(err?.response?.data?.message || "Failed to load scoring queue"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const openScoring = async (submission) => {
    setScoreTarget(submission);
    if (!submission.roundId) return;
    setLoadingCriteria(true);
    try {
      const r = await http.get(`/api/rounds/${submission.roundId}/criteria`);
      setCriteria(r.data?.data || []);
    } catch {
      setCriteria([]);
    } finally {
      setLoadingCriteria(false);
    }
  };

  const handleScored = (submissionId) => {
    setScoredIds((prev) => new Set([...prev, submissionId]));
  };

  const pendingSubmissions = submissions.filter((s) => !scoredIds.has(s.submissionId));
  const scoredSubmissions = submissions.filter((s) => scoredIds.has(s.submissionId));

  return (
    <Box>
      <ModulePageHeader
        eyebrow="Your Work"
        title="Scoring Queue"
        description="Submissions assigned to you for scoring. Click a submission to score it."
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: brand.colors.orange }} />
        </Box>
      ) : submissions.length === 0 ? (
        <Box className="ms-empty">
          <AssignmentTurnedInRoundedIcon sx={{ fontSize: 40, color: brand.colors.muted, mb: 1 }} />
          <Typography fontWeight={800}>No submissions to score</Typography>
          <Typography color="text.secondary" variant="body2">
            Submissions will appear here once teams submit their work for your assigned rounds.
          </Typography>
        </Box>
      ) : (
        <>
          {pendingSubmissions.length > 0 ? (
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ color: brand.colors.text, fontWeight: 900, mb: 1.2, fontSize: 15 }}>
                Pending ({pendingSubmissions.length})
              </Typography>
              <Stack spacing={1.2}>
                {pendingSubmissions.map((s) => (
                  <Box key={s.submissionId}
                    sx={{ p: 2, borderRadius: brand.radius.lg, border: `1px solid ${brand.colors.line}`, bgcolor: brand.colors.surface }}>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5}>
                      <Box minWidth={0}>
                        <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>{s.teamName}</Typography>
                        <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                          {s.roundName} · {new Date(s.scoredAt || Date.now()).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button size="small" variant="contained"
                          onClick={() => openScoring(s)}
                          sx={{ bgcolor: brand.colors.orange, "&:hover": { bgcolor: brand.colors.orangeDark }, borderRadius: 999 }}>
                          Score
                        </Button>
                      </Stack>
                    </Stack>
                    <GitMetadataCard submissionId={s.submissionId} repositoryUrl={null} />
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : null}

          {scoredSubmissions.length > 0 ? (
            <Box>
              <Typography sx={{ color: brand.colors.muted, fontWeight: 900, mb: 1.2, fontSize: 15 }}>
                Scored this session ({scoredSubmissions.length})
              </Typography>
              <Stack spacing={1}>
                {scoredSubmissions.map((s) => (
                  <Box key={s.submissionId}
                    sx={{ p: 1.8, borderRadius: brand.radius.lg, border: `1px solid ${brand.colors.line}`, bgcolor: "#F0FDF4", opacity: 0.85 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography sx={{ color: brand.colors.text, fontWeight: 800 }}>{s.teamName}</Typography>
                        <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>{s.roundName}</Typography>
                      </Box>
                      <Chip size="small" label="Scored" color="success" />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : null}
        </>
      )}

      <ScoreSubmitDialog
        submission={scoreTarget}
        criteria={loadingCriteria ? [] : criteria}
        open={Boolean(scoreTarget)}
        onClose={() => setScoreTarget(null)}
        onScored={handleScored}
      />
    </Box>
  );
}

// ─── Mentor: Assigned Tracks ──────────────────────────────────────────────────
export function MentorTracksPanel() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    http.get("/api/mentor/tracks")
      .then((r) => { if (mounted) setTracks(r.data?.data || []); })
      .catch((err) => { if (mounted) setError(err?.response?.data?.message || "Failed to load tracks"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <Box>
      <ModulePageHeader
        eyebrow="Your Work"
        title="Mentor Tracks"
        description="Tracks you have been assigned to mentor."
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: brand.colors.orange }} />
        </Box>
      ) : tracks.length === 0 ? (
        <Box className="ms-empty">
          <Typography fontWeight={800}>No assigned tracks yet</Typography>
          <Typography color="text.secondary" variant="body2">
            Assigned tracks will appear here after the Event Coordinator maps you to a track.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {tracks.map((t) => (
            <Box key={t.trackMentorId}
              sx={{ p: 2.2, borderRadius: brand.radius.lg, border: `1px solid ${brand.colors.line}`, bgcolor: brand.colors.surface, boxShadow: brand.shadow.sm }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
                <Box>
                  <Typography sx={{ color: brand.colors.text, fontWeight: 900, fontSize: 16 }}>{t.trackName}</Typography>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                    {t.eventName}
                    {t.specialization ? ` · ${t.specialization}` : ""}
                  </Typography>
                </Box>
                <Chip size="small" label={`Assigned ${formatDate(t.assignedAt)}`}
                  sx={{ bgcolor: "#EFF6FF", color: "#3B82F6", fontWeight: 800 }} />
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
