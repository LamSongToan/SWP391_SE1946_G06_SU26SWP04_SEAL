package com.seal.hackathon.auth.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Entity
@Table(name = "JudgeProfile")
public class JudgeProfileEntity {

    @Id
    @Column(name = "user_role_id")
    private Integer userRoleId;

    @OneToOne(optional = false)
    @MapsId
    @JoinColumn(name = "user_role_id")
    private UserRoleEntity userRole;

    @Column(name = "judge_type", nullable = false, length = 50)
    private String judgeType; // 'Internal' or 'Guest'

    @Column(name = "organization", length = 150)
    private String organization;

    @Column(name = "account_expiry")
    private java.time.LocalDateTime accountExpiry;
}