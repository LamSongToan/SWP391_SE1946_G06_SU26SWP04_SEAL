import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
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
  "ANNOUNCEMENT_SENT",
  "ANNOUNCEMENT_UPDATED",
  "ANNOUNCEMENT_DELETED",
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

function getActorInitials(log) {
  const source = log.actorName || log.actorUsername || "System";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join("") || "S";
}

function formatCommitHash(log) {
  return String(log.logId || "000000").padStart(6, "0").slice(-6);
}

function formatCommitMessage(log) {
  const action = formatActionLabel(log.actionType);
  const target = log.targetName || log.targetEntity || "workspace";
  return `${action} on ${target}`;
}

function hasAuditDetails(log) {
  return Boolean(log.reason || log.ipAddress || log.deviceInfo || log.oldValue || log.newValue);
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
  const [selectedEventId, setSelectedEventId] = useState("");
  const [actionType, setActionType] = useState("");
  const [logs, setLogs] = useState([]);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadEvents = async () => {
    const response = await http.get("/api/coordinator/events");
    const nextEvents = response.data?.data || [];
    setEvents(nextEvents);
    return nextEvents;
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
      if (actionType) params.actionType = actionType;
      const response = await http.get("/api/coordinator/scoring/audit-logs", { params });
      setLogs(response.data?.data || []);
      setExpandedLogId(null);
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
        await loadEvents();
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load audit workspace"));
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (loading) return;
    loadLogs({ silent: false });
  }, [selectedEventId, actionType]);

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
              Filter by event or action to inspect approvals, event updates, track and round changes, submissions, and scoring work.
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
              <MenuItem value="">All events</MenuItem>
              {events.map((item) => (
                <MenuItem key={item.eventId} value={String(item.eventId)}>
                  {item.name}
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
            <Stack spacing={1.1}>
              {logs.map((log) => (
                <Box
                  key={log.logId}
                  sx={{
                    borderRadius: brand.radius.md,
                    border: `1px solid ${brand.colors.line}`,
                    bgcolor: "#FFFFFF",
                    overflow: "hidden",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.4}
                    alignItems={{ xs: "stretch", md: "center" }}
                    sx={{ p: { xs: 1.35, md: 1.55 } }}
                  >
                    <Stack direction="row" spacing={1.15} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          bgcolor: brand.colors.surfaceWarm,
                          color: brand.colors.orange,
                          border: "1px solid #FED7AA",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          fontWeight: 950,
                          flex: "0 0 40px",
                        }}
                      >
                        {getActorInitials(log)}
                      </Box>

                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography sx={{ color: brand.colors.text, fontSize: 15, fontWeight: 950, lineHeight: 1.25 }}>
                            {formatCommitMessage(log)}
                          </Typography>
                          <Chip
                            size="small"
                            label={`#${formatCommitHash(log)}`}
                            sx={{ height: 22, borderRadius: 1, fontWeight: 850 }}
                          />
                        </Stack>
                        <Typography sx={{ color: brand.colors.muted, fontSize: 13, mt: 0.35 }}>
                          {log.actorName || log.actorUsername || "System"} - {formatDateTime(log.timestamp)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={0.8}
                      alignItems="center"
                      justifyContent={{ xs: "flex-start", md: "flex-end" }}
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ flex: "0 0 auto" }}
                    >
                      <Chip size="small" variant="outlined" label={log.targetEntity || "General"} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={log.targetName || (log.targetId ? `ID ${log.targetId}` : "No target")}
                      />
                      <Button
                        size="small"
                        variant={expandedLogId === log.logId ? "contained" : "outlined"}
                        disabled={!hasAuditDetails(log)}
                        endIcon={(
                          <ExpandMoreRoundedIcon
                            sx={{
                              fontSize: 18,
                              transition: "transform 0.18s ease",
                              transform: expandedLogId === log.logId ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        )}
                        onClick={() => setExpandedLogId((current) => (current === log.logId ? null : log.logId))}
                        sx={{ borderRadius: 999, textTransform: "none", fontWeight: 850 }}
                      >
                        Details
                      </Button>
                    </Stack>
                  </Stack>

                  <Collapse in={expandedLogId === log.logId} timeout="auto" unmountOnExit>
                    <Divider />
                    <Box sx={{ p: { xs: 1.35, md: 1.55 }, bgcolor: "#F8FAFC" }}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.6}
                        useFlexGap
                        flexWrap="wrap"
                      >
                        {renderKeyValue(
                          "Actor",
                          log.actorName
                            ? `${log.actorName}${log.actorUsername ? ` (@${log.actorUsername})` : ""}`
                            : "Unknown",
                          <PersonOutlineRoundedIcon sx={{ fontSize: 15, color: brand.colors.muted }} />
                        )}
                        {renderKeyValue(
                          "Target",
                          formatTargetLabel(log),
                          <DnsRoundedIcon sx={{ fontSize: 15, color: brand.colors.muted }} />
                        )}
                        {renderKeyValue(
                          "Action",
                          formatActionLabel(log.actionType),
                          <EditNoteRoundedIcon sx={{ fontSize: 15, color: brand.colors.muted }} />
                        )}
                        {log.reason ? renderKeyValue("Reason", log.reason) : null}
                        {log.ipAddress ? renderKeyValue("IP Address", log.ipAddress) : null}
                        {log.deviceInfo ? renderKeyValue("Device", log.deviceInfo) : null}
                      </Stack>

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
                  </Collapse>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
