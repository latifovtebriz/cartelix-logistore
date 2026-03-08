package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String barcode;

    private String name;

    @Column(length = 1000)
    private String description;

    @Column(length = 2000)
    private String ingredients;

    private String healthTags; // Comma separated tags e.g. "Sugar-Free,Vegan"

    private double price;

    @ManyToOne
    @JoinColumn(name = "category_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Category category;

    // Map this to "category" property to match frontend expectation (string name)
    @com.fasterxml.jackson.annotation.JsonProperty("category")
    public String getCategoryName() {
        return category != null ? category.getName() : "";
    }

    private String brand;

    @com.fasterxml.jackson.annotation.JsonProperty("image")
    private String imageUrl;

    private int stockQuantity;

    @Version
    private Long version;

    @Enumerated(EnumType.STRING)
    private UnitType unitType;

    public enum UnitType {
        COUNT,
        KG
    }

    @Transient
    private Double originalPriceDisplay;

    @Transient
    private Double globalDiscountPrice;

    @Transient
    private Double personalPrice;

    @Transient
    private boolean hasPersonalDiscount;

    @Transient
    private String discountLabel;

    private Double oldPrice;

    @com.fasterxml.jackson.annotation.JsonProperty("isDiscount")
    private boolean isDiscount;

    // Aggregates
    private double rating;
    private int reviewCount;

    private int soldCount;
}
