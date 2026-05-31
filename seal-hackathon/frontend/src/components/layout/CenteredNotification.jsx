import { Alert, Snackbar } from "@mui/material";

export default function CenteredNotification({
  message,
  severity = "success",
  onClose,
  autoHideDuration = 3500,
}) {
  return (
    <Snackbar
      className="ms-centered-notification"
      open={Boolean(message)}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
    >
      <Alert
        className="ms-centered-notification-alert"
        onClose={onClose}
        severity={severity}
        variant="filled"
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
