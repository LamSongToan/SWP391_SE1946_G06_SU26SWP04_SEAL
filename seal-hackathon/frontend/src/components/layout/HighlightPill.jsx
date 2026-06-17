import { Chip } from "@mui/material";
import { brand } from "../../styles/designTokens";

export default function HighlightPill({ label, sx = {}, ...props }) {
  return (
    <Chip
      label={label}
      sx={{
        height: 38,
        bgcolor: brand.colors.surfaceWarm,
        color: brand.colors.orange,
        fontWeight: 900,
        "& .MuiChip-label": {
          display: "flex",
          alignItems: "center",
          height: "100%",
        },
        ...sx,
      }}
      {...props}
    />
  );
}
