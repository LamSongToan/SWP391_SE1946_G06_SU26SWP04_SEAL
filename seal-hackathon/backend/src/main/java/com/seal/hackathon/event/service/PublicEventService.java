package com.seal.hackathon.event.service;

import com.seal.hackathon.event.dto.PublicEventCatalogDto;
import com.seal.hackathon.event.dto.PublicEventCriterionDto;
import com.seal.hackathon.event.dto.PublicEventRoundDto;
import com.seal.hackathon.event.dto.PublicRoundMilestoneDto;
import com.seal.hackathon.event.dto.UpcomingEventDto;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.event.repository.ScoringCriteriaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class PublicEventService {

    private final HackathonEventRepository hackathonEventRepository;
    private final RoundRepository roundRepository;
    private final ScoringCriteriaRepository scoringCriteriaRepository;

    public PublicEventService(HackathonEventRepository hackathonEventRepository,
                              RoundRepository roundRepository,
                              ScoringCriteriaRepository scoringCriteriaRepository) {
        this.hackathonEventRepository = hackathonEventRepository;
        this.roundRepository = roundRepository;
        this.scoringCriteriaRepository = scoringCriteriaRepository;
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

                    boolean registrationAvailable = isRegistrationAvailable(event, now);
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
                            registrationAvailable,
                            rounds
                    );
                })
                .toList();
    }

    private boolean isRegistrationAvailable(HackathonEventEntity event, LocalDateTime now) {
        if (!"Ongoing".equalsIgnoreCase(event.getStatus())) {
            return false;
        }
        if (event.getRegistrationStartAt() == null || event.getRegistrationEndAt() == null) {
            return false;
        }
        return !now.isBefore(event.getRegistrationStartAt()) && !now.isAfter(event.getRegistrationEndAt());
    }
}
