package com.logistore.repository;

import com.logistore.model.Receipt;
import com.logistore.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ReceiptRepository extends JpaRepository<Receipt, String> {
    Page<Receipt> findByUserIdOrderByDateDesc(String userId, Pageable pageable);

    List<Receipt> findByUserIdOrderByDateDesc(String userId); // Keep for backward compatibility if needed

    Optional<Receipt> findByFiscalId(String fiscalId);

    Optional<Receipt> findByPhysicalQrString(String physicalQrString);

    Optional<Receipt> findByIdempotencyKey(String idempotencyKey);

    // Count receipts by user and type (PHYSICAL or SCAN_GO)
    long countByUserAndType(User user, Receipt.ReceiptType type);

    long countByUser(User user);

    // Find receipts by user ID (paginated)
    @Query("SELECT r FROM Receipt r WHERE r.user.id = :userId ORDER BY r.date DESC")
    Page<Receipt> findByUserId(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT SUM(r.total) FROM Receipt r")
    Double sumTotalRevenue();

    @Query("SELECT SUM(r.total) FROM Receipt r WHERE r.date >= :startOfDay")
    Double sumRevenueAfter(@Param("startOfDay") java.time.LocalDateTime startOfDay);

    @Query("SELECT new map(ri.product.name as name, SUM(ri.quantity) as count) FROM ReceiptItem ri GROUP BY ri.product.name ORDER BY SUM(ri.quantity) DESC")
    List<java.util.Map<String, Object>> findTopSellingProducts(Pageable pageable);

    // Find receipts by user and date range for campaign eligibility
    List<Receipt> findByUser_IdAndDateBetween(String userId, java.time.LocalDateTime startDate,
            java.time.LocalDateTime endDate);
}
