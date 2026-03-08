package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String title;
    private String message;
    @Column(name = "is_read")
    private boolean read;
    private LocalDateTime date;
    private String type; // e.g., "PROMO", "SYSTEM", "ORDER"
}
