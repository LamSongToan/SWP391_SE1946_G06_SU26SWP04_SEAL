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
  FormControl,
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
  if (value === "DISABLED") return "SUSPENDED";
  return value.replace(/\s+/g, "_");
}

export default function AccountApprovalPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [actionDialog, setActionDialog] = useState(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = filter === "PENDING" ? "/api/coordinator/users/pending" : "/api/coordinator/users";
      const response = await http.get(url);
      setUsers(response.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openDialog = (userId, action) => {
    setActionDialog({ userId, action });
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
      await http.post("/api/coordinator/users/action", {
        userId: actionDialog.userId,
        action: actionDialog.action,
        reason: reason || null,
      });
      closeActionDialog();
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const actionLabel = { ACTIVE: "Activate", REJECTED: "Reject", SUSPENDED: "Suspend", PENDING_APPROVAL: "Re-review" };
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
      const response = await http.get(`/api/coordinator/users/${userId}`);
      const data = response.data?.data;
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
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        sx={{ mb: 1.8 }}
        spacing={1.1}
      >
        <Box>
          <Typography className="ms-section-title" variant="h5">Account Management</Typography>
          <Typography className="ms-section-subtitle">
            Review approvals and maintain account details, status, and role assignment.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant={filter === "ALL" ? "contained" : "outlined"} onClick={() => setFilter("ALL")}>All Users</Button>
          <Button size="small" variant={filter === "PENDING" ? "contained" : "outlined"} onClick={() => setFilter("PENDING")}>Pending Only</Button>
          <Button size="small" onClick={fetchUsers} disabled={loading}>Refresh</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
      ) : users.length === 0 ? (
        <Card className="ms-data-card">
          <CardContent>
            <Typography color="text.secondary">
              {filter === "PENDING" ? "No pending accounts." : "No users found."}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card className="ms-data-card">
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
              {users.map((user) => (
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
                      {normalizeStatus(user.status) === "PENDING_APPROVAL" && (
                        <>
                          <Button size="small" color="success" variant="outlined" onClick={() => openDialog(user.userId, "ACTIVE")}>Activate</Button>
                          <Button size="small" color="error" variant="outlined" onClick={() => openDialog(user.userId, "REJECTED")}>Reject</Button>
                        </>
                      )}
                      {normalizeStatus(user.status) === "REJECTED" && (
                        <>
                          <Button size="small" color="warning" variant="outlined" onClick={() => openDialog(user.userId, "PENDING_APPROVAL")}>Re-review</Button>
                          <Button size="small" color="success" variant="outlined" onClick={() => openDialog(user.userId, "ACTIVE")}>Activate</Button>
                        </>
                      )}
                      {normalizeStatus(user.status) === "ACTIVE" && (
                        <Button size="small" color="warning" variant="outlined" onClick={() => openDialog(user.userId, "SUSPENDED")}>Suspend</Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={Boolean(actionDialog)} onClose={closeActionDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{actionDialog ? `${actionLabel[actionDialog.action]} User` : ""}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Reject requires a reason. Other actions can include an optional note.
          </Typography>
          <TextField
            label={actionDialog?.action === "REJECTED" ? "Reason" : "Reason (optional)"}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            fullWidth
            multiline
            rows={2}
            required={actionDialog?.action === "REJECTED"}
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
