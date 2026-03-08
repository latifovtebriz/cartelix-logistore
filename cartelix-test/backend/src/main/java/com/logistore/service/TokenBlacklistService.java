package com.logistore.service;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class TokenBlacklistService {

    // In a real production environment, use Redis.
    // For MVP, we use an in-memory ConcurrentHashMap.
    private final Map<String, Long> blacklist = new ConcurrentHashMap<>();
    
    // Cleanup scheduler to remove expired tokens from memory
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public TokenBlacklistService() {
        // Run cleanup every hour
        scheduler.scheduleAtFixedRate(this::cleanupExpiredTokens, 1, 1, TimeUnit.HOURS);
    }

    public void blacklistToken(String token, long expirationTimeMillis) {
        blacklist.put(token, expirationTimeMillis);
    }

    public boolean isBlacklisted(String token) {
        if (token == null) return false;
        
        Long expiration = blacklist.get(token);
        if (expiration == null) {
            return false;
        }
        
        // If token is in blacklist but already expired, we can technically remove it,
        // but let's just say it's blacklisted (invalid) to be safe.
        // Or better: if it's expired, it's invalid anyway.
        return true;
    }

    private void cleanupExpiredTokens() {
        long now = System.currentTimeMillis();
        blacklist.entrySet().removeIf(entry -> entry.getValue() < now);
    }
}
