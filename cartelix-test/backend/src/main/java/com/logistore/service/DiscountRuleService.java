package com.logistore.service;

import com.logistore.model.*;
import com.logistore.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Endirim və Promokod qaydalarını tətbiq edən servis.
 * Ən uyğun endirimi tapır və qiymətləri hesablayır.
 */
@Service
public class DiscountRuleService {

    @Autowired
    private DiscountRepository discountRepository;

    @Autowired
    private PromoCodeRepository promoCodeRepository;

    @Autowired
    private PromoCodeUsageRepository promoCodeUsageRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Məhul üçün ən yüksək prioritetli aktiv endirimi tap
     */
    public Optional<Discount> findBestDiscount(Product product) {
        try {
            LocalDateTime now = LocalDateTime.now();

            // 1. Konkret məhsula aid endirimlər
            List<Discount> productDiscounts = discountRepository.findActiveDiscountsForProduct(product.getId(), now);
            if (!productDiscounts.isEmpty()) {
                return Optional.of(productDiscounts.get(0)); // Ən yüksək prioritetli
            }

            // 2. Kateqoriyaya aid endirimlər
            if (product.getCategory() != null) {
                List<Discount> categoryDiscounts = discountRepository.findActiveDiscountsForCategory(
                        product.getCategory().getName(), now);
                if (!categoryDiscounts.isEmpty()) {
                    return Optional.of(categoryDiscounts.get(0));
                }
            }

            // 3. Qlobal endirimlər
            List<Discount> globalDiscounts = discountRepository.findActiveGlobalDiscounts(now);
            if (!globalDiscounts.isEmpty()) {
                return Optional.of(globalDiscounts.get(0));
            }

            return Optional.empty();
        } catch (Exception e) {
            // H2 və ya digər database xətalarında graceful handle et
            System.out.println("Discount query error (non-fatal): " + e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Endirimli qiyməti hesabla
     */
    public double calculateDiscountedPrice(Product product, Discount discount) {
        double originalPrice = product.getPrice();

        switch (discount.getType()) {
            case PERCENTAGE:
                return originalPrice * (1 - discount.getValue() / 100);

            case FIXED_AMOUNT:
                return Math.max(0, originalPrice - discount.getValue());

            case BUY_X_GET_Y:
                // Bu tip səbət səviyyəsində hesablanır
                return originalPrice;

            default:
                return originalPrice;
        }
    }

    /**
     * Səbət üçün "3 al 2 ödə" tipli endirimi hesabla
     */
    public double calculateBuyXGetYDiscount(List<CartItem> items, Discount discount) {
        if (discount.getType() != Discount.DiscountType.BUY_X_GET_Y) {
            return 0;
        }

        int buyQty = discount.getBuyQuantity();
        int payQty = discount.getPayQuantity();
        double totalDiscount = 0;

        for (CartItem item : items) {
            if (discount.appliesTo(item.getProduct())) {
                int qty = item.getQuantity();
                int freeItems = (qty / buyQty) * (buyQty - payQty);
                totalDiscount += freeItems * item.getProduct().getPrice();
            }
        }

        return totalDiscount;
    }

    // === PROMOKOD VALİDASİYASI ===

    /**
     * Promokodu validasiya et
     */
    public PromoValidationResult validatePromoCode(String code, String userId, double basketTotal) {
        try {
            Optional<PromoCode> promoOpt = promoCodeRepository.findByCode(code.toUpperCase());

            if (promoOpt.isEmpty()) {
                return PromoValidationResult.error("Promokod tapılmadı");
            }

        PromoCode promo = promoOpt.get();

        // 1. Aktiv yoxla
        if (!promo.isCurrentlyActive()) {
            return PromoValidationResult.error("Promokod artıq keçərli deyil");
        }

        // 2. Ümumi limit yoxla
        if (promo.hasReachedUsageLimit()) {
            return PromoValidationResult.error("Promokod istifadə limitinə çatıb");
        }

        // 3. Minimum səbət məbləğini yoxla
        if (!promo.meetsMinimumBasketValue(basketTotal)) {
            return PromoValidationResult.error(
                    String.format("Minimum səbət məbləği %.2f AZN olmalıdır", promo.getMinBasketValue()));
        }

        // 4. User limiti yoxla
        if (userId != null && promo.getUserUsageLimit() != null) {
            long userUsageCount = promoCodeUsageRepository.countByPromoCodeIdAndUserId(promo.getId(), userId);
            if (userUsageCount >= promo.getUserUsageLimit()) {
                return PromoValidationResult.error("Bu promokodu artıq istifadə etmisiniz");
            }
        }

        // 5. Xüsusi user yoxla
        if (promo.getTargetUserId() != null && !promo.getTargetUserId().equals(userId)) {
            return PromoValidationResult.error("Bu promokod sizə aid deyil");
        }

        // Endirim məbləğini hesabla
        double discountAmount;
        if (promo.isPercentage()) {
            discountAmount = basketTotal * promo.getDiscountAmount() / 100;
        } else {
            discountAmount = Math.min(promo.getDiscountAmount(), basketTotal);
        }

        return PromoValidationResult.success(promo, discountAmount);
        } catch (Exception e) {
            System.out.println("PromoCode validation error (non-fatal): " + e.getMessage());
            return PromoValidationResult.error("Promokod yoxlanılarkən xəta baş verdi");
        }
    }

    /**
     * Promokod istifadəsini qeyd et
     */
    public void recordPromoCodeUsage(PromoCode promoCode, User user, Receipt receipt, double discountApplied) {
        try {
            PromoCodeUsage usage = new PromoCodeUsage();
            usage.setPromoCode(promoCode);
            usage.setUser(user);
            usage.setReceipt(receipt);
            usage.setDiscountApplied(discountApplied);
            promoCodeUsageRepository.save(usage);

            // Ümumi istifadə sayını artır
            promoCode.incrementUsage();
            promoCodeRepository.save(promoCode);
        } catch (Exception e) {
            System.out.println("PromoCode usage recording error (non-fatal): " + e.getMessage());
        }
    }

    // === DTO ===

    public static class CartItem {
        private Product product;
        private int quantity;

        public CartItem(Product product, int quantity) {
            this.product = product;
            this.quantity = quantity;
        }

        public Product getProduct() {
            return product;
        }

        public int getQuantity() {
            return quantity;
        }
    }

    public static class PromoValidationResult {
        private boolean valid;
        private String errorMessage;
        private PromoCode promoCode;
        private double discountAmount;

        public static PromoValidationResult error(String message) {
            PromoValidationResult result = new PromoValidationResult();
            result.valid = false;
            result.errorMessage = message;
            return result;
        }

        public static PromoValidationResult success(PromoCode promo, double discount) {
            PromoValidationResult result = new PromoValidationResult();
            result.valid = true;
            result.promoCode = promo;
            result.discountAmount = discount;
            return result;
        }

        public boolean isValid() {
            return valid;
        }

        public String getErrorMessage() {
            return errorMessage;
        }

        public PromoCode getPromoCode() {
            return promoCode;
        }

        public double getDiscountAmount() {
            return discountAmount;
        }
    }
}
