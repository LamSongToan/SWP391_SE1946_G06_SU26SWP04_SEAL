import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

export default function ConfirmActionDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmColor = "primary",
  onCancel,
  onConfirm,
}) {
  return (
    <Dialog
      className="ms-confirm-dialog"
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle className="ms-confirm-dialog-title">
        <Box className={`ms-confirm-dialog-icon is-${confirmColor}`}>
          <WarningAmberRoundedIcon fontSize="small" />
        </Box>
        <Typography component="span" fontWeight={700}>
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent className="ms-confirm-dialog-content">
        <Typography color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions className="ms-confirm-dialog-actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button color={confirmColor} onClick={onConfirm} variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
