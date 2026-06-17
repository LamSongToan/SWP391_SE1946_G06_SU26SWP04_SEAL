package com.seal.hackathon.evaluation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.evaluation.entity.AuditLogEntity;
import com.seal.hackathon.evaluation.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Optional;

import static org.springframework.security.core.context.SecurityContextHolder.getContext;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;

    public AuditLogService(AuditLogRepository auditLogRepository,
                           ObjectMapper objectMapper,
                           UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
    }

    @Transactional
    public void record(UserEntity actor,
                       String actionType,
                       String targetEntity,
                       Integer targetId,
                       Object oldValue,
                       Object newValue,
                       String reason) {
        record(actor, actionType, targetEntity, targetId, null, oldValue, newValue, reason);
    }

    @Transactional
    public void record(UserEntity actor,
                       String actionType,
                       String targetEntity,
                       Integer targetId,
                       String targetName,
                       Object oldValue,
                       Object newValue,
                       String reason) {
        persistLog(actor, actionType, targetEntity, targetId, targetName, oldValue, newValue, reason);
    }

    @Transactional
    public void record(String actionType,
                       String targetEntity,
                       Integer targetId,
                       String targetName,
                       Object oldValue,
                       Object newValue,
                       String reason) {
        persistLog(resolveCurrentUser().orElse(null), actionType, targetEntity, targetId, targetName, oldValue, newValue, reason);
    }

    private void persistLog(UserEntity actor,
                            String actionType,
                            String targetEntity,
                            Integer targetId,
                            String targetName,
                            Object oldValue,
                            Object newValue,
                            String reason) {
        if (actor == null) {
            return;
        }

        AuditLogEntity log = new AuditLogEntity();
        log.setUser(actor);
        log.setActionType(actionType);
        log.setTargetEntity(targetEntity);
        log.setTargetId(targetId);
        log.setTargetName(normalizeOptional(targetName));
        log.setOldValue(serialize(oldValue));
        log.setNewValue(serialize(newValue));
        log.setReason(normalizeOptional(reason));
        log.setIpAddress(resolveIpAddress().orElse(null));
        log.setDeviceInfo(resolveUserAgent().orElse(null));
        auditLogRepository.save(log);
    }

    private Optional<UserEntity> resolveCurrentUser() {
        String principal = getContext().getAuthentication() == null
                ? null
                : getContext().getAuthentication().getName();
        if (principal == null || principal.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByEmailIgnoreCase(principal);
    }

    private Optional<String> resolveIpAddress() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return Optional.empty();
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return Optional.of(forwarded.split(",")[0].trim());
        }
        return Optional.ofNullable(normalizeOptional(request.getRemoteAddr()));
    }

    private Optional<String> resolveUserAgent() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(normalizeOptional(request.getHeader("User-Agent")));
    }

    private HttpServletRequest currentRequest() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) {
            return null;
        }
        return attributes.getRequest();
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

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
