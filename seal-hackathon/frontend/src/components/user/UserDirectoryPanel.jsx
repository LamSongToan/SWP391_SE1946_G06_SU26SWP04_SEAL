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
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import PersonOffRoundedIcon from "@mui/icons-material/PersonOffRounded";
import SuspendReasonDialog from "../common/SuspendReasonDialog";
import { getApiErrorMessage, http, resolveAssetUrl } from "../../api/http";
import { brand } from "../../styles/designTokens";

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

function getProfileInitials(profile = {}) {
  const source = (profile?.fullName || profile?.username || "U").trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  const compact = source.replace(/[^a-zA-Z0-9]/g, "");
  return (compact.slice(0, 2) || "U").toUpperCase();
}

function ProfileInfoPill({ icon, label, value }) {
  return (
    <Stack
      direction="row"
      spacing={1.1}
      alignItems="center"
      sx={{
        minWidth: 0,
        p: 1.35,
        borderRadius: brand.radius.md,
        bgcolor: "#FFFFFF",
        border: `1px solid ${brand.colors.line}`,
      }}
    >
      <Box sx={{ color: brand.colors.orange, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: brand.colors.muted, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.45 }}>
          {label}
        </Typography>
        <Typography sx={{ color: brand.colors.text, fontSize: 13.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || "N/A"}
        </Typography>
      </Box>
    </Stack>
  );
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
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendError, setSuspendError] = useState("");

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
    setSuspendDialogOpen(false);
    setSuspendError("");
  };

  const runCoordinatorAction = async (action, reason = null) => {
    if (!detailUser?.userId) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    setDialogMessage({ type: "", text: "" });
    try {
      await http.post("/api/coordinator/users/action", {
        userId: detailUser.userId,
        action,
        reason,
      });
      const refreshed = await http.get(`/api/users/directory/${detailUser.userId}`);
      setDetailUser(refreshed.data?.data || null);
      await fetchDirectory(query);
      setDialogMessage({ type: "success", text: `User status updated to ${action}.` });
      if (action === "SUSPENDED") {
        setSuspendDialogOpen(false);
        setSuspendError("");
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, "Failed to update user status");
      if (action === "SUSPENDED") {
        setSuspendError(errorMessage);
      } else {
        setDialogMessage({ type: "error", text: errorMessage });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openSuspendDialog = () => {
    setSuspendError("");
    setSuspendDialogOpen(true);
    setDialogMessage({ type: "", text: "" });
  };

  const closeSuspendDialog = () => {
    if (actionLoading) return;
    setSuspendDialogOpen(false);
    setSuspendError("");
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

      <Dialog
        open={detailOpen}
        onClose={closeProfile}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: brand.radius.xl,
            bgcolor: "#F3F6FB",
            boxShadow: brand.shadow.lg,
            overflow: "hidden",
          },
        }}
      >
        <DialogContent sx={{ p: { xs: 1.4, md: 2.2 } }}>
          {detailLoading ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : detailUser ? (
            <Stack spacing={2.2}>
              {dialogMessage.text ? (
                <Alert severity={dialogMessage.type === "error" ? "error" : "success"}>
                  {dialogMessage.text}
                </Alert>
              ) : null}
            <Card
              className="ms-data-card"
              sx={{
                overflow: "hidden",
                borderRadius: brand.radius.xl,
                boxShadow: brand.shadow.md,
              }}
            >
              <Box
                sx={{
                  height: { xs: 142, md: 198 },
                  background: brand.gradients.hero,
                  position: "relative",
                  "&:after": {
                    content: '\"\"',
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                    backgroundSize: "34px 34px",
                  },
                }}
              />
              <CardContent sx={{ px: { xs: 2.2, md: 3 }, pb: { xs: 2.4, md: 3 }, pt: 0 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2.2}
                  alignItems={{ xs: "center", md: "flex-start" }}
                  sx={{ position: "relative", zIndex: 1 }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      display: "inline-flex",
                      mt: { xs: -7.2, md: -8.8 },
                      borderRadius: "50%",
                      flex: "0 0 auto",
                    }}
                  >
                    <Avatar
                      src={resolveAssetUrl(detailUser.avatarUrl) || undefined}
                      imgProps={{ style: { objectFit: "cover", objectPosition: "center center" } }}
                      sx={{
                        width: { xs: 128, md: 156 },
                        height: { xs: 128, md: 156 },
                        bgcolor: brand.colors.orange,
                        border: "5px solid #FFFFFF",
                        boxShadow: "0 12px 32px rgba(7, 26, 47, 0.18)",
                        fontSize: { xs: 36, md: 44 },
                        fontWeight: 900,
                      }}
                    >
                      {getProfileInitials(detailUser)}
                    </Avatar>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", md: "left" }, pt: { xs: 0, md: 2.2 } }}>
                    <Stack
                      direction="row"
                      spacing={1.2}
                      alignItems="flex-start"
                      justifyContent="space-between"
                      sx={{ width: "100%" }}
                    >
                      <Typography component="h2" sx={{ color: brand.colors.text, fontSize: { xs: 28, md: 33 }, fontWeight: 950, lineHeight: 1.12, flex: 1, minWidth: 0 }}>
                        {detailUser.fullName || "Unnamed User"}
                      </Typography>
                      {isCoordinator && currentStatus === "ACTIVE" ? (
                        <Button
                          size="medium"
                          variant="contained"
                          startIcon={<PersonOffRoundedIcon fontSize="small" />}
                          disabled={actionLoading}
                          onClick={openSuspendDialog}
                          sx={{
                            mt: { xs: 0.2, md: 0.5 },
                            minWidth: "auto",
                            px: 1.8,
                            py: 0.9,
                            borderRadius: 999,
                            color: "#FFFFFF",
                            bgcolor: "#DC2626",
                            fontWeight: 900,
                            textTransform: "none",
                            fontSize: 14,
                            boxShadow: "0 14px 28px rgba(220, 38, 38, 0.28)",
                            "&:hover": {
                              bgcolor: "#B91C1C",
                              boxShadow: "0 16px 30px rgba(185, 28, 28, 0.32)",
                            },
                            "&.Mui-disabled": {
                              color: "#FFFFFF",
                              bgcolor: "#FCA5A5",
                            },
                          }}
                        >
                          {actionLoading ? "Processing..." : "Suspend"}
                        </Button>
                      ) : null}
                    </Stack>
                    <Typography sx={{ mt: 0.45, color: brand.colors.muted, fontSize: 15, fontWeight: 800 }}>
                      @{detailUser.username || "username"}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.8}
                      justifyContent={{ xs: "center", md: "flex-start" }}
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ mt: 1 }}
                    >
                      {(detailUser.roles || []).map((role) => (
                        <Chip key={role} label={role} size="small" sx={{ bgcolor: "#F2F4F7", color: brand.colors.navy, fontWeight: 850 }} />
                      ))}
                    </Stack>
                    <Typography
                      sx={{
                        mt: 1.25,
                        color: detailUser.bio?.trim() ? brand.colors.text : brand.colors.muted,
                        fontSize: 14.5,
                        lineHeight: 1.65,
                        maxWidth: 700,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {detailUser.bio?.trim() || "This account has not added a bio yet."}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: { xs: 2, md: 2.4 } }} />

                <Box>
                  <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950, mb: 1.2 }}>
                    Contact & Links
                  </Typography>
                  <Grid2 container spacing={1.2}>
                    <Grid2 size={{ xs: 12, md: 6 }}>
                      <ProfileInfoPill icon={<MailOutlineRoundedIcon fontSize="small" />} label="Email" value={detailUser.email} />
                    </Grid2>
                    <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                      <ProfileInfoPill icon={<BadgeRoundedIcon fontSize="small" />} label="Status" value={detailUser.status} />
                    </Grid2>
                    <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
                      <ProfileInfoPill
                        icon={<CalendarTodayRoundedIcon fontSize="small" />}
                        label="Joined"
                        value={detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleDateString("en-GB") : "N/A"}
                      />
                    </Grid2>
                  </Grid2>
                </Box>

                <Grid2 container spacing={1.4} sx={{ mt: 1.4 }}>
                  <Grid2 size={{ xs: 12, md: detailUser.studentType || detailUser.studentCode || detailUser.universityName ? 4 : 12 }}>
                    <Box sx={{ minWidth: 0, p: 1.6, borderRadius: brand.radius.md, bgcolor: "#F8FAFC", border: `1px solid ${brand.colors.line}` }}>
                      <Typography sx={{ color: brand.colors.text, fontSize: 15, fontWeight: 900, mb: 1.2 }}>
                        Roles
                      </Typography>
                      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                        {(detailUser.roles || []).map((role) => (
                          <Chip key={role} label={role} size="small" sx={{ bgcolor: "#FFFFFF", fontWeight: 850 }} />
                        ))}
                      </Stack>
                    </Box>
                  </Grid2>

                  {detailUser.studentType || detailUser.studentCode || detailUser.universityName ? (
                    <Grid2 size={{ xs: 12, md: 8 }}>
                      <Box sx={{ minWidth: 0, p: 1.6, borderRadius: brand.radius.md, bgcolor: "#F8FAFC", border: `1px solid ${brand.colors.line}` }}>
                        <Typography sx={{ color: brand.colors.text, fontSize: 15, fontWeight: 900, mb: 1.2 }}>
                          Student Identity
                        </Typography>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                          <Box>
                            <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>Type</Typography>
                            <Typography sx={{ color: brand.colors.text, fontWeight: 850 }}>{detailUser.studentType || "N/A"}</Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>Student Code</Typography>
                            <Typography sx={{ color: brand.colors.text, fontWeight: 850 }}>{detailUser.studentCode || "N/A"}</Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ color: brand.colors.muted, fontSize: 12 }}>University</Typography>
                            <Typography sx={{ color: brand.colors.text, fontWeight: 850 }}>{detailUser.universityName || "N/A"}</Typography>
                          </Box>
                        </Stack>
                      </Box>
                    </Grid2>
                  ) : null}
                </Grid2>
              </CardContent>
            </Card>

            {isStudent ? (
              <Card className="ms-data-card">
                <CardContent sx={{ p: { xs: 2.2, md: 2.5 } }}>
                  <Typography sx={{ color: brand.colors.text, fontSize: 20, fontWeight: 950, lineHeight: 1.2, mb: 0.5 }}>
                    Team Invitation
                  </Typography>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mb: 2 }}>
                    Invite this student into one of your teams if they are currently eligible.
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

            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
          <Button onClick={closeProfile} disabled={actionLoading || inviteLoading}>Close</Button>
        </DialogActions>
      </Dialog>

      <SuspendReasonDialog
        open={suspendDialogOpen}
        user={detailUser}
        loading={actionLoading}
        error={suspendError}
        onClose={closeSuspendDialog}
        onConfirm={(reason) => runCoordinatorAction("SUSPENDED", reason)}
      />
    </Box>
  );
}
