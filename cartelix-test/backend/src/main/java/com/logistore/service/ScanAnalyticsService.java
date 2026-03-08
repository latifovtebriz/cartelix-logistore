package com.logistore.service;

import com.logistore.model.Product;
import com.logistore.model.ProductScanEvent;
import com.logistore.model.User;
import com.logistore.repository.ProductRepository;
import com.logistore.repository.ProductScanEventRepository;
import com.logistore.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ScanAnalyticsService {

    @Autowired
    private ProductScanEventRepository scanEventRepo;

    @Autowired
    private ProductRepository productRepo;

    @Autowired
    private UserRepository userRepo;

    /**
     * Track a product scan event
     */
    public ProductScanEvent trackScan(Long productId, String userId, String scanSource) {
        ProductScanEvent event = new ProductScanEvent();
        event.setProductId(productId);
        event.setScannedAt(LocalDateTime.now());
        event.setAddedToCart(false);
        event.setPurchased(false);

        // Enrich with product details
        productRepo.findById(productId).ifPresent(product -> {
            event.setProductName(product.getName());
            event.setProductCategory(product.getCategoryName());
            event.setProductBarcode(product.getBarcode());
            event.setProductPrice(product.getPrice());
        });

        // Enrich with user details
        if (userId != null && !userId.isEmpty()) {
            event.setUserId(userId);
            userRepo.findById(userId).ifPresent(user -> {
                event.setUserName(user.getName() + (user.getSurname() != null ? " " + user.getSurname() : ""));
            });
        }

        // Set scan source
        if (scanSource != null) {
            try {
                event.setScanSource(ProductScanEvent.ScanSource.valueOf(scanSource.toUpperCase()));
            } catch (IllegalArgumentException e) {
                event.setScanSource(ProductScanEvent.ScanSource.BARCODE);
            }
        }

        return scanEventRepo.save(event);
    }

    /**
     * Mark a scan event as added to cart
     */
    public ProductScanEvent markAddedToCart(Long eventId) {
        return scanEventRepo.findById(eventId).map(event -> {
            event.setAddedToCart(true);
            event.setAddedToCartAt(LocalDateTime.now());
            return scanEventRepo.save(event);
        }).orElse(null);
    }

    /**
     * Mark scan events as purchased for a user's cart items
     */
    public void markPurchased(String userId, List<Long> productIds) {
        if (userId == null || productIds == null)
            return;

        // Find recent unpurchased scan events for this user and these products
        List<ProductScanEvent> userScans = scanEventRepo.findByUserId(userId);
        for (ProductScanEvent event : userScans) {
            if (!event.isPurchased() && productIds.contains(event.getProductId())) {
                event.setPurchased(true);
                event.setPurchasedAt(LocalDateTime.now());
                scanEventRepo.save(event);
            }
        }
    }

    /**
     * Get overview statistics
     */
    public Map<String, Object> getOverview() {
        Map<String, Object> overview = new LinkedHashMap<>();

        long totalScans = scanEventRepo.count();
        long cartAdds = scanEventRepo.countByAddedToCartTrue();
        long purchases = scanEventRepo.countByPurchasedTrue();
        long abandoned = scanEventRepo.countByAddedToCartFalse();

        overview.put("totalScans", totalScans);
        overview.put("addedToCart", cartAdds);
        overview.put("purchased", purchases);
        overview.put("abandoned", abandoned);
        overview.put("cartRate", totalScans > 0 ? Math.round((double) cartAdds / totalScans * 100) : 0);
        overview.put("purchaseRate", totalScans > 0 ? Math.round((double) purchases / totalScans * 100) : 0);
        overview.put("abandonRate", totalScans > 0 ? Math.round((double) abandoned / totalScans * 100) : 0);

        // Today's stats
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);
        overview.put("todayScans", scanEventRepo.countByScannedAtBetween(todayStart, todayEnd));
        overview.put("todayCartAdds", scanEventRepo.countByAddedToCartTrueAndScannedAtBetween(todayStart, todayEnd));
        overview.put("todayPurchases", scanEventRepo.countByPurchasedTrueAndScannedAtBetween(todayStart, todayEnd));

        // Last 7 days stats
        LocalDateTime weekAgo = LocalDate.now().minusDays(7).atStartOfDay();
        overview.put("weekScans", scanEventRepo.countByScannedAtBetween(weekAgo, todayEnd));
        overview.put("weekCartAdds", scanEventRepo.countByAddedToCartTrueAndScannedAtBetween(weekAgo, todayEnd));
        overview.put("weekPurchases", scanEventRepo.countByPurchasedTrueAndScannedAtBetween(weekAgo, todayEnd));

        return overview;
    }

    /**
     * Get per-product scan statistics
     */
    public List<Map<String, Object>> getProductStats() {
        List<Object[]> raw = scanEventRepo.getProductScanStats();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Object[] row : raw) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("productId", row[0]);
            item.put("productName", row[1]);
            item.put("category", row[2]);
            item.put("barcode", row[3]);
            item.put("totalScans", row[4]);
            item.put("cartAdds", row[5]);
            item.put("purchases", row[6]);

            long totalScans = ((Number) row[4]).longValue();
            long cartAdds = ((Number) row[5]).longValue();
            long purchases = ((Number) row[6]).longValue();
            long abandoned = totalScans - cartAdds;

            item.put("abandoned", abandoned);
            item.put("cartRate", totalScans > 0 ? Math.round((double) cartAdds / totalScans * 100) : 0);
            item.put("purchaseRate", totalScans > 0 ? Math.round((double) purchases / totalScans * 100) : 0);

            result.add(item);
        }

        return result;
    }

    /**
     * Get per-category scan statistics
     */
    public List<Map<String, Object>> getCategoryStats() {
        List<Object[]> raw = scanEventRepo.getCategoryScanStats();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Object[] row : raw) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("category", row[0]);
            item.put("totalScans", row[1]);
            item.put("cartAdds", row[2]);
            item.put("purchases", row[3]);

            long totalScans = ((Number) row[1]).longValue();
            long cartAdds = ((Number) row[2]).longValue();
            long purchases = ((Number) row[3]).longValue();
            long abandoned = totalScans - cartAdds;

            item.put("abandoned", abandoned);
            item.put("cartRate", totalScans > 0 ? Math.round((double) cartAdds / totalScans * 100) : 0);
            item.put("purchaseRate", totalScans > 0 ? Math.round((double) purchases / totalScans * 100) : 0);

            result.add(item);
        }

        return result;
    }

    /**
     * Get per-user scan statistics
     */
    public List<Map<String, Object>> getUserStats() {
        List<Object[]> raw = scanEventRepo.getUserScanStats();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Object[] row : raw) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("userId", row[0]);
            item.put("userName", row[1]);
            item.put("totalScans", row[2]);
            item.put("cartAdds", row[3]);
            item.put("purchases", row[4]);

            long totalScans = ((Number) row[2]).longValue();
            long cartAdds = ((Number) row[3]).longValue();
            long purchases = ((Number) row[4]).longValue();
            long abandoned = totalScans - cartAdds;

            item.put("abandoned", abandoned);
            item.put("cartRate", totalScans > 0 ? Math.round((double) cartAdds / totalScans * 100) : 0);
            item.put("purchaseRate", totalScans > 0 ? Math.round((double) purchases / totalScans * 100) : 0);

            result.add(item);
        }

        return result;
    }

    /**
     * Get top abandoned products (scanned but not added to cart)
     */
    public List<Map<String, Object>> getTopAbandoned() {
        List<Object[]> raw = scanEventRepo.getTopAbandonedProducts();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Object[] row : raw) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("productId", row[0]);
            item.put("productName", row[1]);
            item.put("category", row[2]);
            item.put("totalScans", row[3]);
            item.put("abandoned", row[4]);

            long totalScans = ((Number) row[3]).longValue();
            long abandoned = ((Number) row[4]).longValue();
            item.put("abandonRate", totalScans > 0 ? Math.round((double) abandoned / totalScans * 100) : 0);

            result.add(item);
        }

        return result;
    }

    /**
     * Get hourly distribution for today
     */
    public List<Map<String, Object>> getHourlyDistribution() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        List<Object[]> raw = scanEventRepo.getHourlyScanDistribution(todayStart);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Object[] row : raw) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("hour", row[0]);
            item.put("count", row[1]);
            result.add(item);
        }

        return result;
    }

    /**
     * Get recent scan events (live feed)
     */
    public List<Map<String, Object>> getRecentScans() {
        List<ProductScanEvent> events = scanEventRepo.findTop50ByOrderByScannedAtDesc();
        return events.stream().map(e -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", e.getId());
            item.put("productId", e.getProductId());
            item.put("productName", e.getProductName());
            item.put("productCategory", e.getProductCategory());
            item.put("productBarcode", e.getProductBarcode());
            item.put("userId", e.getUserId());
            item.put("userName", e.getUserName());
            item.put("scannedAt", e.getScannedAt().toString());
            item.put("addedToCart", e.isAddedToCart());
            item.put("purchased", e.isPurchased());
            item.put("scanSource", e.getScanSource());
            return item;
        }).collect(Collectors.toList());
    }

    /**
     * Generate marketing suggestions based on scan analytics
     */
    public List<Map<String, Object>> getMarketingSuggestions() {
        List<Map<String, Object>> suggestions = new ArrayList<>();

        // 1. High-scan low-purchase products → suggest discount
        List<Map<String, Object>> productStats = getProductStats();
        for (Map<String, Object> p : productStats) {
            long totalScans = ((Number) p.get("totalScans")).longValue();
            long cartAdds = ((Number) p.get("cartAdds")).longValue();
            long cartRate = ((Number) p.get("cartRate")).longValue();

            if (totalScans >= 5 && cartRate < 30) {
                Map<String, Object> suggestion = new LinkedHashMap<>();
                suggestion.put("type", "PRICE_REDUCTION");
                suggestion.put("priority", "HIGH");
                suggestion.put("icon", "tag");
                suggestion.put("title", p.get("productName") + " - Qiymət Endirim Təklifi");
                suggestion.put("description",
                        String.format("Bu məhsul %d dəfə scan edilib amma yalnız %d%% halda səbətə əlavə olunub. " +
                                "Qiymət endirimi tətbiq etmək satışları artıra bilər.", totalScans, cartRate));
                suggestion.put("productId", p.get("productId"));
                suggestion.put("productName", p.get("productName"));
                suggestion.put("category", p.get("category"));
                suggestion.put("stats", Map.of("scans", totalScans, "cartAdds", cartAdds, "cartRate", cartRate));
                suggestions.add(suggestion);
            }
        }

        // 2. Category-level insights
        List<Map<String, Object>> categoryStats = getCategoryStats();
        for (Map<String, Object> c : categoryStats) {
            long totalScans = ((Number) c.get("totalScans")).longValue();
            long purchaseRate = ((Number) c.get("purchaseRate")).longValue();

            if (totalScans >= 10 && purchaseRate < 25) {
                Map<String, Object> suggestion = new LinkedHashMap<>();
                suggestion.put("type", "CATEGORY_CAMPAIGN");
                suggestion.put("priority", "MEDIUM");
                suggestion.put("icon", "layers");
                suggestion.put("title", c.get("category") + " kateqoriyasında kampaniya");
                suggestion.put("description",
                        String.format("Bu kateqoriyada %d scan olub amma yalnız %d%% satışa çevrilib. " +
                                "Kateqoriyaya xüsusi kampaniya etmək effektiv ola bilər.", totalScans, purchaseRate));
                suggestion.put("category", c.get("category"));
                suggestion.put("stats", Map.of("scans", totalScans, "purchaseRate", purchaseRate));
                suggestions.add(suggestion);
            }
        }

        // 3. User re-engagement
        List<Map<String, Object>> userStats = getUserStats();
        for (Map<String, Object> u : userStats) {
            long totalScans = ((Number) u.get("totalScans")).longValue();
            long purchases = ((Number) u.get("purchases")).longValue();

            if (totalScans >= 5 && purchases == 0) {
                Map<String, Object> suggestion = new LinkedHashMap<>();
                suggestion.put("type", "USER_REENGAGEMENT");
                suggestion.put("priority", "HIGH");
                suggestion.put("icon", "user-plus");
                suggestion.put("title", u.get("userName") + " - Fərdi Endirim Göndərin");
                suggestion.put("description",
                        String.format("Bu istifadəçi %d dəfə məhsul scan edib amma heç biri satışa çevrilməyib. " +
                                "Fərdi endirim göndərmək bu istifadəçini aktiv müştəriyə çevirə bilər.", totalScans));
                suggestion.put("userId", u.get("userId"));
                suggestion.put("userName", u.get("userName"));
                suggestion.put("stats", Map.of("scans", totalScans, "purchases", purchases));
                suggestions.add(suggestion);
            }
        }

        // 4. Time-based suggestions
        List<Map<String, Object>> hourly = getHourlyDistribution();
        if (!hourly.isEmpty()) {
            // Find peak hour
            Map<String, Object> peakHour = hourly.stream()
                    .max(Comparator.comparingLong(h -> ((Number) h.get("count")).longValue()))
                    .orElse(null);

            if (peakHour != null) {
                Map<String, Object> suggestion = new LinkedHashMap<>();
                suggestion.put("type", "TIME_BASED");
                suggestion.put("priority", "LOW");
                suggestion.put("icon", "clock");
                suggestion.put("title", "Pik Saatlarda Flash Sale");
                suggestion.put("description",
                        String.format("Saat %s:00 ən çox scan edilən vaxtdır (%s scan). " +
                                "Bu saatda flash sale keçirmək effektiv ola bilər.",
                                peakHour.get("hour"), peakHour.get("count")));
                suggestion.put("stats", Map.of("peakHour", peakHour.get("hour"), "scanCount", peakHour.get("count")));
                suggestions.add(suggestion);
            }
        }

        // Sort by priority
        suggestions.sort((a, b) -> {
            Map<String, Integer> priorityMap = Map.of("HIGH", 0, "MEDIUM", 1, "LOW", 2);
            return priorityMap.getOrDefault(a.get("priority"), 2) - priorityMap.getOrDefault(b.get("priority"), 2);
        });

        return suggestions;
    }
}
