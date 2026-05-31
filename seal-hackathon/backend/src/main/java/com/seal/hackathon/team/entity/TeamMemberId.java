package com.seal.hackathon.team.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@EqualsAndHashCode
@NoArgsConstructor
@Embeddable
public class TeamMemberId implements Serializable {

    @Column(name = "team_id")
    private Integer teamId;

    @Column(name = "user_role_id")
    private Integer userRoleId;

    public TeamMemberId(Integer teamId, Integer userRoleId) {
        this.teamId = teamId;
        this.userRoleId = userRoleId;
    }
}
