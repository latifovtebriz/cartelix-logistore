package com.logistore.repository;

import com.logistore.model.Complaint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    Page<Complaint> findByUserId(String userId, Pageable pageable);
    
    // Sorted by date descending (newest first)
    Page<Complaint> findAllByOrderByCreatedAtDesc(Pageable pageable);
    
    Page<Complaint> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
}
