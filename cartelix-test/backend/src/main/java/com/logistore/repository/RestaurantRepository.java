package com.logistore.repository;

import com.logistore.model.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {
    List<Restaurant> findByNameContainingIgnoreCase(String name);
    // Add spatial queries if needed later
}
