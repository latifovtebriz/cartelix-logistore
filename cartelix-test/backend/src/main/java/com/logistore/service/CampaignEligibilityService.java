package com.logistore.service;

import com.logistore.model.Receipt;
import com.logistore.model.UserChallenge;
import com.logistore.repository.ReceiptRepository;
import com.logistore.repository.UserChallengeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CampaignEligibilityService {

    @Autowired
    private UserChallengeRepository userChallengeRepository;

    @Autowired
    private ReceiptRepository receiptRepository;

    /**
     * Get campaigns that the user is eligible for based on purchase history
     */
    public List<Map<String, Object>> getEligibleCampaigns(String userId) {
        List<Map<String, Object>> eligibleCampaigns = new ArrayList<>();

        // Get all active campaigns with purchase requirements
        List<UserChallenge> campaigns = userChallengeRepository.findAll();
        LocalDate today = LocalDate.now();

        for (UserChallenge campaign : campaigns) {
            // Skip if campaign has purchase requirements but they're not set
            if (campaign.getRequiredPurchaseCount() == null ||
                    campaign.getMinAmountPerPurchase() == null ||
                    campaign.getDiscountType() == null ||
                    campaign.getDiscountValue() == null) {
                continue;
            }

            // Skip if campaign is expired
            if (campaign.getEndDate() != null && campaign.getEndDate().isBefore(today)) {
                continue;
            }

            // Skip if campaign hasn't started
            if (campaign.getStartDate() != null && campaign.getStartDate().isAfter(today)) {
                continue;
            }

            // Skip if campaign is personalized for a different user
            if (campaign.getTargetUserId() != null && !campaign.getTargetUserId().equals(userId)) {
                continue;
            }

            // Check if user meets purchase requirements
            if (isUserEligible(userId, campaign)) {
                Map<String, Object> campaignData = new HashMap<>();
                campaignData.put("id", campaign.getId());
                campaignData.put("title", campaign.getChallengeName());
                campaignData.put("description", campaign.getDescription());
                campaignData.put("requiredPurchaseCount", campaign.getRequiredPurchaseCount());
                campaignData.put("minAmountPerPurchase", campaign.getMinAmountPerPurchase());
                campaignData.put("discountType", campaign.getDiscountType().toString());
                campaignData.put("discountValue", campaign.getDiscountValue());
                campaignData.put("isEligible", true);
                eligibleCampaigns.add(campaignData);
            }
        }

        return eligibleCampaigns;
    }

    /**
     * Check if user is eligible for a specific campaign
     */
    private boolean isUserEligible(String userId, UserChallenge campaign) {
        // Get user's receipts within campaign date range
        LocalDateTime startDateTime = campaign.getStartDate() != null ? campaign.getStartDate().atStartOfDay()
                : LocalDateTime.now().minusYears(10);
        LocalDateTime endDateTime = campaign.getEndDate() != null ? campaign.getEndDate().atTime(23, 59, 59)
                : LocalDateTime.now().plusYears(10);

        List<Receipt> userReceipts = receiptRepository.findByUser_IdAndDateBetween(userId, startDateTime, endDateTime);

        // Count purchases that meet minimum amount requirement
        int qualifyingPurchases = 0;
        for (Receipt receipt : userReceipts) {
            if (receipt.getTotal() >= campaign.getMinAmountPerPurchase()) {
                qualifyingPurchases++;
            }
        }

        // Check if user has made enough qualifying purchases
        return qualifyingPurchases >= campaign.getRequiredPurchaseCount();
    }

    /**
     * Calculate discount amount for a campaign
     */
    public double calculateCampaignDiscount(Long campaignId, double cartTotal) {
        UserChallenge campaign = userChallengeRepository.findById(campaignId).orElse(null);
        if (campaign == null || campaign.getDiscountValue() == null) {
            return 0.0;
        }

        if (campaign.getDiscountType() == UserChallenge.DiscountType.PERCENTAGE) {
            return cartTotal * (campaign.getDiscountValue() / 100.0);
        } else {
            return campaign.getDiscountValue();
        }
    }

    /**
     * Verify user eligibility and calculate discount
     */
    public Map<String, Object> applyCampaign(String userId, Long campaignId, double cartTotal) {
        Map<String, Object> result = new HashMap<>();

        UserChallenge campaign = userChallengeRepository.findById(campaignId).orElse(null);
        if (campaign == null) {
            result.put("success", false);
            result.put("message", "Kampaniya tapılmadı");
            return result;
        }

        if (!isUserEligible(userId, campaign)) {
            result.put("success", false);
            result.put("message", "Bu kampaniya üçün uyğun deyilsiniz");
            return result;
        }

        double discount = calculateCampaignDiscount(campaignId, cartTotal);
        result.put("success", true);
        result.put("discount", discount);
        result.put("campaignId", campaignId);
        result.put("campaignTitle", campaign.getChallengeName());

        return result;
    }
}
