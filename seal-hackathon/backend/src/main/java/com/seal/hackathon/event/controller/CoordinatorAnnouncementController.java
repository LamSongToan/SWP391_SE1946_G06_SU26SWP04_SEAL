package com.seal.hackathon.event.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.event.dto.AnnouncementRecipientPreviewDto;
import com.seal.hackathon.event.dto.CreateAnnouncementRequest;
import com.seal.hackathon.event.dto.SentAnnouncementDto;
import com.seal.hackathon.event.dto.UpdateAnnouncementRequest;
import com.seal.hackathon.event.service.EventUpdateNotificationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/coordinator/announcements")
public class CoordinatorAnnouncementController {

    private final EventUpdateNotificationService notificationService;

    public CoordinatorAnnouncementController(EventUpdateNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SentAnnouncementDto>>> listSentAnnouncements(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Sent announcements fetched",
                notificationService.listSentAnnouncements(authentication)
        ));
    }

    @GetMapping("/recipient-preview")
    public ResponseEntity<ApiResponse<AnnouncementRecipientPreviewDto>> previewRecipients(
            Authentication authentication,
            @RequestParam Integer eventId,
            @RequestParam String audience) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Announcement recipients previewed",
                notificationService.previewRecipients(authentication, eventId, audience)
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SentAnnouncementDto>> sendAnnouncement(
            Authentication authentication,
            @Valid @RequestBody CreateAnnouncementRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Announcement sent",
                notificationService.sendAnnouncement(authentication, request)
        ));
    }

    @PutMapping("/{announcementId}")
    public ResponseEntity<ApiResponse<SentAnnouncementDto>> updateAnnouncement(
            Authentication authentication,
            @PathVariable Integer announcementId,
            @Valid @RequestBody UpdateAnnouncementRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Announcement updated",
                notificationService.updateAnnouncement(authentication, announcementId, request)
        ));
    }

    @DeleteMapping("/{announcementId}")
    public ResponseEntity<ApiResponse<Void>> deleteAnnouncement(
            Authentication authentication,
            @PathVariable Integer announcementId) {
        notificationService.deleteAnnouncement(authentication, announcementId);
        return ResponseEntity.ok(ApiResponse.ok("Announcement deleted", null));
    }
}
