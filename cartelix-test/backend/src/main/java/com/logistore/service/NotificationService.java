package com.logistore.service;

import com.logistore.model.Notification;
import com.logistore.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private com.logistore.repository.UserRepository userRepository;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public List<Notification> getUserNotifications(String userId) {
        return notificationRepository.findByUserId(userId);
    }

    public void markAllRead(String userId) {
        List<Notification> unread = notificationRepository.findUnreadByUserId(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    public void sendNotification(String userId, String title, String message, String type) {
        // 1. Save to DB
        Notification notification = new Notification();
        notification.setUser(userRepository.findById(userId).orElse(null));
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setDate(java.time.LocalDateTime.now());
        notification.setRead(false);
        Notification savedNotification = notificationRepository.save(notification);

        // 2. Send via WebSocket
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, savedNotification);
    }

    public void sendGlobalNotification(String title, String message, String type) {
        // For MVP, we iterate all users. In prod, use a batch job or "System Notification" entity.
        List<com.logistore.model.User> users = userRepository.findAll();
        for (com.logistore.model.User user : users) {
            sendNotification(user.getId().toString(), title, message, type);
        }
    }

    public void sendCashierNotification(String message, String type) {
        // For MVP, send to all admins or specific cashier role
        // Here we just log it or save to a specific admin user if exists
        System.out.println("Cashier Notification: " + message);
    }
}
