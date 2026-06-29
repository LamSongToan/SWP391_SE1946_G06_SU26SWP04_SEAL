package com.seal.hackathon.evaluation.entity;

public enum RankingQualificationStatus {
    PENDING("Pending"),
    QUALIFIED("Qualified"),
    ELIMINATED("Eliminated"),
    DISQUALIFIED("Disqualified"),
    NOT_APPLICABLE("Not Applicable");

    private final String dbValue;

    RankingQualificationStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public static RankingQualificationStatus from(String rawValue) {
        if (rawValue == null) {
            return PENDING;
        }
        String normalized = rawValue.trim().replace("_", "").replace(" ", "");
        for (RankingQualificationStatus status : values()) {
            if (status.dbValue.replace(" ", "").equalsIgnoreCase(normalized)
                    || status.name().replace("_", "").equalsIgnoreCase(normalized)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid ranking qualification status: " + rawValue);
    }
}
