package com.logistore.service;

import com.logistore.model.PosTerminal;
import com.logistore.repository.PosTerminalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class PosService {

    @Autowired
    private PosTerminalRepository posTerminalRepository;

    public boolean validatePos(String qrString) {
        Optional<PosTerminal> terminal = posTerminalRepository.findByQrCodeString(qrString);
        return terminal.isPresent();
    }
}
