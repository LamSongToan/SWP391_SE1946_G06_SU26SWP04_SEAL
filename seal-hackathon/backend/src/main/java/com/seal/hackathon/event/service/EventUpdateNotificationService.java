package com.seal.hackathon.event.service;

import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.RoleType;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.repository.UserRoleRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.CreateAnnouncementRequest;
import com.seal.hackathon.event.dto.EventUpdateNotificationDto;
import com.seal.hackathon.event.dto.SentAnnouncementDto;
import com.seal.hackathon.event.dto.UpdateAnnouncementRequest;
import com.seal.hackathon.event.entity.EventUpdateNotificationEntity;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.repository.EventUpdateNotificationRepository;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.JudgeAssignmentRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.evaluation.service.AuditLogService;
import com.seal.hackathon.team.repository.TeamMemberRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class EventUpdateNotificationService {

    private final EventUpdateNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final HackathonEventRepository eventRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TrackMentorRepository trackMentorRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final AuditLogService auditLogService;

    public EventUpdateNotificationService(EventUpdateNotificationRepository notificationRepository,
                                          UserRepository userRepository,
                                          UserRoleRepository userRoleRepository,
                                          HackathonEventRepository eventRepository,
                                          TeamMemberRepository teamMemberRepository,
                                          TrackMentorRepository trackMentorRepository,
                                          JudgeAssignmentRepository judgeAssignmentRepository,
                                          AuditLogService auditLogService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.eventRepository = eventRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.trackMentorRepository = trackMentorRepository;
        this.judgeAssignmentRepository = judgeAssignmentRepository;
        this.auditLogService = auditLogService;
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
                notification.setAnnouncementAudience("AUTO");
                notificationRepository.save(notification);
            });
        }
    }

    @Transactional
    public SentAnnouncementDto sendAnnouncement(Authentication authentication, CreateAnnouncementRequest request) {
        UserEntity coordinator = currentCoordinator(authentication);
        HackathonEventEntity event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Event not found"));

        String title = normalizeRequired(request.title(), "Title");
        String message = normalizeRequired(request.message(), "Message");
        String audience = normalizeAudience(request.audience());
        Set<Integer> recipientIds = resolveRecipients(event.getEventId(), audience);

        if (recipientIds.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No recipients found for this event and audience");
        }

        LocalDateTime createdAt = LocalDateTime.now();
        Integer announcementId = null;
        for (Integer userId : recipientIds) {
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                continue;
            }
            EventUpdateNotificationEntity notification = saveNotification(user, event, title, message, audience, createdAt);
            if (announcementId == null) {
                announcementId = notification.getNotificationId();
            }
        }
        if (!recipientIds.contains(coordinator.getUserId())) {
            saveNotification(coordinator, event, title, message, "COORDINATOR_COPY", createdAt);
        }

        auditLogService.record(
                coordinator,
                "ANNOUNCEMENT_SENT",
                "EVENT",
                event.getEventId(),
                event.getName(),
                null,
                announcementPayload(title, message, audience, recipientIds.size()),
                "Coordinator sent an announcement"
        );

        return new SentAnnouncementDto(
                announcementId,
                event.getEventId(),
                event.getName(),
                title,
                message,
                audience,
                recipientIds.size(),
                createdAt
        );
    }

    @Transactional
    public SentAnnouncementDto updateAnnouncement(Authentication authentication,
                                                  Integer announcementId,
                                                  UpdateAnnouncementRequest request) {
        currentCoordinator(authentication);
        EventUpdateNotificationEntity representative = findEditableAnnouncement(announcementId);
        List<EventUpdateNotificationEntity> group = findAnnouncementGroup(representative);
        if (group.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Announcement group not found");
        }

        String title = normalizeRequired(request.title(), "Title");
        String message = normalizeRequired(request.message(), "Message");
        Map<String, Object> oldValue = announcementPayload(
                representative.getTitle(),
                representative.getMessage(),
                representative.getAnnouncementAudience(),
                recipientCount(group)
        );
        group.forEach((notification) -> {
            notification.setTitle(title);
            notification.setMessage(message);
        });
        notificationRepository.saveAll(group);

        auditLogService.record(
                "ANNOUNCEMENT_UPDATED",
                "EVENT",
                representative.getEventId(),
                representative.getEventName(),
                oldValue,
                announcementPayload(title, message, representative.getAnnouncementAudience(), recipientCount(group)),
                "Coordinator updated an announcement"
        );

        return toSentAnnouncementDto(representative.getNotificationId(), representative, group, title, message);
    }

    @Transactional
    public void deleteAnnouncement(Authentication authentication, Integer announcementId) {
        currentCoordinator(authentication);
        EventUpdateNotificationEntity representative = findEditableAnnouncement(announcementId);
        List<EventUpdateNotificationEntity> group = findAnnouncementGroup(representative);
        if (group.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Announcement group not found");
        }
        auditLogService.record(
                "ANNOUNCEMENT_DELETED",
                "EVENT",
                representative.getEventId(),
                representative.getEventName(),
                announcementPayload(
                        representative.getTitle(),
                        representative.getMessage(),
                        representative.getAnnouncementAudience(),
                        recipientCount(group)
                ),
                null,
                "Coordinator deleted an announcement"
        );
        notificationRepository.deleteAll(group);
    }

    @Transactional(readOnly = true)
    public List<SentAnnouncementDto> listSentAnnouncements(Authentication authentication) {
        currentCoordinator(authentication);
        Map<String, SentAnnouncementAccumulator> grouped = new LinkedHashMap<>();

        notificationRepository.findTop300ByOrderByCreatedAtDesc().stream()
                .filter((notification) -> notification.getAnnouncementAudience() != null)
                .filter((notification) -> !notification.getAnnouncementAudience().equalsIgnoreCase("AUTO"))
                .filter((notification) -> !notification.getAnnouncementAudience().equalsIgnoreCase("COORDINATOR_COPY"))
                .forEach((notification) -> {
                    String key = notification.getEventId()
                            + "|" + notification.getTitle()
                            + "|" + notification.getMessage()
                            + "|" + notification.getAnnouncementAudience()
                            + "|" + notification.getCreatedAt();
                    grouped.computeIfAbsent(key, ignored -> new SentAnnouncementAccumulator(notification))
                            .addRecipient(notification.getUser().getUserId());
                });

        return grouped.values().stream()
                .map(SentAnnouncementAccumulator::toDto)
                .toList();
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

    private Set<Integer> resolveRecipients(Integer eventId, String audience) {
        Set<Integer> recipientIds = new LinkedHashSet<>();
        if (audience.equals("ALL") || audience.equals("STUDENTS")) {
            recipientIds.addAll(teamMemberRepository.findDistinctStudentUserIdsByEventId(eventId));
        }
        if (audience.equals("ALL") || audience.equals("MENTORS")) {
            recipientIds.addAll(trackMentorRepository.findDistinctMentorUserIdsByEventId(eventId));
        }
        if (audience.equals("ALL") || audience.equals("JUDGES")) {
            recipientIds.addAll(judgeAssignmentRepository.findDistinctJudgeUserIdsByEventId(eventId));
        }
        return recipientIds;
    }

    private EventUpdateNotificationEntity saveNotification(UserEntity user,
                                                           HackathonEventEntity event,
                                                           String title,
                                                           String message,
                                                           String audience,
                                                           LocalDateTime createdAt) {
        EventUpdateNotificationEntity notification = new EventUpdateNotificationEntity();
        notification.setUser(user);
        notification.setEventId(event.getEventId());
        notification.setEventName(event.getName());
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setAnnouncementAudience(audience);
        notification.setCreatedAt(createdAt);
        return notificationRepository.save(notification);
    }

    private EventUpdateNotificationEntity findEditableAnnouncement(Integer announcementId) {
        EventUpdateNotificationEntity notification = notificationRepository.findById(announcementId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Announcement not found"));
        String audience = notification.getAnnouncementAudience();
        if (audience == null
                || audience.equalsIgnoreCase("AUTO")
                || audience.equalsIgnoreCase("COORDINATOR_COPY")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only custom sent announcements can be changed");
        }
        return notification;
    }

    private List<EventUpdateNotificationEntity> findAnnouncementGroup(EventUpdateNotificationEntity representative) {
        return notificationRepository.findAnnouncementGroup(
                representative.getEventId(),
                representative.getCreatedAt(),
                representative.getTitle(),
                representative.getMessage(),
                representative.getAnnouncementAudience()
        );
    }

    private SentAnnouncementDto toSentAnnouncementDto(Integer announcementId,
                                                      EventUpdateNotificationEntity representative,
                                                      List<EventUpdateNotificationEntity> group,
                                                      String title,
                                                      String message) {
        return new SentAnnouncementDto(
                announcementId,
                representative.getEventId(),
                representative.getEventName(),
                title,
                message,
                representative.getAnnouncementAudience(),
                recipientCount(group),
                representative.getCreatedAt()
        );
    }

    private Integer recipientCount(List<EventUpdateNotificationEntity> group) {
        Set<Integer> recipientIds = new LinkedHashSet<>();
        group.stream()
                .filter((notification) -> !notification.getAnnouncementAudience().equalsIgnoreCase("COORDINATOR_COPY"))
                .forEach((notification) -> {
                    if (notification.getUser() != null && notification.getUser().getUserId() != null) {
                        recipientIds.add(notification.getUser().getUserId());
                    }
                });
        return recipientIds.size();
    }

    private Map<String, Object> announcementPayload(String title, String message, String audience, Integer recipientCount) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", title);
        payload.put("message", message);
        payload.put("audience", audience);
        payload.put("recipientCount", recipientCount);
        return payload;
    }

    private UserEntity currentCoordinator(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        UserEntity user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        userRoleRepository.findByUserUserIdAndRoleTypeIgnoreCase(user.getUserId(), RoleType.COORDINATOR.getDbValue())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Coordinator role is required"));
        return user;
    }

    private String normalizeRequired(String value, String fieldName) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, fieldName + " is required");
        }
        return normalized;
    }

    private String normalizeAudience(String audience) {
        String normalized = normalizeRequired(audience, "Audience").toUpperCase(Locale.ROOT);
        if (!Set.of("ALL", "STUDENTS", "MENTORS", "JUDGES").contains(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Audience must be ALL, STUDENTS, MENTORS, or JUDGES");
        }
        return normalized;
    }

    private static final class SentAnnouncementAccumulator {
        private final Integer eventId;
        private final Integer announcementId;
        private final String eventName;
        private final String title;
        private final String message;
        private final String audience;
        private final LocalDateTime createdAt;
        private final Set<Integer> recipientIds = new LinkedHashSet<>();

        private SentAnnouncementAccumulator(EventUpdateNotificationEntity notification) {
            this.announcementId = notification.getNotificationId();
            this.eventId = notification.getEventId();
            this.eventName = notification.getEventName();
            this.title = notification.getTitle();
            this.message = notification.getMessage();
            this.audience = notification.getAnnouncementAudience();
            this.createdAt = notification.getCreatedAt();
        }

        private void addRecipient(Integer userId) {
            if (userId != null) {
                recipientIds.add(userId);
            }
        }

        private SentAnnouncementDto toDto() {
            return new SentAnnouncementDto(
                    announcementId,
                    eventId,
                    eventName,
                    title,
                    message,
                    audience,
                    recipientIds.size(),
                    createdAt
            );
        }
    }
}
