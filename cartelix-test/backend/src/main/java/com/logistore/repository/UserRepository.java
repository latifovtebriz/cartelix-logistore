package com.logistore.repository;

import com.logistore.model.User;
import com.logistore.model.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByPhone(String phone);

    Optional<User> findByEmail(String email);

    Optional<User> findByBarcode(String barcode);

    // Search by name or phone
    Page<User> findByNameContainingIgnoreCaseOrPhoneContaining(String name, String phone, Pageable pageable);

    // Find by role
    List<User> findByRole(Role role);

    // Find blocked users
    List<User> findByBlockedTrue();

    // Find users with Scan&Go blocked
    List<User> findByScanGoBlockedTrue();

    // Count by role
    long countByRole(Role role);
}
