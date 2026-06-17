import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Chip, Stack, Typography } from "@mui/material";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { brand } from "../../styles/designTokens";

const metrics = [
  ["Spring", "Ideate"],
  ["Summer", "Prototype"],
  ["Fall", "Launch"],
];

const authActivityImages = {
  login: { src: "/seal-assets/seal-photo-2.jpg" },
  register: { src: "/seal-assets/seal-photo-1.jpg" },
};

const galleryImages = [
  { src: "/seal-assets/seal-photo-1.jpg" },
  { src: "/seal-assets/seal-photo-2.jpg" },
  { src: "/seal-assets/seal-banner-spring-2026.jpg" },
];

function AuthImage({ image, alt, sx = {} }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [image.src]);

  if (failed) {
    return (
      <Box
        role="img"
        aria-label={`${alt} placeholder`}
        sx={{
          display: "block",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, rgba(7,26,47,0.95) 0%, rgba(13,42,71,0.86) 50%, rgba(243,112,33,0.7) 100%)",
          ...sx,
        }}
      />
    );
  }

  return (
    <Box
      component="img"
      src={image.src}
      alt={alt}
      onError={() => setFailed(true)}
      sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover", ...sx }}
    />
  );
}

export default function AuthVisualPanel({ mode = "login" }) {
  const activityImage = authActivityImages[mode] || authActivityImages.login;

  return (
    <Box
      sx={{
        position: "relative",
        flexBasis: "58%",
        display: { xs: "none", md: "flex" },
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        overflow: "hidden",
        px: 6,
        color: brand.colors.inverse,
        background: brand.gradients.hero,
        "&:before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage: "radial-gradient(circle at 50% 44%, #000 0%, transparent 72%)",
        },
        "&:after": {
          content: '""',
          position: "absolute",
          width: 520,
          height: 520,
          right: "-16%",
          bottom: "-16%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(243,112,33,0.44) 0%, rgba(243,112,33,0.12) 42%, transparent 70%)",
        },
      }}
    >
      <Box sx={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <AuthImage image={activityImage} alt="SEAL Hackathon activity background" />
      </Box>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: "linear-gradient(115deg, rgba(6,19,34,0.92) 0%, rgba(6,19,34,0.68) 52%, rgba(243,112,33,0.36) 100%)",
        }}
      />
      <Stack
        spacing={4}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "min(640px, 92%)",
        }}
      >
        <Stack spacing={1.4}>
          <Typography
            component={RouterLink}
            to="/"
            sx={{
              color: brand.colors.inverse,
              fontSize: 34,
              fontWeight: 900,
              lineHeight: 1,
              textDecoration: "none",
            }}
          >
            {brand.appName}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.78)", fontSize: 16, maxWidth: 420 }}>
            Academic technology competition across Spring, Summer, and Fall.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.2}>
          {galleryImages.map((image, index) => (
            <Box
              key={image.src}
              sx={{
                width: 132,
                height: 86,
                overflow: "hidden",
                borderRadius: brand.radius.md,
                border: "1px solid rgba(255,255,255,0.24)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
              }}
            >
              <AuthImage image={image} alt={`SEAL Hackathon activity ${index + 1}`} />
            </Box>
          ))}
        </Stack>

        <Box
          sx={{
            position: "relative",
            minHeight: 440,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: "20px 70px 46px 10px",
              borderRadius: brand.radius.xl,
              bgcolor: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: brand.shadow.glow,
              backdropFilter: "blur(10px)",
            }}
          />

          <Box
            sx={{
              position: "absolute",
              left: 0,
              top: 58,
              width: "72%",
              borderRadius: brand.radius.lg,
              overflow: "hidden",
              bgcolor: "#061322",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.34)",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 46, px: 2, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              {[brand.colors.orange, brand.colors.amber, brand.colors.green].map((color) => (
                <Box key={color} sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
              ))}
              <Typography sx={{ color: "rgba(255,255,255,0.78)", fontSize: 12, fontFamily: brand.font.mono }}>
                seal-{mode}.tsx
              </Typography>
            </Stack>
            <Stack spacing={1.2} sx={{ p: 2.6, fontFamily: brand.font.mono, fontSize: 13 }}>
              <Typography sx={{ color: brand.colors.amber, fontFamily: "inherit", fontSize: "inherit" }}>const semester = ["Spring", "Summer", "Fall"];</Typography>
              <Typography sx={{ color: "#EAF2FF", fontFamily: "inherit", fontSize: "inherit" }}>team.form({"{ members: 5, track: 'SE' }"});</Typography>
              <Typography sx={{ color: brand.colors.cyan, fontFamily: "inherit", fontSize: "inherit" }}>mentor.review(sprintDemo);</Typography>
              <Typography sx={{ color: brand.colors.orange, fontFamily: "inherit", fontSize: "inherit" }}>judge.publishLeaderboard();</Typography>
              {[86, 54, 72].map((width) => (
                <Box key={width} sx={{ width: `${width}%`, height: 8, borderRadius: 99, bgcolor: "rgba(255,255,255,0.12)" }} />
              ))}
            </Stack>
          </Box>

          <Box
            sx={{
              position: "absolute",
              right: 18,
              top: 28,
              width: 210,
              p: 2,
              borderRadius: brand.radius.lg,
              bgcolor: brand.colors.surface,
              color: brand.colors.text,
              boxShadow: brand.shadow.md,
            }}
          >
            <Stack spacing={1.4}>
              <Typography sx={{ fontSize: 13, fontWeight: 900 }}>SEAL Semesters</Typography>
              {metrics.map(([semester, label]) => (
                <Stack key={semester} direction="row" alignItems="center" spacing={1.1}>
                  <Box sx={{ width: 34, height: 34, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: brand.colors.surfaceWarm, color: brand.colors.orange, fontWeight: 900 }}>
                    {semester[0]}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{semester}</Typography>
                    <Typography sx={{ fontSize: 11, color: brand.colors.muted }}>{label}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box
            sx={{
              position: "absolute",
              left: 44,
              bottom: 38,
              width: 338,
              p: 2,
              borderRadius: brand.radius.lg,
              bgcolor: "rgba(255,255,255,0.96)",
              color: brand.colors.text,
              boxShadow: brand.shadow.md,
            }}
          >
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Hackathon workflow</Typography>
            <Stack direction="row" spacing={1}>
              {[
                [GroupsRoundedIcon, "Team"],
                [CodeRoundedIcon, "Build"],
                [WorkspacePremiumRoundedIcon, "Win"],
              ].map(([Icon, label]) => (
                <Chip
                  key={label}
                  icon={<Icon />}
                  label={label}
                  sx={{
                    bgcolor: brand.colors.surfaceWarm,
                    color: brand.colors.navy,
                    fontWeight: 800,
                    "& .MuiChip-icon": { color: brand.colors.orange },
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
