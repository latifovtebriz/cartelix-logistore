package com.logistore.repository;

import com.logistore.model.BusinessLunch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BusinessLunchRepository extends JpaRepository<BusinessLunch, Long> {
    List<BusinessLunch> findByRestaurantId(Long restaurantId);
    List<BusinessLunch> findByNameContainingIgnoreCase(String name);
}
