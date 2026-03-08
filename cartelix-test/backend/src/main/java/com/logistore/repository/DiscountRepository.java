package com.logistore.repository;

import com.logistore.model.Discount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DiscountRepository extends JpaRepository<Discount, Long> {

    /**
     * Aktiv endirimləri tap (tarixə görə)
     */
    @Query("SELECT d FROM Discount d WHERE d.active = true " +
            "AND (d.startDate IS NULL OR d.startDate <= :now) " +
            "AND (d.endDate IS NULL OR d.endDate >= :now)")
    List<Discount> findActiveDiscounts(LocalDateTime now);

    /**
     * Konkret məhsula aid aktiv endirimləri tap
     */
    @Query("SELECT d FROM Discount d JOIN d.products p WHERE p.id = :productId " +
            "AND d.active = true " +
            "AND (d.startDate IS NULL OR d.startDate <= :now) " +
            "AND (d.endDate IS NULL OR d.endDate >= :now) " +
            "ORDER BY d.priority DESC")
    List<Discount> findActiveDiscountsForProduct(Long productId, LocalDateTime now);

    /**
     * Konkret kateqoriyaya aid aktiv endirimləri tap
     */
    @Query("SELECT d FROM Discount d JOIN d.categories c WHERE c.name = :categoryName " +
            "AND d.active = true " +
            "AND (d.startDate IS NULL OR d.startDate <= :now) " +
            "AND (d.endDate IS NULL OR d.endDate >= :now) " +
            "ORDER BY d.priority DESC")
    List<Discount> findActiveDiscountsForCategory(String categoryName, LocalDateTime now);

    /**
     * Bütün məhsullara aid (ALL_PRODUCTS target) aktiv endirimləri tap
     */
    @Query("SELECT d FROM Discount d WHERE d.target = 'ALL_PRODUCTS' " +
            "AND d.active = true " +
            "AND (d.startDate IS NULL OR d.startDate <= :now) " +
            "AND (d.endDate IS NULL OR d.endDate >= :now) " +
            "ORDER BY d.priority DESC")
    List<Discount> findActiveGlobalDiscounts(LocalDateTime now);

    /**
     * Prioritetə görə sıralanmış bütün aktiv endirimlər
     */
    @Query("SELECT d FROM Discount d WHERE d.active = true " +
            "AND (d.startDate IS NULL OR d.startDate <= :now) " +
            "AND (d.endDate IS NULL OR d.endDate >= :now) " +
            "ORDER BY d.priority DESC")
    List<Discount> findAllActiveOrderByPriorityDesc(LocalDateTime now);
}
