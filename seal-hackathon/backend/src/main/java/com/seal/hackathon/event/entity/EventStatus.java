package com.seal.hackathon.event.entity;

public enum EventStatus {
    DRAFT("Draft"),
    ONGOING("Ongoing"),
    ENDED("Ended");

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
        if ("ACTIVE".equalsIgnoreCase(normalized)
                || "CONFIGURED".equalsIgnoreCase(normalized)
                || "REGISTRATIONOPEN".equalsIgnoreCase(normalized)
                || "SCORING".equalsIgnoreCase(normalized)
                || "RESULTPUBLISHED".equalsIgnoreCase(normalized)) {
            return ONGOING;
        }
        if ("CLOSED".equalsIgnoreCase(normalized)
                || "CANCELLED".equalsIgnoreCase(normalized)
                || "COMPLETED".equalsIgnoreCase(normalized)
                || "FINISHED".equalsIgnoreCase(normalized)) {
            return ENDED;
        }
        throw new IllegalArgumentException("Invalid event status: " + rawStatus);
    }

    public boolean isTerminal() {
        return this == ENDED;
    }
}
