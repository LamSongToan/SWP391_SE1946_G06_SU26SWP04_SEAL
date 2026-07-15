package com.seal.hackathon.event.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.hackathon.evaluation.dto.AwardResultDto;
import com.seal.hackathon.evaluation.entity.RankingEntity;
import com.seal.hackathon.evaluation.repository.AuditLogRepository;
import com.seal.hackathon.evaluation.repository.RankingRepository;
import com.seal.hackathon.event.dto.EventWizardAwardRequest;
import com.seal.hackathon.event.dto.PublicEventCatalogDto;
import com.seal.hackathon.event.dto.PublicEventCriterionDto;
import com.seal.hackathon.event.dto.PublicEventRoundDto;
import com.seal.hackathon.event.dto.PublicEventTrackDto;
import com.seal.hackathon.event.dto.PublicRoundMilestoneDto;
import com.seal.hackathon.event.dto.UpcomingEventDto;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.RoundEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.event.repository.ScoringCriteriaRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import com.seal.hackathon.team.entity.TeamEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;

@Service
public class PublicEventService {
    private static final String ACTION_ROUND_RESULTS_PUBLISHED = "ROUND_RESULTS_PUBLISHED";
    private static final String TARGET_ENTITY_ROUND = "ROUND";

    private final HackathonEventRepository hackathonEventRepository;
    private final RoundRepository roundRepository;
    private final ScoringCriteriaRepository scoringCriteriaRepository;
    private final TrackRepository trackRepository;
    private final RankingRepository rankingRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public PublicEventService(HackathonEventRepository hackathonEventRepository,
                              RoundRepository roundRepository,
                              ScoringCriteriaRepository scoringCriteriaRepository,
                              TrackRepository trackRepository,
                              RankingRepository rankingRepository,
                              AuditLogRepository auditLogRepository,
                              ObjectMapper objectMapper) {
        this.hackathonEventRepository = hackathonEventRepository;
        this.roundRepository = roundRepository;
        this.scoringCriteriaRepository = scoringCriteriaRepository;
        this.trackRepository = trackRepository;
        this.rankingRepository = rankingRepository;
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<UpcomingEventDto> getUpcomingEvents() {
        List<HackathonEventEntity> events = hackathonEventRepository.findUpcomingEvents(LocalDate.now());
        return events.stream().map(event -> new UpcomingEventDto(
                event.getEventId(),
                event.getName(),
                event.getSemester(),
                event.getYear(),
                event.getStartDate(),
                event.getEndDate(),
                event.getStatus(),
                event.getDescription(),
                roundRepository.findByEventIdOrderByRoundOrderAsc(event.getEventId())
                        .stream()
                        .map(round -> new PublicRoundMilestoneDto(
                                round.getRoundName(),
                                round.getRoundOrder(),
                                round.getSubmissionDeadline()
                        ))
                        .toList()
        )).toList();
    }

    @Transactional(readOnly = true)
    public List<PublicEventCatalogDto> getEventCatalog() {
        LocalDateTime now = LocalDateTime.now();
        return hackathonEventRepository.findAllByOrderByStartDateDescEventIdDesc().stream()
                .filter(event -> !"Draft".equalsIgnoreCase(event.getStatus()))
                .map(event -> {
                    List<PublicEventTrackDto> tracks = trackRepository.findByEventIdOrderByTrackIdAsc(event.getEventId())
                            .stream()
                            .map(track -> new PublicEventTrackDto(
                                    track.getTrackId(),
                                    track.getName(),
                                    track.getMinTeams(),
                                    track.getMaxTeams()
                            ))
                            .toList();

                    List<PublicEventRoundDto> rounds = roundRepository.findByEventIdOrderByRoundOrderAsc(event.getEventId())
                            .stream()
                            .map(round -> new PublicEventRoundDto(
                                    round.getRoundId(),
                                    round.getRoundName(),
                                    round.getRoundOrder(),
                                    Boolean.TRUE.equals(round.getFinalRound()),
                                    round.getSubmissionDeadline(),
                                    scoringCriteriaRepository.findByRoundIdOrderByCriteriaId(round.getRoundId())
                                            .stream()
                                            .map(criteria -> new PublicEventCriterionDto(
                                                    criteria.getCriteriaId(),
                                                    criteria.getCriteriaName(),
                                                    criteria.getWeight() == null ? null : criteria.getWeight().intValue(),
                                                    criteria.getCriteriaType()
                                            ))
                                            .toList()
                            ))
                            .toList();

                    String registrationStatus = registrationStatus(event, now);
                    boolean registrationAvailable = "OPEN".equals(registrationStatus);
                    boolean awardResultsPublished = areFinalResultsPublished(event, rounds);
                    return new PublicEventCatalogDto(
                            event.getEventId(),
                            event.getName(),
                            event.getSemester(),
                            event.getYear(),
                            event.getStatus(),
                            event.getDescription(),
                            event.getRegistrationStartAt(),
                            event.getRegistrationEndAt(),
                            event.getCompetitionStartAt(),
                            event.getCompetitionEndAt(),
                            event.getTrackSelectionMode(),
                            registrationStatus,
                            registrationAvailable,
                            tracks,
                            rounds,
                            awardResultsPublished,
                            buildAwardOverview(event, awardResultsPublished)
                    );
                })
                .toList();
    }

    private List<AwardResultDto> buildAwardOverview(HackathonEventEntity event, boolean awardResultsPublished) {
        List<EventWizardAwardRequest> configuredAwards = readAwards(event.getAwardsJson());
        if (!awardResultsPublished) {
            return configuredAwards.stream()
                    .filter(award -> award != null && award.awardName() != null && !award.awardName().isBlank())
                    .map(award -> new AwardResultDto(
                            award.awardName().trim(),
                            Math.max(1, award.quantity() == null ? 1 : award.quantity()),
                            award.prizeAmountVnd() == null ? 0L : award.prizeAmountVnd(),
                            List.of()
                    ))
                    .toList();
        }

        return buildPublishedAwardOverview(event, configuredAwards);
    }

    private List<AwardResultDto> buildPublishedAwardOverview(HackathonEventEntity event,
                                                             List<EventWizardAwardRequest> configuredAwards) {
        if (configuredAwards.isEmpty()) {
            return List.of();
        }

        RoundEntity finalRound = roundRepository.findByEventIdOrderByRoundOrderAsc(event.getEventId()).stream()
                .filter(round -> Boolean.TRUE.equals(round.getFinalRound()))
                .max(Comparator.comparing(RoundEntity::getRoundOrder, Comparator.nullsLast(Integer::compareTo)))
                .orElse(null);
        if (finalRound == null) {
            return List.of();
        }

        List<RankingEntity> eligibleRankings = rankingRepository.findByRoundRoundIdOrderByRankPositionAsc(finalRound.getRoundId())
                .stream()
                .filter(this::eligibleForAutomaticAward)
                .sorted(Comparator
                        .comparing(RankingEntity::getRankPosition, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(RankingEntity::getTotalScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(ranking -> ranking.getTeam().getTeamName(), String.CASE_INSENSITIVE_ORDER))
                .toList();

        int nextEligibleIndex = 0;
        LocalDateTime awardedAt = event.getPublishedAt();
        List<AwardResultDto> results = new ArrayList<>();
        for (EventWizardAwardRequest configuredAward : configuredAwards) {
            if (configuredAward == null || configuredAward.awardName() == null || configuredAward.awardName().isBlank()) {
                continue;
            }
            int quantity = Math.max(1, configuredAward.quantity() == null ? 1 : configuredAward.quantity());
            List<AwardResultDto.AwardWinnerDto> winners = new ArrayList<>();
            for (int slot = 0; slot < quantity && nextEligibleIndex < eligibleRankings.size(); slot += 1) {
                RankingEntity ranking = eligibleRankings.get(nextEligibleIndex);
                winners.add(toAwardWinner(ranking, awardedAt));
                nextEligibleIndex += 1;
            }
            results.add(new AwardResultDto(
                    configuredAward.awardName().trim(),
                    Math.max(1, configuredAward.quantity() == null ? 1 : configuredAward.quantity()),
                    configuredAward.prizeAmountVnd() == null ? 0L : configuredAward.prizeAmountVnd(),
                    winners
            ));
        }

        return results;
    }

    private boolean areFinalResultsPublished(HackathonEventEntity event, List<PublicEventRoundDto> rounds) {
        if (event == null) {
            return false;
        }
        if ("Ended".equalsIgnoreCase(event.getStatus())) {
            return true;
        }
        Integer finalRoundId = rounds == null ? null : rounds.stream()
                .filter(Objects::nonNull)
                .filter(PublicEventRoundDto::finalRound)
                .map(PublicEventRoundDto::roundId)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        if (finalRoundId == null) {
            return false;
        }
        return auditLogRepository.findTopByActionTypeAndTargetEntityAndTargetIdOrderByTimestampDesc(
                ACTION_ROUND_RESULTS_PUBLISHED,
                TARGET_ENTITY_ROUND,
                finalRoundId
        ).isPresent();
    }

    private boolean eligibleForAutomaticAward(RankingEntity ranking) {
        if (ranking == null || ranking.getTeam() == null) {
            return false;
        }
        if (ranking.getRankPosition() == null || ranking.getRankPosition() <= 0) {
            return false;
        }
        return ranking.getQualificationStatus() == null
                || !"DISQUALIFIED".equalsIgnoreCase(ranking.getQualificationStatus().trim());
    }

    private AwardResultDto.AwardWinnerDto toAwardWinner(RankingEntity ranking, LocalDateTime awardedAt) {
        TeamEntity team = ranking.getTeam();
        TrackEntity track = team.getTrack();
        BigDecimal totalScore = ranking.getTotalScore();
        return new AwardResultDto.AwardWinnerDto(
                team.getTeamId(),
                team.getTeamName(),
                track == null ? null : track.getTrackId(),
                track == null ? "Final event ranking" : track.getName(),
                ranking.getRankPosition(),
                totalScore,
                awardedAt
        );
    }

    private List<EventWizardAwardRequest> readAwards(String awardsJson) {
        if (awardsJson == null || awardsJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(awardsJson, new TypeReference<List<EventWizardAwardRequest>>() {
            });
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String registrationStatus(HackathonEventEntity event, LocalDateTime now) {
        if (!"Ongoing".equalsIgnoreCase(event.getStatus())) {
            return "UNAVAILABLE";
        }
        if (event.getRegistrationStartAt() == null || event.getRegistrationEndAt() == null) {
            return "UNCONFIGURED";
        }
        if (now.isBefore(event.getRegistrationStartAt())) {
            return "NOT_OPEN_YET";
        }
        if (now.isAfter(event.getRegistrationEndAt())) {
            return "CLOSED";
        }
        return "OPEN";
    }
}
