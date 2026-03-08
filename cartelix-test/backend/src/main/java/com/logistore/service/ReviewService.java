package com.logistore.service;

import com.logistore.model.Review;
import com.logistore.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    public Review addReview(Review review) {
        review.setDate(LocalDate.now());
        return reviewRepository.save(review);
    }

    public Review saveReview(Review review) {
        return reviewRepository.save(review);
    }

    public Optional<Review> getReviewById(Long id) {
        return reviewRepository.findById(id);
    }

    public Page<Review> getAllReviews(Pageable pageable) {
        return reviewRepository.findAll(pageable);
    }

    public List<Review> getReviewsByProductId(Long productId) {
        return reviewRepository.findByProductId(productId);
    }

    public List<Review> getReviewsByUserId(String userId) {
        return reviewRepository.findByUserId(userId);
    }

    public void deleteReview(Long id) {
        reviewRepository.deleteById(id);
    }
}
