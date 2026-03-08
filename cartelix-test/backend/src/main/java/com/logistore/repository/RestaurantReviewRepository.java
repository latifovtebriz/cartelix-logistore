package com.logistore.repository;

import com.logistore.model.RestaurantReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RestaurantReviewRepository extends JpaRepository<RestaurantReview, Long> {
    List<RestaurantReview> findByRestaurantId(Long restaurantId);
}
