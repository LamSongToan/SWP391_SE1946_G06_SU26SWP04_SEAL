package com.seal.hackathon.demo;

import java.util.Arrays;

public enum DemoScenario {
    RESET(
            "reset",
            "01 Event Configuration",
            "Reset demo",
            "Restore the clean Summer 2026 baseline with no teams, registrations, or submissions.",
            "01_event_configuration/00_event_configuration_base.sql",
            true
    ),
    REGISTRATION_OPEN(
            "registration-open",
            "02 Team Formation & Submission",
            "Registration open",
            "Prepare teams and open registration for team formation, invitations, and member management.",
            "02_team_formation_submission_management/01_registration_open_team_formation.sql",
            false
    ),
    QUALIFIER_SUBMISSION_OPEN(
            "qualifier-submission-open",
            "02 Team Formation & Submission",
            "Qualifier submission open",
            "Close registration and open the qualifier submission window with ready-to-use teams.",
            "02_team_formation_submission_management/02_round1_submission_open.sql",
            false
    ),
    QUALIFIER_SCORING_OPEN(
            "qualifier-scoring-open",
            "03 Scoring, Promotion & Publish",
            "Qualifier scoring open",
            "Prepare qualifier submissions and assignments so judges can start scoring.",
            "03_scoring_promotion_publish/01_scoring_open_judge_ready.sql",
            false
    ),
    QUALIFIER_READY_TO_FINALIZE(
            "qualifier-ready-to-finalize",
            "03 Scoring, Promotion & Publish",
            "Qualifier ready to finalize",
            "Prepare completed qualifier scores for finalize, ranking, promotion, and publication.",
            "03_scoring_promotion_publish/02_ready_for_finalize_promote_publish.sql",
            false
    ),
    FINAL_ROUND_OPEN(
            "final-round-open",
            "03 Scoring, Promotion & Publish",
            "Final round open",
            "Prepare published qualifier results and open the final submission window.",
            "03_scoring_promotion_publish/03_advance_to_final_after_promotion.sql",
            false
    ),
    FINAL_READY_TO_PUBLISH(
            "final-ready-to-publish",
            "04 Awards",
            "Final ready to publish",
            "Prepare final submissions and scores for finalization, result publication, and awards.",
            "04_awards/01_final_ready_for_award_publish.sql",
            false
    ),
    INDIVIDUAL_MATCHING_TRACK_BALANCE(
            "individual-matching-track-balance",
            "Special Cases",
            "Individual matching & track balance",
            "Close registration with three waiting individual students and uneven tracks, then demonstrate automatic team matching and coordinator track balancing.",
            "05_special_cases/01_individual_matching_track_balance.sql",
            false
    );

    private final String key;
    private final String group;
    private final String title;
    private final String description;
    private final String relativePath;
    private final boolean reset;

    DemoScenario(String key,
                 String group,
                 String title,
                 String description,
                 String relativePath,
                 boolean reset) {
        this.key = key;
        this.group = group;
        this.title = title;
        this.description = description;
        this.relativePath = relativePath;
        this.reset = reset;
    }

    public String getKey() {
        return key;
    }

    public String getGroup() {
        return group;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getRelativePath() {
        return relativePath;
    }

    public boolean isReset() {
        return reset;
    }

    public static DemoScenario fromKey(String key) {
        return Arrays.stream(values())
                .filter(scenario -> scenario.key.equalsIgnoreCase(key))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown demo scenario: " + key));
    }
}
