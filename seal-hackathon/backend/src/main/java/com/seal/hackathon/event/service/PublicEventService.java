package com.seal.hackathon.event.service;

import com.seal.hackathon.event.dto.PublicRoundMilestoneDto;
import com.seal.hackathon.event.dto.UpcomingEventDto;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.RoundRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class PublicEventService {

    private final HackathonEventRepository hackathonEventRepository;
    private final RoundRepository roundRepository;

    public PublicEventService(HackathonEventRepository hackathonEventRepository,
                              RoundRepository roundRepository) {
        this.hackathonEventRepository = hackathonEventRepository;
        this.roundRepository = roundRepository;
    }

    @Transactional(readOnly = true)
    public List<UpcomingEventDto> getUpcomingEvents() {
        List<HackathonEventEntity> events = hackathonEventRepository.findUpcomingEvents(LocalDate.now());
        return events.stream().map(event -> new UpcomingEventDto(
                event.getEventId(),
                event.getName(),
                event.getSeason(),
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
}
