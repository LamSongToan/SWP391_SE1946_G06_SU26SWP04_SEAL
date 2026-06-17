import { Box, Stack, Typography } from "@mui/material";
import { brand } from "../../styles/designTokens";

export default function ModulePageHeader({
  eyebrow,
  title,
  titleSuffix = null,
  description,
  actions = null,
  children = null,
  sx = {},
}) {
  return (
    <Box
      sx={{
        mb: 2.5,
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "flex-start" }}
        spacing={1.5}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow ? (
            <Typography
              sx={{
                color: brand.colors.orange,
                fontSize: 12,
                fontWeight: 950,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                mb: 0.55,
              }}
            >
              {eyebrow}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography
              sx={{
                color: brand.colors.text,
                fontSize: 22,
                fontWeight: 950,
                lineHeight: 1.18,
              }}
            >
              {title}
            </Typography>
            {titleSuffix}
          </Stack>
          {description ? (
            <Typography
              sx={{
                color: brand.colors.muted,
                fontSize: 14,
                mt: 0.6,
                maxWidth: 760,
              }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>
        {actions ? (
          <Box sx={{ alignSelf: { xs: "stretch", md: "center" } }}>
            {actions}
          </Box>
        ) : null}
      </Stack>
      {children ? (
        <Box sx={{ mt: 1.4 }}>
          {children}
        </Box>
      ) : null}
    </Box>
  );
}
