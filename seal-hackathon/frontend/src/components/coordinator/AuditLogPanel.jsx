import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CenteredNotification from "../layout/CenteredNotification";
import ModulePageHeader from "../layout/ModulePageHeader";
import { getApiErrorMessage, http } from "../../api/http";
import { brand } from "../../styles/designTokens";

function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
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

function formatDayHeading(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLogContent(log) {
  const action = formatActionLabel(log.actionType);
  const target = log.targetName || log.targetEntity || (log.targetId ? `ID ${log.targetId}` : "");
  const reason = String(log.reason || "").trim();
  if (reason && target) return `${action} - ${target} - ${reason}`;
  if (target) return `${action} - ${target}`;
  if (reason) return `${action} - ${reason}`;
  return action;
}

function actorLabel(log) {
  const name = log.actorName || "System";
  const email = log.actorEmail || "";
  return email ? `${name} (${email})` : name;
}

export default function AuditLogPanel() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [logs, setLogs] = useState([]);
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
  }, [selectedEventId]);

  const groupedLogs = useMemo(() => {
    const groups = [];
    const byDate = new Map();

    logs.forEach((log) => {
      const dateKey = log.timestamp ? new Date(log.timestamp).toDateString() : "unknown";
      if (!byDate.has(dateKey)) {
        const group = {
          key: dateKey,
          label: formatDayHeading(log.timestamp),
          items: [],
        };
        byDate.set(dateKey, group);
        groups.push(group);
      }
      byDate.get(dateKey).items.push(log);
    });

    return groups;
  }, [logs]);

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
        description="A clean activity stream showing the log content, who performed it, and when it happened."
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
              Filter by event, then read the audit history as a simple chronological timeline.
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
          </Stack>

          {logs.length === 0 ? (
            <Box className="ms-empty">
              <Typography fontWeight={800}>No audit entries found</Typography>
              <Typography variant="body2" color="text.secondary">
                Try a broader filter or perform an audited action first.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2.4}>
              {groupedLogs.map((group) => (
                <Box key={group.key} sx={{ position: "relative", pl: { xs: 2.5, md: 3.5 } }}>
                  <Box
                    sx={{
                      position: "absolute",
                      left: { xs: 10, md: 14 },
                      top: 34,
                      bottom: 0,
                      width: 2,
                      bgcolor: "#E2E8F0",
                    }}
                  />

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2, position: "relative", zIndex: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        border: `2px solid ${brand.colors.muted}`,
                        bgcolor: "#FFFFFF",
                        ml: { xs: -2.1, md: -2.7 },
                      }}
                    />
                    <Typography sx={{ color: brand.colors.text, fontSize: 16, fontWeight: 500 }}>
                      Logs on {group.label}
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      borderRadius: brand.radius.md,
                      border: `1px solid ${brand.colors.line}`,
                      bgcolor: "#FFFFFF",
                      overflow: "hidden",
                    }}
                  >
                    {group.items.map((log, index) => (
                      <Box key={log.logId}>
                        <Box sx={{ px: { xs: 1.5, md: 2.1 }, py: 1.5 }}>
                          <Typography
                            sx={{
                              color: brand.colors.text,
                              fontSize: 16,
                              fontWeight: 900,
                              lineHeight: 1.35,
                              wordBreak: "break-word",
                            }}
                          >
                            {formatLogContent(log)}
                          </Typography>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 13.5, mt: 0.45 }}>
                            {actorLabel(log)} updated at {formatDateTime(log.timestamp)}
                          </Typography>
                        </Box>
                        {index < group.items.length - 1 ? <Divider /> : null}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
