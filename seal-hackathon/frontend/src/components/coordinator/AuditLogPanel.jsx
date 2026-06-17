import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";
import CenteredNotification from "../layout/CenteredNotification";
import ModulePageHeader from "../layout/ModulePageHeader";
import { getApiErrorMessage, http } from "../../api/http";
import { brand } from "../../styles/designTokens";

const ACTION_OPTIONS = [
  "",
  "ACCOUNT_APPROVED",
  "ACCOUNT_REJECTED",
  "ACCOUNT_RESUBMITTED",
  "ACCOUNT_SUSPENDED",
  "USER_UPDATED",
  "GUEST_JUDGE_CREATED",
  "GUEST_JUDGE_PASSWORD_RESET",
  "GUEST_JUDGE_DEACTIVATED",
  "EVENT_CREATED",
  "EVENT_UPDATED",
  "EVENT_PUBLISHED",
  "EVENT_DELETED",
  "ROUND_CREATED",
  "ROUND_UPDATED",
  "ROUND_SUBMISSION_OPENED",
  "ROUND_SUBMISSION_CLOSED",
  "ROUND_SCORING_FINALIZED",
  "ROUND_SCORING_REOPENED",
  "TRACK_CREATED",
  "TRACK_UPDATED",
  "TRACK_DELETED",
  "TEAM_REGISTERED_FOR_EVENT",
  "SUBMISSION_CREATED",
  "SUBMISSION_UPDATED",
  "ROUND_CRITERIA_UPDATED",
  "CRITERIA_TEMPLATE_CREATED",
  "CRITERIA_TEMPLATE_UPDATED",
  "CRITERIA_TEMPLATE_DELETED",
  "CRITERIA_TEMPLATE_APPLIED",
  "JUDGE_SCORES_SAVED_DRAFT",
  "JUDGE_SCORES_FINALIZED",
  "JUDGE_EVALUATION_REOPENED",
  "SUBMISSION_FEEDBACK_ADDED",
];

function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatActionLabel(value) {
  if (!value) return "Unknown action";
  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(" ");
}

function formatTargetLabel(log) {
  const parts = [];
  if (log.targetEntity) {
    parts.push(log.targetEntity);
  }
  if (log.targetName) {
    parts.push(log.targetName);
  } else if (log.targetId) {
    parts.push(`ID ${log.targetId}`);
  }
  return parts.join(" - ") || "General";
}

function formatPayload(value) {
  if (!value) return "";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return String(value);
  }
}

function renderKeyValue(label, value, icon = null) {
  return (
    <Stack spacing={0.4} sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.8} alignItems="center">
        {icon}
        <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 800 }}>
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          color: brand.colors.text,
          fontSize: 14,
          fontWeight: 700,
          wordBreak: "break-word",
        }}
      >
        {value || "N/A"}
      </Typography>
    </Stack>
  );
}

function JsonBlock({ title, value, tone = "dark" }) {
  if (!value) return null;
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 900, mb: 0.75 }}>
        {title}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.25,
          borderRadius: brand.radius.sm,
          bgcolor: tone === "dark" ? "#0f172a" : "#172554",
          color: "#e2e8f0",
          fontSize: 12,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          minHeight: 108,
        }}
      >
        {formatPayload(value)}
      </Box>
    </Box>
  );
}

