package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "reviews")
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private Long productId;

    private int rating;

    @Column(length = 1000)
    private String comment;

    private LocalDate date;

    // For daily update limit - tracks when review was last modified
    private LocalDate lastModifiedDate;

    private boolean verifiedPurchase;

    // Denormalized user name for display
    private String userName;
}
