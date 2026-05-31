package com.seal.hackathon.auth;

import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserStatus;
import com.seal.hackathon.auth.repository.StudentProfileRepository;
import com.seal.hackathon.auth.repository.UserRepository;
import com.seal.hackathon.auth.service.AccountApprovalService;
import com.seal.hackathon.common.ApiException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountApprovalServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private StudentProfileRepository studentProfileRepository;

    @InjectMocks
    private AccountApprovalService accountApprovalService;

    @Test
    void processAction_shouldRequireRejectReason() {
        UserEntity user = new UserEntity();
        user.setUserId(10);
        user.setStatus(UserStatus.PENDING_APPROVAL.getDbValue());
        user.setApproved(false);

        when(userRepository.findById(10)).thenReturn(Optional.of(user));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> accountApprovalService.processAction(10, "REJECTED", " "));

        Assertions.assertTrue(ex.getMessage().contains("Reject reason is required"));
    }

    @Test
    void processAction_shouldActivatePendingApprovalUser() {
        UserEntity user = new UserEntity();
        user.setUserId(11);
        user.setStatus(UserStatus.PENDING_APPROVAL.getDbValue());
        user.setApproved(false);

        when(userRepository.findById(11)).thenReturn(Optional.of(user));

        accountApprovalService.processAction(11, "ACTIVE", null);

        Assertions.assertEquals(UserStatus.ACTIVE.getDbValue(), user.getStatus());
        Assertions.assertTrue(user.getApproved());
    }
}
