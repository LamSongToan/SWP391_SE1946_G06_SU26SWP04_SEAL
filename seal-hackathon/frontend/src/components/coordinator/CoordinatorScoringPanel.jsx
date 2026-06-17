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
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { getApiErrorMessage, http } from "../../api/http";
import CenteredNotification from "../layout/CenteredNotification";
import ConfirmActionDialog from "../layout/ConfirmActionDialog";
import ModulePageHeader from "../layout/ModulePageHeader";
import { brand } from "../../styles/designTokens";

function createBlankCriterion() {
  return {
    criteriaId: null,
    criteriaName: "",
    weight: "",
    criteriaType: "",
  };
}

function normalizeCriteriaRows(rows) {
  return rows.map((row) => ({
    criteriaId: row.criteriaId ?? null,
    criteriaName: String(row.criteriaName || "").trim(),
    weight: Number(row.weight || 0),
    criteriaType: String(row.criteriaType || "").trim(),
  }));
}

function formatDateTime(value) {
  if (!value) return "Not finalized yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SectionCard({ title, description, action, children }) {
  return (
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
          alignItems={{ xs: "flex-start", lg: "center" }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography sx={{ color: brand.colors.text, fontSize: 22, fontWeight: 950 }}>
              {title}
            </Typography>
            <Typography sx={{ color: brand.colors.muted, fontSize: 14 }}>
              {description}
            </Typography>
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function EventRoundSelector({
  events,
  selectedEventId,
  onSelectEvent,
  rounds,
  selectedRoundId,
  onSelectRound,
}) {
  return (
    <SectionCard
      title="Scoring Workspace"
      description="Choose an event and round before configuring rubrics, templates, and finalization."
      action={null}
    >
      <Stack spacing={1.6}>
        <Box>
          <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 900, mb: 0.8 }}>
            EVENTS
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {events.map((event) => (
              <Chip
                key={event.eventId}
                label={event.name}
                onClick={() => onSelectEvent(event.eventId)}
                sx={{
                  cursor: "pointer",
                  fontWeight: 900,
                  bgcolor: selectedEventId === event.eventId ? brand.colors.navy : brand.colors.surfaceSoft,
                  color: selectedEventId === event.eventId ? brand.colors.inverse : brand.colors.text,
                }}
              />
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 900, mb: 0.8 }}>
            ROUNDS
          </Typography>
          {rounds.length === 0 ? (
            <Box className="ms-empty">
              <Typography fontWeight={800}>No rounds configured</Typography>
              <Typography variant="body2" color="text.secondary">
                Configure event rounds first before managing scoring.
              </Typography>
            </Box>
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {rounds.map((round) => (
                <Chip
                  key={round.roundId}
                  label={`${round.roundOrder}. ${round.roundName}`}
                  onClick={() => onSelectRound(round.roundId)}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 900,
                    bgcolor: selectedRoundId === round.roundId ? brand.colors.orange : brand.colors.surfaceWarm,
                    color: selectedRoundId === round.roundId ? brand.colors.inverse : brand.colors.text,
                  }}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </SectionCard>
  );
}

function CriteriaEditor({ rows, setRows, disabled }) {
  const totalWeight = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.weight || 0), 0),
    [rows]
  );

  const updateRow = (index, key, value) => {
    setRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [key]: value } : row
    )));
  };

  const removeRow = (index) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <Stack spacing={1.2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip
          label={`${totalWeight.toFixed(2)}% total weight`}
          color={Math.abs(totalWeight - 100) < 0.001 ? "success" : "warning"}
        />
        <Chip
          variant="outlined"
          label={`${rows.length} criterion${rows.length === 1 ? "" : "a"}`}
        />
      </Stack>

      {rows.map((row, index) => (
        <Box
          key={`${row.criteriaId ?? "new"}-${index}`}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.6fr 0.7fr 0.9fr auto" },
            gap: 1.2,
            alignItems: "start",
            p: 1.4,
            borderRadius: brand.radius.md,
            border: `1px solid ${brand.colors.line}`,
            bgcolor: brand.colors.surfaceSoft,
          }}
        >
          <TextField
            label="Criterion Name"
            value={row.criteriaName}
            disabled={disabled}
            onChange={(event) => updateRow(index, "criteriaName", event.target.value)}
          />
          <TextField
            label="Weight (%)"
            type="number"
            value={row.weight}
            disabled={disabled}
            inputProps={{ min: 0.01, step: 0.25 }}
            onChange={(event) => updateRow(index, "weight", event.target.value)}
          />
          <TextField
            label="Criterion Type"
            value={row.criteriaType}
            disabled={disabled}
            onChange={(event) => updateRow(index, "criteriaType", event.target.value)}
          />
          <IconButton
            onClick={() => removeRow(index)}
            disabled={disabled || rows.length === 1}
            sx={{ color: brand.colors.danger, mt: { xs: 0, md: 0.5 } }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}

      <Button
        variant="outlined"
        startIcon={<AddRoundedIcon />}
        disabled={disabled}
        onClick={() => setRows((current) => [...current, createBlankCriterion()])}
        sx={{ alignSelf: "flex-start", borderRadius: 999 }}
      >
        Add Criterion
      </Button>
    </Stack>
  );
}

