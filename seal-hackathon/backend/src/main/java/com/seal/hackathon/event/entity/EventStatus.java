package com.seal.hackathon.event.entity;

public enum EventStatus {
    DRAFT("Draft"),
    CONFIGURED("Configured"),
    REGISTRATION_OPEN("RegistrationOpen"),
    ONGOING("Ongoing"),
    SCORING("Scoring"),
    RESULT_PUBLISHED("ResultPublished"),
    CLOSED("Closed"),
    CANCELLED("Cancelled");

    private final String dbValue;

    EventStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public static EventStatus from(String rawStatus) {
        if (rawStatus == null) {
            throw new IllegalArgumentException("status is required");
        }
        String normalized = rawStatus.trim().replace("_", "").replace(" ", "");
        for (EventStatus status : values()) {
            if (status.dbValue.equalsIgnoreCase(normalized)
                    || status.name().replace("_", "").equalsIgnoreCase(normalized)) {
                return status;
            }
        }
        if ("UPCOMING".equalsIgnoreCase(normalized)) {
            return DRAFT;
        }
        if ("ACTIVE".equalsIgnoreCase(normalized)) {
            return ONGOING;
        }
        throw new IllegalArgumentException("Invalid event status: " + rawStatus);
    }

    public boolean isTerminal() {
        return this == CLOSED || this == CANCELLED;
    }
}
