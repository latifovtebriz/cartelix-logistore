package com.logistore.controller;

import com.logistore.model.UserChallenge;
import com.logistore.repository.UserChallengeRepository;
import com.logistore.repository.PromoCodeRepository;
import com.logistore.model.PromoCode;
import com.logistore.service.CampaignEligibilityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/rewards")
public class RewardsController {

    @Autowired
    private UserChallengeRepository userChallengeRepository;

    @Autowired
    private PromoCodeRepository promoCodeRepository;

    @Autowired
    private CampaignEligibilityService campaignEligibilityService;

    @GetMapping("/challenges")
    public List<Map<String, Object>> getChallenges() {
        List<Map<String, Object>> result = new ArrayList<>();

        // Get all user challenges from DB
        List<UserChallenge> dbChallenges = userChallengeRepository.findAll();
        for (UserChallenge uc : dbChallenges) {
            Map<String, Object> c = new HashMap<>();
            c.put("id", uc.getId()); // Return numeric ID without prefix
            c.put("title", uc.getChallengeName());
            c.put("description", uc.getDescription());
            c.put("type", "points");
            c.put("status", uc.isCompleted() ? "completed" : "active");
            c.put("reward", uc.getDescription() != null && !uc.getDescription().isEmpty() ? uc.getDescription()
                    : uc.getTargetValue() + " Bonus");
            c.put("progress", uc.getCurrentValue());
            c.put("total", uc.getTargetValue());
            c.put("targetAmount", uc.getTargetValue());
            c.put("startDate", uc.getStartDate() != null ? uc.getStartDate().toString() : "");
            c.put("endDate", uc.getEndDate() != null ? uc.getEndDate().toString() : "");
            c.put("isPersonalized", uc.getTargetUserId() != null);

            // Purchase-based campaign fields
            c.put("requiredPurchaseCount", uc.getRequiredPurchaseCount());
            c.put("minAmountPerPurchase", uc.getMinAmountPerPurchase());
            c.put("discountType", uc.getDiscountType() != null ? uc.getDiscountType().toString() : null);
            c.put("discountValue", uc.getDiscountValue());

            result.add(c);
        }

        // Get global promo codes from DB
        List<PromoCode> globalPromos = promoCodeRepository.findByTargetUserIdIsNull();
        LocalDate today = LocalDate.now();

        for (PromoCode pc : globalPromos) {
            if (pc.getExpiryDate() != null && pc.getExpiryDate().isBefore(today)) {
                continue;
            }
            Map<String, Object> c = new HashMap<>();
            c.put("id", "pc_" + pc.getId());
            c.put("title", pc.getCode());
            c.put("description",
                    pc.isPercentage() ? pc.getDiscountAmount() + "% endirim" : pc.getDiscountAmount() + " ₼ endirim");
            c.put("type", "promo");
            c.put("status", "active");
            c.put("reward", pc.isPercentage() ? pc.getDiscountAmount() + "%" : pc.getDiscountAmount() + " ₼");
            c.put("promoCode", pc.getCode());
            c.put("isPersonalized", false);
            result.add(c);
        }

        return result;
    }

    @PostMapping("/challenges")
    public ResponseEntity<?> createChallenge(@RequestBody Map<String, Object> body) {
        try {
            UserChallenge challenge = new UserChallenge();
            challenge.setChallengeName((String) body.getOrDefault("title", "Yeni Kampaniya"));
            challenge.setDescription((String) body.getOrDefault("reward", ""));

            Object targetAmount = body.get("targetAmount");
            if (targetAmount instanceof Number) {
                challenge.setTargetValue(((Number) targetAmount).intValue());
            } else {
                challenge.setTargetValue(10);
            }

            challenge.setCurrentValue(0);
            challenge.setCompleted(false);

            String targetUserId = (String) body.get("targetUserId");
            if (targetUserId != null && !targetUserId.isEmpty()) {
                challenge.setTargetUserId(targetUserId);
            }

            String startDateStr = (String) body.get("startDate");
            String endDateStr = (String) body.get("endDate");
            if (startDateStr != null && !startDateStr.isEmpty()) {
                challenge.setStartDate(LocalDate.parse(startDateStr));
            }
            if (endDateStr != null && !endDateStr.isEmpty()) {
                challenge.setEndDate(LocalDate.parse(endDateStr));
            }

            // Purchase-based campaign fields
            if (body.get("requiredPurchaseCount") instanceof Number) {
                int count = ((Number) body.get("requiredPurchaseCount")).intValue();
                challenge.setRequiredPurchaseCount(count);
                // For frequency campaigns, the "Target Value" (progress) is the count
                challenge.setTargetValue(count);
            }
            if (body.get("minAmountPerPurchase") instanceof Number) {
                challenge.setMinAmountPerPurchase(((Number) body.get("minAmountPerPurchase")).doubleValue());
            }
            if (body.get("discountType") != null) {
                challenge.setDiscountType(UserChallenge.DiscountType.valueOf((String) body.get("discountType")));
            }
            if (body.get("discountValue") instanceof Number) {
                challenge.setDiscountValue(((Number) body.get("discountValue")).doubleValue());
            }

            UserChallenge saved = userChallengeRepository.save(challenge);
            return ResponseEntity.ok(Map.of("id", saved.getId(), "message", "Kampaniya yaradıldı"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/challenges/{id}")
    public ResponseEntity<?> updateChallenge(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return userChallengeRepository.findById(id)
                .map(challenge -> {
                    if (body.containsKey("title")) {
                        challenge.setChallengeName((String) body.get("title"));
                    }
                    if (body.containsKey("reward")) {
                        challenge.setDescription((String) body.get("reward"));
                    }
                    if (body.containsKey("targetAmount")) {
                        Object targetAmount = body.get("targetAmount");
                        if (targetAmount instanceof Number) {
                            challenge.setTargetValue(((Number) targetAmount).intValue());
                        }
                    }
                    userChallengeRepository.save(challenge);
                    return ResponseEntity.ok(Map.of("message", "Kampaniya yeniləndi"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/challenges/{id}")
    public ResponseEntity<?> deleteChallenge(@PathVariable Long id) {
        System.out.println("DELETE request received for challenge ID: " + id);
        if (userChallengeRepository.existsById(id)) {
            userChallengeRepository.deleteById(id);
            System.out.println("Challenge deleted successfully: " + id);
            return ResponseEntity.ok(Map.of("message", "Kampaniya silindi"));
        }
        System.out.println("Challenge not found: " + id);
        return ResponseEntity.notFound().build();
    }

    // Campaign eligibility endpoints
    @GetMapping("/campaigns/eligible")
    public ResponseEntity<?> getEligibleCampaigns(@RequestParam String userId) {
        try {
            List<Map<String, Object>> eligibleCampaigns = campaignEligibilityService.getEligibleCampaigns(userId);
            return ResponseEntity.ok(eligibleCampaigns);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/campaigns/apply")
    public ResponseEntity<?> applyCampaign(@RequestBody Map<String, Object> body) {
        try {
            String userId = (String) body.get("userId");
            Long campaignId = ((Number) body.get("campaignId")).longValue();
            Double cartTotal = ((Number) body.get("cartTotal")).doubleValue();

            Map<String, Object> result = campaignEligibilityService.applyCampaign(userId, campaignId, cartTotal);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
