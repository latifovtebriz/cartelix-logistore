package com.logistore.service;

import com.logistore.model.Product;
import com.logistore.model.Receipt;
import com.logistore.model.ReceiptItem;
import com.logistore.model.User;
import com.logistore.repository.ProductRepository;
import com.logistore.repository.ReceiptRepository;
import com.logistore.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
public class ReceiptService {

    @Autowired
    private ReceiptRepository receiptRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PriceCalculatorService priceCalculatorService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private DiscountService discountService;

    @Autowired
    private DiscountRuleService discountRuleService;

    @Autowired
    private ProductService productService;

    @Autowired
    private com.logistore.repository.PromoCodeRepository promoCodeRepository;

    @Autowired
    private com.logistore.repository.PromoCodeUsageRepository promoCodeUsageRepository;

    @Autowired
    private com.logistore.repository.UserChallengeRepository userChallengeRepository;

    /**
     * Yeni qəbz yarat - Transaction annotation yoxdur ki exception zamanı rollback
     * olmasın
     */
    public Receipt createReceipt(String userId, List<Map<String, Object>> itemsData, String idempotencyKey,
            String promoCode, Double bonusSpend, String posQrString, Receipt.ReceiptType type, Long marketId,
            Long campaignId) {

        // 1. Idempotency Check
        if (idempotencyKey != null) {
            Optional<Receipt> existing = receiptRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }

        if (user.isScanGoBlocked()) {
            throw new IllegalArgumentException("Sizin Scan & Go icazəniz bloklanıb.");
        }

        Receipt receipt = new Receipt();
        receipt.setUser(user);
        receipt.setDate(LocalDateTime.now());
        receipt.setIdempotencyKey(idempotencyKey);
        receipt.setStatus(Receipt.ReceiptStatus.CLAIMED);
        receipt.setType(type != null ? type : Receipt.ReceiptType.SCAN_GO);
        receipt.setPosDeviceCode(posQrString);
        receipt.setMarketId(marketId);

        List<ReceiptItem> items = new ArrayList<>();
        double rawTotal = 0;
        double discountedTotal = 0;

        for (Map<String, Object> itemData : itemsData) {
            Long productId = Long.valueOf(itemData.get("id").toString());
            int quantity = (int) itemData.get("quantity");

            Product product = productRepository.findById(productId).orElse(null);
            if (product == null) {
                throw new IllegalArgumentException("Product not found: " + productId);
            }

            // ÖNƏMLİ: Product-u enrich et ki personalPrice hesablansın
            productService.enrichProductWithPrices(product, userId);

            // 2. Stock Check & Update
            if (product.getStockQuantity() < quantity) {
                throw new IllegalArgumentException("Stok tükəndi: " + product.getName());
            }
            product.setStockQuantity(product.getStockQuantity() - quantity);
            product.setSoldCount(product.getSoldCount() + quantity); // Increment sold count
            productRepository.save(product);

            ReceiptItem item = new ReceiptItem();
            item.setReceipt(receipt);
            item.setProduct(product);
            item.setQuantity(quantity);

            // 3. Price Calculation - TAM BACKEND-DƏ HESABLANIR
            // Orijinal qiymət: oldPrice varsa onu istifadə et, yoxsa price
            double originalPrice = (product.getOldPrice() != null && product.getOldPrice() > 0)
                    ? product.getOldPrice()
                    : product.getPrice();

            // Endirimli qiymət - ƏVVƏLcə personalPrice yoxla (ən yaxşı endirim)
            double discountedPrice;

            if (product.getPersonalPrice() != null && product.getPersonalPrice() > 0) {
                // Şəxsi endirim - ən yaxşı qiymət
                discountedPrice = product.getPersonalPrice();
            } else if (product.getGlobalDiscountPrice() != null && product.getGlobalDiscountPrice() > 0) {
                // Global endirim qiyməti
                discountedPrice = product.getGlobalDiscountPrice();
            } else {
                // Default - cari qiymət
                discountedPrice = product.getPrice();

                // DiscountService-dən əlavə endirim yoxla
                try {
                    double servicePrice = discountService.getDiscountedPrice(product);
                    if (servicePrice > 0 && servicePrice < discountedPrice) {
                        discountedPrice = servicePrice;
                    }
                } catch (Exception e) {
                    System.out.println("Discount calc error (ignored): " + e.getMessage());
                }
            }

            // Safe discount label
            try {
                discountRuleService.findBestDiscount(product).ifPresent(d -> item.setDiscountLabel(d.getName()));
            } catch (Exception e) {
                // Ignore
            }

            // Əgər discount label boşdursa amma endirim varsa, default etiket qoy
            if (item.getDiscountLabel() == null && product.isDiscount() && originalPrice > discountedPrice) {
                int discountPercent = (int) Math.round((1 - discountedPrice / originalPrice) * 100);
                item.setDiscountLabel("Endirim " + discountPercent + "%");
            }

            item.setOriginalPrice(originalPrice);
            item.setDiscountedPrice(discountedPrice);
            item.setPriceAtPurchase(discountedPrice);

            items.add(item);
            rawTotal += originalPrice * quantity;
            discountedTotal += discountedPrice * quantity;
        }

        receipt.setItems(items);

        // 4. Promo validation - safe
        double promoDiscount = 0;
        if (promoCode != null && !promoCode.isBlank()) {
            try {
                DiscountRuleService.PromoValidationResult validation = discountRuleService
                        .validatePromoCode(promoCode, userId, discountedTotal);
                if (validation != null && validation.isValid()) {
                    promoDiscount = Math.min(validation.getDiscountAmount(), discountedTotal);
                    receipt.setPromoCodeUsed(promoCode.toUpperCase());
                }
            } catch (Exception e) {
                System.out.println("Promo validation error (ignored): " + e.getMessage());
            }
        }

        double afterPromo = discountedTotal - promoDiscount;

        // 5. Campaign Redemption
        double campaignDiscount = 0;
        if (campaignId != null) {
            try {
                com.logistore.model.UserChallenge uc = userChallengeRepository.findById(campaignId).orElse(null);
                if (uc != null && uc.getUser().getId().equals(userId) && uc.isCompleted() && !uc.isRedeemed()) {
                    if (uc.getDiscountType() == com.logistore.model.UserChallenge.DiscountType.PERCENTAGE) {
                        campaignDiscount = discountedTotal * (uc.getDiscountValue() / 100.0);
                    } else {
                        campaignDiscount = uc.getDiscountValue();
                    }
                    // Ensure discount doesn't exceed total
                    campaignDiscount = Math.min(campaignDiscount, afterPromo);

                    uc.setRedeemed(true);
                    userChallengeRepository.save(uc);
                    receipt.setPromoCodeUsed(uc.getChallengeName()); // Reusing promo field for visibility
                }
            } catch (Exception e) {
                System.out.println("Campaign redemption error: " + e.getMessage());
            }
        }

        double afterCampaign = afterPromo - campaignDiscount;

        // 6. Apply bonus spend
        double safeBonusSpend = Math.max(0, bonusSpend != null ? bonusSpend : 0);
        safeBonusSpend = Math.min(safeBonusSpend, user.getPoints());
        safeBonusSpend = Math.min(safeBonusSpend, afterCampaign);

        double finalPayable = afterCampaign - safeBonusSpend;

        // 6. Cashback (2% on >=10 AZN)
        if (afterPromo >= 10) {
            int cashback = (int) Math.round(finalPayable * 0.02);
            user.setPoints(user.getPoints() + cashback);
        }

        // 7. Deduct used bonus
        user.setPoints(user.getPoints() - (int) Math.round(safeBonusSpend));

        receipt.setBonusSpent(safeBonusSpend);
        receipt.setCardSpent(finalPayable);
        receipt.setOriginalTotal(rawTotal);
        double autoDiscount = rawTotal - discountedTotal;
        receipt.setDiscountTotal(autoDiscount + promoDiscount + campaignDiscount);
        receipt.setTotal(afterCampaign);

        // Update Purchase History
        if (user.getPurchaseHistory() == null) {
            user.setPurchaseHistory(new ArrayList<>());
        }
        for (Map<String, Object> itemData : itemsData) {
            Long productId = Long.valueOf(itemData.get("id").toString());
            if (!user.getPurchaseHistory().contains(productId)) {
                user.getPurchaseHistory().add(productId);
            }
        }

        userRepository.save(user);
        Receipt saved = receiptRepository.save(receipt);

        // Record promo usage - safe
        if (promoCode != null && !promoCode.isBlank() && receipt.getPromoCodeUsed() != null) {
            final double appliedPromoDiscount = promoDiscount;
            try {
                promoCodeRepository.findByCode(promoCode.toUpperCase()).ifPresent(pc -> {
                    try {
                        discountRuleService.recordPromoCodeUsage(pc, user, saved, appliedPromoDiscount);
                    } catch (Exception ignored) {
                    }
                });
            } catch (Exception ignored) {
            }
        }

        // Process Loyalty (Campaigns)
        try {
            processLoyalty(user, saved);
        } catch (Exception e) {
            System.out.println("Loyalty trigger error: " + e.getMessage());
        }

        return saved;
    }

