package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalTime;

@Data
@Entity
@Table(name = "business_lunches")
public class BusinessLunch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    
    @Column(length = 1000)
    private String description;
    
    private Double price;
    
    private String imageUrl;
    
    private LocalTime startTime;
    private LocalTime endTime;
    
    @ManyToOne
    @JoinColumn(name = "restaurant_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("businessLunches")
    private Restaurant restaurant;
}
