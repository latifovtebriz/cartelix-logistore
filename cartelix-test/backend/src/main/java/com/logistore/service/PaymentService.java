package com.logistore.service;

import com.logistore.model.Receipt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class PaymentService {

    @Autowired
    private ReceiptService receiptService;

    public Receipt processPosPayment(String posId, String userId, List<Map<String, Object>> items,
            String promoCode, Double bonusSpend, Long marketId) {
        // 1. Validate POS ID
        if (posId == null || !posId.startsWith("POS_")) {
            throw new IllegalArgumentException("Invalid POS Terminal ID");
        }

        // 2. Simulate Bank Transaction (Always approve for MVP)
        // In real app: bankApi.charge(userCard, amount);
        try {
            // Simulate network latency for "Handshake"
            Thread.sleep(1500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // 3. Create Receipt (This handles Stock & Totals)
        // We pass null for idempotencyKey for now, or generate one
        String idempotencyKey = "POS-" + System.currentTimeMillis();
        return receiptService.createReceipt(userId, items, idempotencyKey, promoCode, bonusSpend, posId,
                Receipt.ReceiptType.SCAN_GO, marketId, null);
    }
}
