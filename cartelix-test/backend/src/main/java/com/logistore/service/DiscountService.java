package com.logistore.service;

import com.logistore.model.Discount;
import com.logistore.model.Product;
import com.logistore.repository.DiscountRepository;
import com.logistore.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Endirimlərlə işləyən köməkçi servis.
 * Əsas qayda məntiqi DiscountRuleService-dədir.
 */
@Service
public class DiscountService {

    @Autowired
    private DiscountRepository discountRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private DiscountRuleService discountRuleService;

    /**
     * Bütün aktiv endirimləri tap
     */
    public List<Discount> getActiveDiscounts() {
        try {
            return discountRepository.findActiveDiscounts(LocalDateTime.now());
        } catch (Exception e) {
            System.out.println("Active discounts query error (non-fatal): " + e.getMessage());
            return List.of();
        }
    }

    /**
     * Məhula tətbiq olunan ən yaxşı endirimi tap
     */
    public Optional<Discount> getBestDiscountForProduct(Product product) {
        try {
            return discountRuleService.findBestDiscount(product);
        } catch (Exception e) {
            System.out.println("getBestDiscountForProduct error (non-fatal): " + e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Məhulun endirimli qiymətini hesabla
     */
    public double getDiscountedPrice(Product product) {
        try {
            Optional<Discount> discountOpt = discountRuleService.findBestDiscount(product);
            if (discountOpt.isEmpty()) {
                return product.getPrice();
            }
            return discountRuleService.calculateDiscountedPrice(product, discountOpt.get());
        } catch (Exception e) {
            System.out.println("getDiscountedPrice error (non-fatal): " + e.getMessage());
            return product.getPrice();
        }
    }

    /**
     * Yeni endirim yarat
     */
    public Discount createDiscount(Discount discount) {
        return discountRepository.save(discount);
    }

    /**
     * Endirimi yenilə
     */
    public Discount updateDiscount(Long id, Discount updated) {
        return discountRepository.findById(id)
                .map(existing -> {
                    existing.setName(updated.getName());
                    existing.setDescription(updated.getDescription());
                    existing.setType(updated.getType());
                    existing.setValue(updated.getValue());
                    existing.setTarget(updated.getTarget());
                    existing.setStartDate(updated.getStartDate());
                    existing.setEndDate(updated.getEndDate());
                    existing.setPriority(updated.getPriority());
                    existing.setActive(updated.isActive());
                    existing.setProducts(updated.getProducts());
                    existing.setCategories(updated.getCategories());
                    existing.setBuyQuantity(updated.getBuyQuantity());
                    existing.setPayQuantity(updated.getPayQuantity());
                    return discountRepository.save(existing);
                })
                .orElseThrow(() -> new RuntimeException("Endirim tapılmadı: " + id));
    }

    /**
     * Endirimi sil
     */
    public void deleteDiscount(Long id) {
        discountRepository.deleteById(id);
    }

    /**
     * Bütün endirimləri tap
     */
    public List<Discount> getAllDiscounts() {
        try {
            return discountRepository.findAll();
        } catch (Exception e) {
            System.out.println("Get all discounts error (non-fatal): " + e.getMessage());
            return List.of();
        }
    }
}
