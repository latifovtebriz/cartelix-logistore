package com.logistore.controller;

import com.logistore.model.Discount;
import com.logistore.model.Product;
import com.logistore.model.Category;
import com.logistore.service.DiscountService;
import com.logistore.service.NotificationService;
import com.logistore.repository.ProductRepository;
import com.logistore.repository.CategoryRepository;
import com.logistore.repository.DiscountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/discounts")
public class DiscountController {

    @Autowired
    private DiscountService discountService;

    @Autowired
    private DiscountRepository discountRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    /**
     * Bütün aktiv endirimləri qaytarır
     */
    @GetMapping("/active")
    public List<Discount> getActiveDiscounts() {
        return discountService.getActiveDiscounts();
    }

    /**
     * Bütün endirimləri qaytarır (admin üçün)
     */
    @GetMapping
    public List<Discount> getAllDiscounts() {
        return discountService.getAllDiscounts();
    }

    /**
     * Get discount by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Discount> getDiscountById(@PathVariable Long id) {
        return discountRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Yeni endirim yarat
     */
    @PostMapping
    public ResponseEntity<Discount> createDiscount(@RequestBody Map<String, Object> data) {
        Discount discount = new Discount();
        populateDiscount(discount, data);
        Discount created = discountService.createDiscount(discount);
        return ResponseEntity.ok(created);
    }

    /**
     * Endirimi yenilə
     */
    @PutMapping("/{id}")
    public ResponseEntity<Discount> updateDiscount(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        return discountRepository.findById(id)
                .map(discount -> {
                    populateDiscount(discount, data);
                    Discount updated = discountRepository.save(discount);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Endirimi sil
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDiscount(@PathVariable Long id) {
        discountService.deleteDiscount(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Send personal discount to a specific user
     */
    @PostMapping("/personal")
    public ResponseEntity<?> createPersonalDiscount(@RequestBody Map<String, Object> data) {
        String userId = (String) data.get("userId");
        if (userId == null || userId.isEmpty()) {
            return ResponseEntity.badRequest().body("userId is required for personal discount");
        }

        Discount discount = new Discount();
        populateDiscount(discount, data);
        discount.setTargetUserId(userId);
        discount.setPersonal(true);

        Discount created = discountService.createDiscount(discount);

        // Send notification to user
        String title = "Sizə xüsusi endirim! 🎁";
        String message = String.format("%s - %s%% endirim!", 
            discount.getName(), 
            discount.getType() == Discount.DiscountType.PERCENTAGE ? (int) discount.getValue() : discount.getValue() + " AZN");
        notificationService.sendNotification(userId, title, message, "discount");

        return ResponseEntity.ok(created);
    }

    /**
     * Get user-specific discounts
     */
    @GetMapping("/user/{userId}")
    public List<Discount> getUserDiscounts(@PathVariable String userId) {
        List<Discount> allDiscounts = discountService.getActiveDiscounts();
        return allDiscounts.stream()
                .filter(d -> d.appliesToUser(userId))
                .collect(Collectors.toList());
    }

    /**
     * Helper to populate discount from request data
     */
    private void populateDiscount(Discount discount, Map<String, Object> data) {
        if (data.containsKey("name")) discount.setName((String) data.get("name"));
        if (data.containsKey("description")) discount.setDescription((String) data.get("description"));
        if (data.containsKey("value")) discount.setValue(((Number) data.get("value")).doubleValue());
        if (data.containsKey("priority")) discount.setPriority(((Number) data.get("priority")).intValue());
        if (data.containsKey("active")) discount.setActive((Boolean) data.get("active"));
        if (data.containsKey("buyQuantity")) discount.setBuyQuantity(((Number) data.get("buyQuantity")).intValue());
        if (data.containsKey("payQuantity")) discount.setPayQuantity(((Number) data.get("payQuantity")).intValue());
        if (data.containsKey("isPersonal")) discount.setPersonal((Boolean) data.get("isPersonal"));
        if (data.containsKey("targetUserId")) discount.setTargetUserId((String) data.get("targetUserId"));

        // Parse type
        if (data.containsKey("type")) {
            String typeStr = (String) data.get("type");
            discount.setType(Discount.DiscountType.valueOf(typeStr.toUpperCase()));
        }

        // Parse target
        if (data.containsKey("target")) {
            String targetStr = (String) data.get("target");
            discount.setTarget(Discount.DiscountTarget.valueOf(targetStr.toUpperCase()));
        }

        // Parse dates
        if (data.containsKey("startDate") && data.get("startDate") != null) {
            String startStr = (String) data.get("startDate");
            if (!startStr.isEmpty()) {
                discount.setStartDate(LocalDateTime.parse(startStr.replace("Z", "")));
            }
        }
        if (data.containsKey("endDate") && data.get("endDate") != null) {
            String endStr = (String) data.get("endDate");
            if (!endStr.isEmpty()) {
                discount.setEndDate(LocalDateTime.parse(endStr.replace("Z", "")));
            }
        }

        // Parse product IDs
        if (data.containsKey("productIds")) {
            @SuppressWarnings("unchecked")
            List<Number> productIds = (List<Number>) data.get("productIds");
            if (productIds != null && !productIds.isEmpty()) {
                Set<Product> products = productIds.stream()
                        .map(id -> productRepository.findById(id.longValue()).orElse(null))
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
                discount.setProducts(products);
            }
        }

        // Parse category IDs
        if (data.containsKey("categoryIds")) {
            @SuppressWarnings("unchecked")
            List<Number> categoryIds = (List<Number>) data.get("categoryIds");
            if (categoryIds != null && !categoryIds.isEmpty()) {
                Set<Category> categories = categoryIds.stream()
                        .map(id -> categoryRepository.findById(id.longValue()).orElse(null))
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
                discount.setCategories(categories);
            }
        }
    }
}
