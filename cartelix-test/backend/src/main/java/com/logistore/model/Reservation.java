package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "reservations")
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "restaurant_id")
    private Restaurant restaurant;

    @ManyToOne
    @JoinColumn(name = "business_lunch_id")
    private BusinessLunch businessLunch;

    private LocalDateTime reservationTime;
    private Integer guestCount;
    
    @Enumerated(EnumType.STRING)
    private ReservationStatus status;
    
    private Double depositAmount;
    
    public enum ReservationStatus {
        PENDING, CONFIRMED, CANCELLED, COMPLETED
    }
}
