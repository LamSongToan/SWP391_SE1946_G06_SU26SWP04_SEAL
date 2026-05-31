package com.seal.hackathon.auth.security;

import com.seal.hackathon.auth.entity.UserEntity;
import com.seal.hackathon.auth.entity.UserStatus;
import com.seal.hackathon.auth.repository.UserRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Locale;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = userRepository.findByEmailIgnoreCase(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(mapAuthorities(user))
                .disabled(!Boolean.TRUE.equals(user.getApproved()) || !UserStatus.ACTIVE.isActiveValue(user.getStatus()))
                .build();
    }

    private Collection<? extends GrantedAuthority> mapAuthorities(UserEntity user) {
        return user.getUserRoles().stream()
                .map(role -> normalizeRole(role.getRoleType()))
                .map(role -> "ROLE_" + role)
                .map(SimpleGrantedAuthority::new)
                .toList();
    }

    public List<String> getRoleNames(UserEntity user) {
        return user.getUserRoles().stream()
                .map(role -> normalizeRole(role.getRoleType()))
                .toList();
    }

    private String normalizeRole(String dbRoleValue) {
        return dbRoleValue.trim().replace(" ", "_").toUpperCase(Locale.ROOT);
    }
}
