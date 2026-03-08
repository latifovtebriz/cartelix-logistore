package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "receipt_items")
public class ReceiptItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "receipt_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Receipt receipt;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    private int quantity;
    private double priceAtPurchase;

    // Extended pricing details
    private Double originalPrice;    // Price before any discount
    private Double discountedPrice;  // Price after discounts (per unit)
    private String discountLabel;    // e.g., "Global 10%" or promo reference

    // For frontend serialization
    public String getName() {
        return product != null ? product.getName() : "";
    }

    public double getPrice() {
        return priceAtPurchase;
    }
}
