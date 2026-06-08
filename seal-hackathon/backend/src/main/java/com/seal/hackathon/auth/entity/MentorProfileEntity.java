package com.seal.hackathon.auth.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
@Entity
@Table(name = "MentorProfile")
public class MentorProfileEntity {

    @Id
    @Column(name = "user_role_id")
    private Integer userRoleId;

    @OneToOne(optional = false)
    @MapsId
    @JoinColumn(name = "user_role_id")
    private UserRoleEntity userRole;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "specialization", length = 100)
    private String specialization;
}