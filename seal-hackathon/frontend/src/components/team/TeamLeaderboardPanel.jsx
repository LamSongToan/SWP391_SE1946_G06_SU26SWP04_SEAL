import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useSearchParams } from "react-router-dom";
import { getApiErrorMessage, http } from "../../api/http";
import { brand } from "../../styles/designTokens";
import CenteredNotification from "../layout/CenteredNotification";
import ModulePageHeader from "../layout/ModulePageHeader";
import "./team-management.css";

function formatDateTime(value) {
  if (!value) return "Not published yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMetric(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return number.toFixed(2);
}

function formatPrizeAmountVnd(value) {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) return "0 VND";
  return `${amount.toLocaleString("vi-VN")} VND`;
}

function formatLeaderboardStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "qualified") return { label: "Qualified", color: "success" };
  if (normalized === "eliminated") return { label: "Eliminated", color: "warning" };
  if (normalized === "disqualified") return { label: "Disqualified", color: "error" };
  if (normalized === "not applicable") return { label: "Published", color: "info" };
  return { label: value || "Pending", color: "default" };
}

export default function TeamLeaderboardPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTeamId = searchParams.get("teamId");

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const registeredTeams = useMemo(
    () => teams.filter((team) => team.eventId),
    [teams]
  );

  const leaderboardGroups = leaderboard?.groups || [];

  useEffect(() => {
    if (!leaderboardGroups.length) {
      setSelectedRoundId(null);
      return;
    }
    if (leaderboardGroups.some((group) => String(group.roundId) === String(selectedRoundId))) {
      return;
    }
    setSelectedRoundId(leaderboardGroups[0].roundId);
  }, [leaderboardGroups, selectedRoundId]);

  const activeGroup = useMemo(
    () => leaderboardGroups.find((group) => String(group.roundId) === String(selectedRoundId)) || leaderboardGroups[0] || null,
    [leaderboardGroups, selectedRoundId]
  );
  const activeGroupIsFinal = Boolean(activeGroup && activeGroup.trackId == null);

  const closeNotification = () => {
    setError("");
    setSuccess("");
  };

  const fetchTeamLeaderboard = async (teamId, availableTeams = registeredTeams) => {
    if (!teamId) {
      setSelectedTeam(null);
      setLeaderboard(null);
      return;
    }

    const ownedTeam = availableTeams.find((team) => String(team.teamId) === String(teamId));
    if (!ownedTeam) {
      setSelectedTeam(null);
      setLeaderboard(null);
      setSearchParams({ section: "leaderboard" }, { replace: true });
      return;
    }

    try {
      setLeaderboardLoading(true);
      const [teamResponse, leaderboardResponse] = await Promise.all([
        http.get(`/api/teams/${teamId}`),
        http.get(`/api/teams/${teamId}/leaderboard`),
      ]);
      setSelectedTeam(teamResponse.data?.data || ownedTeam);
      setLeaderboard(leaderboardResponse.data?.data || null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load leaderboard"));
      setSelectedTeam(null);
      setLeaderboard(null);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const loadWorkspace = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await http.get("/api/teams/my");
      const nextTeams = response.data?.data || [];
      const registered = nextTeams.filter((team) => team.eventId);
      setTeams(nextTeams);
      if (selectedTeamId && registered.some((team) => String(team.teamId) === String(selectedTeamId))) {
        await fetchTeamLeaderboard(selectedTeamId, registered);
      } else {
        setSelectedTeam(null);
        setLeaderboard(null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load leaderboard workspace"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const openTeamLeaderboard = (teamId) => {
    setSearchParams({ section: "leaderboard", teamId: String(teamId) });
    fetchTeamLeaderboard(teamId, registeredTeams);
  };

  const backToTeamList = () => {
    setSearchParams({ section: "leaderboard" });
    setSelectedTeam(null);
    setLeaderboard(null);
  };

  const summaryTiles = activeGroup?.teamBreakdown ? [
    {
      label: "Rank",
      value: activeGroup.teamBreakdown.rankPosition ? `#${activeGroup.teamBreakdown.rankPosition}` : "--",
    },
    {
      label: "Weighted score",
      value: formatMetric(activeGroup.teamBreakdown.totalScore),
    },
    {
      label: activeGroupIsFinal ? "Scope" : "Track",
      value: activeGroupIsFinal
        ? "All finalists"
        : activeGroup.trackName || selectedTeam?.trackName || "Track pending",
    },
  ] : [];

  if (loading) {
    return (
      <Box className="team-loading">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="team-workspace">
      <CenteredNotification
        message={error || success}
        severity={error ? "error" : "success"}
        autoHideDuration={error ? 5500 : 3500}
        onClose={closeNotification}
      />

      <ModulePageHeader
        eyebrow="Published Rankings"
        title={selectedTeam ? `${selectedTeam.teamName} leaderboard` : "Leaderboard"}
        description={
          selectedTeam
            ? "Published rankings appear here after the coordinator releases round results. Qualifiers stay inside your track, while finals become one shared event leaderboard."
            : "Choose one of your registered teams to review published round rankings from its current event."
        }
        actions={(
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedTeam ? (
              <Button startIcon={<ArrowBackRoundedIcon />} onClick={backToTeamList}>
                Back to teams
              </Button>
            ) : null}
            <Button startIcon={<RefreshRoundedIcon />} onClick={loadWorkspace} variant="outlined">
              Refresh
            </Button>
          </Stack>
        )}
      />

      {registeredTeams.length === 0 ? (
        <Box className="ms-empty">
          <Typography fontWeight={800}>No registered teams yet</Typography>
          <Typography color="text.secondary" variant="body2">
            Register a team into an event first. Published leaderboard results will appear here later.
          </Typography>
        </Box>
      ) : selectedTeam ? (
        <Stack spacing={2}>
          <Card className="ms-data-card">
            <CardContent>
              <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" gap={2}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{selectedTeam.teamName}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {selectedTeam.eventName || "No event"} • {selectedTeam.trackName || "Track pending"}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip icon={<GroupsRoundedIcon />} label={`${selectedTeam.memberCount ?? 0}/5 members`} variant="outlined" />
                  <Chip icon={<EmojiEventsRoundedIcon />} label={leaderboard?.resultPublished ? `Published ${formatDateTime(leaderboard?.publishedAt)}` : "Not published yet"} variant="outlined" />
                </Stack>
              </Stack>

              {summaryTiles.length ? (
                <Box
                  sx={{
                    mt: 2,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                    gap: 1.4,
                  }}
                >
                  {summaryTiles.map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        p: 1.7,
                        borderRadius: brand.radius.md,
                        border: `1px solid ${brand.colors.line}`,
                        bgcolor: brand.colors.surfaceSoft,
                      }}
                    >
                      <Typography sx={{ color: brand.colors.muted, fontSize: 11.5, fontWeight: 900, textTransform: "uppercase" }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ color: brand.colors.text, fontSize: 22, fontWeight: 900, mt: 0.65 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : null}
            </CardContent>
          </Card>

          {leaderboardLoading ? (
            <Card className="ms-data-card">
              <CardContent>
                <Box className="team-loading">
                  <CircularProgress />
                </Box>
              </CardContent>
            </Card>
          ) : !leaderboard?.resultPublished || !leaderboardGroups.length ? (
            <Box className="ms-empty">
              <Typography fontWeight={800}>Leaderboard not published yet</Typography>
              <Typography color="text.secondary" variant="body2">
                Coordinator results are still hidden for this team. Rankings will appear here after the round is published.
              </Typography>
            </Box>
          ) : (
            <Card className="ms-data-card">
              <CardContent sx={{ p: 0 }}>
                <Tabs
                  value={activeGroup?.roundId ?? false}
                  onChange={(_, value) => setSelectedRoundId(value)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    px: 1.2,
                    borderBottom: `1px solid ${brand.colors.line}`,
                    bgcolor: brand.colors.surfaceSoft,
                    "& .MuiTab-root": {
                      textTransform: "none",
                      fontWeight: 800,
                      minHeight: 54,
                    },
                    "& .Mui-selected": {
                      color: brand.colors.navy,
                    },
                    "& .MuiTabs-indicator": {
                      backgroundColor: brand.colors.orange,
                      height: 3,
                    },
                  }}
                >
                  {leaderboardGroups.map((group) => (
                    <Tab
                      key={group.roundId}
                      value={group.roundId}
                      label={`Round ${group.roundOrder} - ${group.roundName}`}
                    />
                  ))}
                </Tabs>

                {activeGroup ? (
                  <Box sx={{ p: 2 }}>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.2} sx={{ mb: 1.8 }}>
                      <Box>
                        <Typography sx={{ color: brand.colors.text, fontSize: 22, fontWeight: 900 }}>
                          {activeGroupIsFinal ? "Final leaderboard" : activeGroup.trackName}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {activeGroupIsFinal
                            ? "Finalists from every track are ranked together in one shared event leaderboard."
                            : "Published rankings for your team track only."}
                        </Typography>
                      </Box>
                      <Chip label={`${activeGroup.rows.length} team(s)`} size="small" variant="outlined" />
                    </Stack>

                    <TableContainer
                      sx={{
                        border: `1px solid ${brand.colors.line}`,
                        borderRadius: brand.radius.md,
                        overflow: "hidden",
                        bgcolor: "#FFFFFF",
                      }}
                    >
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#FBFCFE" }}>
                            <TableCell sx={{ fontWeight: 900, width: 90 }}>Rank</TableCell>
                            <TableCell sx={{ fontWeight: 900 }}>Team</TableCell>
                            <TableCell sx={{ fontWeight: 900, width: 160 }}>Score</TableCell>
                            <TableCell sx={{ fontWeight: 900, width: 180 }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {activeGroup.rows.map((row) => {
                            const status = formatLeaderboardStatus(row.qualificationStatus);
                            const isOwnTeam = String(row.teamId) === String(selectedTeam.teamId);
                            const isAwardWinner = Boolean(activeGroupIsFinal && row.awardName);
                            const ownTeamBackground = status.label === "Qualified"
                              ? "#EAF8F0"
                              : ["Eliminated", "Disqualified"].includes(status.label)
                                ? "#FFF1EF"
                                : "#FFF7ED";
                            return (
                              <TableRow
                                key={row.submissionId || row.teamId}
                                sx={{
                                  bgcolor: isAwardWinner ? "#FFF8E1" : isOwnTeam ? ownTeamBackground : "#FFFFFF",
                                  "& td": {
                                    borderTop: isOwnTeam ? `1px solid ${isAwardWinner ? "#F4CF72" : status.label === "Qualified" ? "#7BC89C" : "#F2A08F"}` : undefined,
                                    borderBottom: isOwnTeam ? `1px solid ${isAwardWinner ? "#F4CF72" : status.label === "Qualified" ? "#7BC89C" : "#F2A08F"}` : undefined,
                                  },
                                  "& td:first-of-type": {
                                    borderLeft: isAwardWinner
                                      ? "4px solid #F4B740"
                                      : isOwnTeam
                                        ? `4px solid ${status.label === "Qualified" ? "#2E9B62" : brand.colors.orange}`
                                        : undefined,
                                  },
                                  "&:last-child td, &:last-child th": { borderBottom: 0 },
                                }}
                              >
                                <TableCell sx={{ color: brand.colors.text, fontWeight: 900 }}>
                                  {row.rankPosition ? `#${row.rankPosition}` : "--"}
                                </TableCell>
                                <TableCell>
                                  <Typography sx={{ color: brand.colors.text, fontWeight: 900 }}>
                                    {row.teamName}
                                  </Typography>
                                  {isAwardWinner ? (
                                    <Typography sx={{ color: "#A16207", fontSize: 12.5, fontWeight: 850, mt: 0.35 }}>
                                      {row.awardName} • {formatPrizeAmountVnd(row.prizeAmountVnd)}
                                    </Typography>
                                  ) : null}
                                  {isOwnTeam ? (
                                    <Chip
                                      size="small"
                                      label="Your team"
                                      color={status.label === "Qualified" ? "success" : status.color}
                                      sx={{ mt: 0.6, fontWeight: 850 }}
                                    />
                                  ) : null}
                                  {row.qualificationNote ? (
                                    <Typography sx={{ color: brand.colors.muted, fontSize: 12.5, mt: 0.35 }}>
                                      {row.qualificationNote}
                                    </Typography>
                                  ) : null}
                                </TableCell>
                                <TableCell sx={{ color: brand.colors.text, fontWeight: 800 }}>
                                  {formatMetric(row.totalScore)}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    color={isAwardWinner ? "warning" : status.color}
                                    label={isAwardWinner ? row.awardName : status.label}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {activeGroup.teamBreakdown ? (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          border: `1px solid ${brand.colors.line}`,
                          borderRadius: brand.radius.md,
                          bgcolor: brand.colors.surfaceSoft,
                        }}
                      >
                        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.2} sx={{ mb: 1.5 }}>
                          <Box>
                            <Typography sx={{ color: brand.colors.text, fontSize: 18, fontWeight: 900 }}>
                              Your score breakdown
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                              Only your team can see detailed criterion scores and published feedback.
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={`Rank ${activeGroup.teamBreakdown.rankPosition ? `#${activeGroup.teamBreakdown.rankPosition}` : "--"}`} variant="outlined" size="small" />
                            <Chip label={`Weighted ${formatMetric(activeGroup.teamBreakdown.totalScore)}`} variant="outlined" size="small" />
                          </Stack>
                        </Stack>

                        <Box className="team-leaderboard-criteria">
                          {(activeGroup.teamBreakdown.criteria || []).map((criterion) => (
                            <Box key={criterion.criteriaId} className="team-leaderboard-criterion">
                              <Typography className="team-leaderboard-criterion-label">
                                {criterion.criteriaName}
                              </Typography>
                              <Typography className="team-leaderboard-criterion-score">
                                {formatMetric(criterion.averageScore)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Weight {criterion.weight ?? 0}%
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        <Stack spacing={1.1} sx={{ mt: 1.8 }}>
                          <Typography sx={{ color: brand.colors.text, fontSize: 16, fontWeight: 900 }}>
                            Feedback
                          </Typography>
                          {(activeGroup.teamBreakdown.feedback || []).length === 0 ? (
                            <Typography color="text.secondary" variant="body2">
                              No feedback was published for this round.
                            </Typography>
                          ) : activeGroup.teamBreakdown.feedback.map((item) => (
                            <Box key={item.feedbackId} className="team-submission-round">
                              <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                                <Typography fontWeight={800}>{item.authorName || "Unknown"}</Typography>
                                <Chip size="small" label={item.authorRole || "Feedback"} />
                              </Stack>
                              <Typography sx={{ whiteSpace: "pre-wrap", mt: 1 }}>{item.feedbackText}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(item.createdAt)}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ) : null}
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          )}
        </Stack>
      ) : (
        <Box className="team-grid">
          {registeredTeams.map((team) => (
            <Card key={team.teamId} className="team-card">
              <Box className="team-card-head">
                <Box className="team-card-title">
                  <Box className="team-card-icon"><GroupsRoundedIcon fontSize="small" /></Box>
                  <Box>
                    <Typography variant="h6">{team.teamName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {team.eventName}
                    </Typography>
                  </Box>
                </Box>
                <Chip size="small" label={team.trackName || "Track pending"} />
              </Box>
              <Box className="team-card-body">
                <div><span>Members</span><strong>{team.memberCount ?? (team.members || []).length ?? 0} / 5</strong></div>
                <div><span>Track</span><strong>{team.trackName || "Track pending"}</strong></div>
                <div><span>Role</span><strong>{team.currentUserLeader ? "Leader" : "Member"}</strong></div>
              </Box>
              <Stack className="team-actions" direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="contained"
                  endIcon={<OpenInNewRoundedIcon />}
                  onClick={() => openTeamLeaderboard(team.teamId)}
                >
                  Open leaderboard
                </Button>
              </Stack>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
