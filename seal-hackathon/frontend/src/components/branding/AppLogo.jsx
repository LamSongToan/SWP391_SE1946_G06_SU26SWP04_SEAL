import { Box } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { brand } from "../../styles/designTokens";

const LOGO_SOURCES = {
  full: "/brand/logo-text.png",
  mark: "/brand/logo-only.png",
};

export default function AppLogo({
  variant = "full",
  alt = "SEAL Hackathon",
  height = 46,
  to = "/",
  surface = "none",
  sx = {},
  imageSx = {},
}) {
  const WrapperComponent = to ? RouterLink : "div";
  const surfaceStyles = surface === "soft"
    ? {
        px: 1.5,
        py: 1,
        borderRadius: brand.radius.lg,
        bgcolor: "rgba(255,255,255,0.96)",
        boxShadow: "0 16px 36px rgba(0,0,0,0.18)",
        backdropFilter: "blur(10px)",
      }
    : {};

  return (
    <Box
      component={WrapperComponent}
      to={to || undefined}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-start",
        textDecoration: "none",
        lineHeight: 0,
        ...surfaceStyles,
        ...sx,
      }}
    >
      <Box
        component="img"
        src={LOGO_SOURCES[variant] || LOGO_SOURCES.full}
        alt={alt}
        sx={{
          display: "block",
          width: "auto",
          height,
          maxWidth: "100%",
          objectFit: "contain",
          ...imageSx,
        }}
      />
    </Box>
  );
}
