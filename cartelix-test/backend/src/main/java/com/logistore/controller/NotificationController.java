package com.logistore.controller;

import com.logistore.model.Notification;
import com.logistore.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public List<Notification> getUserNotifications(@RequestParam String userId) {
        return notificationService.getUserNotifications(userId);
    }

    @PatchMapping("/read-all")
    public void markAllRead(@RequestParam String userId) {
        notificationService.markAllRead(userId);
    }

    // Send notification to specific user (admin only)
    @PostMapping("/send")
    public ResponseEntity<?> sendNotification(@RequestBody Map<String, String> data) {
        String userId = data.get("userId");
        String title = data.get("title");
        String message = data.get("message");
        String type = data.getOrDefault("type", "info");

        if (userId == null || title == null || message == null) {
            return ResponseEntity.badRequest().body("userId, title, and message are required");
        }

        notificationService.sendNotification(userId, title, message, type);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // Send notification to all users (admin only)
    @PostMapping("/broadcast")
    public ResponseEntity<?> broadcastNotification(@RequestBody Map<String, String> data) {
        String title = data.get("title");
        String message = data.get("message");
        String type = data.getOrDefault("type", "info");

        if (title == null || message == null) {
            return ResponseEntity.badRequest().body("title and message are required");
        }

        notificationService.sendGlobalNotification(title, message, type);
        return ResponseEntity.ok(Map.of("success", true, "message", "Notification broadcast to all users"));
    }
}
