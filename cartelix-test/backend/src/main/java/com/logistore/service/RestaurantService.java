package com.logistore.service;

import com.logistore.model.Restaurant;
import com.logistore.model.RestaurantReview;
import com.logistore.model.User;
import com.logistore.repository.RestaurantRepository;
import com.logistore.repository.RestaurantReviewRepository;
import com.logistore.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class RestaurantService {
    @Autowired
    private RestaurantRepository restaurantRepository;
    
    @Autowired
    private RestaurantReviewRepository reviewRepository;
    
    @Autowired
    private UserRepository userRepository;

    public List<Restaurant> getAllRestaurants() {
        return restaurantRepository.findAll();
    }

    public Restaurant getRestaurantById(Long id) {
        return restaurantRepository.findById(id).orElseThrow(() -> new RuntimeException("Restaurant not found"));
    }

    public Restaurant createRestaurant(Restaurant restaurant) {
        return restaurantRepository.save(restaurant);
    }
    
    public void deleteRestaurant(Long id) {
        restaurantRepository.deleteById(id);
    }

    public RestaurantReview addReview(Long restaurantId, String userId, Integer rating, String comment) {
        Restaurant restaurant = getRestaurantById(restaurantId);
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        
        RestaurantReview review = new RestaurantReview();
        review.setRestaurant(restaurant);
        review.setUser(user);
        review.setRating(rating);
        review.setComment(comment);
        
        RestaurantReview savedReview = reviewRepository.save(review);
        
        // Update average rating
        updateRestaurantRating(restaurant);
        
        return savedReview;
    }
    
    private void updateRestaurantRating(Restaurant restaurant) {
        List<RestaurantReview> reviews = reviewRepository.findByRestaurantId(restaurant.getId());
        double avg = reviews.stream().mapToInt(RestaurantReview::getRating).average().orElse(0.0);
        restaurant.setAverageRating(avg);
        restaurantRepository.save(restaurant);
    }
}
