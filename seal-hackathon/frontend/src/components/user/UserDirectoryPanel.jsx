import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  Grid2,
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
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import { getApiErrorMessage, http, resolveAssetUrl } from "../../api/http";

const STATUS_COLOR = {
  ACTIVE: "success",
  PENDING_APPROVAL: "warning",
  REJECTED: "error",
  SUSPENDED: "default",
};

function normalizeStatus(status) {
  const value = String(status || "").trim().toUpperCase();
  if (value === "APPROVED") return "ACTIVE";
  if (value === "PENDING") return "PENDING_APPROVAL";
  if (value === "PENDINGAPPROVAL") return "PENDING_APPROVAL";
  if (value === "DISABLED") return "SUSPENDED";
  return value.replace(/\s+/g, "_");
}

export default function UserDirectoryPanel({ currentRole, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState([]);
  const [leaderTeams, setLeaderTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dialogMessage, setDialogMessage] = useState({ type: "", text: "" });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState(null);

  const isCoordinator = currentRole === "COORDINATOR";
  const isStudent = currentRole === "STUDENT";

  const canInviteViewedUser = useMemo(() => {
    if (!isStudent || !detailUser) return false;
    return detailUser.roles?.includes("STUDENT") && normalizeStatus(detailUser.status) === "ACTIVE";
  }, [detailUser, isStudent]);

  const fetchDirectory = async (searchText = query) => {
    const normalizedQuery = searchText.trim();
    if (!normalizedQuery) {
      setUsers([]);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await http.get("/api/users/directory", {
        params: { query: normalizedQuery },
      });
      setUsers(response.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load user directory"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery(initialQuery || "");
  }, [initialQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setError("");
      setLoading(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      fetchDirectory(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isStudent) {
      setLeaderTeams([]);
      return;
    }

    const loadTeams = async () => {
      try {
        const response = await http.get("/api/teams/my");
        const ownLeaderTeams = (response.data?.data || []).filter((team) => team.currentUserLeader);
        setLeaderTeams(ownLeaderTeams);
        if (ownLeaderTeams.length === 1) {
          setSelectedTeamId(String(ownLeaderTeams[0].teamId));
        }
      } catch {
        setLeaderTeams([]);
      }
    };

    loadTeams();
  }, [isStudent]);

  const openProfile = async (userId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailUser(null);
    setError("");
    setSuccess("");
    setDialogMessage({ type: "", text: "" });
    try {
      const response = await http.get(`/api/users/directory/${userId}`);
      setDetailUser(response.data?.data || null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load user profile"));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeProfile = () => {
    if (actionLoading || inviteLoading) return;
    setDetailOpen(false);
    setDetailUser(null);
    setDialogMessage({ type: "", text: "" });
  };

  const runCoordinatorAction = async (action) => {
    if (!detailUser?.userId) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    setDialogMessage({ type: "", text: "" });
    try {
      await http.post("/api/coordinator/users/action", {
        userId: detailUser.userId,
        action,
        reason: null,
      });
      const refreshed = await http.get(`/api/users/directory/${detailUser.userId}`);
      setDetailUser(refreshed.data?.data || null);
      await fetchDirectory(query);
      setDialogMessage({ type: "success", text: `User status updated to ${action}.` });
    } catch (err) {
      setDialogMessage({ type: "error", text: getApiErrorMessage(err, "Failed to update user status") });
    } finally {
      setActionLoading(false);
    }
  };

  const inviteToTeam = async () => {
    if (!detailUser?.username || !selectedTeamId) return;
    setInviteLoading(true);
    setError("");
    setSuccess("");
    setDialogMessage({ type: "", text: "" });
    try {
      await http.post(`/api/teams/${selectedTeamId}/invitations`, {
        identifier: detailUser.username,
      });
      setDialogMessage({ type: "success", text: `Invitation sent to @${detailUser.username}.` });
    } catch (err) {
      setDialogMessage({ type: "error", text: getApiErrorMessage(err, "Failed to invite student") });
    } finally {
      setInviteLoading(false);
    }
  };

  const currentStatus = normalizeStatus(detailUser?.status);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        sx={{ mb: 1.8 }}
        spacing={1.1}
      >
        <Box>
          <Typography className="ms-section-title" variant="h5">User Directory</Typography>
          <Typography className="ms-section-subtitle">
            Search other users, open their profile snapshot, and use actions available to your role.
          </Typography>
        </Box>
        <Button size="small" onClick={() => fetchDirectory(query)} disabled={loading}>Refresh</Button>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          <TextField
            fullWidth
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users by name, username, email, university, or role"
          />
        </Stack>
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

      <Card className="ms-data-card">
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : users.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">
                {query.trim() ? "No users matched this search." : "Type a keyword to search users."}
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.userId} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <Avatar src={resolveAssetUrl(user.avatarUrl) || undefined} sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                          {(user.fullName || user.username || "U").charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{user.fullName}</Typography>
                          <Typography variant="caption" color="text.secondary">@{user.username}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {(user.roles || []).map((role) => (
                          <Chip key={role} label={role} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        size="small"
                        color={STATUS_COLOR[normalizeStatus(user.status)] || "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.6} justifyContent="flex-end" flexWrap="wrap">
                        <Button size="small" variant="outlined" onClick={() => openProfile(user.userId)}>
                          View profile
                        </Button>
                        {isCoordinator && normalizeStatus(user.status) === "PENDING_APPROVAL" ? (
                          <Button size="small" color="success" variant="contained" onClick={() => openProfile(user.userId)}>
                            Approve
                          </Button>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onClose={closeProfile} maxWidth="md" fullWidth>
        <DialogTitle>User Profile</DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : detailUser ? (
            <Stack spacing={2.2} sx={{ mt: 1 }}>
              {dialogMessage.text ? (
                <Alert severity={dialogMessage.type === "error" ? "error" : "success"}>
                  {dialogMessage.text}
                </Alert>
              ) : null}
              <Stack direction={{ xs: "column", md: "row" }} spacing={2.2}>
                <Avatar
                  src={resolveAssetUrl(detailUser.avatarUrl) || undefined}
                  sx={{ width: 96, height: 96, bgcolor: "primary.main", fontSize: 32 }}
                >
                  {(detailUser.fullName || detailUser.username || "U").charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{detailUser.fullName}</Typography>
                  <Typography color="text.secondary" sx={{ mb: 0.8 }}>@{detailUser.username}</Typography>
                  <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mb: 1.2 }}>
                    {(detailUser.roles || []).map((role) => (
                      <Chip key={role} label={role} size="small" variant="outlined" />
                    ))}
                    <Chip
                      label={detailUser.status}
                      size="small"
                      color={STATUS_COLOR[currentStatus] || "default"}
                    />
                  </Stack>
                  <Typography color="text.secondary">
                    {detailUser.bio?.trim() || "No bio has been added for this account yet."}
                  </Typography>
                </Box>
              </Stack>

              <Divider />

              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MailOutlineRoundedIcon fontSize="small" color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Email</Typography>
                      <Typography sx={{ fontWeight: 600 }}>{detailUser.email}</Typography>
                    </Box>
                  </Stack>
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <BadgeRoundedIcon fontSize="small" color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Joined</Typography>
                      <Typography sx={{ fontWeight: 600 }}>
                        {detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleDateString("en-GB") : "N/A"}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid2>
                {detailUser.studentType || detailUser.universityName ? (
                  <>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <BadgeRoundedIcon fontSize="small" color="action" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Student Type</Typography>
                          <Typography sx={{ fontWeight: 600 }}>{detailUser.studentType || "N/A"}</Typography>
                        </Box>
                      </Stack>
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ApartmentRoundedIcon fontSize="small" color="action" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">University</Typography>
                          <Typography sx={{ fontWeight: 600 }}>{detailUser.universityName || "N/A"}</Typography>
                        </Box>
                      </Stack>
                    </Grid2>
                  </>
                ) : null}
              </Grid2>

              {isStudent ? (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.6 }}>
                      Team Invitation
                    </Typography>
                    {canInviteViewedUser ? (
                      leaderTeams.length > 0 ? (
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                          <TextField
                            select
                            fullWidth
                            label="Invite to team"
                            value={selectedTeamId}
                            onChange={(event) => setSelectedTeamId(event.target.value)}
                          >
                            {leaderTeams.map((team) => (
                              <MenuItem key={team.teamId} value={String(team.teamId)}>
                                {team.teamName} - {team.eventName}
                              </MenuItem>
                            ))}
                          </TextField>
                          <Button
                            variant="contained"
                            startIcon={<GroupAddRoundedIcon />}
                            disabled={inviteLoading || !selectedTeamId}
                            onClick={inviteToTeam}
                            sx={{ minWidth: 180 }}
                          >
                            {inviteLoading ? "Inviting..." : "Invite to team"}
                          </Button>
                        </Stack>
                      ) : (
                        <Alert severity="info">Become a team leader first to invite other students from here.</Alert>
                      )
                    ) : (
                      <Alert severity="info">Only active student accounts can be invited to a team.</Alert>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {isCoordinator ? (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                      Coordinator Actions
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {currentStatus === "PENDING_APPROVAL" ? (
                        <Button
                          color="success"
                          variant="contained"
                          startIcon={<ManageAccountsRoundedIcon />}
                          disabled={actionLoading}
                          onClick={() => runCoordinatorAction("ACTIVE")}
                        >
                          {actionLoading ? "Processing..." : "Approve"}
                        </Button>
                      ) : null}
                      {currentStatus === "ACTIVE" ? (
                        <Button
                          color="warning"
                          variant="outlined"
                          disabled={actionLoading}
                          onClick={() => runCoordinatorAction("SUSPENDED")}
                        >
                          {actionLoading ? "Processing..." : "Suspend"}
                        </Button>
                      ) : null}
                      {(currentStatus === "REJECTED" || currentStatus === "SUSPENDED") ? (
                        <Button
                          color="warning"
                          variant="outlined"
                          disabled={actionLoading}
                          onClick={() => runCoordinatorAction("PENDING_APPROVAL")}
                        >
                          {actionLoading ? "Processing..." : "Re-review"}
                        </Button>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeProfile} disabled={actionLoading || inviteLoading}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
