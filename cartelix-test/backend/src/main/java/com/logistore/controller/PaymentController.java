package com.logistore.controller;

import com.logistore.model.Receipt;
import com.logistore.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pos")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping("/pay")
    public ResponseEntity<?> processPayment(@RequestBody Map<String, Object> payload) {
        try {
            String posId = (String) payload.get("posId");
            String userId = (String) payload.get("userId");
            List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
            String promoCode = payload.get("promoCode") != null ? payload.get("promoCode").toString() : null;
            Double bonusSpend = payload.get("bonusSpend") != null
                    ? Double.parseDouble(payload.get("bonusSpend").toString())
                    : 0d;
            Long marketId = payload.get("marketId") != null ? Long.valueOf(payload.get("marketId").toString())
                    : null;

            Receipt receipt = paymentService.processPosPayment(posId, userId, items, promoCode, bonusSpend, marketId);
            return ResponseEntity.ok(receipt);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
