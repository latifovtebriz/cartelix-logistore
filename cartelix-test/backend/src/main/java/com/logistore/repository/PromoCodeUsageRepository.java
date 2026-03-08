package com.logistore.repository;

import com.logistore.model.PromoCode;
import com.logistore.model.PromoCodeUsage;
import com.logistore.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PromoCodeUsageRepository extends JpaRepository<PromoCodeUsage, Long> {

    /**
     * Müəyyən user-in müəyyən promokodu neçə dəfə istifadə etdiyini say
     */
    long countByPromoCodeAndUser(PromoCode promoCode, User user);

    /**
     * User-in promokod istifadə tarixçəsini tap
     */
    List<PromoCodeUsage> findByUserOrderByUsedAtDesc(User user);

    /**
     * Promokodun bütün istifadələrini tap
     */
    List<PromoCodeUsage> findByPromoCodeOrderByUsedAtDesc(PromoCode promoCode);

    /**
     * User bu promokodu istifadə edibmi?
     */
    boolean existsByPromoCodeAndUser(PromoCode promoCode, User user);

    /**
     * User ID ilə sayma
     */
    @Query("SELECT COUNT(u) FROM PromoCodeUsage u WHERE u.promoCode.id = :promoCodeId AND u.user.id = :userId")
    long countByPromoCodeIdAndUserId(Long promoCodeId, String userId);
}
