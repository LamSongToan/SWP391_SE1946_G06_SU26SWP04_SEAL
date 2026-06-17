import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  Grid2,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import FacebookRoundedIcon from "@mui/icons-material/FacebookRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import InstagramIcon from "@mui/icons-material/Instagram";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { getApiErrorMessage, http } from "../../api/http";
import { brand } from "../../styles/designTokens";
import EventCatalogExperience from "../../components/event/EventCatalogExperience";

const navItems = [
  ["About", "#about"],
  ["System", "#system"],
  ["Events", "#events"],
  ["Rankings", "#rankings"],
  ["Participants", "#participants"],
  ["FAQ", "#faq"],
];

const hackathons = [
  {
    semester: "Spring",
    title: "SDLC & Professional Working",
    description: "A semester Hackathon focused on software development life cycle topics and professional working skills.",
  },
  {
    semester: "Summer",
    title: "Summer SEAL - Emerging Technologies",
    description: "A semester Hackathon focused on emerging technologies and modern directions such as AI, IoT, Blockchain, and research-oriented trends.",
  },
  {
    semester: "Fall",
    title: "Product & User Experience",
    description: "A semester Hackathon focused on user-oriented product development, practical experience, and idea commercialization.",
  },
];

const rankingTypes = [
  {
    title: "Chapter Ranking",
    description: "Maintained throughout the year based on the best achievements of teams in each Chapter and the defined point adjustment rules.",
  },
  {
    title: "Team Ranking",
    description: "Applied within each Hackathon and reflects the direct performance of teams in that Hackathon. It is not accumulated across Hackathons.",
  },
  {
    title: "Individual Ranking",
    description: "Published after the three Hackathons to recognize individual performance across the SEAL Hackathon system.",
  },
];

const benefits = [
  [CodeRoundedIcon, "Academic technology experience", "Students work through real software and technology challenges in a structured Hackathon environment."],
  [GroupsRoundedIcon, "Team-based competition", "Participants compete as teams and experience collaboration, coordination, and delivery pressure."],
  [PsychologyRoundedIcon, "Professional skill development", "The system emphasizes SDLC practice, professional working skills, product thinking, and modern technologies."],
  [WorkspacePremiumRoundedIcon, "Recognition through rankings", "Results are consolidated into Chapter, Team, and Individual rankings."],
];

const competitionFacts = [
  ["Annual system", "Three Hackathons are organized every year, aligned with the Spring, Summer, and Fall semesters."],
  ["Academic scope", "The competition is designed for Information Technology students at FPT University HCMC and other universities in Ho Chi Minh City."],
  ["Theme rotation", "Each semester has a defined academic direction: SDLC and professional work, emerging technologies, or product and user experience."],
  ["Ranking publication", "Results are consolidated into Chapter, Team, and Individual rankings after the three Hackathons."],
];

const faqs = [
  ["Who can participate?", "SEAL Hackathon is for Information Technology students studying at FPT University HCMC and other universities in Ho Chi Minh City."],
  ["How many Hackathons are organized each year?", "SEAL organizes three Hackathons every year, corresponding to the Spring, Summer, and Fall semesters."],
  ["What are the annual themes?", "Spring focuses on SDLC & Professional Working, Summer focuses on Emerging Technologies, and Fall focuses on Product & User Experience."],
  ["How are results published?", "Results are published through Chapter, Team, and Individual rankings after the Hackathon cycle."],
];

const activityImages = [
  { src: "/seal-assets/seal-photo-1.jpg", label: "SEAL Hackathon Showcase" },
  { src: "/seal-assets/seal-photo-2.jpg", label: "Project Presentation Round" },
  { src: "/seal-assets/seal-banner-spring-2026.jpg", label: "Spring 2026 Identity" },
];

