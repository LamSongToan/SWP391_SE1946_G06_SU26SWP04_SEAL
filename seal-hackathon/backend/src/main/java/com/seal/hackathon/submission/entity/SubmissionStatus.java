package com.seal.hackathon.submission.entity;

public enum SubmissionStatus {
    SUBMITTED("Submitted"),
    EVALUATING("Evaluating"),
    QUALIFIED("Qualified"),
    ELIMINATED("Eliminated");

    private final String dbValue;

    SubmissionStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public static SubmissionStatus from(String rawStatus) {
        if (rawStatus == null) {
            throw new IllegalArgumentException("status is required");
        }
        String normalized = rawStatus.trim().replace("_", "").replace(" ", "");
        for (SubmissionStatus status : values()) {
            if (status.dbValue.equalsIgnoreCase(normalized)
                    || status.name().replace("_", "").equalsIgnoreCase(normalized)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid submission status: " + rawStatus);
    }
}
