package com.logistore.controller;

import com.logistore.model.SystemSetting;
import com.logistore.service.SystemSettingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/settings")
public class SystemSettingController {

    @Autowired
    private SystemSettingService systemSettingService;

    @GetMapping
    public List<SystemSetting> getAllSettings() {
        return systemSettingService.getAllSettings();
    }

    @PutMapping("/{key}")
    public ResponseEntity<SystemSetting> updateSetting(
            @PathVariable String key,
            @RequestBody String value) {
        // value might come with quotes if raw body text/plain, or json string.
        // If sent as raw string from frontend, might need cleanup.
        // Let's assume frontend sends JSON object { "value": "..." } or just raw
        // string.
        // Actually easiest is @RequestParam to avoid JSON parsing issues for simple
        // strings
        return ResponseEntity.ok(systemSettingService.updateSetting(key, value));
    }

    @PutMapping("/{key}/simple")
    public ResponseEntity<SystemSetting> updateSettingSimple(
            @PathVariable String key,
            @RequestParam String value) {
        return ResponseEntity.ok(systemSettingService.updateSetting(key, value));
    }
}
