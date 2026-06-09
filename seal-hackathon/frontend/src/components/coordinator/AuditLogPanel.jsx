import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { getApiErrorMessage, http } from "../../api/http";
import CenteredNotification from "../layout/CenteredNotification";
import { brand } from "../../styles/designTokens";

const ACTION_OPTIONS = [
  "",
  "ROUND_CRITERIA_UPDATED",
  "CRITERIA_TEMPLATE_CREATED",
  "CRITERIA_TEMPLATE_UPDATED",
  "CRITERIA_TEMPLATE_DELETED",
  "CRITERIA_TEMPLATE_APPLIED",
  "ROUND_SCORING_FINALIZED",
  "ROUND_SCORING_REOPENED",
  "JUDGE_SCORES_SAVED_DRAFT",
  "JUDGE_SCORES_FINALIZED",
  "JUDGE_EVALUATION_REOPENED",
  "SUBMISSION_FEEDBACK_ADDED",
];

function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPayload(value) {
  if (!value) return "";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return String(value);
  }
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
      <CenteredNotification
        message={error}
        severity="error"
        onClose={() => setError("")}
      />

      <Card
        sx={{
          borderRadius: brand.radius.lg,
          border: `1px solid ${brand.colors.line}`,
          boxShadow: brand.shadow.sm,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography sx={{ color: brand.colors.text, fontSize: 22, fontWeight: 950 }}>
                Audit Log & Activity Tracking
              </Typography>
              <Typography sx={{ color: brand.colors.muted, fontSize: 14 }}>
                Review coordinator, judge, and mentor actions across rubric changes, template use, scoring, and feedback.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => loadLogs({ silent: true })}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.2}
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 2 }}
          >
            <TextField
              select
              label="Event"
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              {events.map((item) => (
                <MenuItem key={item.eventId} value={String(item.eventId)}>
                  {item.name} ({item.season} {item.year})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Round"
              value={selectedRoundId}
              onChange={(event) => setSelectedRoundId(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">All Rounds</MenuItem>
              {scopedRounds.map((item) => (
                <MenuItem key={item.roundId} value={String(item.roundId)}>
                  {item.roundOrder}. {item.roundName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Action Type"
              value={actionType}
              onChange={(event) => setActionType(event.target.value)}
              sx={{ minWidth: 260 }}
            >
              <MenuItem value="">All Actions</MenuItem>
              {ACTION_OPTIONS.filter(Boolean).map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
          </Stack>

          {logs.length === 0 ? (
            <Box className="ms-empty">
              <Typography fontWeight={800}>No audit activity found</Typography>
              <Typography variant="body2" color="text.secondary">
                Try broadening the filters or perform scoring actions to generate tracking records.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.3}>
              {logs.map((log) => (
                <Box
                  key={log.logId}
                  sx={{
                    p: 1.6,
                    borderRadius: brand.radius.md,
                    border: `1px solid ${brand.colors.line}`,
                    bgcolor: brand.colors.surfaceSoft,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", lg: "row" }}
                    justifyContent="space-between"
                    spacing={1.2}
                    sx={{ mb: 1 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
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
                          {log.actionType}
                        </Typography>
                        <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                          {log.userName} • {formatDateTime(log.timestamp)}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={log.targetEntity} />
                      <Chip size="small" variant="outlined" label={`Target #${log.targetId}`} />
                    </Stack>
                  </Stack>

                  {log.reason ? (
                    <Typography sx={{ color: brand.colors.text, fontSize: 14, mb: 1 }}>
                      {log.reason}
                    </Typography>
                  ) : null}

                  <Stack direction={{ xs: "column", xl: "row" }} spacing={1.2}>
                    {log.oldValue ? (
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 900, mb: 0.6 }}>
                          PREVIOUS STATE
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            m: 0,
                            p: 1.2,
                            borderRadius: brand.radius.sm,
                            bgcolor: "#0f172a",
                            color: "#e2e8f0",
                            fontSize: 12,
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {formatPayload(log.oldValue)}
                        </Box>
                      </Box>
                    ) : null}

                    {log.newValue ? (
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 900, mb: 0.6 }}>
                          NEW STATE
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            m: 0,
                            p: 1.2,
                            borderRadius: brand.radius.sm,
                            bgcolor: "#071A2F",
                            color: "#e2e8f0",
                            fontSize: 12,
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {formatPayload(log.newValue)}
                        </Box>
                      </Box>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
