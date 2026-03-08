package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "discounts")
public class Discount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // "Yaz Endirimi"
    private String description; // "Bütün süd məhsullarına 20% endirim"

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type")
    private DiscountType type; // PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y

    @Column(name = "discount_value")
    private double value; // 20 (faiz) və ya 5.00 (AZN)
    private Integer buyQuantity; // "3 al 2 ödə" üçün: 3
    private Integer payQuantity; // "3 al 2 ödə" üçün: 2

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_target")
    private DiscountTarget target; // ALL_PRODUCTS, SPECIFIC_PRODUCTS, SPECIFIC_CATEGORIES

    private LocalDateTime startDate;
    private LocalDateTime endDate;

    private int priority; // Konflikt halında yüksək prioritetli tətbiq olunur (daha böyük = daha yüksək)
    private boolean active = true;

    // Personal discount - specific user targeting
    private String targetUserId; // null = global, otherwise user-specific
    private boolean isPersonal = false;

    @ManyToMany
    @JoinTable(name = "discount_products", joinColumns = @JoinColumn(name = "discount_id"), inverseJoinColumns = @JoinColumn(name = "product_id"))
    private Set<Product> products = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "discount_categories", joinColumns = @JoinColumn(name = "discount_id"), inverseJoinColumns = @JoinColumn(name = "category_id"))
    private Set<Category> categories = new HashSet<>();

    // Endirim növləri
    public enum DiscountType {
        PERCENTAGE, // Faiz endirimi (məs: 20%)
        FIXED_AMOUNT, // Sabit məbləğ (məs: 5 AZN)
        BUY_X_GET_Y // "3 al 2 ödə" tipli
    }

    // Endirim hədəfləri
    public enum DiscountTarget {
        ALL_PRODUCTS, // Bütün məhsullara/səbətə
        SPECIFIC_PRODUCTS, // Yalnız seçilmiş məhsullara
        SPECIFIC_CATEGORIES // Yalnız seçilmiş kateqoriyalara
    }

    // Endirimin hal-hazırda aktiv olub olmadığını yoxla
    @com.fasterxml.jackson.annotation.JsonProperty("currentlyActive")
    public boolean isCurrentlyActive() {
        if (!active)
            return false;
        LocalDateTime now = LocalDateTime.now();
        if (startDate != null && now.isBefore(startDate))
            return false;
        if (endDate != null && now.isAfter(endDate))
            return false;
        return true;
    }

    // Check if discount applies to a specific user
    public boolean appliesToUser(String userId) {
        if (targetUserId == null || targetUserId.isEmpty()) {
            return true; // Global discount
        }
        return targetUserId.equals(userId);
    }

    // Məhsula aid olub olmadığını yoxla
    public boolean appliesTo(Product product) {
        if (!isCurrentlyActive())
            return false;

        switch (target) {
            case ALL_PRODUCTS:
                return true;
            case SPECIFIC_PRODUCTS:
                return products.contains(product);
            case SPECIFIC_CATEGORIES:
                return categories.stream()
                        .anyMatch(cat -> cat.getName().equals(product.getCategory()));
            default:
                return false;
        }
    }

    // Check if applies to both user and product
    public boolean appliesTo(Product product, String userId) {
        return appliesTo(product) && appliesToUser(userId);
    }
}
