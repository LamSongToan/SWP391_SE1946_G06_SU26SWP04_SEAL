import { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Avatar,
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
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExitToAppRoundedIcon from "@mui/icons-material/ExitToAppRounded";
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { useSearchParams } from "react-router-dom";
import { getApiErrorMessage, http, resolveAssetUrl } from "../../api/http";
import CenteredNotification from "../layout/CenteredNotification";
import ConfirmActionDialog from "../layout/ConfirmActionDialog";
import ModulePageHeader from "../layout/ModulePageHeader";
import "./team-management.css";

const INITIAL_CREATE_FORM = { teamName: "" };
const INITIAL_SUBMISSION_FORM = { roundId: "", repositoryUrl: "", demoUrl: "", slideUrl: "" };

function getTeamHealth(team = {}) {
  return {
    members: `${team.memberCount ?? (team.members || []).length ?? 0} / 5`,
    submission: team.submissionStatus || team.latestSubmissionStatus || "Not submitted",
    round: team.currentRoundName || team.roundName || "Round pending",
    deadline: team.nextDeadline || team.submissionDeadline || "Deadline pending",
  };
}

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

export default function TeamManagementPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTeamId = searchParams.get("teamId");

  const [teams, setTeams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamInvitations, setTeamInvitations] = useState([]);
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteCandidates, setInviteCandidates] = useState([]);
  const [inviteSelection, setInviteSelection] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [confirmation, setConfirmation] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmColor: "primary",
  });
  const confirmationResolver = useRef(null);

  const pendingInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === "Pending"),
    [invitations]
  );

  const readyTeams = useMemo(
    () => teams.filter((team) => team.membershipValid).length,
    [teams]
  );

  const selectedTeamMemberKeys = useMemo(
    () => new Set((selectedTeam?.members || []).flatMap((member) => [
      member.username?.toLowerCase(),
      member.email?.toLowerCase(),
    ]).filter(Boolean)),
    [selectedTeam]
  );

  const visibleInviteCandidates = useMemo(
    () => inviteCandidates.filter((user) => {
      const roles = user.roles || [];
      return roles.includes("STUDENT")
        && user.username?.toLowerCase().includes(inviteQuery.trim().toLowerCase())
        && !selectedTeamMemberKeys.has(user.username?.toLowerCase())
        && !selectedTeamMemberKeys.has(user.email?.toLowerCase());
    }),
    [inviteCandidates, inviteQuery, selectedTeamMemberKeys]
  );

  const closeNotification = () => {
    setError("");
    setSuccess("");
  };

  const requestConfirmation = (options) => new Promise((resolve) => {
    confirmationResolver.current = resolve;
    setConfirmation({
      open: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel || "Confirm",
      confirmColor: options.confirmColor || "primary",
    });
  });

  const closeConfirmation = (confirmed) => {
    setConfirmation((current) => ({ ...current, open: false }));
    const resolve = confirmationResolver.current;
    confirmationResolver.current = null;
    resolve?.(confirmed);
  };

  const fetchSelectedTeam = async (teamId) => {
    if (!teamId) {
      setSelectedTeam(null);
      setTeamInvitations([]);
      setSubmissions([]);
      setSubmissionRounds([]);
      setSubmissionFeedback([]);
      return;
    }

    const ownedTeam = teams.find((team) => String(team.teamId) === String(teamId));
    try {
      const teamResponse = await http.get(`/api/teams/${teamId}`);
      const nextTeam = teamResponse.data?.data || null;
      const [invitationResponse, submissionResponse, roundResponse] = await Promise.all([
        ownedTeam?.currentUserLeader
          ? http.get(`/api/teams/${teamId}/invitations`)
          : Promise.resolve({ data: { data: [] } }),
        nextTeam?.eventId
          ? http.get(`/api/teams/${teamId}/submissions`)
          : Promise.resolve({ data: { data: [] } }),
        nextTeam?.eventId
          ? http.get(`/api/teams/${teamId}/submission-rounds`)
          : Promise.resolve({ data: { data: [] } }),
      ]);
      setSelectedTeam(nextTeam);
      setTeamInvitations(invitationResponse.data?.data || []);
      setSubmissions(submissionResponse.data?.data || []);
      setSubmissionRounds(roundResponse.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load team details"));
      setSelectedTeam(null);
      setTeamInvitations([]);
      setSubmissions([]);
      setSubmissionRounds([]);
      setSubmissionFeedback([]);
      setSearchParams({ section: "teams" }, { replace: true });
    }
  };

  const loadWorkspace = async ({ preserveDetail = true } = {}) => {
    setLoading(true);
    setError("");
    try {
      const [teamResponse, invitationResponse] = await Promise.all([
        http.get("/api/teams/my"),
        http.get("/api/team-invitations/my"),
      ]);
      const nextTeams = teamResponse.data?.data || [];
      setTeams(nextTeams);
      setInvitations(invitationResponse.data?.data || []);

      const teamId = preserveDetail ? selectedTeamId : null;
      if (teamId && nextTeams.some((team) => String(team.teamId) === String(teamId))) {
        await fetchSelectedTeam(teamId);
      } else {
        setSelectedTeam(null);
        setTeamInvitations([]);
        setSubmissions([]);
        setSubmissionRounds([]);
        if (teamId) {
          setSearchParams({ section: "teams" }, { replace: true });
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load team workspace"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  useEffect(() => {
    if (!selectedTeamId || loading) return;
    if (teams.some((team) => String(team.teamId) === String(selectedTeamId))) {
      fetchSelectedTeam(selectedTeamId);
    }
  }, [loading, selectedTeamId, teams]);

  useEffect(() => {
    if (!selectedTeamId) {
      setSelectedTeam(null);
      setTeamInvitations([]);
      setSubmissions([]);
      setSubmissionRounds([]);
      setSubmissionFeedback([]);
      setInviteQuery("");
      setInviteSelection(null);
      setInviteCandidates([]);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedTeam?.currentUserLeader || !selectedTeamId) {
      setInviteCandidates([]);
      setInviteLoading(false);
      return;
    }

    const normalizedQuery = inviteQuery.trim();
    if (!normalizedQuery) {
      setInviteCandidates([]);
      setInviteLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setInviteLoading(true);
      try {
        const response = await http.get("/api/users/directory", {
          params: { query: normalizedQuery },
        });
        setInviteCandidates(response.data?.data || []);
      } catch {
        setInviteCandidates([]);
      } finally {
        setInviteLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [inviteQuery, selectedTeam?.currentUserLeader, selectedTeamId]);

  const refreshOnlySelectedTeam = async (teamId) => {
    if (!teamId) return;
    await fetchSelectedTeam(teamId);
  };

  const closeCreateDialog = () => {
    if (saving) return;
    setCreateDialogOpen(false);
    setCreateForm(INITIAL_CREATE_FORM);
  };

  const openCreate = () => {
    setCreateDialogOpen(true);
    setCreateForm(INITIAL_CREATE_FORM);
  };

  const openTeam = (teamId) => {
    setSearchParams({ section: "teams", teamId: String(teamId) });
  };

  const backToTeamList = () => {
    setSearchParams({ section: "teams" });
  };

  const refreshAfterTeamMutation = async (message, options = {}) => {
    setSuccess(message);
    setInviteQuery("");
    setInviteSelection(null);
    setInviteCandidates([]);
    await loadWorkspace({ preserveDetail: options.preserveDetail ?? true });
  };

  const submitCreate = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await http.post("/api/teams", {
        teamName: createForm.teamName,
      });
      closeCreateDialog();
      setSuccess("Team created. Invite 3 to 5 students first, then register this team in Event Registration.");
      await loadWorkspace({ preserveDetail: false });
      const createdTeamId = response.data?.data?.teamId;
      if (createdTeamId) {
        setSearchParams({ section: "teams", teamId: String(createdTeamId) });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create team"));
    } finally {
      setSaving(false);
    }
  };

  const submitInvite = async () => {
    if (!selectedTeam || !inviteSelection) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await http.post(`/api/teams/${selectedTeam.teamId}/invitations`, {
        identifier: inviteSelection.email || inviteSelection.username,
      });
      setInviteQuery("");
      setInviteSelection(null);
      setInviteCandidates([]);
      setSuccess("Invitation sent.");
      await refreshOnlySelectedTeam(selectedTeam.teamId);
      await loadWorkspace();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to invite student"));
    } finally {
      setSaving(false);
    }
  };

  const processInvitation = async (invitationId, action) => {
    setError("");
    setSuccess("");
    try {
      await http.post(`/api/team-invitations/${invitationId}/${action}`);
      setSuccess(action === "accept" ? "Invitation accepted." : "Invitation rejected.");
      await loadWorkspace();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to process invitation"));
    }
  };

  const removeMember = async (teamId, userRoleId) => {
    const confirmed = await requestConfirmation({
      title: "Remove team member?",
      message: "This member will lose access to the team workspace.",
      confirmLabel: "Remove",
      confirmColor: "error",
    });
    if (!confirmed) return;
    setError("");
    try {
      await http.delete(`/api/teams/${teamId}/members/${userRoleId}`);
      setSuccess("Team member removed.");
      await loadWorkspace();
      await refreshOnlySelectedTeam(teamId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to remove team member"));
    }
  };

  const leaveTeam = async (team) => {
    if (team.currentUserLeader) {
      setError("Transfer team leadership to another member before leaving.");
      return;
    }
    const confirmed = await requestConfirmation({
      title: `Leave ${team.teamName}?`,
      message: "You will leave this team and lose access to its workspace.",
      confirmLabel: "Leave",
      confirmColor: "error",
    });
    if (!confirmed) return;
    setError("");
    try {
      await http.delete(`/api/teams/${team.teamId}/members/me`);
      if (String(selectedTeamId) === String(team.teamId)) {
        setSearchParams({ section: "teams" });
      }
      await refreshAfterTeamMutation("You left the team.", { preserveDetail: false });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to leave team"));
    }
  };

  const disbandTeam = async (team) => {
    const firstConfirmation = await requestConfirmation({
      title: `Disband ${team.teamName}?`,
      message: "All members will be removed from this team.",
      confirmLabel: "Continue",
      confirmColor: "error",
    });
    if (!firstConfirmation) return;
    const finalConfirmation = await requestConfirmation({
      title: "Confirm team disbandment",
      message: `This permanently disbands ${team.teamName}. This action cannot be undone.`,
      confirmLabel: "Disband",
      confirmColor: "error",
    });
    if (!finalConfirmation) return;
    setError("");
    try {
      await http.delete(`/api/teams/${team.teamId}`);
      if (String(selectedTeamId) === String(team.teamId)) {
        setSearchParams({ section: "teams" });
      }
      await refreshAfterTeamMutation("Team disbanded.", { preserveDetail: false });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to disband team"));
    }
  };

  const transferLeadership = async (team, member) => {
    const firstConfirmation = await requestConfirmation({
      title: "Transfer team leadership?",
      message: `${member.fullName} will receive the Team Leader role.`,
      confirmLabel: "Continue",
    });
    if (!firstConfirmation) return;
    const finalConfirmation = await requestConfirmation({
      title: "Confirm leadership transfer",
      message: `${member.fullName} will become Team Leader and you will become a regular member.`,
      confirmLabel: "Transfer",
    });
    if (!finalConfirmation) return;
    setError("");
    try {
      await http.patch(`/api/teams/${team.teamId}/leader/${member.userRoleId}`);
      setSuccess("Team leadership transferred.");
      await loadWorkspace();
      await refreshOnlySelectedTeam(team.teamId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to transfer team leadership"));
    }
  };

  const cancelInvitation = async (teamId, invitationId) => {
    setError("");
    try {
      await http.post(`/api/teams/${teamId}/invitations/${invitationId}/cancel`);
      setSuccess("Invitation cancelled.");
      await refreshOnlySelectedTeam(teamId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to cancel invitation"));
    }
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
        await http.post(
          `/api/teams/${selectedTeam.teamId}/rounds/${submissionForm.roundId}/submission`,
          payload
        );
        setSuccess("Submission created.");
      }
      closeSubmissionDialog();
      await loadWorkspace();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save submission"));
    } finally {
      setSaving(false);
    }
  };

  const openHistoryDialog = async (submission) => {
    if (!submission?.submissionId) return;
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    setSubmissionHistory([]);
    setError("");
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
    if (!submission?.submissionId) return;
    setFeedbackDialogOpen(true);
    setFeedbackLoading(true);
    setSubmissionFeedback([]);
    try {
      const response = await http.get(`/api/submissions/${submission.submissionId}/feedback`);
      setSubmissionFeedback(response.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load feedback"));
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
              const canSubmit = selectedTeam.currentUserLeader && round.editable;
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

  const renderTeamList = () => (
    <>
      <ModulePageHeader
        eyebrow="Team Workspace"
        title="My Teams"
        description="Manage your current teams and invitations here. Submission delivery now lives in the separate Submissions module."
        actions={(
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<RefreshRoundedIcon />} onClick={() => loadWorkspace()} variant="outlined">
              Refresh
            </Button>
            <Button startIcon={<AddRoundedIcon />} onClick={openCreate} variant="contained">
              Create Team
            </Button>
          </Stack>
        )}
      />

      <Box className="team-invitation-head">
        <Box>
          <Typography variant="h6">Pending Invitations</Typography>
          <Typography color="text.secondary" variant="body2">
            Review invitations first, then open a team only when you are ready to join it.
          </Typography>
        </Box>
        <Chip icon={<MailOutlineRoundedIcon />} label={`${pendingInvitations.length} pending`} variant="outlined" />
      </Box>

      <Card className="ms-data-card" sx={{ mb: 2.5 }}>
        <Box className="team-table-scroll">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Team</TableCell>
                <TableCell>Event / Track</TableCell>
                <TableCell>Invited by</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No invitations.</TableCell>
                </TableRow>
              ) : invitations.map((invitation) => (
                <TableRow key={invitation.invitationId}>
                  <TableCell>{invitation.teamName}</TableCell>
                  <TableCell>{invitation.eventName} / {invitation.trackName}</TableCell>
                  <TableCell>{invitation.invitedByName}</TableCell>
                  <TableCell><Chip label={invitation.status} size="small" variant="outlined" /></TableCell>
                  <TableCell align="right">
                    {invitation.status === "Pending" ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => processInvitation(invitation.invitationId, "reject")}>
                          Reject
                        </Button>
                        <Button size="small" variant="contained" onClick={() => processInvitation(invitation.invitationId, "accept")}>
                          Accept
                        </Button>
                      </Stack>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <Box className="team-summary-strip">
        <Card className="team-summary-card">
          <Typography className="team-summary-label">Active teams</Typography>
          <Typography className="team-summary-value">{teams.length}</Typography>
        </Card>
        <Card className="team-summary-card">
          <Typography className="team-summary-label">Ready teams</Typography>
          <Typography className="team-summary-value">{readyTeams}</Typography>
        </Card>
      </Box>

      <Box className="team-grid">
        {teams.map((team) => (
          <Card className="team-card" key={team.teamId}>
            <Box className="team-card-head">
              <Box className="team-card-title">
                <Box className="team-card-icon"><GroupsRoundedIcon fontSize="small" /></Box>
                <Box>
                  <Typography variant="h6">{team.teamName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {team.eventName || "Not registered in any event yet"}
                  </Typography>
                </Box>
              </Box>
              <Chip
                color={team.membershipValid ? "success" : "warning"}
                label={team.membershipValid ? "Ready" : "Forming"}
                size="small"
              />
            </Box>
            <Divider />
            <Box className="team-card-body">
              <div><span>Event</span><strong>{team.eventName || "Not registered yet"}</strong></div>
              <div><span>Track</span><strong>{team.trackName || "Pending event registration"}</strong></div>
              <div><span>Team Leader</span><strong>{team.leaderName}</strong></div>
              <div><span>Members</span><strong>{getTeamHealth(team).members}</strong></div>
            </Box>
            <Typography className="team-validation" color={team.membershipValid ? "success.main" : "warning.main"}>
              {team.validationMessage}
            </Typography>
            <Stack className="team-actions" direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="outlined" endIcon={<OpenInNewRoundedIcon />} onClick={() => openTeam(team.teamId)}>
                Open Team
              </Button>
              <Button
                color="error"
                size="small"
                startIcon={<ExitToAppRoundedIcon />}
                onClick={() => leaveTeam(team)}
              >
                Leave
              </Button>
              {team.currentUserLeader ? (
                <Button
                  color="error"
                  disabled={!team.deletable}
                  size="small"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  title={team.deletable ? "Disband team" : "A team with submissions cannot be disbanded"}
                  onClick={() => disbandTeam(team)}
                >
                  Disband
                </Button>
              ) : null}
            </Stack>
          </Card>
        ))}
      </Box>

      {teams.length === 0 ? (
        <Box className="ms-empty">
          <Typography fontWeight={700}>No team yet</Typography>
          <Typography color="text.secondary" variant="body2">
            Create your first team here, then register it into an event from the Event Registration module.
          </Typography>
        </Box>
      ) : null}

    </>
  );

  const renderTeamDetail = () => {
    if (!selectedTeam) {
      return (
        <Box className="team-loading">
          <CircularProgress />
        </Box>
      );
    }
    const teamHealth = getTeamHealth(selectedTeam);

    return (
      <Stack spacing={2}>
        <ModulePageHeader
          eyebrow="Team Workspace"
          title={selectedTeam.teamName}
          description={
            selectedTeam.eventName
              ? `${selectedTeam.eventName} / ${selectedTeam.trackName || "Track pending"}`
              : "This team has not been registered into an event yet."
          }
          actions={(
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                color={selectedTeam.membershipValid ? "success" : "warning"}
                label={selectedTeam.membershipValid ? "Ready" : "Forming"}
                size="small"
              />
              <Button startIcon={<RefreshRoundedIcon />} onClick={() => refreshOnlySelectedTeam(selectedTeam.teamId)} variant="outlined">
                Refresh Team
              </Button>
            </Stack>
          )}
        >
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={backToTeamList}>
            Back to Team List
          </Button>
        </ModulePageHeader>

        <Card className="ms-data-card">
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedTeam.teamName}</Typography>
                <Typography color="text.secondary">{selectedTeam.validationMessage}</Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Event: ${selectedTeam.eventName || "Not registered yet"}`} variant="outlined" />
                <Chip label={`Track: ${selectedTeam.trackName || "Pending registration"}`} variant="outlined" />
                <Chip label={`Members: ${teamHealth.members}`} variant="outlined" />
                <Chip label={`Leader: ${selectedTeam.leaderName}`} variant="outlined" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card className="ms-data-card">
          <CardContent>
            <Box className="ms-empty">
              <Typography fontWeight={800}>
                {selectedTeam.eventId ? "Use the Submissions module for delivery" : "Register this team into an event next"}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {selectedTeam.eventId
                  ? "This page now focuses on team members and invitations. Open the Submissions module from the sidebar when you are ready to submit."
                  : "This team is ready for member management here. Register it from the Event Registration module when you want to join an event."}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {selectedTeam.currentUserLeader ? (
          <Card className="ms-data-card">
            <CardContent>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Invite Student</Typography>
                  <Typography color="text.secondary">
                    Search approved student accounts by username, then send the invitation from here.
                  </Typography>
                </Box>
                <Autocomplete
                  fullWidth
                  options={visibleInviteCandidates}
                  value={inviteSelection}
                  onChange={(_, value) => setInviteSelection(value)}
                  inputValue={inviteQuery}
                  onInputChange={(_, value, reason) => {
                    setInviteQuery(value);
                    if (reason === "clear") {
                      setInviteSelection(null);
                    }
                  }}
                  loading={inviteLoading}
                  noOptionsText={inviteQuery.trim() ? "No eligible student found." : "Type a username to search students."}
                  getOptionLabel={(option) => option?.fullName ? `${option.fullName} (@${option.username})` : ""}
                  isOptionEqualToValue={(option, value) => option.userId === value.userId}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                        <Avatar
                          src={resolveAssetUrl(option.avatarUrl) || undefined}
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: "#e2e8f0",
                          }}
                        >
                          {(option.fullName || option.username || "S").trim().charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                            {option.fullName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            @{option.username} • {option.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}
                  renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Student username"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <SearchRoundedIcon sx={{ color: "text.secondary", mr: 1 }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {inviteLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    startIcon={<GroupAddRoundedIcon />}
                    onClick={submitInvite}
                    disabled={saving || !inviteSelection}
                  >
                    Invite to Team
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        <Card className="ms-data-card">
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Members</Typography>
            <Box className="team-table-scroll">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedTeam.members || []).map((member) => (
                    <TableRow key={member.userRoleId}>
                      <TableCell>{member.fullName}</TableCell>
                      <TableCell>@{member.username}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.leader ? "Team Leader" : "Member"}</TableCell>
                      <TableCell align="right">
                        {selectedTeam.currentUserLeader && !member.leader ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              startIcon={<SwapHorizRoundedIcon />}
                              onClick={() => transferLeadership(selectedTeam, member)}
                            >
                              Transfer leadership
                            </Button>
                            <Button
                              color="error"
                              size="small"
                              startIcon={<PersonRemoveRoundedIcon />}
                              onClick={() => removeMember(selectedTeam.teamId, member.userRoleId)}
                            >
                              Remove
                            </Button>
                          </Stack>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>

        {selectedTeam.currentUserLeader ? (
          <Card className="ms-data-card">
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.2} sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Sent Invitations</Typography>
                  <Typography color="text.secondary">
                    Pending invitation slots count toward the team size limit.
                  </Typography>
                </Box>
                <Chip icon={<MailOutlineRoundedIcon />} label={`${teamInvitations.length} total`} variant="outlined" />
              </Stack>
              <Box className="team-table-scroll">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Identifier</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teamInvitations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>No sent invitations.</TableCell>
                      </TableRow>
                    ) : teamInvitations.map((invitation) => (
                      <TableRow key={invitation.invitationId}>
                        <TableCell>{invitation.inviteeName}</TableCell>
                        <TableCell>{invitation.inviteeIdentifier}</TableCell>
                        <TableCell><Chip label={invitation.status} size="small" variant="outlined" /></TableCell>
                        <TableCell align="right">
                          {invitation.status === "Pending" ? (
                            <Button
                              color="error"
                              size="small"
                              onClick={() => cancelInvitation(selectedTeam.teamId, invitation.invitationId)}
                            >
                              Cancel
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    );
  };

  return (
    <Box className="team-workspace">
      <CenteredNotification
        message={error || success}
        severity={error ? "error" : "success"}
        autoHideDuration={error ? 5500 : 3500}
        onClose={closeNotification}
      />
      <ConfirmActionDialog
        {...confirmation}
        onCancel={() => closeConfirmation(false)}
        onConfirm={() => closeConfirmation(true)}
      />

      {loading ? (
        <Box className="team-loading"><CircularProgress /></Box>
      ) : selectedTeamId ? renderTeamDetail() : renderTeamList()}

      <Dialog open={createDialogOpen} onClose={closeCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create Team</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField
              label="Team name"
              value={createForm.teamName}
              onChange={(event) => setCreateForm({ ...createForm, teamName: event.target.value })}
              helperText="Create the team first. Event and track registration happen later in Event Registration."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateDialog}>Cancel</Button>
          <Button
            onClick={submitCreate}
            disabled={saving || !createForm.teamName.trim()}
            variant="contained"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

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
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Action</TableCell>
                    <TableCell>Changed by</TableCell>
                    <TableCell>Repository</TableCell>
                    <TableCell>Changed at</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissionHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>No history recorded.</TableCell>
                    </TableRow>
                  ) : submissionHistory.map((item) => (
                    <TableRow key={item.historyId}>
                      <TableCell><Chip label={item.actionType} size="small" /></TableCell>
                      <TableCell>{item.changedByName || "System"}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          {item.oldRepositoryUrl ? (
                            <Typography variant="body2" color="text.secondary" noWrap>
                              Old: {item.oldRepositoryUrl}
                            </Typography>
                          ) : null}
                          <Typography variant="body2" noWrap>
                            New: {item.newRepositoryUrl || "N/A"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
