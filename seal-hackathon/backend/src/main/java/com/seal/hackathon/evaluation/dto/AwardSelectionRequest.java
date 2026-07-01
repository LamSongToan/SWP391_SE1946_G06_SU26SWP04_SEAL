package com.seal.hackathon.evaluation.dto;

import java.util.List;

public record AwardSelectionRequest(
        String awardName,
        List<Integer> winnerTeamIds
) {
}
