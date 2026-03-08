package com.logistore.repository;

import com.logistore.model.MarketInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;
import java.util.Optional;

public interface MarketInventoryRepository
        extends JpaRepository<MarketInventory, Long>, JpaSpecificationExecutor<MarketInventory> {

    Optional<MarketInventory> findByMarketIdAndProductId(Long marketId, Long productId);

    List<MarketInventory> findByMarketId(Long marketId);
}
