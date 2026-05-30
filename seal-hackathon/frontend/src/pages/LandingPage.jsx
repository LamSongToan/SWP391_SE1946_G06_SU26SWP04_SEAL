import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid2,
  Stack,
  Typography,
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import PublicShell from "../components/layout/PublicShell";
import { http } from "../api/http";

function formatDate(rawDate) {
  if (!rawDate) return "N/A";
  return new Date(rawDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getScheduleLabel(startDate) {
  if (!startDate) return "Schedule Pending";
  const now = new Date();
  const start = new Date(startDate);
  const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 0) return `In ${diffDays} Days`;
  if (diffDays === 0) return "Starting Today";
  return "Ongoing";
}

export default function LandingPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUpcomingEvents = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await http.get("/api/public/events/upcoming");
        setEvents(Array.isArray(response.data?.data) ? response.data.data : []);
      } catch (err) {
        setError(err?.response?.data?.message || "Cannot load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    loadUpcomingEvents();
  }, []);

  const totalRounds = useMemo(
    () => events.reduce((sum, event) => sum + (event.rounds?.length || 0), 0),
    [events]
  );

  return (
    <PublicShell>
      <Box sx={{ background: "linear-gradient(180deg, #eef4fb 0%, #f8fbff 100%)", pb: 4 }}>
        <Container maxWidth="xl" sx={{ pt: { xs: 5, md: 7 } }}>
          <Card sx={{ borderRadius: 4, overflow: "hidden" }}>
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <Grid2 alignItems="center" container spacing={4}>
                <Grid2 size={{ xs: 12, md: 6.5 }}>
                  <Chip
                    color="primary"
                    label="Software Engineering Agile League"
                    sx={{ bgcolor: "primary.50", color: "primary.main", fontWeight: 700, mb: 2 }}
                    variant="filled"
                  />
                  <Typography sx={{ mb: 2 }} variant="h1">
                    Elevate Your <Box component="span" sx={{ color: "primary.main" }}>Engineering</Box> Journey
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 20, mb: 3 }}>
                    Join the Software Engineering Agile League at FPT University. Build real products,
                    compete in multi-round hackathons, and get scored by mentors and judges.
                  </Typography>

                  <Stack
                    direction="row"
                    justifyContent={{ xs: "center", md: "flex-start" }}
                    spacing={1.5}
                    sx={{ mb: 2.5 }}
                  >
                    <Button component={RouterLink} size="large" to="/login" variant="contained">
                      Sign In
                    </Button>
                    <Button component={RouterLink} size="large" to="/register" variant="outlined">
                      Create Account
                    </Button>
                  </Stack>

                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                    <Chip icon={<PublicIcon />} label="Spring" />
                    <Chip icon={<PublicIcon />} label="Summer" />
                    <Chip icon={<PublicIcon />} label="Fall" />
                  </Stack>

                  <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap", mt: 1 }}>
                    <Chip color="primary" label={`${events.length} upcoming events`} variant="outlined" />
                    <Chip color="secondary" label={`${totalRounds} configured rounds`} variant="outlined" />
                  </Stack>
                </Grid2>

                <Grid2 size={{ xs: 12, md: 5.5 }}>
                  <Box
                    component="img"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYq0oll6FK0xFT7Ys_fyZvMl7Tg3N29D4f8TDj9ZxJyR4AtRjq-8eJH8U3SXQjrBkt5nmxeFG2-WxQMjFTpEryHbNy9zWDjS4YJ3ofOU186wNaaUi0l7d73rmrh9Hogz9PLvTrxDA6bvtXmEHV8OhLa8ZjB0TaS1P3VKolu6XmDzLkt_nWDgbwqHOCpEfK4my_XxEf23KF4s5THu7Zk7J4kXQK7P7EkrzdwxmuhGwuZiK-qQmUllXY2GRWWPSlYlRfPw4Rzw87Fu-P"
                    alt="SEAL hackathon students"
                    sx={{
                      width: "100%",
                      aspectRatio: "4/3",
                      objectFit: "cover",
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                </Grid2>
              </Grid2>
            </CardContent>
          </Card>
        </Container>
      </Box>

      <Container id="upcoming" maxWidth="xl" sx={{ pt: 5 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h3">Upcoming Events</Typography>
            <Typography color="text.secondary">Only events available in database are shown.</Typography>
          </Box>
        </Stack>

        {loading ? <Alert severity="info">Loading upcoming events...</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        {!loading && !error && events.length === 0 ? (
          <Card>
            <CardContent>
              <Typography sx={{ mb: 1 }} variant="h6">
                There is no event in database yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                When coordinators create events and rounds, this section auto-renders event cards.
              </Typography>
              <Button component={RouterLink} to="/register" variant="outlined">
                Create Account
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !error && events.length > 0 ? (
          <Grid2 container spacing={2}>
            {events.map((event, idx) => (
              <Grid2 key={event.eventId} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ borderTop: idx === 0 ? "4px solid #1565c0" : undefined }}>
                  <CardContent>
                    <Stack alignItems="center" direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Chip
                        color={idx === 0 ? "primary" : "default"}
                        label={`${event.season} ${event.year}`}
                        size="small"
                      />
                      <Typography color="text.secondary" variant="caption">
                        {getScheduleLabel(event.startDate)}
                      </Typography>
                    </Stack>

                    <Typography sx={{ mb: 1.2 }} variant="h6">
                      {event.name}
                    </Typography>

                    <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                      {event.description || "Event description will be updated soon."}
                    </Typography>

                    <Stack spacing={0.5} sx={{ mb: 2 }}>
                      {(event.rounds || []).slice(0, 2).map((round) => (
                        <Typography key={`${event.eventId}-${round.roundOrder}`} variant="body2">
                          {round.roundName}: {formatDate(round.submissionDeadline)}
                        </Typography>
                      ))}
                      {(event.rounds || []).length === 0 ? (
                        <Typography variant="body2">Round schedule pending</Typography>
                      ) : null}
                    </Stack>

                    <Button component={RouterLink} fullWidth to="/register" variant="contained">
                      Register Team
                    </Button>
                  </CardContent>
                </Card>
              </Grid2>
            ))}
          </Grid2>
        ) : null}
      </Container>

      <Container id="about" maxWidth="xl" sx={{ pt: 5 }}>
        <Grid2 container spacing={2}>
          {[
            ["Department Led", "Guided by FPT Software Engineering faculty for academic rigor and practical outcomes."],
            ["PDP Support", "Built with PDP collaboration to connect academics with practical industry standards."],
            ["Industry Ready", "Judge feedback and competition constraints simulate real software delivery."],
            ["Cross-University Teams", "Supports FPT-only teams, mixed teams, and external university collaboration."],
          ].map(([title, desc]) => (
            <Grid2 key={title} size={{ xs: 12, md: 6, lg: 3 }}>
              <Card>
                <CardContent>
                  <Typography sx={{ mb: 1 }} variant="h6">{title}</Typography>
                  <Typography color="text.secondary">{desc}</Typography>
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      </Container>

      <Container id="flow" maxWidth="xl" sx={{ pt: 5 }}>
        <Typography sx={{ mb: 2 }} variant="h3">How It Works</Typography>
        <Grid2 container spacing={2}>
          {[
            ["01", "Create Account", "Register with student details and wait for approval."],
            ["02", "Build Team", "Form 3-5 members and join a track that fits your idea."],
            ["03", "Submit and Compete", "Submit project links by round deadline and get scored."],
          ].map(([index, title, desc]) => (
            <Grid2 key={title} size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Chip label={index} sx={{ mb: 1 }} />
                  <Typography sx={{ mb: 1 }} variant="h6">{title}</Typography>
                  <Typography color="text.secondary">{desc}</Typography>
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      </Container>

      <Box id="impact" sx={{ background: "linear-gradient(120deg,#0d3b66,#14538c)", color: "#fff", mt: 6, py: 6 }}>
        <Container maxWidth="xl">
          <Typography align="center" sx={{ mb: 2.5 }} variant="h3">
            SEAL Global Impact
          </Typography>
          <Grid2 container spacing={2}>
            {[
              ["500+", "Participants", <GroupsIcon key="g" />],
              ["50+", "Active Teams", <RocketLaunchIcon key="r" />],
              ["30+", "Partner Universities", <PublicIcon key="p" />],
              ["12", "Successful Leagues", <EmojiEventsIcon key="e" />],
            ].map(([num, label, icon]) => (
              <Grid2 key={label} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Box sx={{ mb: 1, opacity: 0.9 }}>{icon}</Box>
                    <Typography sx={{ fontWeight: 800 }} variant="h4">{num}</Typography>
                    <Typography sx={{ mt: 1, opacity: 0.9 }} variant="body2">{label}</Typography>
                  </CardContent>
                </Card>
              </Grid2>
            ))}
          </Grid2>
        </Container>
      </Box>
    </PublicShell>
  );
}
