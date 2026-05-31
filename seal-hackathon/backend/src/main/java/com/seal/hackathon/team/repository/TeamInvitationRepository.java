package com.seal.hackathon.team.repository;

import com.seal.hackathon.team.entity.TeamInvitationEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamInvitationRepository extends JpaRepository<TeamInvitationEntity, Integer> {

    @EntityGraph(attributePaths = {
            "team", "team.track", "invitedBy", "invitedBy.userRole", "invitedBy.userRole.user",
            "invitee", "invitee.userRole", "invitee.userRole.user"
    })
    List<TeamInvitationEntity> findByInviteeUserRoleUserUserIdOrderByCreatedAtDesc(Integer userId);

    @EntityGraph(attributePaths = {
            "team", "team.track", "invitedBy", "invitedBy.userRole", "invitedBy.userRole.user",
            "invitee", "invitee.userRole", "invitee.userRole.user"
    })
    List<TeamInvitationEntity> findByTeamTeamIdOrderByCreatedAtDesc(Integer teamId);

    Optional<TeamInvitationEntity> findByTeamTeamIdAndInviteeUserRoleIdAndStatusIgnoreCase(
            Integer teamId, Integer inviteeUserRoleId, String status);

    long countByTeamTeamIdAndStatusIgnoreCase(Integer teamId, String status);
}
