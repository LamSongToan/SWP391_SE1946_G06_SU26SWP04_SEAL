package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.FeedbackEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<FeedbackEntity, Integer> {

    @EntityGraph(attributePaths = {"authorRole", "authorRole.user"})
    List<FeedbackEntity> findBySubmissionSubmissionIdOrderByCreatedAtDesc(Integer submissionId);

    long countByAuthorRoleUserRoleId(Integer authorRoleId);
}
