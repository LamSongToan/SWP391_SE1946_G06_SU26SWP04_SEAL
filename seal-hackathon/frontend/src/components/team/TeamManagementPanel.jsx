import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
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
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExitToAppRoundedIcon from "@mui/icons-material/ExitToAppRounded";
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { getApiErrorMessage, http } from "../../api/http";
import CenteredNotification from "../layout/CenteredNotification";
import ConfirmActionDialog from "../layout/ConfirmActionDialog";
import "./team-management.css";

const INITIAL_CREATE_FORM = { eventId: "", trackId: "", teamName: "" };

export default function TeamManagementPanel() {
  const [teams, setTeams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [teamInvitations, setTeamInvitations] = useState([]);
  const [events, setEvents] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dialog, setDialog] = useState({ open: false, type: "", team: null });
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [joinCode, setJoinCode] = useState("");
  const [inviteIdentifier, setInviteIdentifier] = useState("");
  const [confirmation, setConfirmation] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmColor: "primary",
  });
  const confirmationResolver = useRef(null);

  const registrationEvents = useMemo(
    () => events.filter((event) => event.status === "RegistrationOpen"),
    [events]
  );

  const pendingInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === "Pending"),
    [invitations]
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

  const loadWorkspace = async () => {
    setLoading(true);
    setError("");
    try {
      const [teamResponse, invitationResponse, eventResponse] = await Promise.all([
        http.get("/api/teams/my"),
        http.get("/api/team-invitations/my"),
        http.get("/api/public/events/upcoming"),
      ]);
      setTeams(teamResponse.data?.data || []);
      setInvitations(invitationResponse.data?.data || []);
      setEvents(eventResponse.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load team workspace"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const closeDialog = () => {
    if (saving) return;
    setDialog({ open: false, type: "", team: null });
    setCreateForm(INITIAL_CREATE_FORM);
    setJoinCode("");
    setInviteIdentifier("");
    setTracks([]);
    setTeamInvitations([]);
  };

  const openCreate = () => {
    setDialog({ open: true, type: "create", team: null });
    setCreateForm(INITIAL_CREATE_FORM);
    setTracks([]);
  };

  const openJoin = () => {
    setDialog({ open: true, type: "join", team: null });
    setJoinCode("");
  };

  const openInvite = (team) => {
    setDialog({ open: true, type: "invite", team });
    setInviteIdentifier("");
  };

  const openDetails = async (team) => {
    setError("");
    try {
      const [teamResponse, invitationResponse] = await Promise.all([
        http.get(`/api/teams/${team.teamId}`),
        team.currentUserLeader
          ? http.get(`/api/teams/${team.teamId}/invitations`)
          : Promise.resolve({ data: { data: [] } }),
      ]);
      setTeamInvitations(invitationResponse.data?.data || []);
      setDialog({ open: true, type: "details", team: teamResponse.data?.data });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load team details"));
    }
  };

  const selectEvent = async (event) => {
    const eventId = event.target.value;
    setCreateForm((current) => ({ ...current, eventId, trackId: "" }));
    setTracks([]);
    if (!eventId) return;
    try {
      const response = await http.get(`/api/teams/events/${eventId}/tracks`);
      setTracks(response.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load categories"));
    }
  };

  const refreshAfterAction = async (message) => {
    setDialog({ open: false, type: "", team: null });
    setCreateForm(INITIAL_CREATE_FORM);
    setJoinCode("");
    setInviteIdentifier("");
    setTracks([]);
    setSuccess(message);
    await loadWorkspace();
  };

  const submitCreate = async () => {
    setSaving(true);
    setError("");
    try {
      await http.post("/api/teams", {
        trackId: Number(createForm.trackId),
        teamName: createForm.teamName,
      });
      await refreshAfterAction("Team created. Invite members until the team has 3-5 participants.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create team"));
    } finally {
      setSaving(false);
    }
  };

  const submitJoin = async () => {
    setSaving(true);
    setError("");
    try {
      await http.post("/api/teams/join", { joinCode });
      await refreshAfterAction("Joined team successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to join team"));
    } finally {
      setSaving(false);
    }
  };

  const submitInvite = async () => {
    setSaving(true);
    setError("");
    try {
      await http.post(`/api/teams/${dialog.team.teamId}/invitations`, {
        identifier: inviteIdentifier,
      });
      await refreshAfterAction("Invitation sent.");
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
      const response = await http.delete(`/api/teams/${teamId}/members/${userRoleId}`);
      setDialog({ open: true, type: "details", team: response.data?.data });
      setSuccess("Team member removed.");
      await loadWorkspace();
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
      await refreshAfterAction("You left the team.");
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
      await refreshAfterAction("Team disbanded.");
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
      const response = await http.patch(`/api/teams/${team.teamId}/leader/${member.userRoleId}`);
      setDialog({ open: true, type: "details", team: response.data?.data });
      setTeamInvitations([]);
      setSuccess("Team leadership transferred.");
      await loadWorkspace();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to transfer team leadership"));
    }
  };

  const cancelInvitation = async (teamId, invitationId) => {
    setError("");
    try {
      await http.post(`/api/teams/${teamId}/invitations/${invitationId}/cancel`);
      const response = await http.get(`/api/teams/${teamId}/invitations`);
      setTeamInvitations(response.data?.data || []);
      setSuccess("Invitation cancelled.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to cancel invitation"));
    }
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

      <Stack className="team-toolbar" direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.5}>
        <Box>
          <Typography variant="h6">My Teams</Typography>
          <Typography variant="body2" color="text.secondary">
            Create one team per event, select one category and build a valid group of 3-5 members.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button startIcon={<RefreshRoundedIcon />} onClick={loadWorkspace} variant="outlined">
            Refresh
          </Button>
          <Button startIcon={<KeyRoundedIcon />} onClick={openJoin} variant="outlined">
            Join by code
          </Button>
          <Button startIcon={<AddRoundedIcon />} onClick={openCreate} variant="contained">
            Create team
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Box className="team-loading"><CircularProgress /></Box>
      ) : (
        <>
          <Box className="team-summary-strip">
            <Card className="team-summary-card">
              <Typography className="team-summary-label">Active teams</Typography>
              <Typography className="team-summary-value">{teams.length}</Typography>
            </Card>
            <Card className="team-summary-card">
              <Typography className="team-summary-label">Pending invitations</Typography>
              <Typography className="team-summary-value">{pendingInvitations.length}</Typography>
            </Card>
            <Card className="team-summary-card">
              <Typography className="team-summary-label">Open events</Typography>
              <Typography className="team-summary-value">{registrationEvents.length}</Typography>
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
                    <Typography variant="body2" color="text.secondary">{team.eventName}</Typography>
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
                  <div><span>Category</span><strong>{team.trackName}</strong></div>
                  <div><span>Team Leader</span><strong>{team.leaderName}</strong></div>
                  <div><span>Members</span><strong>{team.memberCount} / 5</strong></div>
                  <div><span>Join code</span><strong className="team-code">{team.joinCode}</strong></div>
                </Box>
                <Typography className="team-validation" color={team.membershipValid ? "success.main" : "warning.main"}>
                  {team.validationMessage}
                </Typography>
                <Stack className="team-actions" direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="outlined" onClick={() => openDetails(team)}>Members</Button>
                  {team.currentUserLeader ? (
                    <>
                      <Button size="small" startIcon={<GroupAddRoundedIcon />} onClick={() => openInvite(team)}>
                        Invite
                      </Button>
                    </>
                  ) : null}
                  <Button
                    color="error"
                    size="small"
                    startIcon={<ExitToAppRoundedIcon />}
                    onClick={() => leaveTeam(team)}
                  >
                    Leave
                  </Button>
                  {team.currentUserLeader ? (
                    <>
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
                    </>
                  ) : null}
                </Stack>
              </Card>
            ))}
          </Box>

          {teams.length === 0 ? (
            <Box className="ms-empty">
              <Typography fontWeight={700}>No team yet</Typography>
              <Typography color="text.secondary" variant="body2">
                Create a team in an open event or join a teammate with a code.
              </Typography>
            </Box>
          ) : null}

          <Box className="team-invitation-head">
            <Box>
              <Typography variant="h6">Pending Invitations</Typography>
              <Typography color="text.secondary" variant="body2">
                Accept an invitation only when you have not joined another team in the same event.
              </Typography>
            </Box>
            <Chip icon={<MailOutlineRoundedIcon />} label={`${pendingInvitations.length} pending`} variant="outlined" />
          </Box>

          <Card className="ms-data-card">
            <Box className="team-table-scroll">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Team</TableCell>
                    <TableCell>Event / Category</TableCell>
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
        </>
      )}

      <Dialog open={dialog.open && dialog.type === "create"} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create Team</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField select label="Event" value={createForm.eventId} onChange={selectEvent} fullWidth>
              {registrationEvents.map((event) => (
                <MenuItem key={event.eventId} value={String(event.eventId)}>{event.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Category / Track"
              value={createForm.trackId}
              onChange={(event) => setCreateForm({ ...createForm, trackId: event.target.value })}
              disabled={!createForm.eventId}
              fullWidth
            >
              {tracks.map((track) => <MenuItem key={track.trackId} value={String(track.trackId)}>{track.name}</MenuItem>)}
            </TextField>
            <TextField
              label="Team name"
              value={createForm.teamName}
              onChange={(event) => setCreateForm({ ...createForm, teamName: event.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            onClick={submitCreate}
            disabled={saving || !createForm.trackId || !createForm.teamName.trim()}
            variant="contained"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog.open && dialog.type === "join"} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Join Team</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Team join code"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            sx={{ mt: 1 }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button disabled={saving || !joinCode.trim()} onClick={submitJoin} variant="contained">Join</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog.open && dialog.type === "invite"} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Invite Student</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Username or email"
            value={inviteIdentifier}
            onChange={(event) => setInviteIdentifier(event.target.value)}
            sx={{ mt: 1 }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button disabled={saving || !inviteIdentifier.trim()} onClick={submitInvite} variant="contained">Send invitation</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog.open && dialog.type === "details"} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>{dialog.team?.teamName || "Team Members"}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {dialog.team?.eventName} / {dialog.team?.trackName}
          </Typography>
          <Box className="team-table-scroll">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(dialog.team?.members || []).map((member) => (
                  <TableRow key={member.userRoleId}>
                    <TableCell>{member.fullName}</TableCell>
                    <TableCell>{member.username}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.leader ? "Team Leader" : "Member"}</TableCell>
                    <TableCell align="right">
                      {dialog.team?.currentUserLeader && !member.leader ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            startIcon={<SwapHorizRoundedIcon />}
                            onClick={() => transferLeadership(dialog.team, member)}
                          >
                            Transfer leadership
                          </Button>
                          <Button
                            color="error"
                            size="small"
                            startIcon={<PersonRemoveRoundedIcon />}
                            onClick={() => removeMember(dialog.team.teamId, member.userRoleId)}
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
          {dialog.team?.currentUserLeader ? (
            <>
              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }} fontWeight={700}>
                Sent Invitations
              </Typography>
              <Box className="team-table-scroll">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Username</TableCell>
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
                              onClick={() => cancelInvitation(dialog.team.teamId, invitation.invitationId)}
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
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
