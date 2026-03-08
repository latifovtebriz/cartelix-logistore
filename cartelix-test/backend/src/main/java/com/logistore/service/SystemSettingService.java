package com.logistore.service;

import com.logistore.model.SystemSetting;
import com.logistore.repository.SystemSettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SystemSettingService {

    @Autowired
    private SystemSettingRepository systemSettingRepository;

    public List<SystemSetting> getAllSettings() {
        return systemSettingRepository.findAll();
    }

    public SystemSetting updateSetting(String key, String value) {
        SystemSetting setting = systemSettingRepository.findBySettingKey(key)
                .orElseThrow(() -> new RuntimeException("Setting not found: " + key));
        setting.setSettingValue(value);
        return systemSettingRepository.save(setting);
    }

    public void createSettingIfMissing(String key, String value, String description, String type) {
        if (systemSettingRepository.findBySettingKey(key).isEmpty()) {
            SystemSetting s = new SystemSetting();
            s.setSettingKey(key);
            s.setSettingValue(value);
            s.setDescription(description);
            s.setType(type);
            systemSettingRepository.save(s);
        }
    }

    // Typed Helpers
    public int getInt(String key, int defaultValue) {
        return systemSettingRepository.findBySettingKey(key)
                .map(s -> {
                    try {
                        return Integer.parseInt(s.getSettingValue());
                    } catch (NumberFormatException e) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    public double getDouble(String key, double defaultValue) {
        return systemSettingRepository.findBySettingKey(key)
                .map(s -> {
                    try {
                        return Double.parseDouble(s.getSettingValue());
                    } catch (NumberFormatException e) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }
}
