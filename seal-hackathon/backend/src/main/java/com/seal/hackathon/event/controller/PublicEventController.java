package com.seal.hackathon.event.controller;

import com.seal.hackathon.common.ApiResponse;
import com.seal.hackathon.event.dto.UpcomingEventDto;
import com.seal.hackathon.event.service.PublicEventService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/events")
public class PublicEventController {

    private final PublicEventService publicEventService;

    public PublicEventController(PublicEventService publicEventService) {
        this.publicEventService = publicEventService;
    }

    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<UpcomingEventDto>>> getUpcomingEvents() {
        List<UpcomingEventDto> data = publicEventService.getUpcomingEvents();
        return ResponseEntity.ok(ApiResponse.ok("Upcoming events fetched", data));
    }
}
