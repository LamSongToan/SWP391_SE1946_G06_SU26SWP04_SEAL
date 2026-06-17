package com.seal.hackathon.event.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.event.dto.EventUpdateNotificationDto;
import com.seal.hackathon.event.service.EventUpdateNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class EventUpdateNotificationController {

    private final EventUpdateNotificationService notificationService;

    public EventUpdateNotificationController(EventUpdateNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/event-updates")
    public ResponseEntity<ApiResponse<List<EventUpdateNotificationDto>>> listMyEventUpdates(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Event update notifications fetched",
                notificationService.listMyNotifications(authentication)
        ));
    }
}
