package com.logistore.repository;

import com.logistore.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProductId(Long productId);

    List<Review> findByUserId(String userId);
    
    // Paginated reviews by product, sorted by date descending
    Page<Review> findByProductIdOrderByDateDesc(Long productId, Pageable pageable);
    
    // All reviews sorted by date descending (for admin)
    Page<Review> findAllByOrderByDateDesc(Pageable pageable);

    // Check if user already reviewed this product (returns first one)
    Optional<Review> findByUserIdAndProductId(String userId, Long productId);

    // Count reviews by user for a specific product (for max 2 reviews per product
    // limit)
    long countByUserIdAndProductId(String userId, Long productId);

    // Count reviews by user on a specific date (for daily update limit)
    List<Review> findByUserIdAndDate(String userId, LocalDate date);
}
