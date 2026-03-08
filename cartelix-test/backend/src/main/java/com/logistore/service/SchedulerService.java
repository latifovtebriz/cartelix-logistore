package com.logistore.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Planlaşdırılmış tapşırıqlar üçün servis.
 * Endirimlərin aktivləşdirilməsi artıq DiscountRuleService-də real-vaxt
 * hesablanır,
 * ona görə bu servis sadələşdirilib.
 */
@Service
public class SchedulerService {

    @Autowired
    private DiscountService discountService;

    /**
     * Hər dəqiqə aktiv endirimləri yoxla (logging/monitoring üçün)
     */
    @Scheduled(fixedRate = 60000)
    public void checkDiscounts() {
        // Artıq qiymətlər real-vaxt hesablanır, burada yalnız monitoring
        int activeCount = discountService.getActiveDiscounts().size();
        if (activeCount > 0) {
            System.out.println("[SchedulerService] Aktiv endirim sayı: " + activeCount);
        }
    }
}
