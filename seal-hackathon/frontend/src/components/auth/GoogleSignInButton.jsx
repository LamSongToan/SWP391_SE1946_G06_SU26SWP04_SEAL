import { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({
  text = "signin_with",
  onCredential,
  disabled = false,
  width,
  fullWidth = false,
  minHeight = 50,
}) {
  const buttonRef = useRef(null);
  const containerRef = useRef(null);
  const [resolvedWidth, setResolvedWidth] = useState(width || 280);

  useEffect(() => {
    if (!fullWidth || !containerRef.current) {
      setResolvedWidth(width || 280);
      return undefined;
    }

    const updateWidth = () => {
      const nextWidth = Math.max(240, Math.floor(containerRef.current?.clientWidth || 0));
      if (nextWidth) {
        setResolvedWidth(nextWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fullWidth, width]);

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
        size: "large",
        text,
        shape: "pill",
        logo_alignment: "left",
        width: resolvedWidth,
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
  }, [disabled, onCredential, resolvedWidth, text]);

  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        justifyContent: "center",
        width: fullWidth ? "100%" : "auto",
        minHeight,
        "& > div": {
          width: fullWidth ? "100%" : "auto",
          display: "flex",
          justifyContent: "center",
        },
        "& iframe": {
          width: fullWidth ? "100% !important" : "auto",
          minWidth: fullWidth ? "100% !important" : "auto",
          height: `${minHeight}px !important`,
        },
      }}
    >
      <Box ref={buttonRef} />
    </Box>
  );
}
