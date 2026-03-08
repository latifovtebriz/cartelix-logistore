package com.logistore.service;

import com.logistore.model.BusinessLunch;
import com.logistore.model.Reservation;
import com.logistore.model.Restaurant;
import com.logistore.model.User;
import com.logistore.repository.BusinessLunchRepository;
import com.logistore.repository.ReservationRepository;
import com.logistore.repository.RestaurantRepository;
import com.logistore.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReservationService {
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private RestaurantRepository restaurantRepository;
    
    @Autowired
    private BusinessLunchRepository businessLunchRepository;

    public Reservation createReservation(String userId, Long restaurantId, Long businessLunchId, LocalDateTime time, Integer guests) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Restaurant restaurant = restaurantRepository.findById(restaurantId).orElseThrow(() -> new RuntimeException("Restaurant not found"));
        
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setRestaurant(restaurant);
        reservation.setReservationTime(time);
        reservation.setGuestCount(guests);
        reservation.setStatus(Reservation.ReservationStatus.PENDING);
        
        if (businessLunchId != null) {
            BusinessLunch bl = businessLunchRepository.findById(businessLunchId).orElse(null);
            reservation.setBusinessLunch(bl);
        }
        
        // Simulate payment/deposit logic here if needed
        reservation.setDepositAmount(10.0); // Example deposit
        
        return reservationRepository.save(reservation);
    }
    
    public List<Reservation> getUserReservations(String userId) {
        return reservationRepository.findByUserId(userId);
    }
    
    public void cancelReservation(Long id) {
        Reservation reservation = reservationRepository.findById(id).orElseThrow(() -> new RuntimeException("Reservation not found"));
        if (reservation.getReservationTime().isAfter(LocalDateTime.now())) {
             reservation.setStatus(Reservation.ReservationStatus.CANCELLED);
             reservationRepository.save(reservation);
        } else {
            throw new RuntimeException("Cannot cancel past reservation");
        }
    }
}
