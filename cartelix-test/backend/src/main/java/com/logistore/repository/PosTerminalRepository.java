package com.logistore.repository;

import com.logistore.model.PosTerminal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PosTerminalRepository extends JpaRepository<PosTerminal, Long> {
    Optional<PosTerminal> findByQrCodeString(String qrCodeString);
}
