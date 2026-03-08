package com.logistore.repository;

import com.logistore.model.PromoCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PromoCodeRepository extends JpaRepository<PromoCode, Long> {
    Optional<PromoCode> findByCode(String code);

    java.util.List<PromoCode> findByTargetUserId(String userId);

    java.util.List<PromoCode> findByTargetUserIdIsNull();
}