export default function AuditLogPanel() {
  const [events, setEvents] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [actionType, setActionType] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const scopedRounds = useMemo(
    () => rounds.filter((round) => !selectedEventId || String(round.eventId) === String(selectedEventId)),
    [rounds, selectedEventId]
  );

  const loadEvents = async () => {
    const response = await http.get("/api/coordinator/events");
    const nextEvents = response.data?.data || [];
    setEvents(nextEvents);
    if (!selectedEventId && nextEvents[0]?.eventId) {
      setSelectedEventId(String(nextEvents[0].eventId));
    }
    return nextEvents;
  };

  const loadRounds = async (eventId) => {
    if (!eventId) {
      setRounds([]);
      setSelectedRoundId("");
      return;
    }
    const response = await http.get(`/api/coordinator/events/${eventId}/rounds`);
    const nextRounds = response.data?.data || [];
    setRounds(nextRounds);
    if (selectedRoundId && !nextRounds.some((round) => String(round.roundId) === String(selectedRoundId))) {
      setSelectedRoundId("");
    }
  };

  const loadLogs = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const params = {};
      if (selectedEventId) params.eventId = selectedEventId;
      if (selectedRoundId) params.roundId = selectedRoundId;
      if (actionType) params.actionType = actionType;
      const response = await http.get("/api/coordinator/scoring/audit-logs", { params });
      setLogs(response.data?.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load audit logs"));
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        const nextEvents = await loadEvents();
        const initialEventId = selectedEventId || nextEvents[0]?.eventId;
        if (initialEventId) {
          await loadRounds(initialEventId);
        }
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load audit workspace"));
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    loadRounds(selectedEventId).catch((err) => {
      setError(getApiErrorMessage(err, "Failed to load rounds"));
    });
  }, [selectedEventId]);

  useEffect(() => {
    if (loading) return;
    loadLogs({ silent: false });
  }, [selectedEventId, selectedRoundId, actionType]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: brand.colors.orange }} />
      </Box>
    );
  }

  return (
    <Box>
      <CenteredNotification message={error} severity="error" onClose={() => setError("")} />

      <ModulePageHeader
        eyebrow="Audit Trail"
        title="Audit Log & Activity Tracking"
        description="Review who changed what, on which object, when it happened, and how the data changed before and after."
        actions={(
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => loadLogs({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        )}
      />

      <Card
        sx={{
          borderRadius: brand.radius.lg,
          border: `1px solid ${brand.colors.line}`,
          boxShadow: brand.shadow.sm,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack spacing={1.4} sx={{ mb: 2.2 }}>
            <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 900 }}>
              Activity stream
            </Typography>
            <Typography sx={{ color: brand.colors.muted, fontSize: 14 }}>
              Filter by event, round, or action to inspect approvals, event updates, track and round changes, submissions, and scoring work.
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.2}
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 2.25 }}
          >
            <TextField
              select
              label="Event"
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              sx={{ minWidth: 230 }}
            >
              {events.map((item) => (
                <MenuItem key={item.eventId} value={String(item.eventId)}>
                  {item.name} ({item.semester} {item.year})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Round"
              value={selectedRoundId}
              onChange={(event) => setSelectedRoundId(event.target.value)}
              sx={{ minWidth: 230 }}
            >
              <MenuItem value="">All rounds</MenuItem>
              {scopedRounds.map((item) => (
                <MenuItem key={item.roundId} value={String(item.roundId)}>
                  {item.roundOrder}. {item.roundName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Action"
              value={actionType}
              onChange={(event) => setActionType(event.target.value)}
              sx={{ minWidth: 280 }}
            >
              <MenuItem value="">All actions</MenuItem>
              {ACTION_OPTIONS.filter(Boolean).map((item) => (
                <MenuItem key={item} value={item}>
                  {formatActionLabel(item)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {logs.length === 0 ? (
            <Box className="ms-empty">
              <Typography fontWeight={800}>No audit entries found</Typography>
              <Typography variant="body2" color="text.secondary">
                Try a broader filter or perform an audited action first.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.4}>
              {logs.map((log) => (
                <Box
                  key={log.logId}
                  sx={{
                    p: 1.8,
                    borderRadius: brand.radius.md,
                    border: `1px solid ${brand.colors.line}`,
                    bgcolor: brand.colors.surfaceSoft,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", lg: "row" }}
                    justifyContent="space-between"
                    spacing={1.5}
                    sx={{ mb: 1.5 }}
                  >
                    <Stack direction="row" spacing={1.1} alignItems="center">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          bgcolor: brand.colors.surfaceWarm,
                          color: brand.colors.orange,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <HistoryRoundedIcon fontSize="small" />
                      </Box>
                      <Box>
                        <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>
                          {formatActionLabel(log.actionType)}
                        </Typography>
                        <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                          {formatDateTime(log.timestamp)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={log.targetEntity || "General"} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={log.targetName || (log.targetId ? `ID ${log.targetId}` : "No target name")}
                      />
                    </Stack>
                  </Stack>

                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    useFlexGap
                    flexWrap="wrap"
                    sx={{ mb: 1.6 }}
                  >
                    {renderKeyValue(
                      "Actor",
                      log.actorName
                        ? `${log.actorName}${log.actorUsername ? ` (@${log.actorUsername})` : ""}`
                        : "Unknown",
                      <PersonOutlineRoundedIcon sx={{ fontSize: 15, color: brand.colors.muted }} />
                    )}
                    {renderKeyValue(
                      "Action",
                      formatActionLabel(log.actionType),
                      <EditNoteRoundedIcon sx={{ fontSize: 15, color: brand.colors.muted }} />
                    )}
                    {renderKeyValue(
                      "Target",
                      formatTargetLabel(log),
                      <DnsRoundedIcon sx={{ fontSize: 15, color: brand.colors.muted }} />
                    )}
                    {renderKeyValue(
                      "Timestamp",
                      formatDateTime(log.timestamp),
                      <UpdateRoundedIcon sx={{ fontSize: 15, color: brand.colors.muted }} />
                    )}
                  </Stack>

                  {(log.reason || log.ipAddress || log.deviceInfo) && (
                    <>
                      <Divider sx={{ my: 1.4 }} />
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        useFlexGap
                        flexWrap="wrap"
                        sx={{ mb: 1.6 }}
                      >
                        {log.reason ? renderKeyValue("Reason", log.reason) : null}
                        {log.ipAddress ? renderKeyValue("IP Address", log.ipAddress) : null}
                        {log.deviceInfo ? renderKeyValue("Device", log.deviceInfo) : null}
                      </Stack>
                    </>
                  )}

                  {(log.oldValue || log.newValue) && (
                    <>
                      <Divider sx={{ my: 1.4 }} />
                      <Stack direction={{ xs: "column", xl: "row" }} spacing={1.25}>
                        <JsonBlock title="OLD VALUE" value={log.oldValue} tone="dark" />
                        <JsonBlock title="NEW VALUE" value={log.newValue} tone="blue" />
                      </Stack>
                    </>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
