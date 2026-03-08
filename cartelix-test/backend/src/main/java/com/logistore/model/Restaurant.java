package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalTime;
import java.util.List;

@Data
@Entity
@Table(name = "restaurants")
public class Restaurant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    
    @Column(length = 1000)
    private String description;
    
    private String address;
    private Double latitude;
    private Double longitude;
    
    private String phone;
    private String email;
    
    private String imageUrl;
    
    private LocalTime openTime;
    private LocalTime closeTime;
    
    private Double averageRating;
    
    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL)
    private List<BusinessLunch> businessLunches;
    
    @OneToMany(mappedBy = "restaurant", cascade = CascadeType.ALL)
    private List<RestaurantReview> reviews;
}
