package com.seal.hackathon.event.service;

import com.seal.hackathon.auth.entity.MentorProfileEntity;
import com.seal.hackathon.auth.repository.MentorProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.AssignTrackMentorRequest;
import com.seal.hackathon.event.entity.HackathonEventEntity;
import com.seal.hackathon.event.entity.TrackEntity;
import com.seal.hackathon.event.entity.TrackMentorEntity;
import com.seal.hackathon.event.repository.HackathonEventRepository;
import com.seal.hackathon.event.repository.JudgeAssignmentRepository;
import com.seal.hackathon.event.repository.TrackMentorRepository;
import com.seal.hackathon.event.repository.TrackRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrackMentorServiceTest {

    @Mock
    private TrackMentorRepository trackMentorRepository;
    @Mock
    private TrackRepository trackRepository;
    @Mock
    private MentorProfileRepository mentorProfileRepository;
    @Mock
    private HackathonEventRepository eventRepository;
    @Mock
    private JudgeAssignmentRepository judgeAssignmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AssignmentLockPolicyService assignmentLockPolicyService;

    @InjectMocks
    private TrackMentorService service;

    @Test
    void listByTrack_shouldHideAssignmentsForEndedEvent() {
        TrackEntity track = track(20, 10);
        HackathonEventEntity event = event(10, "Ended", LocalDateTime.now().minusDays(1));
        when(trackRepository.findById(20)).thenReturn(Optional.of(track));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));

        assertTrue(service.listByTrack(20).isEmpty());
        verify(trackMentorRepository, never()).findByTrackTrackId(20);
    }

    @Test
    void assign_shouldRejectExpiredEventEvenWhenStoredStatusIsOngoing() {
        TrackEntity track = track(20, 10);
        HackathonEventEntity event = event(10, "Ongoing", LocalDateTime.now().minusMinutes(1));
        MentorProfileEntity mentor = new MentorProfileEntity();
        mentor.setUserRoleId(30);
        when(trackRepository.findById(20)).thenReturn(Optional.of(track));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));
        when(mentorProfileRepository.findById(30)).thenReturn(Optional.of(mentor));
        when(trackMentorRepository.existsByTrackTrackIdAndMentorUserRoleId(20, 30)).thenReturn(false);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.assign(new AssignTrackMentorRequest(30, 20)));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        assertTrue(exception.getMessage().contains("ended"));
        verify(trackMentorRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void remove_shouldRejectAssignmentFromEndedEvent() {
        TrackEntity track = track(20, 10);
        TrackMentorEntity assignment = new TrackMentorEntity();
        assignment.setTrack(track);
        HackathonEventEntity event = event(10, "Ended", LocalDateTime.now().minusDays(1));
        when(trackMentorRepository.findById(40)).thenReturn(Optional.of(assignment));
        when(eventRepository.findById(10)).thenReturn(Optional.of(event));

        ApiException exception = assertThrows(ApiException.class, () -> service.remove(40));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(trackMentorRepository, never()).delete(assignment);
    }

    private TrackEntity track(Integer trackId, Integer eventId) {
        TrackEntity track = new TrackEntity();
        track.setTrackId(trackId);
        track.setEventId(eventId);
        track.setName("AI & Data");
        return track;
    }

    private HackathonEventEntity event(Integer eventId, String status, LocalDateTime competitionEndAt) {
        HackathonEventEntity event = new HackathonEventEntity();
        event.setEventId(eventId);
        event.setName("SEAL Summer 2026");
        event.setStatus(status);
        event.setCompetitionEndAt(competitionEndAt);
        return event;
    }
}
