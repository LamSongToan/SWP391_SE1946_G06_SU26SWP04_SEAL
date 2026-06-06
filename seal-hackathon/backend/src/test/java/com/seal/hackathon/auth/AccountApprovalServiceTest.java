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
        user.setRejectionReason("Old reason");

        when(userRepository.findById(11)).thenReturn(Optional.of(user));

        accountApprovalService.processAction(11, "ACTIVE", null);

        Assertions.assertEquals(UserStatus.ACTIVE.getDbValue(), user.getStatus());
        Assertions.assertTrue(user.getApproved());
        Assertions.assertNull(user.getRejectionReason());
    }

    @Test
    void processAction_shouldStoreRejectReason() {
        UserEntity user = new UserEntity();
        user.setUserId(13);
        user.setStatus(UserStatus.PENDING_APPROVAL.getDbValue());
        user.setApproved(false);

        when(userRepository.findById(13)).thenReturn(Optional.of(user));

        accountApprovalService.processAction(13, "REJECTED", "Student ID image is unclear");

        Assertions.assertEquals(UserStatus.REJECTED.getDbValue(), user.getStatus());
        Assertions.assertFalse(user.getApproved());
        Assertions.assertEquals("Student ID image is unclear", user.getRejectionReason());
    }

    @Test
    void processAction_shouldRejectActivatingRejectedUserDirectly() {
        UserEntity user = new UserEntity();
        user.setUserId(12);
        user.setStatus(UserStatus.REJECTED.getDbValue());
        user.setApproved(false);

        when(userRepository.findById(12)).thenReturn(Optional.of(user));

        ApiException ex = Assertions.assertThrows(ApiException.class,
                () -> accountApprovalService.processAction(12, "ACTIVE", null));

        Assertions.assertTrue(ex.getMessage().contains("Only PendingApproval accounts can be activated"));
    }
}
