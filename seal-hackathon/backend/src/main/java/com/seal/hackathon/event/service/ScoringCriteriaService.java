package com.seal.hackathon.event.service;

import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.event.dto.ScoringCriteriaDto;
import com.seal.hackathon.event.dto.ScoringCriteriaRequest;
import com.seal.hackathon.event.entity.ScoringCriteriaEntity;
import com.seal.hackathon.event.repository.RoundRepository;
import com.seal.hackathon.event.repository.ScoringCriteriaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ScoringCriteriaService {

    private final ScoringCriteriaRepository criteriaRepository;
    private final RoundRepository roundRepository;

    public ScoringCriteriaService(ScoringCriteriaRepository criteriaRepository,
                                   RoundRepository roundRepository) {
        this.criteriaRepository = criteriaRepository;
        this.roundRepository = roundRepository;
    }

    @Transactional(readOnly = true)
    public List<ScoringCriteriaDto> listByRound(Integer roundId) {
        if (!roundRepository.existsById(roundId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Round not found");
        }
        return criteriaRepository.findByRoundIdOrderByCriteriaId(roundId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public ScoringCriteriaDto create(Integer roundId, ScoringCriteriaRequest request) {
        if (!roundRepository.existsById(roundId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Round not found");
        }
        ScoringCriteriaEntity entity = new ScoringCriteriaEntity();
        entity.setRoundId(roundId);
        entity.setCriteriaName(request.criteriaName().trim());
        entity.setWeight(request.weight());
        entity.setCriteriaType(request.criteriaType().trim());
        return toDto(criteriaRepository.save(entity));
    }

    @Transactional
    public ScoringCriteriaDto update(Integer criteriaId, ScoringCriteriaRequest request) {
        ScoringCriteriaEntity entity = criteriaRepository.findById(criteriaId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Criteria not found"));
        entity.setCriteriaName(request.criteriaName().trim());
        entity.setWeight(request.weight());
        entity.setCriteriaType(request.criteriaType().trim());
        return toDto(criteriaRepository.save(entity));
    }

    @Transactional
    public void delete(Integer criteriaId) {
        if (!criteriaRepository.existsById(criteriaId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Criteria not found");
        }
        criteriaRepository.deleteById(criteriaId);
    }

    private ScoringCriteriaDto toDto(ScoringCriteriaEntity e) {
        return new ScoringCriteriaDto(e.getCriteriaId(), e.getRoundId(),
                e.getCriteriaName(), e.getWeight(), e.getCriteriaType());
    }
}