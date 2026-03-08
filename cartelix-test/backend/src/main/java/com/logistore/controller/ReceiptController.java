package com.logistore.controller;

import com.logistore.model.Receipt;
import com.logistore.service.ReceiptService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {

    @Autowired
    private ReceiptService receiptService;

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<Receipt>> getReceipts(
            @RequestParam String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity
                .ok(receiptService.getUserReceipts(userId, org.springframework.data.domain.PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Receipt> getReceiptById(@PathVariable String id) {
        return ResponseEntity.ok(receiptService.getReceiptById(id));
    }

    @PostMapping
    public ResponseEntity<Receipt> createReceipt(
            @jakarta.validation.Valid @RequestBody com.logistore.dto.CreateReceiptRequest payload,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey) {
        Receipt receipt = receiptService.createReceipt(
                payload.getUserId(),
                payload.getItems(),
                idempotencyKey,
                payload.getPromoCode(),
                payload.getBonusSpend(),
                payload.getPosQrString(),
                payload.getType() != null ? Receipt.ReceiptType.valueOf(payload.getType())
                        : Receipt.ReceiptType.SCAN_GO,
                payload.getMarketId(),
                payload.getCampaignId());
        return ResponseEntity.ok(receipt);
    }

    @PostMapping("/claim")
    public ResponseEntity<?> claimReceipt(@RequestParam String qrString, @RequestParam String userId) {
        try {
            Receipt receipt = receiptService.claimPhysicalReceipt(qrString, userId);
            return ResponseEntity.ok(receipt);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/claim/status")
    public ResponseEntity<?> getClaimStatus(@RequestParam String qrString) {
        try {
            Receipt receipt = receiptService.getReceiptByPhysicalQr(qrString);
            return ResponseEntity.ok(Map.of(
                    "status", receipt.getStatus(),
                    "type", receipt.getType(),
                    "receiptId", receipt.getId(),
                    "fiscalId", receipt.getFiscalId(),
                    "claimed", receipt.getStatus() == Receipt.ReceiptStatus.CLAIMED,
                    "userId", receipt.getUser() != null ? receipt.getUser().getId() : null,
                    "total", receipt.getTotal(),
                    "posDeviceCode", receipt.getPosDeviceCode(),
                    "marketId", receipt.getMarketId()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/pos/pay")
    public ResponseEntity<?> processPosPayment(@RequestParam String posQr, @RequestParam double amount,
            @RequestParam String userId) {
        try {
            Receipt receipt = receiptService.processPosPayment(posQr, amount, userId);
            return ResponseEntity.ok(receipt);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Additional endpoint for scanning physical receipt could go here
    @PostMapping("/scan")
    public ResponseEntity<?> scanReceipt(@RequestBody Map<String, String> payload) {
        // Mock implementation
        return ResponseEntity.ok(Map.of("success", true, "message", "Receipt scanned successfully"));
    }
}
