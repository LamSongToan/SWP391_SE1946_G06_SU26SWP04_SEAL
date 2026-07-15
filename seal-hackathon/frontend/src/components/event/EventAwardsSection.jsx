import { Box, Chip, Stack, Typography } from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { brand } from "../../styles/designTokens";

function formatPrizeAmountVnd(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0 VND";
  return `${amount.toLocaleString("vi-VN")} VND`;
}

function formatDateTime(value) {
  if (!value) return "Not announced yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventAwardsSection({
  event,
  highlightedTeamIds = [],
  title = "Awards",
  emptyTitle = "No awards configured yet",
  emptyDescription = "The coordinator has not published the award structure for this event yet.",
}) {
  const awards = event?.awards || [];
  const published = Boolean(event?.awardResultsPublished);
  const highlightedIds = new Set(highlightedTeamIds.map((teamId) => String(teamId)));

  if (!awards.length) {
    return (
      <Box className="ms-empty">
        <Typography fontWeight={900}>{emptyTitle}</Typography>
        <Typography color="text.secondary" variant="body2">
          {emptyDescription}
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.8}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1.2}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 900, color: brand.colors.text }}>
            {title}
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.35 }}>
            {published
              ? "Final award results are available for this event."
              : "These awards will be assigned automatically from the published final ranking."}
          </Typography>
        </Box>
        <Chip
          icon={<EmojiEventsRoundedIcon fontSize="small" />}
          label={published ? "Results published" : "Planned award structure"}
          color={published ? "success" : "warning"}
          variant={published ? "filled" : "outlined"}
          sx={{ alignSelf: { xs: "flex-start", md: "center" }, fontWeight: 850 }}
        />
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
          gap: 1.4,
        }}
      >
        {awards.map((award) => (
          <Box
            key={`${event?.eventId || "event"}-${award.awardName}`}
            sx={{
              p: 2,
              borderRadius: 3.5,
              border: `1px solid ${brand.colors.line}`,
              bgcolor: "#fff",
            }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.1} sx={{ mb: 1.4 }}>
              <Box>
                <Typography sx={{ fontWeight: 900, color: brand.colors.text }}>
                  {award.awardName}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.35 }}>
                  {award.quantity} slot{award.quantity === 1 ? "" : "s"} • {formatPrizeAmountVnd(award.prizeAmountVnd)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  icon={<WorkspacePremiumRoundedIcon fontSize="small" />}
                  label={`${award.quantity} award${award.quantity === 1 ? "" : "s"}`}
                  sx={{ bgcolor: "#FFF5ED", color: brand.colors.orange, fontWeight: 850 }}
                />
                <Chip
                  size="small"
                  icon={<SavingsRoundedIcon fontSize="small" />}
                  label={formatPrizeAmountVnd(award.prizeAmountVnd)}
                  variant="outlined"
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
            </Stack>

            {published ? (
              award.winners?.length ? (
                <Stack spacing={1}>
                  {award.winners.map((winner) => {
                    const isOwnTeam = highlightedIds.has(String(winner.teamId));
                    return (
                      <Box
                        key={`${award.awardName}-${winner.teamId}`}
                        sx={{
                          p: 1.3,
                          borderRadius: 2.5,
                          bgcolor: isOwnTeam ? "#EAF8F0" : brand.colors.surfaceSoft,
                          border: isOwnTeam ? "2px solid #67B98A" : `1px solid ${brand.colors.line}`,
                          boxShadow: isOwnTeam ? "0 8px 20px rgba(46, 155, 98, 0.12)" : "none",
                        }}
                      >
                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                        <Box>
                          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography sx={{ fontWeight: 850, color: brand.colors.text }}>
                              {winner.teamName}
                            </Typography>
                            {isOwnTeam ? <Chip size="small" color="success" label="Your team" sx={{ fontWeight: 850 }} /> : null}
                          </Stack>
                          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.3 }}>
                            {winner.trackName || "Final event ranking"}
                          </Typography>
                        </Box>
                        <Typography color="text.secondary" variant="caption" sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
                          Awarded {formatDateTime(winner.awardedAt)}
                        </Typography>
                      </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Typography color="text.secondary" variant="body2">
                  No eligible team was assigned to this award after publication.
                </Typography>
              )
            ) : (
              <Typography color="text.secondary" variant="body2">
                Teams will see winners here after the coordinator publishes the final event results.
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
