package com.seal.hackathon.auth.entity;

public enum RoleType {
    STUDENT("Student"),
    MENTOR("Mentor"),
    JUDGE("Judge"),
    COORDINATOR("Coordinator");

    private final String dbValue;

    RoleType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public String toAuthorityRole() {
        return name();
    }
}
