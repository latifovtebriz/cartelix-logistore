package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "complaints")
public class Complaint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Store userId as string directly (matches User.id format)
    @Column(name = "user_id")
    private String userId;

    // Denormalized user name for display
    private String userName;

    private String subject;

    @Column(length = 2000)
    private String description;

    // Product reference for product-specific complaints
    private Long productId;
    private String productName;
    private String productBarcode;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private ComplaintStatus status;

    private LocalDateTime createdAt;

    public enum ComplaintStatus {
        OPEN,
        IN_PROGRESS,
        RESOLVED,
        CLOSED
    }
}
