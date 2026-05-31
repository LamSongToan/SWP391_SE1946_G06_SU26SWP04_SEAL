package com.seal.hackathon.auth.entity;

public enum UserStatus {
    PENDING_APPROVAL("PendingApproval"),
    ACTIVE("Active"),
    REJECTED("Rejected"),
    SUSPENDED("Suspended");

    private final String dbValue;

    UserStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public boolean isActiveValue(String rawStatus) {
        return dbValue.equalsIgnoreCase(rawStatus)
                || name().equalsIgnoreCase(rawStatus)
                || (this == ACTIVE && "APPROVED".equalsIgnoreCase(rawStatus))
                || (this == PENDING_APPROVAL && "PENDING".equalsIgnoreCase(rawStatus))
                || (this == SUSPENDED && "DISABLED".equalsIgnoreCase(rawStatus));
    }

    public static UserStatus from(String rawStatus) {
        if (rawStatus == null) {
            throw new IllegalArgumentException("status is required");
        }
        for (UserStatus status : values()) {
            if (status.isActiveValue(rawStatus.trim())) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid status: " + rawStatus);
    }
}
