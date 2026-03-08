package com.logistore.repository;

import com.logistore.model.Market;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MarketRepository extends JpaRepository<Market, Long> {
    Optional<Market> findByPosDeviceCode(String posDeviceCode);
}
