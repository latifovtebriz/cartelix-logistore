package com.logistore.controller;

import com.logistore.model.ProductScanEvent;
import com.logistore.service.ScanAnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scan-analytics")
public class ScanAnalyticsController {

    @Autowired
    private ScanAnalyticsService scanAnalyticsService;

    /**
     * Track a product scan event
     * Called from frontend when user scans a product
     */
    @PostMapping("/track")
    public ResponseEntity<Map<String, Object>> trackScan(@RequestBody Map<String, Object> body) {
        Long productId = Long.valueOf(body.get("productId").toString());
        String userId = body.get("userId") != null ? body.get("userId").toString() : null;
        String scanSource = body.get("scanSource") != null ? body.get("scanSource").toString() : "BARCODE";

        ProductScanEvent event = scanAnalyticsService.trackScan(productId, userId, scanSource);
        return ResponseEntity.ok(Map.of(
            "id", event.getId(),
            "productId", event.getProductId(),
            "message", "Scan tracked successfully"
        ));
    }

    /**
     * Mark a scan event as added to cart
     */
    @PutMapping("/{id}/cart-added")
    public ResponseEntity<?> markCartAdded(@PathVariable Long id) {
        ProductScanEvent event = scanAnalyticsService.markAddedToCart(id);
        if (event != null) {
            return ResponseEntity.ok(Map.of("message", "Cart add tracked", "id", event.getId()));
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Mark products as purchased for a user (called after checkout)
     */
    @PostMapping("/mark-purchased")
    public ResponseEntity<?> markPurchased(@RequestBody Map<String, Object> body) {
        String userId = body.get("userId").toString();
        @SuppressWarnings("unchecked")
        List<Number> productIds = (List<Number>) body.get("productIds");
        List<Long> ids = productIds.stream().map(Number::longValue).toList();

        scanAnalyticsService.markPurchased(userId, ids);
        return ResponseEntity.ok(Map.of("message", "Purchases tracked"));
    }

    /**
     * Get overview statistics (summary cards)
     */
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        return ResponseEntity.ok(scanAnalyticsService.getOverview());
    }

    /**
     * Get per-product scan statistics
     */
    @GetMapping("/products")
    public ResponseEntity<List<Map<String, Object>>> getProductStats() {
        return ResponseEntity.ok(scanAnalyticsService.getProductStats());
    }

    /**
     * Get per-category scan statistics
     */
    @GetMapping("/categories")
    public ResponseEntity<List<Map<String, Object>>> getCategoryStats() {
        return ResponseEntity.ok(scanAnalyticsService.getCategoryStats());
    }

    /**
     * Get per-user scan statistics
     */
    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getUserStats() {
        return ResponseEntity.ok(scanAnalyticsService.getUserStats());
    }

    /**
     * Get top abandoned products
     */
    @GetMapping("/abandoned")
    public ResponseEntity<List<Map<String, Object>>> getTopAbandoned() {
        return ResponseEntity.ok(scanAnalyticsService.getTopAbandoned());
    }

    /**
     * Get hourly scan distribution
     */
    @GetMapping("/hourly")
    public ResponseEntity<List<Map<String, Object>>> getHourlyDistribution() {
        return ResponseEntity.ok(scanAnalyticsService.getHourlyDistribution());
    }

    /**
     * Get recent scans (live feed)
     */
    @GetMapping("/recent")
    public ResponseEntity<List<Map<String, Object>>> getRecentScans() {
        return ResponseEntity.ok(scanAnalyticsService.getRecentScans());
    }

    /**
     * Get marketing suggestions based on scan data
     */
    @GetMapping("/suggestions")
    public ResponseEntity<List<Map<String, Object>>> getMarketingSuggestions() {
        return ResponseEntity.ok(scanAnalyticsService.getMarketingSuggestions());
    }
}
