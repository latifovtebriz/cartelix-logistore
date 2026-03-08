package com.logistore.service;

import com.logistore.model.Product;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class PriceCalculatorService {

    public double calculateFinalPrice(Product product, double cartTotalDiscount) {
        BigDecimal basePrice = BigDecimal.valueOf(product.getPrice());

        // 1. Item Discount (e.g. 10% off specific product)
        // For MVP, let's assume discountService gives us a percentage or fixed amount.
        // We'll mock it as 0 for now or fetch from DiscountService if implemented.
        BigDecimal itemDiscount = BigDecimal.ZERO;

        BigDecimal priceAfterItemDisc = basePrice.subtract(itemDiscount);

        // 2. Cart/Global Discount (e.g. 5 AZN off total, distributed or applied once)
        // This logic is tricky for single items. Usually cart discount is applied to
        // the TOTAL receipt.
        // So this service might be better suited for calculating RECEIPT total.

        // Let's keep it simple: This method calculates price for ONE item line.
        // Cart discount should be applied in ReceiptService on the sum.

        return priceAfterItemDisc.max(BigDecimal.ZERO).doubleValue();
    }

    public double calculateReceiptTotal(double rawTotal, double globalDiscount, double couponValue) {
        BigDecimal total = BigDecimal.valueOf(rawTotal);
        BigDecimal gDiscount = BigDecimal.valueOf(globalDiscount);
        BigDecimal cValue = BigDecimal.valueOf(couponValue);

        // Order: (Total - Global) - Coupon
        BigDecimal afterGlobal = total.subtract(gDiscount);
        BigDecimal finalPrice = afterGlobal.subtract(cValue);

        return finalPrice.max(BigDecimal.ZERO).doubleValue();
    }
}
