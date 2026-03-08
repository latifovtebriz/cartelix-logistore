package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "product_scan_events")
public class ProductScanEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long productId;

    private String productName;

    private String productCategory;

    private String productBarcode;

    private Double productPrice;

    // User who scanned (nullable for anonymous scans)
    private String userId;

    private String userName;

    @Column(nullable = false)
    private LocalDateTime scannedAt;

    // Whether the user added this product to cart after scanning
    private boolean addedToCart;

    private LocalDateTime addedToCartAt;

    // Whether the product was actually purchased
    private boolean purchased;

    private LocalDateTime purchasedAt;

    // Scan source (BARCODE, QR_CODE, MANUAL)
    @Enumerated(EnumType.STRING)
    private ScanSource scanSource;

    public enum ScanSource {
        BARCODE, QR_CODE, MANUAL
    }

    @PrePersist
    protected void onCreate() {
        if (scannedAt == null) {
            scannedAt = LocalDateTime.now();
        }
    }
}
