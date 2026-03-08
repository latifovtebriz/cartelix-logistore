package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "promo_codes")
public class PromoCode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    private String name; // "Bonus10" - admin üçün ad
    private String description; // "İlk alış üçün 10% endirim"

    private double discountAmount; // Endirim dəyəri
    private boolean isPercentage; // true = faiz, false = sabit məbləğ

    private LocalDate startDate;
    private LocalDate expiryDate;

    private boolean onlyScanAndGo; // true = yalnız Scan & Go üçün
    private boolean active = true;

    // === YENİ LIMITLƏR ===

    private Integer usageLimit; // Ümumi istifadə limiti (null = limitsiz)
    private Integer userUsageLimit; // Bir user neçə dəfə işlədə bilər (default: 1, null = limitsiz)
    private Double minBasketValue; // Minimum səbət məbləği (null = limit yox)
    private int currentUsageCount; // Neçə dəfə istifadə olunub (ümumi)

    // Yalnız bu user üçün (null = hamı üçün)
    private String targetUserId;

    // === ƏLAQƏLİ MƏHSUL/KATEQORİYA ===

    @ManyToMany
    @JoinTable(name = "promo_products", joinColumns = @JoinColumn(name = "promo_id"), inverseJoinColumns = @JoinColumn(name = "product_id"))
    private Set<Product> applicableProducts = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "promo_categories", joinColumns = @JoinColumn(name = "promo_id"), inverseJoinColumns = @JoinColumn(name = "category_id"))
    private Set<Category> applicableCategories = new HashSet<>();

    // === HELPER METODLAR ===

    /**
     * Promokodun hal-hazırda aktiv olub olmadığını yoxla
     */
    public boolean isCurrentlyActive() {
        if (!active)
            return false;
        LocalDate today = LocalDate.now();
        if (startDate != null && today.isBefore(startDate))
            return false;
        if (expiryDate != null && today.isAfter(expiryDate))
            return false;
        return true;
    }

    /**
     * Ümumi istifadə limitini yoxla
     */
    public boolean hasReachedUsageLimit() {
        if (usageLimit == null)
            return false;
        return currentUsageCount >= usageLimit;
    }

    /**
     * Minimum səbət məbləğini yoxla
     */
    public boolean meetsMinimumBasketValue(double basketTotal) {
        if (minBasketValue == null)
            return true;
        return basketTotal >= minBasketValue;
    }

    /**
     * Bu məhsula aid olub olmadığını yoxla
     */
    public boolean appliesTo(Product product) {
        // Əgər heç bir məhsul/kateqoriya təyin edilməyibsə, hamıya aiddir
        if (applicableProducts.isEmpty() && applicableCategories.isEmpty()) {
            return true;
        }

        if (applicableProducts.contains(product)) {
            return true;
        }

        return applicableCategories.stream()
                .anyMatch(cat -> cat.getName().equals(product.getCategory()));
    }

    /**
     * İstifadə sayını artır
     */
    public void incrementUsage() {
        this.currentUsageCount++;
    }

    @Transient
    private String userStatus; // "active", "used", "expired"
}
