package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "challenges")
public class Challenge {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;
    
    private int targetAmount; // e.g., Spend 50 AZN
    private int rewardPoints; // e.g., 500 points
    
    private LocalDate startDate;
    private LocalDate endDate;
    
    @Enumerated(EnumType.STRING)
    private ChallengeType type; // SPEND_AMOUNT, BUY_COUNT, VISIT_COUNT

    public enum ChallengeType {
        SPEND_AMOUNT,
        BUY_COUNT,
        VISIT_COUNT
    }
}
