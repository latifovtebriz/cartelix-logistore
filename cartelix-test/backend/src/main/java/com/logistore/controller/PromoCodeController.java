package com.logistore.controller;

import com.logistore.model.PromoCode;
import com.logistore.repository.PromoCodeRepository;
import com.logistore.service.DiscountRuleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/promo-codes")
public class PromoCodeController {

    @Autowired
    private PromoCodeRepository promoCodeRepository;

    @Autowired
    private com.logistore.repository.PromoCodeUsageRepository promoCodeUsageRepository;

    @Autowired
    private com.logistore.repository.UserRepository userRepository;

    @Autowired
    private DiscountRuleService discountRuleService;

    @PostMapping("/validate")
    public ResponseEntity<?> validatePromoCode(@RequestBody Map<String, Object> request) {
        try {
            String code = (String) request.get("code");
            String userId = (String) request.get("userId");
            double cartTotal = request.get("cartTotal") != null ? 
                Double.parseDouble(request.get("cartTotal").toString()) : 0;

            if (code == null || code.isBlank()) {
                return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "errorMessage", "Promokod daxil edin"
                ));
            }

            DiscountRuleService.PromoValidationResult result = discountRuleService
                .validatePromoCode(code.toUpperCase(), userId, cartTotal);

            if (result == null) {
                return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "errorMessage", "Promokod tapılmadı"
                ));
            }

            if (result.isValid()) {
                return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "discountAmount", result.getDiscountAmount()
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "errorMessage", result.getErrorMessage() != null ? result.getErrorMessage() : "Promokod keçərsizdir"
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "valid", false,
                "errorMessage", "Promokod yoxlanılarkən xəta: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/user/{userId}")
    public List<PromoCode> getUserPromoCodes(@PathVariable String userId) {
        LocalDate today = LocalDate.now();
        java.util.Set<PromoCode> allCodes = new java.util.HashSet<>();

        // 1. Targeted Codes
        allCodes.addAll(promoCodeRepository.findByTargetUserId(userId));

        // 2. Global Active Codes
        allCodes.addAll(promoCodeRepository.findByTargetUserIdIsNull().stream()
                .filter(PromoCode::isCurrentlyActive)
                .toList());

        // 3. Used Codes (History)
        userRepository.findById(userId).ifPresent(user -> {
            List<com.logistore.model.PromoCodeUsage> usages = promoCodeUsageRepository
                    .findByUserOrderByUsedAtDesc(user);
            usages.forEach(u -> allCodes.add(u.getPromoCode()));
        });

        // 4. Set Status
        List<PromoCode> result = new java.util.ArrayList<>(allCodes);
        for (PromoCode pc : result) {
            boolean isExpired = (pc.getExpiryDate() != null && pc.getExpiryDate().isBefore(today));
            long usedCount = promoCodeUsageRepository.countByPromoCodeIdAndUserId(pc.getId(), userId);
            boolean limitReached = (pc.getUserUsageLimit() != null && usedCount >= pc.getUserUsageLimit());

            if (limitReached) {
                pc.setUserStatus("used");
            } else if (isExpired) {
                pc.setUserStatus("expired");
            } else {
                pc.setUserStatus("active");
            }
        }

        return result;
    }

    @GetMapping
    public List<PromoCode> getAllPromoCodes() {
        return promoCodeRepository.findAll();
    }
}
