package com.seal.hackathon.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "StudentProfile")
public class StudentProfileEntity {

    @Id
    @Column(name = "user_role_id")
    private Integer userRoleId;

    @OneToOne(optional = false)
    @MapsId
    @JoinColumn(name = "user_role_id")
    private UserRoleEntity userRole;

    @Column(name = "student_type", nullable = false, length = 50)
    private String studentType;

    @Column(name = "student_code", length = 50)
    private String studentCode;

    @Column(name = "university_name", nullable = false, length = 150)
    private String universityName;
}
