package com.logistore.repository;

import com.logistore.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @org.springframework.data.jpa.repository.Query("SELECT n FROM Notification n WHERE n.user.id = :userId ORDER BY n.date DESC")
    List<Notification> findByUserId(@org.springframework.data.repository.query.Param("userId") String userId);

    @org.springframework.data.jpa.repository.Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.read = false")
    List<Notification> findUnreadByUserId(@org.springframework.data.repository.query.Param("userId") String userId);
}