    public Page<Receipt> getUserReceipts(String userId, Pageable pageable) {
        return receiptRepository.findByUserIdOrderByDateDesc(userId, pageable);
    }

    public Receipt getReceiptById(String id) {
        return receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Receipt not found"));
    }

    public Receipt getReceiptByPhysicalQr(String qrString) {
        return findByPhysicalOrFiscal(qrString);
    }

    public List<Receipt> getUserReceipts(String userId) {
        return receiptRepository.findByUserIdOrderByDateDesc(userId);
    }

    @Transactional
    public Receipt claimPhysicalReceipt(String qrString, String userId) {
        Receipt receipt = findByPhysicalOrFiscal(qrString);

        if (receipt.getType() != Receipt.ReceiptType.PHYSICAL) {
            throw new RuntimeException("Only physical receipts can be claimed");
        }

        if (receipt.getUser() != null || receipt.getStatus() == Receipt.ReceiptStatus.CLAIMED) {
            throw new RuntimeException("Receipt already claimed");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isScanGoBlocked()) {
            throw new RuntimeException("Sizin Scan & Go icazəniz bloklanıb.");
        }

        receipt.setUser(user);
        receipt.setStatus(Receipt.ReceiptStatus.CLAIMED);

        int earnedPoints = (int) (receipt.getTotal() / 10);
        user.setPoints(user.getPoints() + earnedPoints);

        if (receipt.getItems() != null) {
            if (user.getPurchaseHistory() == null) {
                user.setPurchaseHistory(new ArrayList<>());
            }
            for (ReceiptItem item : receipt.getItems()) {
                Long productId = item.getProduct() != null ? item.getProduct().getId() : null;
                if (productId != null) {
                    for (int i = 0; i < item.getQuantity(); i++) {
                        user.getPurchaseHistory().add(productId);
                    }
                }
            }
        }

        userRepository.save(user);
        return receiptRepository.save(receipt);
    }

