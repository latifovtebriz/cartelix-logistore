package com.logistore.controller;

import com.logistore.model.Market;
import com.logistore.model.PosTerminal;
import com.logistore.repository.MarketRepository;
import com.logistore.repository.PosTerminalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/markets")
public class MarketController {

    @Autowired
    private MarketRepository marketRepository;

    @Autowired
    private PosTerminalRepository posTerminalRepository;

    @GetMapping
    public List<Market> getAllMarkets() {
        return marketRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Market> getMarketById(@PathVariable Long id) {
        return marketRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Market> createMarket(@RequestBody Market market) {
        Market saved = marketRepository.save(market);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Market> updateMarket(@PathVariable Long id, @RequestBody Market updated) {
        return marketRepository.findById(id)
                .map(market -> {
                    market.setName(updated.getName());
                    market.setLocation(updated.getLocation());
                    market.setPosDeviceCode(updated.getPosDeviceCode());
                    return ResponseEntity.ok(marketRepository.save(market));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMarket(@PathVariable Long id) {
        if (!marketRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        marketRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // POS Terminal endpoints
    @GetMapping("/pos-terminals")
    public List<Map<String, Object>> getAllPosTerminals() {
        List<PosTerminal> terminals = posTerminalRepository.findAll();
        return terminals.stream().map(t -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", t.getId());
            map.put("qrString", t.getQrCodeString());
            map.put("marketName", t.getMarket() != null ? t.getMarket().getName() : "Unknown");
            map.put("marketId", t.getMarket() != null ? t.getMarket().getId() : null);
            return map;
        }).toList();
    }

    @PostMapping("/pos-terminals")
    public ResponseEntity<?> addPosTerminal(@RequestBody Map<String, Object> data) {
        String qrString = (String) data.get("qrString");
        Long marketId = data.get("marketId") != null ? Long.valueOf(data.get("marketId").toString()) : null;
        String marketName = (String) data.get("marketName");

        if (qrString == null || qrString.isEmpty()) {
            return ResponseEntity.badRequest().body("QR string is required");
        }

        // Create or find market
        Market market = null;
        if (marketId != null) {
            market = marketRepository.findById(marketId).orElse(null);
        } else if (marketName != null && !marketName.isEmpty()) {
            market = new Market();
            market.setName(marketName);
            market.setPosDeviceCode(qrString);
            market = marketRepository.save(market);
        }

        PosTerminal terminal = new PosTerminal();
        terminal.setQrCodeString(qrString);
        terminal.setMarket(market);
        
        PosTerminal saved = posTerminalRepository.save(terminal);

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("qrString", saved.getQrCodeString());
        response.put("marketName", market != null ? market.getName() : null);
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/pos-terminals/{id}")
    public ResponseEntity<?> deletePosTerminal(@PathVariable Long id) {
        if (!posTerminalRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        posTerminalRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
