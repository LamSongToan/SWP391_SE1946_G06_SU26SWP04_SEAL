package com.seal.hackathon.evaluation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.evaluation.entity.AuditLogEntity;
import com.seal.hackathon.evaluation.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditLogService(AuditLogRepository auditLogRepository,
                           ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void record(UserEntity actor,
                       String actionType,
                       String targetEntity,
                       Integer targetId,
                       Object oldValue,
                       Object newValue,
                       String reason) {
        AuditLogEntity log = new AuditLogEntity();
        log.setUser(actor);
        log.setActionType(actionType);
        log.setTargetEntity(targetEntity);
        log.setTargetId(targetId);
        log.setOldValue(serialize(oldValue));
        log.setNewValue(serialize(newValue));
        log.setReason(reason);
        auditLogRepository.save(log);
    }

    private String serialize(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String stringValue) {
            return stringValue;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return String.valueOf(value);
        }
    }
}
