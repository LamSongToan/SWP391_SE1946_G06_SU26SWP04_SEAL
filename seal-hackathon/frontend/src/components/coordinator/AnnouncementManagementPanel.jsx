import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ModulePageHeader from "../layout/ModulePageHeader";
import { getApiErrorMessage, http } from "../../api/http";
import { brand } from "../../styles/designTokens";

const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "All participants", hint: "Active students, mentors, and judges" },
  { value: "STUDENTS", label: "Students", hint: "Active student accounts" },
  { value: "MENTORS", label: "Mentors", hint: "Active mentors and assigned mentors" },
  { value: "JUDGES", label: "Judges", hint: "Active judges and assigned judges" },
];

const EMPTY_FORM = {
  eventId: "",
  audience: "ALL",
  title: "",
  message: "",
};

function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function audienceLabel(value) {
  return AUDIENCE_OPTIONS.find((item) => item.value === value)?.label || value || "Audience";
}

function emptyAudienceMessage(audience) {
  if (audience === "STUDENTS") return "No active students found for this event/audience.";
  if (audience === "MENTORS") return "No active mentors found for this event/audience.";
  if (audience === "JUDGES") return "No active judges found for this event/audience.";
  return "No active users found for this event/audience.";
}

export default function AnnouncementManagementPanel() {
  const [events, setEvents] = useState([]);
  const [sentAnnouncements, setSentAnnouncements] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", message: "" });
  const [recipientPreview, setRecipientPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [apiAvailable, setApiAvailable] = useState(true);

  const selectedAudience = useMemo(
    () => AUDIENCE_OPTIONS.find((item) => item.value === form.audience) || AUDIENCE_OPTIONS[0],
    [form.audience]
  );
  const recipientCount = Number(recipientPreview?.recipientCount ?? 0);
  const noRecipientMessage = emptyAudienceMessage(form.audience);

  const canSend = apiAvailable
    && form.eventId
    && form.title.trim()
    && form.message.trim()
    && recipientCount > 0
    && !sending;
  const canUpdate = editForm.title.trim() && editForm.message.trim() && !actionLoading;

  const loadEvents = async () => {
    const response = await http.get("/api/coordinator/events");
    const nextEvents = response.data?.data || [];
    setEvents(nextEvents);
    setForm((current) => ({
      ...current,
      eventId: current.eventId || (nextEvents[0]?.eventId ? String(nextEvents[0].eventId) : ""),
    }));
  };

  const loadSentAnnouncements = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    try {
      const response = await http.get("/api/coordinator/announcements");
      setSentAnnouncements(response.data?.data || []);
      setApiAvailable(true);
    } catch (err) {
      if (err?.response?.status === 404) {
        setSentAnnouncements([]);
        setApiAvailable(false);
        return;
      }
      throw err;
    } finally {
      setRefreshing(false);
    }
  };

  const loadWorkspace = async () => {
    setLoading(true);
    setError("");
    try {
      await loadEvents();
      await loadSentAnnouncements();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load announcements"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRecipientPreview = async () => {
      if (!apiAvailable || !form.eventId || !form.audience) {
        setRecipientPreview(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const response = await http.get("/api/coordinator/announcements/recipient-preview", {
          params: {
            eventId: Number(form.eventId),
            audience: form.audience,
          },
        });
        if (!cancelled) {
          setRecipientPreview(response.data?.data || null);
        }
      } catch {
        if (!cancelled) {
          setRecipientPreview(null);
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    loadRecipientPreview();
    return () => {
      cancelled = true;
    };
  }, [apiAvailable, form.eventId, form.audience]);

  const onChange = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const onSend = async () => {
    if (recipientCount <= 0) {
      setError(noRecipientMessage);
      setSuccess("");
      return;
    }
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        eventId: Number(form.eventId),
        audience: form.audience,
        title: form.title.trim(),
        message: form.message.trim(),
      };
      const response = await http.post("/api/coordinator/announcements", payload);
      const sent = response.data?.data;
      setSentAnnouncements((current) => (sent ? [sent, ...current] : current));
      setSuccess(`Announcement sent to ${sent?.recipientCount ?? 0} recipient(s) via dashboard notification and email.`);
      setForm((current) => ({ ...EMPTY_FORM, eventId: current.eventId, audience: current.audience }));
    } catch (err) {
      setError(getApiErrorMessage(err, noRecipientMessage));
    } finally {
      setSending(false);
    }
  };

  const openEditDialog = (item) => {
    setEditTarget(item);
    setEditForm({
      title: item.title || "",
      message: item.message || "",
    });
    setError("");
    setSuccess("");
  };

  const closeEditDialog = () => {
    if (actionLoading) return;
    setEditTarget(null);
    setEditForm({ title: "", message: "" });
  };

  const onEditChange = (key) => (event) => {
    setEditForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const onUpdate = async () => {
    if (!editTarget?.announcementId) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        title: editForm.title.trim(),
        message: editForm.message.trim(),
      };
      const response = await http.put(`/api/coordinator/announcements/${editTarget.announcementId}`, payload);
      const updated = response.data?.data;
      setSentAnnouncements((current) => current.map((item) => (
        item.announcementId === editTarget.announcementId ? { ...item, ...updated } : item
      )));
      setSuccess("Announcement updated.");
      setEditTarget(null);
      setEditForm({ title: "", message: "" });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update announcement"));
    } finally {
      setActionLoading(false);
    }
  };

  const onDelete = async (item) => {
    if (!item?.announcementId) return;
    const confirmed = window.confirm(`Delete announcement "${item.title}"? It will disappear from recipients' dashboards.`);
    if (!confirmed) return;

    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await http.delete(`/api/coordinator/announcements/${item.announcementId}`);
      setSentAnnouncements((current) => current.filter((announcement) => announcement.announcementId !== item.announcementId));
      setSuccess("Announcement deleted.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete announcement"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: brand.colors.orange }} />
      </Box>
    );
  }

  return (
    <Box>
      <ModulePageHeader
        eyebrow="Announcements"
        title="Announcement Center"
        description="Create event announcements for students, mentors, and judges, then send them through both dashboard notifications and email."
        actions={(
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => loadSentAnnouncements({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        )}
      />

      <Stack spacing={2.2}>
        {error ? <Alert severity="error" onClose={() => setError("")}>{error}</Alert> : null}
        {success ? <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert> : null}
        {!apiAvailable ? (
          <Alert severity="warning">
            Announcement API is not available on the running backend. Restart the backend after pulling this code. If the local database is outdated, rerun
            {" "}
            <strong>seal_hackathon.sql</strong>
            {" "}
            and
            {" "}
            <strong>seed_test_data.sql</strong>
            .
          </Alert>
        ) : null}

        <Card sx={{ borderRadius: brand.radius.lg, border: `1px solid ${brand.colors.line}`, boxShadow: brand.shadow.sm, overflow: "hidden" }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2.2} alignItems="flex-start">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.6 }}>
                  <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: brand.colors.surfaceWarm, color: brand.colors.orange, display: "grid", placeItems: "center" }}>
                    <CampaignRoundedIcon />
                  </Box>
                  <Box>
                    <Typography sx={{ color: brand.colors.text, fontSize: 19, fontWeight: 950 }}>
                      Send Announcement
                    </Typography>
                    <Typography sx={{ color: brand.colors.muted, fontSize: 13.5 }}>
                      Compose a notice that appears on recipients' dashboards and is also sent by email.
                    </Typography>
                  </Box>
                </Stack>

                <Stack spacing={1.4}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                    <TextField
                      select
                      label="Event"
                      value={form.eventId}
                      onChange={onChange("eventId")}
                      fullWidth
                    >
                      {events.map((event) => (
                        <MenuItem key={event.eventId} value={String(event.eventId)}>
                          {event.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Audience"
                      value={form.audience}
                      onChange={onChange("audience")}
                      fullWidth
                    >
                      {AUDIENCE_OPTIONS.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                          {item.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <TextField
                    label="Title"
                    value={form.title}
                    onChange={onChange("title")}
                    inputProps={{ maxLength: 180 }}
                    helperText={`${form.title.length}/180 characters`}
                    fullWidth
                  />

                  <TextField
                    label="Message"
                    value={form.message}
                    onChange={onChange("message")}
                    inputProps={{ maxLength: 1000 }}
                    helperText={`${form.message.length}/1000 characters`}
                    fullWidth
                    multiline
                    minRows={5}
                  />

                  <Button
                    variant="contained"
                    startIcon={<SendRoundedIcon />}
                    onClick={onSend}
                    disabled={!canSend}
                    sx={{ alignSelf: "flex-start", px: 2.4, borderRadius: 999 }}
                  >
                    {sending ? "Sending..." : "Send announcement"}
                  </Button>
                  {!previewLoading && form.eventId && recipientCount === 0 ? (
                    <Typography sx={{ color: brand.colors.danger, fontSize: 13, fontWeight: 750 }}>
                      {noRecipientMessage}
                    </Typography>
                  ) : null}
                </Stack>
              </Box>

              <Box
                sx={{
                  width: { xs: "100%", lg: 320 },
                  p: 1.6,
                  borderRadius: brand.radius.md,
                  border: `1px solid ${brand.colors.line}`,
                  bgcolor: brand.colors.surfaceInfo,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                }}
              >
                <Typography sx={{ color: brand.colors.text, fontWeight: 950 }}>
                  Audience Preview
                </Typography>
                <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.6, lineHeight: 1.6 }}>
                  {selectedAudience.hint}
                </Typography>
                <Chip
                  label={selectedAudience.label}
                  sx={{ mt: 1.2, bgcolor: "#FFFFFF", fontWeight: 850 }}
                />
                <Box sx={{ mt: 1.4, p: 1.35, borderRadius: 2.5, bgcolor: "#FFFFFF", border: `1px solid ${brand.colors.line}`, boxShadow: brand.shadow.xs }}>
                  <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 850, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Estimated Recipients
                  </Typography>
                  <Typography sx={{ color: brand.colors.text, fontSize: 28, fontWeight: 950, mt: 0.2 }}>
                    {previewLoading ? "..." : recipientPreview?.recipientCount ?? 0}
                  </Typography>
                  {recipientCount === 0 && !previewLoading ? (
                    <Typography sx={{ color: brand.colors.danger, fontSize: 12.5 }}>
                      {noRecipientMessage}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: brand.radius.lg, border: `1px solid ${brand.colors.line}`, boxShadow: brand.shadow.sm, overflow: "hidden" }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.2} sx={{ mb: 1.6 }}>
              <Box>
                <Typography sx={{ color: brand.colors.text, fontSize: 19, fontWeight: 950 }}>
                  Sent Announcements
                </Typography>
                <Typography sx={{ color: brand.colors.muted, fontSize: 13.5 }}>
                  Recent custom announcements sent by coordinators.
                </Typography>
              </Box>
              <Chip label={`${sentAnnouncements.length} sent`} sx={{ alignSelf: { xs: "flex-start", md: "center" }, fontWeight: 850 }} />
            </Stack>

            {sentAnnouncements.length === 0 ? (
              <Box className="ms-empty">
                <Typography fontWeight={850}>No custom announcements yet</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sent announcements will appear here after coordinators publish one.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.1}>
                {sentAnnouncements.map((item, index) => (
                  <Box
                    key={item.announcementId || `${item.eventId}-${item.title}-${item.createdAt}-${index}`}
                    sx={{
                      p: 1.5,
                      borderRadius: brand.radius.md,
                      border: `1px solid ${brand.colors.line}`,
                      bgcolor: "#FFFFFF",
                      transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                      "&:hover": {
                        borderColor: "rgba(243,112,33,0.3)",
                        boxShadow: brand.shadow.xs,
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} justifyContent="space-between">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ color: brand.colors.text, fontSize: 15.5, fontWeight: 950 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.45, lineHeight: 1.55 }}>
                          {item.message}
                        </Typography>
                      </Box>
                      <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }} sx={{ flex: "0 0 auto" }}>
                        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap justifyContent={{ md: "flex-end" }}>
                          <Chip size="small" label={item.eventName} />
                          <Chip size="small" variant="outlined" label={audienceLabel(item.audience)} />
                          <Chip size="small" variant="outlined" label={`${item.recipientCount} recipients`} />
                        </Stack>
                        <Stack direction="row" spacing={0.8}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditRoundedIcon fontSize="small" />}
                            onClick={() => openEditDialog(item)}
                            disabled={actionLoading || !item.announcementId}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
                            onClick={() => onDelete(item)}
                            disabled={actionLoading || !item.announcementId}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Stack>
                    </Stack>
                    <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, mt: 1 }}>
                      Sent {formatDateTime(item.createdAt)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={Boolean(editTarget)} onClose={closeEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>
          Edit announcement
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField
              label="Title"
              value={editForm.title}
              onChange={onEditChange("title")}
              inputProps={{ maxLength: 180 }}
              helperText={`${editForm.title.length}/180 characters`}
              fullWidth
            />
            <TextField
              label="Message"
              value={editForm.message}
              onChange={onEditChange("message")}
              inputProps={{ maxLength: 1000 }}
              helperText={`${editForm.message.length}/1000 characters`}
              fullWidth
              multiline
              minRows={5}
            />
            <Box sx={{ p: 1.4, borderRadius: brand.radius.md, bgcolor: brand.colors.surfaceSoft, border: `1px solid ${brand.colors.line}` }}>
              <Typography sx={{ color: brand.colors.text, fontWeight: 850, fontSize: 13 }}>
                {editTarget?.eventName || "Selected event"}
              </Typography>
              <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, mt: 0.35 }}>
                Audience and recipients stay the same. Editing only updates the visible title and message.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeEditDialog} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            onClick={onUpdate}
            disabled={!canUpdate}
          >
            {actionLoading ? "Saving..." : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
