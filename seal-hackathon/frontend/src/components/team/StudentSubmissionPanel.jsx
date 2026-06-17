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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useSearchParams } from "react-router-dom";
import { getApiErrorMessage, http } from "../../api/http";
import CenteredNotification from "../layout/CenteredNotification";
import ModulePageHeader from "../layout/ModulePageHeader";
import "./team-management.css";

const INITIAL_SUBMISSION_FORM = { roundId: "", repositoryUrl: "", demoUrl: "", slideUrl: "" };

function formatDateTime(value) {
  if (!value) return "Deadline pending";
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

function isHttpUrl(value) {
  if (!value?.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isGitRepositoryUrl(value) {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    return (url.protocol === "http:" || url.protocol === "https:")
      && (host === "github.com" || host === "gitlab.com")
      && segments.length >= 2;
  } catch {
    return false;
  }
}

export default function StudentSubmissionPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTeamId = searchParams.get("teamId");

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionRounds, setSubmissionRounds] = useState([]);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [submissionForm, setSubmissionForm] = useState(INITIAL_SUBMISSION_FORM);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const registeredTeams = useMemo(
    () => teams.filter((team) => team.eventId),
    [teams]
  );

  const closeNotification = () => {
    setError("");
    setSuccess("");
  };

  const fetchTeamWorkspace = async (teamId, availableTeams = registeredTeams) => {
    if (!teamId) {
      setSelectedTeam(null);
      setSubmissions([]);
      setSubmissionRounds([]);
      setSubmissionFeedback([]);
      return;
    }

    const ownedTeam = availableTeams.find((team) => String(team.teamId) === String(teamId));
    if (!ownedTeam) {
      setSelectedTeam(null);
      setSubmissions([]);
      setSubmissionRounds([]);
      setSubmissionFeedback([]);
      setSearchParams({ section: "submissions" }, { replace: true });
      return;
    }

    try {
      const [teamResponse, submissionResponse, roundResponse] = await Promise.all([
        http.get(`/api/teams/${teamId}`),
        http.get(`/api/teams/${teamId}/submissions`),
        http.get(`/api/teams/${teamId}/submission-rounds`),
      ]);
      setSelectedTeam(teamResponse.data?.data || null);
      setSubmissions(submissionResponse.data?.data || []);
      setSubmissionRounds(roundResponse.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load submission workspace"));
      setSelectedTeam(null);
      setSubmissions([]);
      setSubmissionRounds([]);
      setSubmissionFeedback([]);
    }
  };

  const loadWorkspace = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await http.get("/api/teams/my");
      const nextTeams = response.data?.data || [];
      setTeams(nextTeams);
      const registered = nextTeams.filter((team) => team.eventId);
      if (selectedTeamId && registered.some((team) => String(team.teamId) === String(selectedTeamId))) {
        await fetchTeamWorkspace(selectedTeamId, registered);
      } else {
        setSelectedTeam(null);
        setSubmissions([]);
        setSubmissionRounds([]);
        setSubmissionFeedback([]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load submission workspace"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const openTeam = (teamId) => {
    setSearchParams({ section: "submissions", teamId: String(teamId) });
    fetchTeamWorkspace(teamId, registeredTeams);
  };

  const backToSubmissionList = () => {
    setSearchParams({ section: "submissions" });
    setSelectedTeam(null);
    setSubmissions([]);
    setSubmissionRounds([]);
    setSubmissionFeedback([]);
  };

  const closeSubmissionDialog = () => {
    if (saving) return;
    setSubmissionDialogOpen(false);
    setSubmissionForm(INITIAL_SUBMISSION_FORM);
    setEditingSubmission(null);
  };

  const openSubmissionDialog = (round, submission = null) => {
    setError("");
    setEditingSubmission(submission);
    setSubmissionForm({
      roundId: String(round?.roundId || submission?.roundId || ""),
      repositoryUrl: submission?.repositoryUrl || "",
      demoUrl: submission?.demoUrl || "",
      slideUrl: submission?.slideUrl || "",
    });
    setSubmissionDialogOpen(true);
  };

  const submitSubmission = async () => {
    const repositoryUrl = submissionForm.repositoryUrl.trim();
    const demoUrl = submissionForm.demoUrl.trim();
    const slideUrl = submissionForm.slideUrl.trim();
    if (!repositoryUrl) {
      setError("Repository URL is required.");
      return;
    }
    if (!isGitRepositoryUrl(repositoryUrl)) {
      setError("Repository URL must be a valid GitHub or GitLab repository link.");
      return;
    }
    if (![repositoryUrl, demoUrl, slideUrl].every(isHttpUrl)) {
      setError("Submission links must be valid http or https URLs.");
      return;
    }
    if (!selectedTeam) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      repositoryUrl,
      demoUrl: demoUrl || null,
      slideUrl: slideUrl || null,
    };

    try {
      if (editingSubmission) {
        await http.put(`/api/submissions/${editingSubmission.submissionId}`, payload);
        setSuccess("Submission updated and history recorded.");
      } else {
        await http.post(`/api/teams/${selectedTeam.teamId}/rounds/${submissionForm.roundId}/submission`, payload);
        setSuccess("Submission created.");
      }
      closeSubmissionDialog();
      await fetchTeamWorkspace(selectedTeam.teamId, registeredTeams);
      await loadWorkspace();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save submission"));
    } finally {
      setSaving(false);
    }
  };

  const openHistoryDialog = async (submission) => {
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    setSubmissionHistory([]);
    try {
      const response = await http.get(`/api/submissions/${submission.submissionId}/history`);
      setSubmissionHistory(response.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load submission history"));
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistoryDialog = () => {
    setHistoryDialogOpen(false);
    setSubmissionHistory([]);
  };

  const openFeedbackDialog = async (submission) => {
    setFeedbackDialogOpen(true);
    setFeedbackLoading(true);
    setSubmissionFeedback([]);
    try {
      const response = await http.get(`/api/submissions/${submission.submissionId}/feedback`);
      setSubmissionFeedback(response.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load submission feedback"));
    } finally {
      setFeedbackLoading(false);
    }
  };

  const closeFeedbackDialog = () => {
    setFeedbackDialogOpen(false);
    setSubmissionFeedback([]);
  };

  const renderSubmissionPanel = () => (
    <Card className="ms-data-card team-submission-card">
      <CardContent>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Submission Management</Typography>
            <Typography color="text.secondary">
              Submit repository, demo, and slide links by round. Updates are recorded in submission history.
            </Typography>
          </Box>
          <Chip icon={<AssignmentTurnedInRoundedIcon />} label={`${submissions.length} submission(s)`} variant="outlined" />
        </Stack>

        {submissionRounds.length === 0 ? (
          <Box className="ms-empty">
            <Typography fontWeight={700}>No configured rounds</Typography>
            <Typography color="text.secondary" variant="body2">
              Submission rounds will appear after the coordinator configures the event timeline.
            </Typography>
          </Box>
        ) : (
          <Box className="team-submission-grid">
            {submissionRounds.map((round) => {
              const existing = submissions.find((submission) => submission.submissionId === round.submissionId);
              const canSubmit = selectedTeam?.currentUserLeader && round.editable;
              return (
                <Box className="team-submission-round" key={round.roundId}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip label={`Round ${round.roundOrder}`} size="small" />
                        <Typography sx={{ fontWeight: 800 }}>{round.roundName}</Typography>
                      </Stack>
                      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                        Deadline: {formatDateTime(round.submissionDeadline)}
                      </Typography>
                    </Box>
                    <Chip
                      color={round.submitted ? "success" : round.editable ? "warning" : "default"}
                      label={round.submitted ? round.submissionStatus : round.editable ? "Open" : "Locked"}
                      size="small"
                      variant={round.submitted ? "filled" : "outlined"}
                    />
                  </Stack>

                  {existing ? (
                    <Box className="team-submission-links">
                      <a href={existing.repositoryUrl} target="_blank" rel="noreferrer">Repository</a>
                      {existing.demoUrl ? <a href={existing.demoUrl} target="_blank" rel="noreferrer">Demo</a> : null}
                      {existing.slideUrl ? <a href={existing.slideUrl} target="_blank" rel="noreferrer">Slides</a> : null}
                    </Box>
                  ) : (
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1.5 }}>
                      No submission has been created for this round.
                    </Typography>
                  )}

                  {round.blockedReason ? (
                    <Typography className="team-submission-note" color="text.secondary">
                      {round.blockedReason}
                    </Typography>
                  ) : null}

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                    {existing ? (
                      <>
                        <Button
                          disabled={!canSubmit}
                          size="small"
                          variant="outlined"
                          onClick={() => openSubmissionDialog(round, existing)}
                        >
                          Update
                        </Button>
                        <Button
                          size="small"
                          startIcon={<HistoryRoundedIcon />}
                          onClick={() => openHistoryDialog(existing)}
                        >
                          History
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openFeedbackDialog(existing)}
                        >
                          Feedback
                        </Button>
                      </>
                    ) : (
                      <Button
                        disabled={!canSubmit}
                        size="small"
                        variant="contained"
                        startIcon={<AssignmentTurnedInRoundedIcon />}
                        onClick={() => openSubmissionDialog(round)}
                      >
                        Submit
                      </Button>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box className="team-loading">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="team-workspace">
      <CenteredNotification
        message={error || success}
        severity={error ? "error" : "success"}
        autoHideDuration={error ? 5500 : 3500}
        onClose={closeNotification}
      />

      <ModulePageHeader
        eyebrow="Submission Workspace"
        title={selectedTeam ? `${selectedTeam.teamName} submissions` : "Submissions"}
        description={
          selectedTeam
            ? `Submit or update delivery links for ${selectedTeam.teamName} in ${selectedTeam.eventName}.`
            : "Choose a team-event workspace first. Submission details only open after you enter a specific team."
        }
        actions={(
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedTeam ? (
              <Button startIcon={<ArrowBackRoundedIcon />} onClick={backToSubmissionList}>
                Back to submission list
              </Button>
            ) : null}
            <Button startIcon={<RefreshRoundedIcon />} onClick={loadWorkspace} variant="outlined">
              Refresh
            </Button>
          </Stack>
        )}
      />

      {registeredTeams.length === 0 ? (
        <Box className="ms-empty">
          <Typography fontWeight={800}>No registered teams yet</Typography>
          <Typography color="text.secondary" variant="body2">
            Register a ready team into an event first. Submission rounds will appear here after that.
          </Typography>
        </Box>
      ) : selectedTeam ? (
        <Stack spacing={2}>
          <Card className="ms-data-card">
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedTeam.teamName}</Typography>
                  <Typography color="text.secondary">{selectedTeam.eventName}</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={selectedTeam.trackName || "Track pending"} variant="outlined" />
                  <Chip label={selectedTeam.currentUserLeader ? "Leader access" : "Member view"} variant="outlined" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {renderSubmissionPanel()}
        </Stack>
      ) : (
        <Box className="team-grid">
            {registeredTeams.map((team) => {
              return (
                <Card
                  key={team.teamId}
                  className="team-card"
                >
                  <Box className="team-card-head">
                    <Box className="team-card-title">
                      <Box className="team-card-icon"><GroupsRoundedIcon fontSize="small" /></Box>
                      <Box>
                        <Typography variant="h6">{team.teamName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {team.eventName}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip size="small" label={team.currentUserLeader ? "Leader" : "Member"} />
                  </Box>
                  <Box className="team-card-body">
                    <div><span>Track</span><strong>{team.trackName || "Track pending"}</strong></div>
                    <div><span>Members</span><strong>{team.memberCount ?? (team.members || []).length ?? 0} / 5</strong></div>
                    <div><span>Role</span><strong>{team.currentUserLeader ? "Leader" : "Member"}</strong></div>
                  </Box>
                  <Stack className="team-actions" direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      variant="contained"
                      endIcon={<OpenInNewRoundedIcon />}
                      onClick={() => openTeam(team.teamId)}
                    >
                      Open submission workspace
                    </Button>
                  </Stack>
                </Card>
              );
            })}
        </Box>
      )}

      <Dialog open={submissionDialogOpen} onClose={closeSubmissionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSubmission ? "Update Submission" : "Create Submission"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField
              select
              disabled={Boolean(editingSubmission)}
              label="Round"
              value={submissionForm.roundId}
              onChange={(event) => setSubmissionForm({ ...submissionForm, roundId: event.target.value })}
              fullWidth
            >
              {submissionRounds.map((round) => (
                <MenuItem key={round.roundId} value={String(round.roundId)} disabled={!round.editable && !round.submitted}>
                  Round {round.roundOrder} - {round.roundName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              label="Repository URL"
              placeholder="https://github.com/organization/project"
              value={submissionForm.repositoryUrl}
              onChange={(event) => setSubmissionForm({ ...submissionForm, repositoryUrl: event.target.value })}
              error={Boolean(submissionForm.repositoryUrl) && !isGitRepositoryUrl(submissionForm.repositoryUrl)}
              helperText="Required. GitHub/GitLab repository link."
              fullWidth
            />
            <TextField
              label="Demo URL"
              placeholder="https://demo.example.com"
              value={submissionForm.demoUrl}
              onChange={(event) => setSubmissionForm({ ...submissionForm, demoUrl: event.target.value })}
              error={Boolean(submissionForm.demoUrl) && !isHttpUrl(submissionForm.demoUrl)}
              helperText="Optional. Product demo, deployed app, or video link."
              fullWidth
            />
            <TextField
              label="Slide / Report URL"
              placeholder="https://docs.google.com/presentation/d/..."
              value={submissionForm.slideUrl}
              onChange={(event) => setSubmissionForm({ ...submissionForm, slideUrl: event.target.value })}
              error={Boolean(submissionForm.slideUrl) && !isHttpUrl(submissionForm.slideUrl)}
              helperText="Optional. Slide deck or report link."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSubmissionDialog}>Cancel</Button>
          <Button
            disabled={saving || !submissionForm.roundId || !submissionForm.repositoryUrl.trim()}
            onClick={submitSubmission}
            variant="contained"
          >
            {saving ? "Saving..." : editingSubmission ? "Update Submission" : "Create Submission"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyDialogOpen} onClose={closeHistoryDialog} maxWidth="md" fullWidth>
        <DialogTitle>Submission History</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box className="team-loading"><CircularProgress /></Box>
          ) : (
            <Box className="team-table-scroll">
              <table className="MuiTable-root">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Changed by</th>
                    <th>Repository</th>
                    <th>Changed at</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No history recorded.</td>
                    </tr>
                  ) : submissionHistory.map((item) => (
                    <tr key={item.historyId}>
                      <td>{item.actionType}</td>
                      <td>{item.changedByName || "System"}</td>
                      <td>
                        {item.oldRepositoryUrl ? `Old: ${item.oldRepositoryUrl} | ` : ""}
                        New: {item.newRepositoryUrl || "N/A"}
                      </td>
                      <td>{formatDateTime(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeHistoryDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={feedbackDialogOpen} onClose={closeFeedbackDialog} maxWidth="md" fullWidth>
        <DialogTitle>Submission Feedback</DialogTitle>
        <DialogContent>
          {feedbackLoading ? (
            <Box className="team-loading"><CircularProgress /></Box>
          ) : (
            <Stack spacing={1.2}>
              {submissionFeedback.length === 0 ? (
                <Box className="ms-empty">
                  <Typography fontWeight={700}>No feedback yet.</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Judge and mentor feedback will appear here after it is submitted.
                  </Typography>
                </Box>
              ) : submissionFeedback.map((item) => (
                <Box key={item.feedbackId} className="team-submission-round">
                  <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                    <Typography fontWeight={800}>{item.authorName || "Unknown"}</Typography>
                    <Chip size="small" label={item.authorRole || "Feedback"} />
                  </Stack>
                  <Typography sx={{ whiteSpace: "pre-wrap", mt: 1 }}>{item.feedbackText}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(item.createdAt)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFeedbackDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
