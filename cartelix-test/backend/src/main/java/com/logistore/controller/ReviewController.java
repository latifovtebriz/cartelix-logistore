package com.logistore.controller;

import com.logistore.model.Review;
import com.logistore.model.Product;
import com.logistore.service.ReviewService;
import com.logistore.repository.ReviewRepository;
import com.logistore.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private ReviewRepository reviewRepository;
    
    @Autowired
    private ProductRepository productRepository;

    @PostMapping
    public ResponseEntity<?> addReview(@RequestBody Review review) {
        // Check if user has reached max 2 reviews per product limit
        if (review.getUserId() != null && review.getProductId() != null) {
            long existingCount = reviewRepository.countByUserIdAndProductId(review.getUserId(), review.getProductId());
            if (existingCount >= 2) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "Bu məhsula maksimum 2 rəy yaza bilərsiniz",
                        "currentCount", existingCount));
            }
        }
        return ResponseEntity.ok(reviewService.addReview(review));
    }

    // Get reviews for a product with pagination (sorted by date desc)
    @GetMapping("/product/{productId}")
    public ResponseEntity<?> getReviewsByProductId(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        int pageSize = Math.min(size, 20);
        Page<Review> reviews = reviewRepository.findByProductIdOrderByDateDesc(productId, PageRequest.of(page, pageSize));
        return ResponseEntity.ok(reviews);
    }

    @GetMapping("/user/{userId}")
    public List<Review> getReviewsByUserId(@PathVariable String userId) {
        return reviewService.getReviewsByUserId(userId);
    }

    // Admin endpoint - get all reviews with pagination (sorted by date desc)
    @GetMapping("/all")
    public Page<Review> getAllReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        int pageSize = Math.min(size, 20);
        return reviewRepository.findAllByOrderByDateDesc(PageRequest.of(page, pageSize));
    }
    
    // Admin endpoint - get all reviews with product details
    @GetMapping("/admin/all")
    public ResponseEntity<?> getAllReviewsWithProductDetails(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        int pageSize = Math.min(size, 20);
        Page<Review> reviews = reviewRepository.findAllByOrderByDateDesc(PageRequest.of(page, pageSize));
        
        // Enrich reviews with product details
        List<Map<String, Object>> enrichedReviews = reviews.getContent().stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("userId", r.getUserId());
            map.put("userName", r.getUserName());
            map.put("productId", r.getProductId());
            map.put("rating", r.getRating());
            map.put("comment", r.getComment());
            map.put("date", r.getDate());
            map.put("verifiedPurchase", r.isVerifiedPurchase());
            
            // Add product details
            productRepository.findById(r.getProductId()).ifPresent(product -> {
                map.put("productName", product.getName());
                map.put("barcode", product.getBarcode());
            });
            
            return map;
        }).toList();
        
        Map<String, Object> response = new HashMap<>();
        response.put("content", enrichedReviews);
        response.put("totalPages", reviews.getTotalPages());
        response.put("totalElements", reviews.getTotalElements());
        response.put("number", reviews.getNumber());
        
        return ResponseEntity.ok(response);
    }

    // Update review - user can only update their own, max 1 update per day
    @PutMapping("/{id}")
    public ResponseEntity<?> updateReview(
            @PathVariable Long id,
            @RequestBody Review reviewData,
            @RequestParam String userId) {
        return reviewService.getReviewById(id)
                .map(review -> {
                    // Check ownership
                    if (!review.getUserId().equals(userId)) {
                        return ResponseEntity.status(403).body(Map.of("error", "Bu rəy sizə aid deyil"));
                    }

                    // Check daily limit - user can only update once per day
                    java.time.LocalDate today = java.time.LocalDate.now();
                    if (review.getLastModifiedDate() != null && review.getLastModifiedDate().equals(today)) {
                        return ResponseEntity.status(429).body(Map.of(
                                "error", "Rəyi gündə yalnız 1 dəfə yeniləyə bilərsiniz",
                                "nextAllowedUpdate", today.plusDays(1).toString()));
                    }

                    // Update allowed fields
                    if (reviewData.getRating() > 0)
                        review.setRating(reviewData.getRating());
                    if (reviewData.getComment() != null)
                        review.setComment(reviewData.getComment());

                    // Set last modified date
                    review.setLastModifiedDate(today);

                    return ResponseEntity.ok(reviewService.saveReview(review));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete review - user can delete their own, admin can delete any
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReview(
            @PathVariable Long id,
            @RequestParam(required = false) String userId,
            @RequestParam(defaultValue = "false") boolean isAdmin) {
        return reviewService.getReviewById(id)
                .map(review -> {
                    // Admin can delete any review
                    if (isAdmin) {
                        reviewService.deleteReview(id);
                        return ResponseEntity.ok().build();
                    }
                    // User can only delete their own
                    if (userId != null && review.getUserId().equals(userId)) {
                        reviewService.deleteReview(id);
                        return ResponseEntity.ok().build();
                    }
                    return ResponseEntity.status(403).body("Bu rəyi silmək icazəniz yoxdur");
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
