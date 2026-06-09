package com.seal.hackathon.evaluation.repository;

import com.seal.hackathon.evaluation.entity.CriteriaTemplateEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CriteriaTemplateRepository extends JpaRepository<CriteriaTemplateEntity, Integer> {

    @EntityGraph(attributePaths = {"items", "createdBy"})
    List<CriteriaTemplateEntity> findAllByOrderByTemplateNameAsc();

    @EntityGraph(attributePaths = {"items", "createdBy"})
    Optional<CriteriaTemplateEntity> findDetailedByTemplateId(Integer templateId);

    boolean existsByTemplateNameIgnoreCase(String templateName);

    boolean existsByTemplateNameIgnoreCaseAndTemplateIdNot(String templateName, Integer templateId);
}
