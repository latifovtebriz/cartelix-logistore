package com.logistore.repository;

import com.logistore.model.ProductScanEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ProductScanEventRepository extends JpaRepository<ProductScanEvent, Long> {

       // Count total scans
       long count();

       // Count scans that were added to cart
       long countByAddedToCartTrue();

       // Count scans that were purchased
       long countByPurchasedTrue();

       // Count scans NOT added to cart (abandoned)
       long countByAddedToCartFalse();

       // Scans within a date range
       List<ProductScanEvent> findByScannedAtBetween(LocalDateTime start, LocalDateTime end);

       // Find by product
       List<ProductScanEvent> findByProductId(Long productId);

       // Find by user
       List<ProductScanEvent> findByUserId(String userId);

       // Find scans not added to cart by product (abandoned scans)
       List<ProductScanEvent> findByProductIdAndAddedToCartFalse(Long productId);

       // Recent scans (for live feed)
       List<ProductScanEvent> findTop50ByOrderByScannedAtDesc();

       // ---- Aggregation Queries ----

       // Per-product scan count
       @Query("SELECT e.productId, e.productName, e.productCategory, e.productBarcode, " +
                     "COUNT(e) as totalScans, " +
                     "SUM(CASE WHEN e.addedToCart = true THEN 1 ELSE 0 END) as cartAdds, " +
                     "SUM(CASE WHEN e.purchased = true THEN 1 ELSE 0 END) as purchases " +
                     "FROM ProductScanEvent e " +
                     "GROUP BY e.productId, e.productName, e.productCategory, e.productBarcode " +
                     "ORDER BY COUNT(e) DESC")
       List<Object[]> getProductScanStats();

       // Per-category scan count
       @Query("SELECT e.productCategory, " +
                     "COUNT(e) as totalScans, " +
                     "SUM(CASE WHEN e.addedToCart = true THEN 1 ELSE 0 END) as cartAdds, " +
                     "SUM(CASE WHEN e.purchased = true THEN 1 ELSE 0 END) as purchases " +
                     "FROM ProductScanEvent e " +
                     "WHERE e.productCategory IS NOT NULL " +
                     "GROUP BY e.productCategory " +
                     "ORDER BY COUNT(e) DESC")
       List<Object[]> getCategoryScanStats();

       // Per-user scan count (users who scan but don't buy)
       @Query("SELECT e.userId, e.userName, " +
                     "COUNT(e) as totalScans, " +
                     "SUM(CASE WHEN e.addedToCart = true THEN 1 ELSE 0 END) as cartAdds, " +
                     "SUM(CASE WHEN e.purchased = true THEN 1 ELSE 0 END) as purchases " +
                     "FROM ProductScanEvent e " +
                     "WHERE e.userId IS NOT NULL " +
                     "GROUP BY e.userId, e.userName " +
                     "ORDER BY COUNT(e) DESC")
       List<Object[]> getUserScanStats();

       // Top abandoned products (scanned most but not purchased)
       @Query("SELECT e.productId, e.productName, e.productCategory, " +
                     "COUNT(e) as totalScans, " +
                     "SUM(CASE WHEN e.addedToCart = false THEN 1 ELSE 0 END) as abandoned " +
                     "FROM ProductScanEvent e " +
                     "GROUP BY e.productId, e.productName, e.productCategory " +
                     "HAVING SUM(CASE WHEN e.addedToCart = false THEN 1 ELSE 0 END) > 0 " +
                     "ORDER BY SUM(CASE WHEN e.addedToCart = false THEN 1 ELSE 0 END) DESC")
       List<Object[]> getTopAbandonedProducts();

       // Hourly scan distribution
       @Query("SELECT FUNCTION('HOUR', e.scannedAt) as hour, COUNT(e) " +
                     "FROM ProductScanEvent e " +
                     "WHERE e.scannedAt >= :since " +
                     "GROUP BY FUNCTION('HOUR', e.scannedAt) " +
                     "ORDER BY FUNCTION('HOUR', e.scannedAt)")
       List<Object[]> getHourlyScanDistribution(@Param("since") LocalDateTime since);

       // Count scans in date range
       long countByScannedAtBetween(LocalDateTime start, LocalDateTime end);

       // Count cart adds in date range
       long countByAddedToCartTrueAndScannedAtBetween(LocalDateTime start, LocalDateTime end);

       // Count purchases in date range
       long countByPurchasedTrueAndScannedAtBetween(LocalDateTime start, LocalDateTime end);
}
