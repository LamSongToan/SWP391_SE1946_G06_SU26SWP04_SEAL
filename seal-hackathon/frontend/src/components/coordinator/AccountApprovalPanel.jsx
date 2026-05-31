import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { http } from "../../api/http";

const STATUS_COLOR = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "error",
  DISABLED: "default",
};

export default function AccountApprovalPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL | PENDING
  const [dialog, setDialog] = useState(null); // { userId, action }
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = filter === "PENDING"
        ? "/api/coordinator/users/pending"
        : "/api/coordinator/users";
      const response = await http.get(url);
      setUsers(response.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openDialog = (userId, action) => {
    setDialog({ userId, action });
    setReason("");
    setActionError("");
  };

  const closeDialog = () => {
    setDialog(null);
    setReason("");
    setActionError("");
  };

  const confirmAction = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      await http.post("/api/coordinator/users/action", {
        userId: dialog.userId,
        action: dialog.action,
        reason: reason || null,
      });
      closeDialog();
      fetchUsers();
    } catch (err) {
      setActionError(err?.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const actionLabel = { APPROVED: "Approve", REJECTED: "Reject", DISABLED: "Disable", PENDING: "Re-review" };
  const actionColor = { APPROVED: "success", REJECTED: "error", DISABLED: "warning", PENDING: "warning" };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Account Management</Typography>
        <Stack direction="row" spacing={1}>
          {["ALL", "PENDING"].map((f) => (
            <Button
              key={f}
              size="small"
              variant={filter === f ? "contained" : "outlined"}
              onClick={() => setFilter(f)}
            >
              {f === "PENDING" ? "Pending Only" : "All Users"}
            </Button>
          ))}
          <Button size="small" onClick={fetchUsers} disabled={loading}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">
              {filter === "PENDING" ? "No pending accounts." : "No users found."}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Full Name</TableCell>
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
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {user.roles.map((r) => (
                        <Chip key={r} label={r} size="small" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      size="small"
                      color={STATUS_COLOR[user.status] || "default"}
                    />
                  </TableCell>
                  <TableCell>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-GB")
                      : "N/A"}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {user.status === "PENDING" && (
                        <>
                          <Button size="small" color="success" variant="outlined"
                            onClick={() => openDialog(user.userId, "APPROVED")}>
                            Approve
                          </Button>
                          <Button size="small" color="error" variant="outlined"
                            onClick={() => openDialog(user.userId, "REJECTED")}>
                            Reject
                          </Button>
                        </>
                      )}
                      {user.status === "REJECTED" && (
                        <>
                          <Button size="small" color="warning" variant="outlined"
                            onClick={() => openDialog(user.userId, "PENDING")}>
                            Re-review
                          </Button>
                          <Button size="small" color="success" variant="outlined"
                            onClick={() => openDialog(user.userId, "APPROVED")}>
                            Approve
                          </Button>
                        </>
                      )}
                      {user.status === "APPROVED" && (
                        <Button size="small" color="warning" variant="outlined"
                          onClick={() => openDialog(user.userId, "DISABLED")}>
                          Disable
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialog ? `${actionLabel[dialog.action]} User` : ""}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This action will set the account status to{" "}
            <strong>{dialog?.action}</strong>. You can optionally provide a reason.
          </Typography>
          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
          {actionError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>{actionError}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={actionLoading}>Cancel</Button>
          <Button
            onClick={confirmAction}
            disabled={actionLoading}
            color={dialog ? actionColor[dialog.action] : "primary"}
            variant="contained"
          >
            {actionLoading ? "Processing..." : (dialog ? actionLabel[dialog.action] : "")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}