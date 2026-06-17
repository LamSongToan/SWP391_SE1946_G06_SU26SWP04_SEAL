import { useCallback, useEffect, useState } from "react";
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
  FormControl,
  Grid2,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { http } from "../../api/http";
import ModulePageHeader from "../layout/ModulePageHeader";

const STATUS_COLOR = {
  ACTIVE: "success",
  PENDING_APPROVAL: "warning",
  REJECTED: "error",
  SUSPENDED: "default",
};

const STATUS_OPTIONS = ["PendingApproval", "Active", "Rejected", "Suspended"];
const ROLE_OPTIONS = ["STUDENT", "MENTOR", "JUDGE", "COORDINATOR"];

function normalizeStatus(status) {
  const value = String(status || "").trim().toUpperCase();
  if (value === "APPROVED") return "ACTIVE";
  if (value === "PENDING") return "PENDING_APPROVAL";
  if (value === "PENDINGAPPROVAL") return "PENDING_APPROVAL";
  if (value === "DISABLED") return "SUSPENDED";
  return value.replace(/\s+/g, "_");
}

function RegistrationInfoRow({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.4 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600 }}>
        {value || "N/A"}
      </Typography>
    </Box>
  );
}

export default function AccountApprovalPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionDialog, setActionDialog] = useState(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [reasonViewDialog, setReasonViewDialog] = useState(null);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewUser, setReviewUser] = useState(null);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [managedUser, setManagedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    fullName: "",
    status: "PendingApproval",
    roles: [],
  });

  const pendingUsers = users.filter((user) => normalizeStatus(user.status) === "PENDING_APPROVAL");
  const managedUsers = users.filter((user) => normalizeStatus(user.status) !== "PENDING_APPROVAL");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await http.get("/api/coordinator/users");
      setUsers(response.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const runAction = async (userId, action, actionReason = null) => {
    await http.post("/api/coordinator/users/action", {
      userId,
      action,
      reason: actionReason,
    });
  };

  const openDialog = (userOrId, action) => {
    const user = typeof userOrId === "object" ? userOrId : users.find((item) => item.userId === userOrId);
    setActionDialog({ userId: user?.userId || userOrId, action, user });
    setReason("");
    setError("");
  };

  const closeActionDialog = () => {
    setActionDialog(null);
    setReason("");
  };

  const confirmAction = async () => {
    setActionLoading(true);
    setError("");
    try {
      await runAction(actionDialog.userId, actionDialog.action, reason || null);
      closeActionDialog();
      setReviewDialogOpen(false);
      await fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const approveDirectly = async (userId) => {
    setActionLoading(true);
    setError("");
    try {
      await runAction(userId, "ACTIVE");
      setReviewDialogOpen(false);
      await fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Approve failed");
    } finally {
      setActionLoading(false);
    }
  };

  const actionLabel = { ACTIVE: "Approve", REJECTED: "Reject", SUSPENDED: "Suspend", PENDING_APPROVAL: "Re-review" };
  const actionColor = { ACTIVE: "success", REJECTED: "error", SUSPENDED: "warning", PENDING_APPROVAL: "warning" };

  const fillEditForm = (user) => {
    setManagedUser(user);
    setEditForm({
      username: user?.username || "",
      fullName: user?.fullName || "",
      status: user?.status || "PendingApproval",
      roles: user?.roles || [],
    });
  };

  const loadUserDetails = async (userId) => {
    const response = await http.get(`/api/coordinator/users/${userId}`);
    return response.data?.data;
  };

  const openReview = async (user) => {
    setReviewDialogOpen(true);
    setReviewLoading(true);
    setReviewError("");
    setReviewUser(user);
    try {
      const latest = await loadUserDetails(user.userId);
      setReviewUser(latest || user);
    } catch (err) {
      setReviewError(err?.response?.data?.message || "Failed to load latest registration details.");
    } finally {
      setReviewLoading(false);
    }
  };

  const closeReview = () => {
    if (actionLoading) return;
    setReviewDialogOpen(false);
    setReviewLoading(false);
    setReviewError("");
    setReviewUser(null);
  };

  const openDetails = async (user) => {
    const userId = user?.userId;
    setDetailDialogOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setError("");
    fillEditForm(user);

    if (!userId) {
      setDetailError("Cannot open details because this row does not include userId.");
      setDetailLoading(false);
      return;
    }

    try {
      const data = await loadUserDetails(userId);
      fillEditForm(data || user);
    } catch (err) {
      setDetailError(err?.response?.data?.message || "Failed to load latest user details. Showing table data instead.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    if (detailSaving) return;
    setDetailDialogOpen(false);
    setManagedUser(null);
    setDetailError("");
  };

  const updateField = (key) => (event) => {
    setEditForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const saveDetails = async () => {
    if (!managedUser?.userId) {
      setDetailError("Cannot save because the selected user does not include userId.");
      return;
    }

    const currentStatus = normalizeStatus(managedUser.status);
    const nextStatus = normalizeStatus(editForm.status);
    if (nextStatus === "REJECTED" && currentStatus !== "REJECTED") {
      setDetailDialogOpen(false);
      openDialog({ ...managedUser, ...editForm, userId: managedUser.userId }, "REJECTED");
      return;
    }

    setDetailSaving(true);
    setError("");
    try {
      await http.put(`/api/coordinator/users/${managedUser.userId}`, editForm);
      closeDetails();
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update user");
    } finally {
      setDetailSaving(false);
    }
  };

  return (
    <Box>
      <ModulePageHeader
        eyebrow="Account Review"
        title="User Management"
        description="Review pending registrations, approve accounts quickly, and keep user details manageable afterward."
        actions={<Button size="small" onClick={fetchUsers} disabled={loading}>Refresh</Button>}
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={2.2}>
          <Card className="ms-data-card">
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={1}
                sx={{ mb: 1.6 }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Pending Approval</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Newly registered accounts waiting for coordinator review and approval.
                  </Typography>
                </Box>
                <Chip color="warning" label={`${pendingUsers.length} pending`} />
              </Stack>

              {pendingUsers.length === 0 ? (
                <Typography color="text.secondary">No pending accounts right now.</Typography>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Roles</TableCell>
                      <TableCell>Registered</TableCell>
                      <TableCell align="right">Approval Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.userId} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.2} alignItems="center">
                            <Avatar sx={{ bgcolor: "primary.main", width: 34, height: 34 }}>
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
                            {user.roles.map((role) => (
                              <Chip key={role} label={role} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB") : "N/A"}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.6} justifyContent="flex-end" flexWrap="wrap">
                            <Button size="small" variant="outlined" onClick={() => openReview(user)}>
                              Detail
                            </Button>
                            <Button size="small" color="success" variant="contained" onClick={() => approveDirectly(user.userId)}>
                              Approve
                            </Button>
                            <Button size="small" color="error" variant="outlined" onClick={() => openDialog(user, "REJECTED")}>
                              Reject
                            </Button>
                            <Button size="small" variant="text" onClick={() => openDetails(user)}>
                              Manage
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="ms-data-card">
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.2, py: 1.8 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Managed Accounts</Typography>
                <Typography variant="body2" color="text.secondary">
                  Approved, suspended, or previously reviewed accounts. Use Details to update status or roles later.
                </Typography>
              </Box>
              {managedUsers.length === 0 ? (
                <Box sx={{ px: 2.2, pb: 2.2 }}>
                  <Typography color="text.secondary">No managed accounts yet.</Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Roles</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Registered</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {managedUsers.map((user) => (
                      <TableRow key={user.userId} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.2} alignItems="center">
                            <Avatar sx={{ bgcolor: "primary.main", width: 34, height: 34 }}>
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
                            {user.roles.map((role) => (
                              <Chip key={role} label={role} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip label={user.status} size="small" color={STATUS_COLOR[normalizeStatus(user.status)] || "default"} />
                        </TableCell>
                        <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB") : "N/A"}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
                            <Button size="small" variant="outlined" onClick={() => openDetails(user)}>Details</Button>
                            {normalizeStatus(user.status) === "REJECTED" && (
                              <>
                                <Button size="small" color="error" variant="outlined" onClick={() => setReasonViewDialog(user)}>View reason</Button>
                                <Button size="small" color="warning" variant="outlined" onClick={() => openDialog(user, "PENDING_APPROVAL")}>Re-review</Button>
                              </>
                            )}
                            {normalizeStatus(user.status) === "ACTIVE" && (
                              <Button size="small" color="warning" variant="outlined" onClick={() => openDialog(user, "SUSPENDED")}>Suspend</Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      <Dialog open={Boolean(actionDialog)} onClose={closeActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog?.action === "REJECTED"
            ? "Reject account request"
            : actionDialog ? `${actionLabel[actionDialog.action]} User` : ""}
        </DialogTitle>
        <DialogContent>
          {actionDialog?.user ? (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {actionDialog.user.fullName || actionDialog.user.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {actionDialog.user.email || `@${actionDialog.user.username}`}
              </Typography>
            </Box>
          ) : null}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {actionDialog?.action === "REJECTED"
              ? "Write a clear rejection reason. This message will be shown to the applicant when they try to sign in."
              : "Confirm this account status change. You can leave the note empty for this action."}
          </Typography>
          <TextField
            label={actionDialog?.action === "REJECTED" ? "Rejection reason" : "Reason (optional)"}
            placeholder={actionDialog?.action === "REJECTED" ? "Example: Student code does not match the submitted university record." : ""}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            fullWidth
            multiline
            minRows={actionDialog?.action === "REJECTED" ? 5 : 3}
            maxRows={8}
            required={actionDialog?.action === "REJECTED"}
            inputProps={{ maxLength: 1000 }}
            helperText={actionDialog?.action === "REJECTED" ? `${reason.length}/1000 characters` : " "}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeActionDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            onClick={confirmAction}
            disabled={actionLoading || (actionDialog?.action === "REJECTED" && !reason.trim())}
            color={actionDialog ? actionColor[actionDialog.action] : "primary"}
            variant="contained"
          >
            {actionLoading ? "Processing..." : (actionDialog ? actionLabel[actionDialog.action] : "Save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(reasonViewDialog)} onClose={() => setReasonViewDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Rejection reason</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 800 }}>
                {reasonViewDialog?.fullName || reasonViewDialog?.username || "Rejected account"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {reasonViewDialog?.email || "No email available"}
              </Typography>
            </Box>
            <Alert severity="error" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {reasonViewDialog?.rejectionReason || "No rejection reason was recorded for this account."}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReasonViewDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reviewDialogOpen} onClose={closeReview} maxWidth="sm" fullWidth>
        <DialogTitle>Pending Registration Details</DialogTitle>
        <DialogContent>
          {reviewLoading ? (
            <Box sx={{ py: 3, textAlign: "center" }}><CircularProgress /></Box>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {reviewError ? <Alert severity="warning">{reviewError}</Alert> : null}

              {reviewUser ? (
                <>
                  <Box>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>{reviewUser.fullName}</Typography>
                    <Typography color="text.secondary">{reviewUser.email}</Typography>
                    <Typography variant="caption" color="text.secondary">@{reviewUser.username}</Typography>
                  </Box>

                  <Divider />

                  <Grid2 container spacing={2}>
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <RegistrationInfoRow label="Student Type" value={reviewUser.studentType} />
                    </Grid2>
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <RegistrationInfoRow label="Student Code" value={reviewUser.studentCode} />
                    </Grid2>
                    <Grid2 size={{ xs: 12 }}>
                      <RegistrationInfoRow label="University" value={reviewUser.universityName} />
                    </Grid2>
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <RegistrationInfoRow
                        label="Registered On"
                        value={reviewUser.createdAt ? new Date(reviewUser.createdAt).toLocaleString("en-GB") : "N/A"}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.4 }}>
                          Roles
                        </Typography>
                        <Stack direction="row" spacing={0.6} flexWrap="wrap">
                          {(reviewUser.roles || []).map((role) => (
                            <Chip key={role} label={role} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    </Grid2>
                  </Grid2>

                  <Alert severity="info">
                    This dialog is for reviewing submitted registration data. Use <strong>Manage</strong> later if you need to edit username, roles, or status manually.
                  </Alert>
                </>
              ) : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReview} disabled={actionLoading}>Close</Button>
          {reviewUser ? (
            <>
              <Button
                color="error"
                variant="outlined"
                onClick={() => openDialog(reviewUser, "REJECTED")}
                disabled={actionLoading}
              >
                Reject
              </Button>
              <Button
                color="success"
                variant="contained"
                onClick={() => approveDirectly(reviewUser.userId)}
                disabled={actionLoading}
              >
                {actionLoading ? "Approving..." : "Approve"}
              </Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={detailDialogOpen} onClose={closeDetails} maxWidth="sm" fullWidth>
        <DialogTitle>User Details & Edit</DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box sx={{ py: 3, textAlign: "center" }}><CircularProgress /></Box>
          ) : (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {detailError ? <Alert severity="warning">{detailError}</Alert> : null}
              <TextField label="Username" value={editForm.username} onChange={updateField("username")} fullWidth />
              <TextField label="Full Name" value={editForm.fullName} onChange={updateField("fullName")} fullWidth />
              <TextField select label="Status" value={editForm.status} onChange={updateField("status")} fullWidth>
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </TextField>
              {normalizeStatus(editForm.status) === "REJECTED" && normalizeStatus(managedUser?.status) !== "REJECTED" ? (
                <Alert severity="warning">
                  Saving with Rejected status will open a separate rejection reason dialog before the account is updated.
                </Alert>
              ) : null}
              {normalizeStatus(managedUser?.status) === "REJECTED" && managedUser?.rejectionReason ? (
                <Alert severity="error" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  Current rejection reason: {managedUser.rejectionReason}
                </Alert>
              ) : null}

              <FormControl fullWidth>
                <InputLabel id="role-select-label">Roles</InputLabel>
                <Select
                  labelId="role-select-label"
                  multiple
                  value={editForm.roles}
                  onChange={updateField("roles")}
                  input={<OutlinedInput label="Roles" />}
                  renderValue={(selected) => selected.join(", ")}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Alert severity="info">
                For accounts that already have a student profile, do not remove STUDENT role to avoid profile data conflicts.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetails} disabled={detailSaving}>Cancel</Button>
          <Button variant="contained" onClick={saveDetails} disabled={detailLoading || detailSaving || !managedUser?.userId}>
            {detailSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
