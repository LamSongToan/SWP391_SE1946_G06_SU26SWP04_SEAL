package com.seal.hackathon.event.dto;

public record TrackPromotionRuleRequest(
        Integer trackId,
        String trackName,
        Integer topN
) {
}
