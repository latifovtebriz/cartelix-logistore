package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "user_challenges")
public class UserChallenge {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    private String challengeName;
    private String description;
    private int targetValue;
    private int currentValue;
    private boolean completed;
    private LocalDate expiryDate;
    private LocalDate startDate;
    private LocalDate endDate;
    private String targetUserId; // For personalized campaigns (null = global)

    // Purchase-based campaign fields
    private Integer requiredPurchaseCount; // Number of purchases required
    private Double minAmountPerPurchase; // Minimum amount per purchase

    @Enumerated(EnumType.STRING)
    private DiscountType discountType; // Type of discount to apply
    private Double discountValue; // Discount amount (percentage or fixed)

    public enum DiscountType {
        PERCENTAGE,
        FIXED_AMOUNT
    }

    private boolean redeemed;

    public boolean isRedeemed() {
        return redeemed;
    }

    public void setRedeemed(boolean redeemed) {
        this.redeemed = redeemed;
    }
}
