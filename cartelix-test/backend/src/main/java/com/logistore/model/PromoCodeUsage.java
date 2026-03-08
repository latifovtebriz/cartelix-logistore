package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Promokodun istifadə tarixçəsi.
 * Hər user-in hər promokodu neçə dəfə istifadə etdiyini izləyir.
 */
@Data
@Entity
@Table(name = "promo_code_usages", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "promo_code_id", "receipt_id" })
})
public class PromoCodeUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promo_code_id", nullable = false)
    private PromoCode promoCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id")
    private Receipt receipt;

    private LocalDateTime usedAt;

    private double discountApplied; // Bu istifadədə tətbiq edilən endirim məbləği

    @PrePersist
    public void prePersist() {
        if (usedAt == null) {
            usedAt = LocalDateTime.now();
        }
    }
}
