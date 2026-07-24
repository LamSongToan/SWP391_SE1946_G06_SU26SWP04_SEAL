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
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DataObjectRoundedIcon from "@mui/icons-material/DataObjectRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { getApiErrorMessage, http } from "../../api/http";
import { brand } from "../../styles/designTokens";

const IMPORT_TIMEOUT_MS = 120000;

function formatDateTime(value) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatAnchorDate(value) {
  if (!value) return "Not available";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(parsed);
}

export default function DemoImportPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [importingKey, setImportingKey] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const loadStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await http.get("/api/coordinator/demo-import");
      setStatus(response.data?.data || null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Failed to load demo import status"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const scenarioGroups = useMemo(() => {
    const groups = new Map();
    (status?.scenarios || []).forEach((scenario) => {
      if (!groups.has(scenario.group)) groups.set(scenario.group, []);
      groups.get(scenario.group).push(scenario);
    });
    return Array.from(groups.entries());
  }, [status?.scenarios]);

  const runImport = async () => {
    if (!selectedScenario) return;
    const scenario = selectedScenario;
    setSelectedScenario(null);
    setImportingKey(scenario.key);
    setError("");
    setLastResult(null);
    try {
      const response = await http.post(
        `/api/coordinator/demo-import/${scenario.key}`,
        null,
        { timeout: IMPORT_TIMEOUT_MS }
      );
      setLastResult(response.data?.data || null);
      await loadStatus();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, `Failed to import ${scenario.title}`));
    } finally {
      setImportingKey("");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 900, color: brand.colors.navy }}>
          Import Data
        </Typography>
        <Typography sx={{ mt: 0.75, color: brand.colors.muted, maxWidth: 820 }}>
          Load a verified Main Flow snapshot into the Summer 2026 demo event. Every imported
          timeline is shifted automatically to the current date in Vietnam.
        </Typography>
      </Box>

      {error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadStatus}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {!status?.enabled ? (
        <Alert severity="warning" icon={<ErrorOutlineRoundedIcon />}>
          Demo import is disabled on this backend. Start it with <strong>DEMO_ENABLED=true</strong>.
        </Alert>
      ) : null}

      {status?.enabled && !status?.allScriptsAvailable ? (
        <Alert severity="error">
          One or more Main Flow SQL files are missing. Check the configured script root:
          {" "}<strong>{status.scriptRoot}</strong>
        </Alert>
      ) : null}

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            divider={<Divider orientation="vertical" flexItem />}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1 }}>
              <ScheduleRoundedIcon sx={{ color: brand.colors.orange }} />
              <Box>
                <Typography variant="caption" sx={{ color: brand.colors.muted }}>
                  Current import anchor
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>
                  {formatAnchorDate(status?.currentAnchorDate)} at 09:00
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1 }}>
              <DataObjectRoundedIcon sx={{ color: brand.colors.navy }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: brand.colors.muted }}>
                  Main Flow source
                </Typography>
                <Typography sx={{ fontWeight: 700, wordBreak: "break-all" }}>
                  {status?.scriptRoot || "Not resolved"}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {scenarioGroups.map(([group, scenarios]) => (
        <Box key={group}>
          <Typography
            variant="overline"
            sx={{ color: brand.colors.muted, fontWeight: 900, letterSpacing: 1 }}
          >
            {group}
          </Typography>
          <Box
            sx={{
              mt: 1,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 2,
            }}
          >
            {scenarios.map((scenario) => {
              const importing = importingKey === scenario.key;
              const disabled =
                !status?.enabled ||
                !scenario.available ||
                Boolean(importingKey);
              return (
                <Card
                  key={scenario.key}
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    borderColor: scenario.reset ? "#fecaca" : brand.colors.line,
                    bgcolor: scenario.reset ? "#fffafa" : "#fff",
                  }}
                >
                  <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography variant="h6" sx={{ fontWeight: 850, color: brand.colors.navy }}>
                        {scenario.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={scenario.available ? "Ready" : "Missing SQL"}
                        color={scenario.available ? "success" : "error"}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography sx={{ mt: 1, color: brand.colors.muted, lineHeight: 1.6, flex: 1 }}>
                      {scenario.description}
                    </Typography>
                    <Button
                      sx={{ mt: 2, alignSelf: "flex-start" }}
                      variant={scenario.reset ? "outlined" : "contained"}
                      color={scenario.reset ? "error" : "primary"}
                      startIcon={
                        importing
                          ? <CircularProgress color="inherit" size={17} />
                          : scenario.reset
                            ? <AutorenewRoundedIcon />
                            : <FileUploadRoundedIcon />
                      }
                      disabled={disabled}
                      onClick={() => setSelectedScenario(scenario)}
                    >
                      {importing ? "Importing..." : scenario.reset ? "Reset demo" : "Import data"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      ))}

      {lastResult ? (
        <Alert severity="success" icon={<CheckCircleRoundedIcon />}>
          <Typography sx={{ fontWeight: 800 }}>
            {lastResult.title} imported successfully in {lastResult.durationMillis} ms.
          </Typography>
          <Typography variant="body2">
            Timeline anchor: {formatDateTime(lastResult.anchorDateTime)} · Event status:
            {" "}{lastResult.event?.status || "Unknown"} · Registration:
            {" "}{formatDateTime(lastResult.event?.registrationStartAt)} –{" "}
            {formatDateTime(lastResult.event?.registrationEndAt)}
          </Typography>
        </Alert>
      ) : null}

      <Dialog
        open={Boolean(selectedScenario)}
        onClose={importingKey ? undefined : () => setSelectedScenario(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 850 }}>
          {selectedScenario?.reset ? "Reset demo data?" : "Import this Main Flow stage?"}
        </DialogTitle>
        <DialogContent>
          <Alert severity={selectedScenario?.reset ? "error" : "warning"} sx={{ mb: 2 }}>
            This restores the seeded demo scope: events created outside the seeded Spring 2026
            and Summer 2026 events are removed, then teams, registrations, submissions, scores,
            rankings, notifications, and awards for the Summer 2026 demo event are rebuilt.
          </Alert>
          <Typography sx={{ fontWeight: 750 }}>{selectedScenario?.title}</Typography>
          <Typography sx={{ mt: 0.75, color: brand.colors.muted }}>
            {selectedScenario?.description}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Imported dates will be anchored to <strong>{formatAnchorDate(status?.currentAnchorDate)} at 09:00</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedScenario(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={selectedScenario?.reset ? "error" : "primary"}
            onClick={runImport}
          >
            Confirm import
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
