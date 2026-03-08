package com.logistore.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;

public class CreateReceiptRequest {
    @NotNull(message = "User ID is required")
    private String userId;

    @NotEmpty(message = "Items list cannot be empty")
    private List<Map<String, Object>> items;

    // Optional promo code for Scan & Go
    private String promoCode;

    // Optional bonus spend amount (<= user points)
    private Double bonusSpend;

    // POS QR or device code for Scan & Go
    private String posQrString;

    // Receipt type: SCAN_GO or PHYSICAL
    private String type;

    // Market identifier (for POS / cashier linkage)
    private Long marketId;

    private Long campaignId;

    public Long getCampaignId() {
        return campaignId;
    }

    public void setCampaignId(Long campaignId) {
        this.campaignId = campaignId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public List<Map<String, Object>> getItems() {
        return items;
    }

    public void setItems(List<Map<String, Object>> items) {
        this.items = items;
    }

    public String getPromoCode() {
        return promoCode;
    }

    public void setPromoCode(String promoCode) {
        this.promoCode = promoCode;
    }

    public Double getBonusSpend() {
        return bonusSpend;
    }

    public void setBonusSpend(Double bonusSpend) {
        this.bonusSpend = bonusSpend;
    }

    public String getPosQrString() {
        return posQrString;
    }

    public void setPosQrString(String posQrString) {
        this.posQrString = posQrString;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getMarketId() {
        return marketId;
    }

    public void setMarketId(Long marketId) {
        this.marketId = marketId;
    }
}
