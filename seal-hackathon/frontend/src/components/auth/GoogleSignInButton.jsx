import { useEffect, useRef } from "react";
import { Box } from "@mui/material";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({
  text = "signin_with",
  onCredential,
  disabled = false,
  width = 280,
}) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current || disabled) {
      return undefined;
    }

    let intervalId = null;

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) {
        return false;
      }

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        use_fedcm_for_button: false,
        callback: (response) => {
          if (response?.credential) {
            onCredential?.(response.credential);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "medium",
        text,
        shape: "pill",
        logo_alignment: "left",
        width,
      });
      return true;
    };

    if (!renderGoogleButton()) {
      intervalId = window.setInterval(() => {
        if (renderGoogleButton()) {
          window.clearInterval(intervalId);
        }
      }, 300);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [disabled, onCredential, text, width]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        minHeight: 40,
      }}
    >
      <Box ref={buttonRef} />
    </Box>
  );
}
