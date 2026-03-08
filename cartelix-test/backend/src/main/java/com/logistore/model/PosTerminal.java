package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "pos_terminals")
public class PosTerminal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String qrCodeString;

    @ManyToOne
    @JoinColumn(name = "market_id")
    private Market market;
}
