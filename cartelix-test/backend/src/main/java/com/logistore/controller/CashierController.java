package com.logistore.controller;

import com.logistore.model.*;
import com.logistore.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/cashier")
public class CashierController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ReceiptRepository receiptRepository;

    @Autowired
    private MarketRepository marketRepository;

    /**
     * Get current cashier's market info
     */
    @GetMapping("/market")
    public ResponseEntity<?> getCashierMarket(@RequestHeader("X-User-Id") String cashierId) {
        Optional<User> cashierOpt = userRepository.findById(cashierId);
        if (cashierOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Kassir tapılmadı"));
        }

        User cashier = cashierOpt.get();
        if (cashier.getRole() != Role.CASHIER) {
            return ResponseEntity.status(403).body(Map.of("error", "Bu istifadəçi kassir deyil"));
        }

        if (cashier.getMarketId() == null) {
            return ResponseEntity.ok(Map.of("market", null, "message", "Mağaza təyin edilməyib"));
        }

        Optional<Market> marketOpt = marketRepository.findById(cashier.getMarketId());
        return ResponseEntity.ok(Map.of("market", marketOpt.orElse(null)));
    }

    /**
     * Lookup customer by their LogiStore Plus barcode
     */
    @GetMapping("/lookup-customer/{barcode}")
    public ResponseEntity<?> lookupCustomerByBarcode(@PathVariable String barcode) {
        Optional<User> customerOpt = userRepository.findByBarcode(barcode);

        if (customerOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Müştəri tapılmadı"));
        }

        User customer = customerOpt.get();

        // Count physical purchases
        long physicalPurchases = receiptRepository.countByUserAndType(customer, Receipt.ReceiptType.PHYSICAL);

        Map<String, Object> response = new HashMap<>();
        response.put("id", customer.getId());
        response.put("name", customer.getName());
        response.put("surname", customer.getSurname());
        response.put("phone", customer.getPhone());
        response.put("points", customer.getPoints());
        response.put("physicalPurchases", physicalPurchases);
        response.put("barcode", customer.getBarcode());

        return ResponseEntity.ok(response);
    }

    /**
     * Complete checkout - create receipt and add to user history
     */
    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(
            @RequestHeader("X-User-Id") String cashierId,
            @RequestBody CheckoutRequest request) {

        // Validate cashier
        Optional<User> cashierOpt = userRepository.findById(cashierId);
        if (cashierOpt.isEmpty() || cashierOpt.get().getRole() != Role.CASHIER) {
            return ResponseEntity.status(403).body(Map.of("error", "Kassir icazəsi yoxdur"));
        }

        User cashier = cashierOpt.get();

        // Validate customer if provided
        User customer = null;
        if (request.getCustomerId() != null && !request.getCustomerId().isEmpty()) {
            Optional<User> customerOpt = userRepository.findById(request.getCustomerId());
            if (customerOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Müştəri tapılmadı"));
            }
            customer = customerOpt.get();
        }

        // Create receipt base metadata
        Receipt receipt = new Receipt();
        receipt.setDate(LocalDateTime.now());
        receipt.setType(Receipt.ReceiptType.PHYSICAL);
        receipt.setCashierId(cashierId);
        receipt.setMarketId(cashier.getMarketId());
        receipt.setPosDeviceCode(resolvePosCode(cashier.getMarketId()));
        receipt.setStatus(Receipt.ReceiptStatus.UNCLAIMED);
        receipt.setType(Receipt.ReceiptType.PHYSICAL);

        // Generate fiscal/QR identifiers
        receipt.setFiscalId("FIS-" + System.currentTimeMillis());
        // Use consistent prefix with seeded physical receipts
        receipt.setPhysicalQrString("PHY_" + UUID.randomUUID().toString().substring(0, 8));
        receipt.setIdempotencyKey(UUID.randomUUID().toString());

        // Create receipt items
        List<ReceiptItem> items = new ArrayList<>();
        double total = 0;
        double originalTotal = 0;
        double discountTotal = 0;

        for (CheckoutItem item : request.getItems()) {
            Optional<Product> productOpt = productRepository.findById(item.getProductId());
            if (productOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Məhsul tapılmadı: " + item.getProductId()));
            }

            Product product = productOpt.get();
            ReceiptItem receiptItem = new ReceiptItem();
            receiptItem.setReceipt(receipt);
            receiptItem.setProduct(product);
            receiptItem.setQuantity(item.getQuantity());

            // Pricing breakdown per unit
            double originalUnit = product.getOldPrice() != null && product.getOldPrice() > 0
                    ? product.getOldPrice()
                    : product.getPrice();
            double discountedUnit = product.getPrice();

            receiptItem.setOriginalPrice(originalUnit);
            receiptItem.setDiscountedPrice(discountedUnit);
            receiptItem.setPriceAtPurchase(discountedUnit);
            receiptItem.setDiscountLabel(originalUnit > discountedUnit ? "Shelf discount" : "No discount");
            items.add(receiptItem);

            total += discountedUnit * item.getQuantity();
            originalTotal += originalUnit * item.getQuantity();

            // Add to customer's purchase history if customer exists (track each scan)
            if (customer != null) {
                if (customer.getPurchaseHistory() == null) {
                    customer.setPurchaseHistory(new ArrayList<>());
                }
                for (int q = 0; q < item.getQuantity(); q++) {
                    customer.getPurchaseHistory().add(product.getId());
                }
            }
        }

        discountTotal = Math.max(0, originalTotal - total);

        receipt.setTotal(total);
        receipt.setOriginalTotal(originalTotal);
        receipt.setDiscountTotal(discountTotal);
        receipt.setBonusSpent(0.0);
        receipt.setCardSpent(total);
        receipt.setItems(items);

        // Link receipt to customer if exists
        if (customer != null) {
            receipt.setUser(customer);
            receipt.setStatus(Receipt.ReceiptStatus.CLAIMED);

            // Add points (1 point per 10 AZN)
            int earnedPoints = (int) (total / 10);
            customer.setPoints(customer.getPoints() + earnedPoints);

            userRepository.save(customer);
        }

        receiptRepository.save(receipt);

        // Build response
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("receiptId", receipt.getId());
        response.put("fiscalId", receipt.getFiscalId());
        response.put("total", total);
        response.put("itemCount", items.size());
        response.put("originalTotal", originalTotal);
        response.put("discountTotal", discountTotal);
        response.put("cardSpent", receipt.getCardSpent());
        response.put("bonusSpent", receipt.getBonusSpent());
        response.put("posDeviceCode", receipt.getPosDeviceCode());
        response.put("physicalQrString", receipt.getPhysicalQrString());
        if (customer != null) {
            response.put("customerName", customer.getName());
            int earned = (int) (total / 10);
            response.put("earnedPoints", earned);
            response.put("newPointsBalance", customer.getPoints());
        }

        // === QR KOD DATA ===
        // Müştəri bu QR-ı skan edib bonusunu yükləyə bilər
        Map<String, Object> qrData = new HashMap<>();
        qrData.put("transactionId", receipt.getFiscalId());
        qrData.put("receiptId", receipt.getId());
        qrData.put("total", total);
        qrData.put("timestamp", LocalDateTime.now().toString());
        qrData.put("marketId", cashier.getMarketId());
        qrData.put("itemCount", items.size());

        // JSON-a çevir və Base64 encode et
        try {
            String qrJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(qrData);
            String qrEncoded = java.util.Base64.getEncoder().encodeToString(qrJson.getBytes());
            response.put("qrData", qrEncoded);
            response.put("qrJson", qrJson); // Debug üçün raw JSON
        } catch (Exception e) {
            response.put("qrData", receipt.getFiscalId()); // Fallback
        }

        return ResponseEntity.ok(response);
    }

    // Request DTOs
    public static class CheckoutRequest {
        private String customerId;
        private List<CheckoutItem> items;
        private String paymentMethod; // CASH, CARD

        public String getCustomerId() {
            return customerId;
        }

        public void setCustomerId(String customerId) {
            this.customerId = customerId;
        }

        public List<CheckoutItem> getItems() {
            return items;
        }

        public void setItems(List<CheckoutItem> items) {
            this.items = items;
        }

        public String getPaymentMethod() {
            return paymentMethod;
        }

        public void setPaymentMethod(String paymentMethod) {
            this.paymentMethod = paymentMethod;
        }
    }

    public static class CheckoutItem {
        private Long productId;
        private int quantity;

        public Long getProductId() {
            return productId;
        }

        public void setProductId(Long productId) {
            this.productId = productId;
        }

        public int getQuantity() {
            return quantity;
        }

        public void setQuantity(int quantity) {
            this.quantity = quantity;
        }
    }

    private String resolvePosCode(Long marketId) {
        if (marketId == null)
            return null;
        return marketRepository.findById(marketId)
                .map(Market::getPosDeviceCode)
                .orElse(null);
    }
}
