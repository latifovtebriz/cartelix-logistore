package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "market_inventory")
public class MarketInventory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "market_id")
    private Market market;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    private int quantity;
    private double localPrice; // Price specific to this market
}