function TemplateDialog({ open, mode, initialValue, onClose, onSubmit, saving }) {
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [criteriaRows, setCriteriaRows] = useState([createBlankCriterion()]);

  useEffect(() => {
    if (!open) return;
    setTemplateName(initialValue?.templateName || "");
    setDescription(initialValue?.description || "");
    setCriteriaRows(
      (initialValue?.criteria || []).length > 0
        ? initialValue.criteria.map((item) => ({
            criteriaId: item.criteriaId ?? null,
            criteriaName: item.criteriaName || "",
            weight: item.weight ?? "",
            criteriaType: item.criteriaType || "",
          }))
        : [createBlankCriterion()]
    );
  }, [initialValue, open]);

  const handleSubmit = () => {
    onSubmit({
      templateName,
      description,
      criteria: normalizeCriteriaRows(criteriaRows),
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>
        {mode === "edit" ? "Update Criteria Template" : "Create Criteria Template"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Template Name"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            disabled={saving}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={saving}
            multiline
            minRows={2}
          />
          <CriteriaEditor rows={criteriaRows} setRows={setCriteriaRows} disabled={saving} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : mode === "edit" ? "Update Template" : "Create Template"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CoordinatorScoringPanel() {
  const [events, setEvents] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [criteriaData, setCriteriaData] = useState(null);
  const [criteriaRows, setCriteriaRows] = useState([createBlankCriterion()]);
  const [templates, setTemplates] = useState([]);
  const [finalization, setFinalization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roundLoading, setRoundLoading] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateDialog, setTemplateDialog] = useState({ open: false, mode: "create", template: null });
  const [confirmState, setConfirmState] = useState({ open: false, mode: null, templateId: null, templateName: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentRound = useMemo(
    () => rounds.find((round) => round.roundId === selectedRoundId) || null,
    [rounds, selectedRoundId]
  );

  const loadTemplates = async () => {
    const response = await http.get("/api/coordinator/scoring/templates");
    setTemplates(response.data?.data || []);
  };

  const loadRoundWorkspace = async (roundId) => {
    if (!roundId) {
      setCriteriaData(null);
      setFinalization(null);
      setCriteriaRows([createBlankCriterion()]);
      return;
    }
    setRoundLoading(true);
    try {
      const [criteriaResponse, finalizationResponse] = await Promise.all([
        http.get(`/api/coordinator/scoring/rounds/${roundId}/criteria`),
        http.get(`/api/coordinator/scoring/rounds/${roundId}/finalization`),
      ]);
      const nextCriteria = criteriaResponse.data?.data || null;
      const nextFinalization = finalizationResponse.data?.data || null;
      setCriteriaData(nextCriteria);
      setCriteriaRows(
        (nextCriteria?.criteria || []).length > 0
          ? nextCriteria.criteria.map((item) => ({
              criteriaId: item.criteriaId,
              criteriaName: item.criteriaName,
              weight: item.weight,
              criteriaType: item.criteriaType,
            }))
          : [createBlankCriterion()]
      );
      setFinalization(nextFinalization);
    } finally {
      setRoundLoading(false);
    }
  };

  const loadBootstrap = async () => {
    setLoading(true);
    setError("");
    try {
      const eventResponse = await http.get("/api/coordinator/events");
      const nextEvents = eventResponse.data?.data || [];
      setEvents(nextEvents);
      await loadTemplates();
      if (nextEvents.length > 0) {
        const initialEventId = selectedEventId && nextEvents.some((event) => event.eventId === selectedEventId)
          ? selectedEventId
          : nextEvents[0].eventId;
        setSelectedEventId(initialEventId);
      } else {
        setSelectedEventId(null);
        setRounds([]);
        setSelectedRoundId(null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load scoring workspace"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBootstrap();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadRounds = async () => {
      if (!selectedEventId) {
        setRounds([]);
        setSelectedRoundId(null);
        return;
      }
      setRoundLoading(true);
      setError("");
      try {
        const response = await http.get(`/api/coordinator/events/${selectedEventId}/rounds`);
        if (!mounted) return;
        const nextRounds = (response.data?.data || []).slice().sort((a, b) => a.roundOrder - b.roundOrder);
        setRounds(nextRounds);
        setSelectedRoundId((current) => (
          current && nextRounds.some((round) => round.roundId === current)
            ? current
            : nextRounds[0]?.roundId || null
        ));
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, "Failed to load rounds for scoring"));
          setRounds([]);
          setSelectedRoundId(null);
        }
      } finally {
        if (mounted) {
          setRoundLoading(false);
        }
      }
    };

    loadRounds();
    return () => {
      mounted = false;
    };
  }, [selectedEventId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedRoundId) {
        setCriteriaData(null);
        setFinalization(null);
        setCriteriaRows([createBlankCriterion()]);
        return;
      }
      setError("");
      try {
        await loadRoundWorkspace(selectedRoundId);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Failed to load round scoring details"));
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedRoundId]);

  const handleSaveCriteria = async () => {
    if (!selectedRoundId) return;
    setSavingCriteria(true);
    setError("");
    try {
      const response = await http.put(`/api/coordinator/scoring/rounds/${selectedRoundId}/criteria`, {
        criteria: normalizeCriteriaRows(criteriaRows),
      });
      setCriteriaData(response.data?.data || null);
      setSuccess("Round scoring criteria updated.");
      await loadRoundWorkspace(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update round criteria"));
    } finally {
      setSavingCriteria(false);
    }
  };

  const handleSaveTemplate = async (payload) => {
    setSavingTemplate(true);
    setError("");
    try {
      if (templateDialog.mode === "edit" && templateDialog.template?.templateId) {
        await http.put(`/api/coordinator/scoring/templates/${templateDialog.template.templateId}`, payload);
        setSuccess("Criteria template updated.");
      } else {
        await http.post("/api/coordinator/scoring/templates", payload);
        setSuccess("Criteria template created.");
      }
      setTemplateDialog({ open: false, mode: "create", template: null });
      await loadTemplates();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save criteria template"));
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleApplyTemplate = async (templateId) => {
    if (!selectedRoundId) return;
    setError("");
    try {
      await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/apply-template/${templateId}`);
      setSuccess("Template applied to the selected round.");
      await loadRoundWorkspace(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to apply criteria template"));
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    setError("");
    try {
      await http.delete(`/api/coordinator/scoring/templates/${templateId}`);
      setSuccess("Criteria template deleted.");
      await loadTemplates();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete criteria template"));
    }
  };

  const handleFinalizeRound = async () => {
    if (!selectedRoundId) return;
    setError("");
    try {
      await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/finalize`);
      setSuccess("Round scores finalized and locked.");
      await loadRoundWorkspace(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to finalize round scores"));
    }
  };

  const handleReopenRound = async () => {
    if (!selectedRoundId) return;
    setError("");
    try {
      await http.post(`/api/coordinator/scoring/rounds/${selectedRoundId}/reopen`);
      setSuccess("Round finalization reopened.");
      await loadRoundWorkspace(selectedRoundId);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reopen round finalization"));
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
      <CenteredNotification
        message={error || success}
        severity={error ? "error" : "success"}
        onClose={() => {
          setError("");
          setSuccess("");
        }}
      />

      <Stack spacing={2}>
        <ModulePageHeader
          eyebrow="Evaluation Setup"
          title="Scoring Management"
          description="Manage round rubrics, criteria templates, and final score locking from one scoring workspace."
        />

        <EventRoundSelector
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
          rounds={rounds}
          selectedRoundId={selectedRoundId}
          onSelectRound={setSelectedRoundId}
        />

        {events.length === 0 ? (
          <Box className="ms-empty">
            <Typography fontWeight={800}>No events configured</Typography>
            <Typography variant="body2" color="text.secondary">
              Create an event and configure rounds before managing scoring.
            </Typography>
          </Box>
        ) : null}

        {roundLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: brand.colors.orange }} />
          </Box>
        ) : currentRound ? (
          <>
            <SectionCard
              title="Scoring Criteria Management"
              description={`Maintain the active rubric for ${currentRound.roundName}. Criteria can only change before scoring begins.`}
              action={(
                <Button
                  variant="contained"
                  startIcon={<SaveRoundedIcon />}
                  onClick={handleSaveCriteria}
                  disabled={savingCriteria || !criteriaData?.editable}
                >
                  {savingCriteria ? "Updating..." : "Update Criteria"}
                </Button>
              )}
            >
              {!criteriaData?.editable && criteriaData?.lockedReason ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {criteriaData.lockedReason}
                </Alert>
              ) : null}
              <CriteriaEditor rows={criteriaRows} setRows={setCriteriaRows} disabled={!criteriaData?.editable || savingCriteria} />
            </SectionCard>

            <SectionCard
              title="Criteria Template Management"
              description="Build reusable rubric templates and apply them to any round before scoring starts."
              action={(
                <Button
                  variant="outlined"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => setTemplateDialog({ open: true, mode: "create", template: null })}
                >
                  Create Template
                </Button>
              )}
            >
              {templates.length === 0 ? (
                <Box className="ms-empty">
                  <Typography fontWeight={800}>No templates yet</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create your first rubric template so coordinators can reuse the same scoring structure.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.3}>
                  {templates.map((template) => (
                    <Box
                      key={template.templateId}
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
                        spacing={1.3}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography sx={{ color: brand.colors.text, fontWeight: 900, fontSize: 16 }}>
                              {template.templateName}
                            </Typography>
                            <Chip size="small" label={`${template.criteriaCount} criteria`} />
                            <Chip size="small" variant="outlined" label={`${Number(template.totalWeight || 0).toFixed(2)}% total`} />
                          </Stack>
                          {template.description ? (
                            <Typography sx={{ color: brand.colors.muted, fontSize: 13, mt: 0.7 }}>
                              {template.description}
                            </Typography>
                          ) : null}
                          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                            {(template.criteria || []).map((item, index) => (
                              <Chip
                                key={`${template.templateId}-${index}`}
                                size="small"
                                label={`${item.criteriaName} (${item.weight}%)`}
                                sx={{ bgcolor: brand.colors.surface }}
                              />
                            ))}
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AutoFixHighRoundedIcon />}
                            disabled={!criteriaData?.editable}
                            onClick={() => handleApplyTemplate(template.templateId)}
                          >
                            Apply to Round
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setTemplateDialog({ open: true, mode: "edit", template })}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => setConfirmState({
                              open: true,
                              mode: "delete-template",
                              templateId: template.templateId,
                              templateName: template.templateName,
                            })}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </SectionCard>

            <SectionCard
              title="Score Finalization"
              description="Preview readiness, rank submissions per track, and lock round scoring when everything is complete."
              action={(
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshRoundedIcon />}
                    onClick={() => loadRoundWorkspace(selectedRoundId)}
                  >
                    Refresh
                  </Button>
                  {finalization?.scoreLocked ? (
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<GavelRoundedIcon />}
                      onClick={() => setConfirmState({ open: true, mode: "reopen-round" })}
                    >
                      Reopen Finalization
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<AssignmentTurnedInRoundedIcon />}
                      disabled={!finalization?.canFinalize}
                      onClick={() => setConfirmState({ open: true, mode: "finalize-round" })}
                    >
                      Finalize Round
                    </Button>
                  )}
                </Stack>
              )}
            >
              {finalization ? (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`${finalization.criteriaCount} criteria`} />
                    <Chip label={`${finalization.readySubmissions}/${finalization.totalSubmissions} submissions ready`} />
                    <Chip label={`Top ${finalization.promotionRuleTopN} per track`} />
                    <Chip
                      color={finalization.scoreLocked ? "success" : finalization.canFinalize ? "warning" : "default"}
                      label={finalization.scoreLocked ? "Locked" : finalization.canFinalize ? "Ready to finalize" : "Blocked"}
                    />
                  </Stack>
                  <Alert severity={finalization.canFinalize ? "success" : finalization.scoreLocked ? "info" : "warning"}>
                    {finalization.finalizationNote}
                    {finalization.scoreLocked && finalization.finalizedAt ? ` Finalized at ${formatDateTime(finalization.finalizedAt)}.` : ""}
                  </Alert>

                  <Stack spacing={1}>
                    {(finalization.submissions || []).map((item) => (
                      <Box
                        key={item.submissionId}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", lg: "1.2fr 0.9fr 0.8fr 0.8fr 1fr" },
                          gap: 1.2,
                          p: 1.4,
                          borderRadius: brand.radius.md,
                          border: `1px solid ${brand.colors.line}`,
                          bgcolor: item.ready ? "#F5FFF8" : brand.colors.surfaceSoft,
                        }}
                      >
                        <Box>
                          <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>
                            {item.teamName}
                          </Typography>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 13 }}>
                            {item.trackName}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 900 }}>
                            Judge Coverage
                          </Typography>
                          <Typography sx={{ color: brand.colors.text, fontWeight: 800 }}>
                            {item.finalizedJudgeCount}/{item.assignedJudgeCount} finalized
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 900 }}>
                            Weighted Score
                          </Typography>
                          <Typography sx={{ color: brand.colors.text, fontWeight: 800 }}>
                            {item.totalScore ?? "--"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 900 }}>
                            Ranking
                          </Typography>
                          <Typography sx={{ color: brand.colors.text, fontWeight: 800 }}>
                            {item.rankPosition ? `#${item.rankPosition}` : "--"}
                          </Typography>
                        </Box>
                        <Box>
                          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                            <Chip size="small" color={item.ready ? "success" : "default"} label={item.ready ? "Ready" : "Blocked"} />
                            <Chip
                              size="small"
                              color={item.qualifiedNextRound ? "success" : "default"}
                              label={item.qualifiedNextRound ? "Qualified" : item.submissionStatus}
                            />
                          </Stack>
                          <Typography sx={{ color: brand.colors.muted, fontSize: 12, mt: 0.8 }}>
                            {item.readinessNote}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              ) : null}
            </SectionCard>
          </>
        ) : null}
      </Stack>

      <TemplateDialog
        open={templateDialog.open}
        mode={templateDialog.mode}
        initialValue={templateDialog.template}
        onClose={() => setTemplateDialog({ open: false, mode: "create", template: null })}
        onSubmit={handleSaveTemplate}
        saving={savingTemplate}
      />

      <ConfirmActionDialog
        open={confirmState.open}
        title={
          confirmState.mode === "delete-template"
            ? "Delete criteria template?"
            : confirmState.mode === "finalize-round"
              ? "Finalize round scores?"
              : "Reopen round finalization?"
        }
        message={
          confirmState.mode === "delete-template"
            ? `Delete "${confirmState.templateName}" permanently? This will not remove existing round criteria that were already applied.`
            : confirmState.mode === "finalize-round"
              ? "This will lock the round, compute rankings for every track, and mark teams as qualified or eliminated."
              : "This will unlock the round, clear saved rankings, and move qualified/eliminated submissions back to Evaluating."
        }
        confirmLabel={
          confirmState.mode === "delete-template"
            ? "Delete"
            : confirmState.mode === "finalize-round"
              ? "Finalize"
              : "Reopen"
        }
        confirmColor={confirmState.mode === "delete-template" ? "error" : "primary"}
        onCancel={() => setConfirmState({ open: false, mode: null, templateId: null, templateName: "" })}
        onConfirm={async () => {
          const mode = confirmState.mode;
          const templateId = confirmState.templateId;
          setConfirmState({ open: false, mode: null, templateId: null, templateName: "" });
          if (mode === "delete-template" && templateId) {
            await handleDeleteTemplate(templateId);
          } else if (mode === "finalize-round") {
            await handleFinalizeRound();
          } else if (mode === "reopen-round") {
            await handleReopenRound();
          }
        }}
      />
    </Box>
  );
}
