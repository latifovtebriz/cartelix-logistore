package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Data
@Entity
@Table(name = "markets")
public class Market {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String location;

    @Column(unique = true)
    private String posDeviceCode;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "market")
    private List<MarketInventory> inventory;
}
