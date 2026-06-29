package com.seal.hackathon.event.repository;

import com.seal.hackathon.event.entity.AnnouncementEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnouncementRepository extends JpaRepository<AnnouncementEntity, Integer> {

    @EntityGraph(attributePaths = {"createdBy"})
    List<AnnouncementEntity> findTop300ByOrderByCreatedAtDescAnnouncementIdDesc();
}
