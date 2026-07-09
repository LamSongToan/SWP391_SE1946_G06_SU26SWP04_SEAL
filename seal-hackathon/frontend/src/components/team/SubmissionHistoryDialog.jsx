import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";

function formatDateTime(value) {
  if (!value) return "Time pending";
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

function actionTone(actionType = "") {
  const normalized = String(actionType).toUpperCase();
  if (normalized === "CREATED") {
    return {
      label: "Created",
      Icon: AddCircleOutlineRoundedIcon,
      className: "is-created",
    };
  }
  if (normalized === "UPDATED") {
    return {
      label: "Updated",
      Icon: UpdateRoundedIcon,
      className: "is-updated",
    };
  }
  return {
    label: normalized || "Changed",
    Icon: HistoryRoundedIcon,
    className: "is-default",
  };
}

function LinkValue({ label, value, muted = false }) {
  return (
    <Box className={`submission-history-link-value ${muted ? "is-muted" : ""}`}>
      <Typography component="span" className="submission-history-link-label">
        {label}
      </Typography>
      {value ? (
        <Button
          component="a"
          href={value}
          target="_blank"
          rel="noreferrer"
          endIcon={<OpenInNewRoundedIcon />}
          className="submission-history-link"
        >
          {value}
        </Button>
      ) : (
        <Typography component="span" className="submission-history-empty-value">
          Not provided
        </Typography>
      )}
    </Box>
  );
}

function ChangeRow({ label, oldValue, newValue }) {
  if (!oldValue && !newValue) return null;

  return (
    <Box className="submission-history-change-row">
      <Stack direction="row" spacing={0.9} alignItems="center" className="submission-history-change-title">
        <LinkRoundedIcon />
        <Typography>{label}</Typography>
      </Stack>
      <Box className="submission-history-change-body">
        {oldValue ? <LinkValue label="Old" value={oldValue} muted /> : null}
        {oldValue ? (
          <ArrowForwardRoundedIcon className="submission-history-arrow" />
        ) : null}
        <LinkValue label={oldValue ? "New" : "Current"} value={newValue} />
      </Box>
    </Box>
  );
}

function HistoryItem({ item, index }) {
  const tone = actionTone(item.actionType);
  const Icon = tone.Icon;
  const statusChanged = item.oldStatus && item.oldStatus !== item.newStatus;

  return (
    <Box className="submission-history-item">
      <Box className="submission-history-marker">
        <span>{index + 1}</span>
      </Box>
      <Box className="submission-history-card">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          className="submission-history-card-head"
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              icon={<Icon />}
              label={tone.label}
              className={`submission-history-action-chip ${tone.className}`}
            />
            {statusChanged ? (
              <Chip
                size="small"
                label={`${item.oldStatus} -> ${item.newStatus}`}
                className="submission-history-status-chip"
              />
            ) : item.newStatus ? (
              <Chip
                size="small"
                label={item.newStatus}
                className="submission-history-status-chip"
              />
            ) : null}
          </Stack>
          <Stack direction="row" spacing={0.7} alignItems="center" className="submission-history-time">
            <ScheduleRoundedIcon />
            <Typography>{formatDateTime(item.createdAt)}</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.7} alignItems="center" className="submission-history-author">
          <PersonOutlineRoundedIcon />
          <Typography>
            Changed by <strong>{item.changedByName || "System"}</strong>
          </Typography>
        </Stack>

        <Stack spacing={1} className="submission-history-changes">
          <ChangeRow
            label="Repository"
            oldValue={item.oldRepositoryUrl}
            newValue={item.newRepositoryUrl}
          />
          <ChangeRow
            label="Demo"
            oldValue={item.oldDemoUrl}
            newValue={item.newDemoUrl}
          />
          <ChangeRow
            label="Slides / Report"
            oldValue={item.oldSlideUrl}
            newValue={item.newSlideUrl}
          />
        </Stack>
      </Box>
    </Box>
  );
}

export default function SubmissionHistoryDialog({ open, onClose, loading, history }) {
  const entries = history || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ className: "submission-history-dialog" }}
    >
      <DialogTitle component="div" className="submission-history-title">
        <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.1} alignItems="center">
            <Box className="submission-history-title-icon">
              <HistoryRoundedIcon />
            </Box>
            <Box>
              <Typography component="h2">Submission History</Typography>
              <Typography component="p">
                Review every submission link change in chronological order.
              </Typography>
            </Box>
          </Stack>
          <Chip label={`${entries.length} change${entries.length === 1 ? "" : "s"}`} className="submission-history-count" />
        </Stack>
      </DialogTitle>
      <DialogContent className="submission-history-content">
        {loading ? (
          <Box className="team-loading"><CircularProgress /></Box>
        ) : entries.length === 0 ? (
          <Box className="submission-history-empty">
            <HistoryRoundedIcon />
            <Typography fontWeight={800}>No history recorded</Typography>
            <Typography color="text.secondary" variant="body2">
              Create or update a submission first, then changes will appear here.
            </Typography>
          </Box>
        ) : (
          <Box className="submission-history-list">
            {entries.map((item, index) => (
              <HistoryItem key={item.historyId || `${item.actionType}-${item.createdAt}-${index}`} item={item} index={index} />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions className="submission-history-actions">
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
