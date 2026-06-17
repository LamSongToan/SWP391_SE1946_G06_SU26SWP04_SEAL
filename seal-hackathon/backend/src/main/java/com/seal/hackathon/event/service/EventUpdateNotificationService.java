package com.seal.hackathon.event.service;

import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.EventUpdateNotificationDto;
import com.seal.hackathon.event.entity.EventUpdateNotificationEntity;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.repository.EventUpdateNotificationRepository;
import com.seal.hackathon.event.repository.JudgeAssignmentRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class EventUpdateNotificationService {

    private final EventUpdateNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TrackMentorRepository trackMentorRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;

    public EventUpdateNotificationService(EventUpdateNotificationRepository notificationRepository,
                                          UserRepository userRepository,
                                          TeamMemberRepository teamMemberRepository,
                                          TrackMentorRepository trackMentorRepository,
                                          JudgeAssignmentRepository judgeAssignmentRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.trackMentorRepository = trackMentorRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
    }

    @Transactional
    public void notifyEventUpdated(HackathonEventEntity event) {
        Set<Integer> recipientIds = new LinkedHashSet<>();
        recipientIds.addAll(teamMemberRepository.findDistinctStudentUserIdsByEventId(event.getEventId()));
        recipientIds.addAll(trackMentorRepository.findDistinctMentorUserIdsByEventId(event.getEventId()));
        recipientIds.addAll(judgeAssignmentRepository.findDistinctJudgeUserIdsByEventId(event.getEventId()));

        if (recipientIds.isEmpty()) {
            return;
        }

        String title = "Event update available";
        String message = "The coordinator updated " + event.getName()
                + ". Please review the latest rounds, promotion rules, deadlines, and scoring updates on your dashboard.";

        for (Integer userId : recipientIds) {
            userRepository.findById(userId).ifPresent((user) -> {
                EventUpdateNotificationEntity notification = new EventUpdateNotificationEntity();
                notification.setUser(user);
                notification.setEventId(event.getEventId());
                notification.setEventName(event.getName());
                notification.setTitle(title);
                notification.setMessage(message);
                notificationRepository.save(notification);
            });
        }
    }

    @Transactional(readOnly = true)
    public List<EventUpdateNotificationDto> listMyNotifications(Authentication authentication) {
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return notificationRepository.findTop10ByUserUserIdOrderByCreatedAtDesc(user.getUserId()).stream()
                .map((notification) -> new EventUpdateNotificationDto(
                        notification.getNotificationId(),
                        notification.getEventId(),
                        notification.getEventName(),
                        notification.getTitle(),
                        notification.getMessage(),
                        notification.getCreatedAt()
                ))
                .toList();
    }
}
