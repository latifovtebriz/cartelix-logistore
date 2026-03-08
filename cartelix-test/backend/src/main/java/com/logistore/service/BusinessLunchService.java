package com.logistore.service;

import com.logistore.model.BusinessLunch;
import com.logistore.model.Restaurant;
import com.logistore.repository.BusinessLunchRepository;
import com.logistore.repository.RestaurantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class BusinessLunchService {
    @Autowired
    private BusinessLunchRepository businessLunchRepository;
    
    @Autowired
    private RestaurantRepository restaurantRepository;

    public List<BusinessLunch> getAllBusinessLunches() {
        return businessLunchRepository.findAll();
    }
    
    public List<BusinessLunch> getBusinessLunchesByRestaurant(Long restaurantId) {
        return businessLunchRepository.findByRestaurantId(restaurantId);
    }

    public BusinessLunch createBusinessLunch(Long restaurantId, BusinessLunch businessLunch) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
            .orElseThrow(() -> new RuntimeException("Restaurant not found"));
        businessLunch.setRestaurant(restaurant);
        return businessLunchRepository.save(businessLunch);
    }
    
    public void deleteBusinessLunch(Long id) {
        businessLunchRepository.deleteById(id);
    }
}