    private Receipt findByPhysicalOrFiscal(String code) {
        return receiptRepository.findByPhysicalQrString(code)
                .or(() -> receiptRepository.findByFiscalId(code))
                .orElseThrow(() -> new RuntimeException("Receipt not found"));
    }

    @Transactional
    public Receipt processPosPayment(String posQrString, double amount, String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Receipt receipt = new Receipt();
        receipt.setUser(user);
        receipt.setDate(LocalDateTime.now());
        receipt.setTotal(amount);
        receipt.setStatus(Receipt.ReceiptStatus.CLAIMED);
        receipt.setType(Receipt.ReceiptType.SCAN_GO);
        receipt.setPosDeviceCode(posQrString);

        user.setPoints(user.getPoints() + (int) amount);
        userRepository.save(user);

        Receipt savedReceipt = receiptRepository.save(receipt);

        notificationService.sendCashierNotification(
                "Yeni Satış: " + savedReceipt.getTotal() + " AZN",
                "SALE");

        processLoyalty(user, savedReceipt);

        return savedReceipt;
    }

    private void processLoyalty(User user, Receipt receipt) {
        try {
            List<com.logistore.model.UserChallenge> activeChallenges = userChallengeRepository
                    .findByUserIdAndCompletedFalse(user.getId());

            java.time.LocalDate today = java.time.LocalDate.now();

            for (com.logistore.model.UserChallenge challenge : activeChallenges) {
                // 1. Check Date Validity
                if (challenge.getStartDate() != null && challenge.getStartDate().isAfter(today))
                    continue;
                if (challenge.getEndDate() != null && challenge.getEndDate().isBefore(today))
                    continue;

                boolean progressUpdated = false;

                // 2. FREQUENCY BASED CAMPAIGN (e.g. Buy 5 times > 10 AZN)
                if (challenge.getRequiredPurchaseCount() != null && challenge.getRequiredPurchaseCount() > 0) {
                    double minAmount = challenge.getMinAmountPerPurchase() != null ? challenge.getMinAmountPerPurchase()
                            : 0.0;

                    // Only count if receipt total meets minimum amount
                    if (receipt.getTotal() >= minAmount) {
                        challenge.setCurrentValue(challenge.getCurrentValue() + 1);
                        progressUpdated = true;

                        // Check completion
                        if (challenge.getCurrentValue() >= challenge.getRequiredPurchaseCount()) {
                            challenge.setCompleted(true);
                            // Award notification handled below
                        }
                    }
                }
                // 3. SPEND BASED CAMPAIGN (e.g. Spend total 100 AZN)
                else {
                    challenge.setCurrentValue(challenge.getCurrentValue() + (int) receipt.getTotal());
                    progressUpdated = true;

                    // Check completion
                    if (challenge.getCurrentValue() >= challenge.getTargetValue()) {
                        challenge.setCompleted(true);
                    }
                }

                // 4. Save & Notify if completed
                if (progressUpdated) {
                    if (challenge.isCompleted()) {
                        // Award Bonus if description contains numeric bonus, otherwise default 500
                        int bonus = 500; // Default
                        try {
                            // Try to parse bonus from description if it's just a number
                            if (challenge.getDescription() != null && challenge.getDescription().matches("\\d+")) {
                                bonus = Integer.parseInt(challenge.getDescription());
                            }
                        } catch (Exception e) {
                        }

                        user.setPoints(user.getPoints() + bonus);
                        userRepository.save(user);

                        notificationService.sendGlobalNotification("Hədəf Tamamlandı! 🎉",
                                "Təbriklər! " + user.getName() + " '" + challenge.getChallengeName()
                                        + "' kampaniyasını tamamladı və " + bonus + " bonus qazandı!",
                                "CHALLENGE");

                        // Also Add a specific notification for the user
                        notificationService.sendNotification(user.getId(), "Kampaniya Tamamlandı!",
                                "Siz '" + challenge.getChallengeName() + "' kampaniyasını uğurla tamamladınız.",
                                "CHALLENGE");
                    }

                    userChallengeRepository.save(challenge);
                }
            }
        } catch (Exception e) {
            System.out.println("Loyalty processing error (ignored): " + e.getMessage());
            e.printStackTrace();
        }
    }
}
