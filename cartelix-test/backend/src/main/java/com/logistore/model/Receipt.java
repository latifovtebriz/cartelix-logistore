package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "receipts")
public class Receipt {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    private LocalDateTime date;
    private double total;

    // Pricing breakdown
    private Double originalTotal; // Sum of original (pre-discount) line prices
    private Double discountTotal; // Total discounts (auto + promo)
    private Double bonusSpent; // How much was paid with bonus balance
    private Double cardSpent; // Remainder paid by card/cash
    private String promoCodeUsed; // Applied promo code (if any)

    // POS / market metadata
    private String posDeviceCode; // Scanned POS QR code identifier

    @Column(unique = true)
    private String fiscalId; // For physical receipts

    @Column(unique = true)
    private String physicalQrString;

    @Column(unique = true)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private ReceiptStatus status; // CLAIMED, UNCLAIMED

    public enum ReceiptStatus {
        CLAIMED, UNCLAIMED
    }

    // Receipt type - SCAN_GO or PHYSICAL (cashier)
    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private ReceiptType type;

    public enum ReceiptType {
        SCAN_GO, PHYSICAL
    }

    // For physical receipts - which market and cashier processed it
    private Long marketId;
    private String cashierId;

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL)
    private List<ReceiptItem> items;
}
