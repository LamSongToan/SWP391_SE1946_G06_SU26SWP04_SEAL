package com.seal.hackathon.submission.repository;

import com.seal.hackathon.submission.entity.SubmissionHistoryEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubmissionHistoryRepository extends JpaRepository<SubmissionHistoryEntity, Integer> {

    @EntityGraph(attributePaths = {"submission", "changedBy", "changedBy.userRole", "changedBy.userRole.user"})
    List<SubmissionHistoryEntity> findBySubmissionSubmissionIdOrderByCreatedAtDesc(Integer submissionId);
}
