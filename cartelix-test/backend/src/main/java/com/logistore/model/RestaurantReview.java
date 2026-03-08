package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "restaurant_reviews")
public class RestaurantReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "restaurant_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("reviews")
    private Restaurant restaurant;

    private Integer rating; // 1-5
    
    @Column(length = 1000)
    private String comment;
    
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