function Logo({ dark = false }) {
  return (
    <Stack component={RouterLink} to="/" direction="row" alignItems="center" spacing={1.2} sx={{ textDecoration: "none" }}>
      <Box
        className="seal-logo-mark"
        sx={{
          width: 38,
          height: 38,
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          color: brand.colors.inverse,
          background: brand.gradients.orange,
          boxShadow: dark ? "none" : brand.shadow.sm,
        }}
      >
        <VerifiedRoundedIcon sx={{ fontSize: 22 }} />
      </Box>
      <Box>
        <Typography sx={{ color: dark ? brand.colors.inverse : brand.colors.text, fontSize: 19, fontWeight: 950, lineHeight: 1.05 }}>
          SEAL Hackathon
        </Typography>
        <Typography sx={{ color: dark ? "rgba(255,255,255,0.72)" : brand.colors.muted, fontSize: 11, fontWeight: 800, letterSpacing: 0.4 }}>
          Software Engineering Agile League
        </Typography>
      </Box>
    </Stack>
  );
}

function ActivityImage({ image, alt, sx = {} }) {
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
            "linear-gradient(135deg, rgba(7,26,47,0.95) 0%, rgba(13,42,71,0.9) 52%, rgba(243,112,33,0.72) 100%)",
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

function FptMark() {
  return (
    <Stack direction="row" alignItems="center" spacing={0.6}>
      {[
        ["F", brand.colors.orange],
        ["P", brand.colors.green],
        ["T", brand.colors.blue],
      ].map(([letter, color]) => (
        <Box
          key={letter}
          sx={{
            width: 34,
            height: 28,
            borderRadius: 1.5,
            bgcolor: color,
            color: brand.colors.inverse,
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
          }}
        >
          {letter}
        </Box>
      ))}
      <Typography sx={{ color: "rgba(255,255,255,0.82)", fontWeight: 800, ml: 1 }}>
        University HCMC
      </Typography>
    </Stack>
  );
}

function ActivityPhotoPanel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % activityImages.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  const activeImage = activityImages[activeIndex];

  return (
    <Box
      className="seal-photo-panel"
      sx={{
        position: "relative",
        minHeight: { xs: 420, md: 560 },
        borderRadius: brand.radius.xl,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: brand.shadow.glow,
        background: "#061322",
      }}
    >
      {activityImages.map((image, index) => (
        <ActivityImage
          key={image.src}
          image={image}
          alt={image.label}
          sx={{
            position: "absolute",
            inset: 0,
            opacity: activeIndex === index ? 1 : 0,
            transform: activeIndex === index ? "scale(1.02)" : "scale(1)",
            transition: "opacity 900ms ease, transform 5200ms ease",
          }}
        />
      ))}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(7,26,47,0.1) 0%, rgba(7,26,47,0.22) 42%, rgba(7,26,47,0.82) 100%)",
        }}
      />
      <Stack direction="row" spacing={1.2} sx={{ position: "absolute", top: 20, right: 20, display: { xs: "none", sm: "flex" } }}>
        {activityImages.map((image, index) => (
          <Box
            key={image.src}
            component="button"
            type="button"
            onClick={() => setActiveIndex(index)}
            className="seal-photo-thumb"
            aria-label={`Show ${image.label}`}
            sx={{
              position: "relative",
              width: activeIndex === index ? 142 : 118,
              height: 84,
              p: 0,
              overflow: "hidden",
              borderRadius: brand.radius.md,
              border: activeIndex === index ? `2px solid ${brand.colors.amber}` : "1px solid rgba(255,255,255,0.32)",
              boxShadow: activeIndex === index ? "0 18px 42px rgba(253,181,21,0.22)" : "0 14px 34px rgba(0,0,0,0.24)",
              cursor: "pointer",
              transition: "width 260ms ease, border-color 260ms ease, box-shadow 260ms ease",
              bgcolor: "transparent",
            }}
          >
            <ActivityImage image={image} alt={`SEAL activity ${index + 1}`} />
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 4,
                bgcolor: "rgba(255,255,255,0.18)",
              }}
            >
              <Box
                key={activeIndex === index ? `active-${index}` : `idle-${index}`}
                sx={{
                  width: activeIndex === index ? "100%" : "0%",
                  height: "100%",
                  bgcolor: brand.colors.amber,
                  transition: activeIndex === index ? "width 4200ms linear" : "none",
                }}
              />
            </Box>
          </Box>
        ))}
      </Stack>
      <Stack className="seal-photo-caption" sx={{ position: "absolute", left: { xs: 18, md: 26 }, right: { xs: 18, md: 26 }, bottom: { xs: 18, md: 26 } }} spacing={1.2}>
        <Chip label={activeImage.label} sx={{ alignSelf: "flex-start", bgcolor: "rgba(255,255,255,0.14)", color: brand.colors.inverse, fontWeight: 900 }} />
        <Typography sx={{ color: brand.colors.inverse, fontSize: { xs: 24, md: 32 }, fontWeight: 950, lineHeight: 1.12, maxWidth: 680 }}>
          Academic competition and technology experience at FPT University HCMC.
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.78)", maxWidth: 640, lineHeight: 1.65 }}>
          Spring, Summer, and Fall Hackathons connect students, teams, mentors, judges, and ranking outcomes.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {hackathons.map((item) => (
            <Chip key={item.semester} label={item.semester} sx={{ bgcolor: brand.colors.surface, color: brand.colors.navy, fontWeight: 900 }} />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsError, setEventsError] = useState("");

  const loadEventCatalog = async () => {
    setEventsError("");
    try {
      const response = await http.get("/api/public/events/catalog");
      setEvents(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      setEventsError(getApiErrorMessage(err, "Event data is currently unavailable."));
      setEvents([]);
    }
  };

  useEffect(() => {
    loadEventCatalog();
  }, []);

  const nav = (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
      {navItems.map(([label, target]) => (
        <Button
          key={label}
          component="a"
          href={target}
          onClick={() => setMobileOpen(false)}
          sx={{
            color: brand.colors.muted,
            fontSize: 14,
            fontWeight: 800,
            "&:hover": { color: brand.colors.orange, bgcolor: "transparent" },
          }}
        >
          {label}
        </Button>
      ))}
    </Stack>
  );

  return (
    <Box sx={{ bgcolor: brand.colors.surfaceSoft, color: brand.colors.text, fontFamily: brand.font.primary }}>
      <AppBar
        elevation={0}
        position="sticky"
        sx={{
          height: 74,
          bgcolor: "rgba(255,255,255,0.94)",
          color: brand.colors.text,
          borderBottom: `1px solid ${brand.colors.line}`,
          backdropFilter: "blur(14px)",
        }}
      >
        <Container maxWidth="xl" sx={{ height: "100%" }}>
          <Toolbar disableGutters sx={{ minHeight: "74px !important", justifyContent: "space-between", gap: 2 }}>
            <Logo />
            <Box sx={{ display: { xs: "none", md: "block" } }}>{nav}</Box>
            <Stack direction="row" spacing={1.2} sx={{ display: { xs: "none", md: "flex" } }}>
              <Button component={RouterLink} to="/login" variant="outlined" sx={{ borderColor: brand.colors.lineStrong, color: brand.colors.navy }}>
                Sign in
              </Button>
              <Button component={RouterLink} to="/register/verify-email" variant="contained" sx={{ bgcolor: brand.colors.orange, "&:hover": { bgcolor: brand.colors.orangeDark } }}>
                Register
              </Button>
            </Stack>
            <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { xs: "inline-flex", md: "none" }, color: brand.colors.navy }}>
              <MenuRoundedIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { width: 304, p: 2.5 } }}>
        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Logo />
            <IconButton onClick={() => setMobileOpen(false)}><CloseRoundedIcon /></IconButton>
          </Stack>
          {nav}
          <Divider />
          <Button component={RouterLink} to="/login" variant="outlined">Sign in</Button>
          <Button component={RouterLink} to="/register/verify-email" variant="contained" sx={{ bgcolor: brand.colors.orange }}>Register</Button>
        </Stack>
      </Drawer>

      <Box component="main">
        <Box
          id="hero"
          sx={{
            position: "relative",
            overflow: "hidden",
            color: brand.colors.inverse,
            background: brand.gradients.hero,
            pt: { xs: 6, md: 8 },
            pb: { xs: 7, md: 9 },
            "&:before": {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.075) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "linear-gradient(to bottom, #000 0%, #000 72%, transparent 100%)",
            },
          }}
        >
          <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
            <Grid2 container alignItems="center" spacing={{ xs: 4, md: 6 }}>
              <Grid2 size={{ xs: 12, md: 5.1 }} className="seal-reveal seal-hero-copy">
                <Chip
                  className="seal-kicker"
                  icon={<VerifiedRoundedIcon />}
                  label="FPT University HCMC"
                  sx={{ mb: 2.2, bgcolor: "rgba(255,255,255,0.12)", color: brand.colors.inverse, fontWeight: 900, "& .MuiChip-icon": { color: brand.colors.amber } }}
                />
                <Typography className="seal-hero-title" component="h1" sx={{ fontSize: { xs: 44, md: 68 }, fontWeight: 950, lineHeight: 0.98, letterSpacing: 0 }}>
                  SEAL Hackathon
                </Typography>
                <Typography className="seal-gradient-text" sx={{ mt: 1.5, color: brand.colors.amber, fontSize: { xs: 22, md: 32 }, fontWeight: 900, lineHeight: 1.18 }}>
                  Software Engineering Agile League
                </Typography>
                <Typography className="seal-hero-lead" sx={{ mt: 2.2, color: "rgba(255,255,255,0.78)", fontSize: { xs: 16, md: 18 }, lineHeight: 1.75, maxWidth: 620 }}>
                  An annual academic Hackathon system and technology experience for Information Technology students at FPT University HCMC and other universities in Ho Chi Minh City.
                </Typography>
                <Stack className="seal-cta-row" direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3.2 }}>
                  <Button className="seal-cta-primary" component={RouterLink} to="/register/verify-email" size="large" variant="contained" endIcon={<KeyboardArrowRightRoundedIcon />} sx={{ height: 52, px: 3.2, bgcolor: brand.colors.orange, "&:hover": { bgcolor: brand.colors.orangeDark } }}>
                    Register
                  </Button>
                  <Button className="seal-cta-secondary" component="a" href="#about" size="large" variant="outlined" sx={{ height: 52, px: 3, color: brand.colors.inverse, borderColor: "rgba(255,255,255,0.42)", "&:hover": { borderColor: brand.colors.inverse, bgcolor: "rgba(255,255,255,0.08)" } }}>
                    Learn more
                  </Button>
                </Stack>
                <Stack className="seal-chip-row" direction="row" flexWrap="wrap" gap={1.1} sx={{ mt: 2.8 }}>
                  {["3 Hackathons per year", "Spring / Summer / Fall", "Chapter / Team / Individual rankings"].map((label) => (
                    <Chip className="seal-hero-chip" key={label} label={label} sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.88)", fontWeight: 800 }} />
                  ))}
                </Stack>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 6.9 }} className="seal-reveal">
                <ActivityPhotoPanel />
              </Grid2>
            </Grid2>
          </Container>
        </Box>

        <Box id="about" sx={{ py: { xs: 7, md: 10 }, bgcolor: brand.colors.surface }}>
          <Container maxWidth="xl">
            <Grid2 container spacing={4} alignItems="center">
              <Grid2 size={{ xs: 12, md: 5 }} className="seal-reveal">
                <Typography sx={{ color: brand.colors.orange, fontSize: 13, fontWeight: 950, letterSpacing: 1.5, mb: 1.2 }}>
                  ABOUT SEAL
                </Typography>
                <Typography component="h2" sx={{ color: brand.colors.text, fontSize: { xs: 32, md: 44 }, fontWeight: 950, lineHeight: 1.08 }}>
                  A structured academic Hackathon league for IT students in Ho Chi Minh City.
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 7 }} className="seal-reveal">
                <Typography sx={{ color: brand.colors.muted, fontSize: 17, lineHeight: 1.85 }}>
                  SEAL Hackathon is an academic playground and technology experience for Information Technology students studying at FPT University HCMC and other universities in Ho Chi Minh City. Every year, SEAL organizes three Hackathons corresponding to the Spring, Summer, and Fall semesters, with each semester carrying a clear academic direction.
                </Typography>
              </Grid2>
            </Grid2>
            <Grid2 container spacing={2.2} sx={{ mt: 4 }}>
              {competitionFacts.map(([title, description]) => (
                <Grid2 key={title} size={{ xs: 12, sm: 6, lg: 3 }} className="seal-reveal">
                  <Box className="seal-premium-card" sx={{ height: "100%", p: 2.6, borderRadius: brand.radius.lg, bgcolor: brand.colors.surfaceSoft, border: `1px solid ${brand.colors.line}` }}>
                    <Typography sx={{ color: brand.colors.text, fontSize: 16, fontWeight: 950, mb: 0.8 }}>{title}</Typography>
                    <Typography sx={{ color: brand.colors.muted, lineHeight: 1.7 }}>{description}</Typography>
                  </Box>
                </Grid2>
              ))}
            </Grid2>
          </Container>
        </Box>

        <Box id="system" sx={{ py: { xs: 7, md: 10 }, bgcolor: brand.colors.surfaceSoft }}>
          <Container maxWidth="xl">
            <Box className="seal-reveal" sx={{ textAlign: "center", maxWidth: 760, mx: "auto", mb: 5 }}>
              <Typography sx={{ color: brand.colors.orange, fontSize: 13, fontWeight: 950, letterSpacing: 1.5, mb: 1.2 }}>HACKATHON SYSTEM</Typography>
              <Typography component="h2" sx={{ color: brand.colors.text, fontSize: { xs: 32, md: 44 }, fontWeight: 950, lineHeight: 1.08 }}>
                Three Hackathons, three academic directions.
              </Typography>
            </Box>
            <Grid2 container spacing={2.4}>
              {hackathons.map((item) => (
                <Grid2 key={item.semester} size={{ xs: 12, md: 4 }} className="seal-reveal">
                  <Box className="seal-premium-card" sx={{ height: "100%", p: 3, borderRadius: brand.radius.lg, bgcolor: brand.colors.surface, border: `1px solid ${brand.colors.line}`, boxShadow: brand.shadow.sm }}>
                    <Chip label={item.semester} sx={{ mb: 2, bgcolor: brand.colors.surfaceWarm, color: brand.colors.orange, fontWeight: 950 }} />
                    <Typography sx={{ color: brand.colors.text, fontSize: 20, fontWeight: 950, mb: 1 }}>{item.title}</Typography>
                    <Typography sx={{ color: brand.colors.muted, lineHeight: 1.75 }}>{item.description}</Typography>
                  </Box>
                </Grid2>
              ))}
            </Grid2>
          </Container>
        </Box>

        <Box id="rankings" sx={{ py: { xs: 7, md: 10 }, bgcolor: brand.colors.navy, color: brand.colors.inverse }}>
          <Container maxWidth="xl">
            <Grid2 container spacing={4} alignItems="stretch">
              <Grid2 size={{ xs: 12, md: 4 }} className="seal-reveal">
                <Typography sx={{ color: brand.colors.amber, fontSize: 13, fontWeight: 950, letterSpacing: 1.5, mb: 1.2 }}>RANKINGS</Typography>
                <Typography component="h2" sx={{ fontSize: { xs: 32, md: 44 }, fontWeight: 950, lineHeight: 1.08 }}>
                  Results are consolidated into three rankings.
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.8, mt: 2 }}>
                  The SEAL Hackathon results are published through Chapter, Team, and Individual rankings after the three Hackathons.
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 8 }}>
                <Grid2 container spacing={2}>
                  {rankingTypes.map((item) => (
                    <Grid2 key={item.title} size={{ xs: 12, md: 4 }} className="seal-reveal">
                      <Box className="seal-premium-card seal-dark-card" sx={{ height: "100%", p: 3, borderRadius: brand.radius.lg, bgcolor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
                        <BarChartRoundedIcon sx={{ color: brand.colors.orange, fontSize: 34, mb: 1.5 }} />
                        <Typography sx={{ fontSize: 18, fontWeight: 950, mb: 1 }}>{item.title}</Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>{item.description}</Typography>
                      </Box>
                    </Grid2>
                  ))}
                </Grid2>
              </Grid2>
            </Grid2>
          </Container>
        </Box>

        <Box id="participants" sx={{ py: { xs: 7, md: 10 }, bgcolor: brand.colors.surface }}>
          <Container maxWidth="xl">
            <Grid2 container spacing={4} alignItems="center">
              <Grid2 size={{ xs: 12, md: 5 }} className="seal-reveal">
                <Typography sx={{ color: brand.colors.orange, fontSize: 13, fontWeight: 950, letterSpacing: 1.5, mb: 1.2 }}>PARTICIPANTS</Typography>
                <Typography component="h2" sx={{ color: brand.colors.text, fontSize: { xs: 32, md: 44 }, fontWeight: 950, lineHeight: 1.08 }}>
                  For Information Technology students in Ho Chi Minh City.
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 7 }}>
                <Grid2 container spacing={2}>
                  {[
                    [SchoolRoundedIcon, "FPT University HCMC students", "Information Technology students studying at FPT University HCMC."],
                    [GroupsRoundedIcon, "Students from other HCMC universities", "Information Technology students studying at other universities in Ho Chi Minh City."],
                    [VerifiedRoundedIcon, "Academic and technology experience", "A structured environment to experience Hackathon competition and technology topics."],
                    [CodeRoundedIcon, "Software and product practice", "Themes cover SDLC, professional working, emerging technologies, product, and user experience."],
                  ].map(([Icon, title, description]) => (
                    <Grid2 key={title} size={{ xs: 12, sm: 6 }} className="seal-reveal">
                      <Box className="seal-premium-card" sx={{ height: "100%", p: 3, borderRadius: brand.radius.lg, bgcolor: brand.colors.surfaceSoft, border: `1px solid ${brand.colors.line}` }}>
                        <Icon sx={{ color: brand.colors.orange, fontSize: 32, mb: 1.4 }} />
                        <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950, mb: 0.8 }}>{title}</Typography>
                        <Typography sx={{ color: brand.colors.muted, lineHeight: 1.7 }}>{description}</Typography>
                      </Box>
                    </Grid2>
                  ))}
                </Grid2>
              </Grid2>
            </Grid2>
          </Container>
        </Box>

        <Box id="benefits" sx={{ py: { xs: 7, md: 10 }, bgcolor: brand.colors.surfaceSoft }}>
          <Container maxWidth="xl">
            <Box className="seal-reveal" sx={{ textAlign: "center", maxWidth: 740, mx: "auto", mb: 5 }}>
              <Typography sx={{ color: brand.colors.orange, fontSize: 13, fontWeight: 950, letterSpacing: 1.5, mb: 1.2 }}>BENEFITS</Typography>
              <Typography component="h2" sx={{ color: brand.colors.text, fontSize: { xs: 32, md: 44 }, fontWeight: 950, lineHeight: 1.08 }}>
                What students experience in SEAL.
              </Typography>
            </Box>
            <Grid2 container spacing={2.4}>
              {benefits.map(([Icon, title, description]) => (
                <Grid2 key={title} size={{ xs: 12, md: 6, lg: 3 }} className="seal-reveal">
                  <Box className="seal-premium-card" sx={{ height: "100%", p: 3, borderRadius: brand.radius.lg, bgcolor: brand.colors.surface, border: `1px solid ${brand.colors.line}`, transition: "transform 160ms ease, box-shadow 160ms ease", "&:hover": { transform: "translateY(-5px)", boxShadow: brand.shadow.md } }}>
                    <Box sx={{ width: 54, height: 54, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: brand.colors.surfaceWarm, color: brand.colors.orange, mb: 2 }}>
                      <Icon sx={{ fontSize: 30 }} />
                    </Box>
                    <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950, mb: 1 }}>{title}</Typography>
                    <Typography sx={{ color: brand.colors.muted, lineHeight: 1.7 }}>{description}</Typography>
                  </Box>
                </Grid2>
              ))}
            </Grid2>
          </Container>
        </Box>

        <Box id="events" sx={{ py: { xs: 7, md: 9 }, bgcolor: brand.colors.surface }}>
          <Container maxWidth="xl">
            {events.length > 0 ? (
              <EventCatalogExperience
                events={events}
                mode="public"
                sectionTitle="Upcoming and past SEAL events"
                sectionDescription="Browse current, upcoming, and archived hackathons. Open any event to review its timeline, rounds, and judging criteria before joining."
              />
            ) : (
              <Box className="seal-reveal" sx={{ p: 3, borderRadius: brand.radius.lg, bgcolor: brand.colors.surfaceSoft, border: `1px dashed ${brand.colors.lineStrong}` }}>
                <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950 }}>No published event data is available</Typography>
                <Typography sx={{ color: brand.colors.muted, mt: 0.7 }}>{eventsError || "When an Event Coordinator publishes events, they will appear here."}</Typography>
              </Box>
            )}
          </Container>
        </Box>

        <Box id="faq" sx={{ py: { xs: 7, md: 10 }, bgcolor: brand.colors.surfaceSoft }}>
          <Container maxWidth="lg">
            <Box className="seal-reveal" sx={{ textAlign: "center", maxWidth: 720, mx: "auto", mb: 5 }}>
              <HelpOutlineRoundedIcon sx={{ color: brand.colors.orange, fontSize: 40, mb: 1 }} />
              <Typography component="h2" sx={{ color: brand.colors.text, fontSize: { xs: 32, md: 44 }, fontWeight: 950, lineHeight: 1.08 }}>
                FAQ
              </Typography>
            </Box>
            <Grid2 container spacing={2}>
              {faqs.map(([question, answer]) => (
                <Grid2 key={question} size={{ xs: 12, md: 6 }} className="seal-reveal">
                  <Box className="seal-premium-card" sx={{ height: "100%", p: 3, borderRadius: brand.radius.lg, bgcolor: brand.colors.surface, border: `1px solid ${brand.colors.line}` }}>
                    <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 950, mb: 1 }}>{question}</Typography>
                    <Typography sx={{ color: brand.colors.muted, lineHeight: 1.75 }}>{answer}</Typography>
                  </Box>
                </Grid2>
              ))}
            </Grid2>
          </Container>
        </Box>
      </Box>

      <Box id="contact" component="footer" sx={{ bgcolor: brand.colors.navy, color: brand.colors.inverse, pt: 7 }}>
        <Container maxWidth="xl">
          <Grid2 container spacing={4}>
            <Grid2 size={{ xs: 12, md: 5 }}>
              <Logo dark />
              <Typography sx={{ color: "rgba(255,255,255,0.72)", maxWidth: 440, lineHeight: 1.8, mt: 2 }}>
                SEAL Hackathon - Software Engineering Agile League at FPT University HCMC.
              </Typography>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}>
              <Typography sx={{ fontWeight: 950, mb: 1.6 }}>Institution</Typography>
              <FptMark />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 3 }}>
              <Typography sx={{ fontWeight: 950, mb: 1.6 }}>Social</Typography>
              <Stack direction="row" spacing={1}>
                {[FacebookRoundedIcon, InstagramIcon, LinkedInIcon].map((Icon, index) => (
                  <IconButton key={index} sx={{ color: brand.colors.inverse, bgcolor: "rgba(255,255,255,0.08)", "&:hover": { bgcolor: "rgba(255,255,255,0.16)" } }}>
                    <Icon sx={{ fontSize: 19 }} />
                  </IconButton>
                ))}
              </Stack>
            </Grid2>
          </Grid2>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.12)", mt: 5 }} />
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ py: 2.5 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.68)", fontSize: 14 }}>
              (c) 2026 FPT University HCMC
            </Typography>
            <Stack direction="row" spacing={2}>
              {["About", "Rankings", "FAQ"].map((item) => (
                <Typography key={item} component="a" href={item === "FAQ" ? "#faq" : item === "Rankings" ? "#rankings" : "#about"} sx={{ color: "rgba(255,255,255,0.68)", textDecoration: "none", fontSize: 14, fontWeight: 800 }}>
                  {item}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
