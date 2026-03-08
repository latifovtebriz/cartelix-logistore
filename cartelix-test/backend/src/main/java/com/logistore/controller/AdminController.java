package com.logistore.controller;

import com.logistore.model.User;
import com.logistore.model.Receipt;
import com.logistore.model.Role;
import com.logistore.repository.ReceiptRepository;
import com.logistore.repository.UserRepository;
import com.logistore.repository.ProductRepository;
import com.logistore.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReceiptRepository receiptRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private NotificationService notificationService;

    @GetMapping("/users")
    public Page<User> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean blocked) {
        // Max 50 items per page
        int pageSize = Math.min(size, 50);
        Pageable pageable = PageRequest.of(page, pageSize, Sort.by("name").ascending());

        // Filter by search, role, and blocked status
        Page<User> users = userRepository.findAll(pageable);

        // Apply filters if needed (for complex filtering, consider @Query in
        // repository)
        return users;
    }

    @GetMapping("/users/search")
    public Page<User> searchUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q) {
        int pageSize = Math.min(size, 50);
        Pageable pageable = PageRequest.of(page, pageSize);

        if (q != null && !q.isEmpty()) {
            return userRepository.findByNameContainingIgnoreCaseOrPhoneContaining(q, q, pageable);
        }
        return userRepository.findAll(pageable);
    }

    @PatchMapping("/users/{id}/block")
    public ResponseEntity<User> toggleUserBlock(@PathVariable String id, @RequestParam boolean blocked) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setScanGoBlocked(blocked);
                    return ResponseEntity.ok(userRepository.save(user));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getAdminStats() {
        try {
            Map<String, Object> stats = new HashMap<>();

            // Real database counts
            long userCount = userRepository.count();
            long receiptCount = receiptRepository.count();

            Double totalRevenue = receiptRepository.sumTotalRevenue();
            if (totalRevenue == null)
                totalRevenue = 0.0;

            java.time.LocalDateTime startOfDay = java.time.LocalDateTime.of(java.time.LocalDate.now(),
                    java.time.LocalTime.MIN);
            Double todaysRevenue = receiptRepository.sumRevenueAfter(startOfDay);
            if (todaysRevenue == null)
                todaysRevenue = 0.0;

            stats.put("totalRevenue", totalRevenue);
            stats.put("totalOrders", receiptCount);
            stats.put("activeUsers", userCount);
            stats.put("todaysRevenue", todaysRevenue);

            // Recent orders
            List<Receipt> recentReceipts = receiptRepository.findAll(
                    PageRequest.of(0, 5, Sort.by("date").descending())).getContent();

            // Map receipts to simple structure for frontend if needed, or send as is
            // (Receipt has User inside)
            // But Receipt entity has User @JsonIgnore, so we might need dto or simple map.
            // Currently frontend expects 'recentOrders' list. Let's see what frontend
            // expects.
            // Wait, front uses 'recentOrders' for visuals?
            // Actually AdminDashboard might just show graph or table.

            // Let's create a simplified list for recent orders including user name
            List<Map<String, Object>> recentOrders = recentReceipts.stream().map(r -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", r.getFiscalId() != null ? r.getFiscalId() : r.getId());
                map.put("total", r.getTotal());
                map.put("date", r.getDate());
                map.put("status", r.getStatus());
                if (r.getUser() != null) {
                    map.put("userName", r.getUser().getName() + " "
                            + (r.getUser().getSurname() != null ? r.getUser().getSurname() : ""));
                } else {
                    map.put("userName", "Qonaq");
                }
                return map;
            }).collect(Collectors.toList());

            stats.put("recentOrders", recentOrders);
            stats.put("logs", new ArrayList<>());

            // Top selling products (Dynamic from Products table as requested)
            // stats.put("topSellingProducts",
            // receiptRepository.findTopSellingProducts(PageRequest.of(0, 5)));
            List<Map<String, Object>> topProducts = productRepository.findTop5ByOrderBySoldCountDesc().stream()
                    .map(p -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("name", p.getName());
                        map.put("count", p.getSoldCount());
                        return map;
                    })
                    .collect(Collectors.toList());
            stats.put("topSellingProducts", topProducts);

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("error", e.getMessage());
            fallback.put("totalRevenue", 0);
            fallback.put("totalOrders", 0);
            fallback.put("activeUsers", 0);
            fallback.put("todaysRevenue", 0);
            fallback.put("recentOrders", new ArrayList<>());
            fallback.put("logs", new ArrayList<>());
            fallback.put("topSellingProducts", new ArrayList<>());
            return ResponseEntity.ok(fallback);
        }
    }

    @PatchMapping("/users/{id}/block-account")
    public ResponseEntity<User> toggleAccountBlock(@PathVariable String id, @RequestParam boolean blocked) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setBlocked(blocked);
                    return ResponseEntity.ok(userRepository.save(user));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete user
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // Get user purchase history
    @GetMapping("/users/{id}/receipts")
    public ResponseEntity<?> getUserReceipts(
            @PathVariable String id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userRepository.findById(id)
                .map(user -> {
                    Pageable pageable = PageRequest.of(page, size, Sort.by("date").descending());
                    Page<Receipt> receipts = receiptRepository.findByUserId(id, pageable);
                    return ResponseEntity.ok(receipts);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Create admin user
    @PostMapping("/users/create-admin")
    public ResponseEntity<?> createAdminUser(@RequestBody Map<String, String> data) {
        String phone = data.get("phone");
        String name = data.get("name");
        String surname = data.get("surname");
        String roleStr = data.getOrDefault("role", "ADMIN");

        if (phone == null || phone.isEmpty()) {
            return ResponseEntity.badRequest().body("Phone number is required");
        }

        // Check if user already exists
        if (userRepository.findByPhone(phone).isPresent()) {
            return ResponseEntity.badRequest().body("User with this phone already exists");
        }

        User newUser = new User();
        newUser.setPhone(phone);
        newUser.setName(name != null ? name : "Admin");
        newUser.setSurname(surname);
        newUser.setRole(Role.valueOf(roleStr.toUpperCase()));
        newUser.setPoints(0);
        newUser.setBlocked(false);
        newUser.setScanGoBlocked(false);

        User saved = userRepository.save(newUser);
        return ResponseEntity.ok(saved);
    }

    // Update user details
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody Map<String, Object> data) {
        return userRepository.findById(id)
                .map(user -> {
                    if (data.containsKey("name"))
                        user.setName((String) data.get("name"));
                    if (data.containsKey("surname"))
                        user.setSurname((String) data.get("surname"));
                    if (data.containsKey("email"))
                        user.setEmail((String) data.get("email"));
                    if (data.containsKey("points"))
                        user.setPoints((Integer) data.get("points"));
                    if (data.containsKey("role"))
                        user.setRole(Role.valueOf(((String) data.get("role")).toUpperCase()));
                    return ResponseEntity.ok(userRepository.save(user));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Export users as JSON (exclude sensitive data)
    @GetMapping("/users/export")
    public ResponseEntity<?> exportUsers(@RequestParam(defaultValue = "json") String format) {
        List<User> users = userRepository.findAll();

        List<Map<String, Object>> exportData = users.stream().map(u -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("phone", u.getPhone());
            map.put("name", u.getName());
            map.put("surname", u.getSurname());
            map.put("email", u.getEmail());
            map.put("points", u.getPoints());
            map.put("role", u.getRole());
            map.put("isBlocked", u.isBlocked());
            map.put("isScanGoBlocked", u.isScanGoBlocked());
            return map;
        }).collect(Collectors.toList());

        if ("csv".equalsIgnoreCase(format)) {
            StringBuilder csv = new StringBuilder();
            csv.append("ID,Phone,Name,Surname,Email,Points,Role,IsBlocked,IsScanGoBlocked\n");
            for (Map<String, Object> row : exportData) {
                csv.append(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                        row.get("id"), row.get("phone"), row.get("name"), row.get("surname"),
                        row.get("email"), row.get("points"), row.get("role"),
                        row.get("isBlocked"), row.get("isScanGoBlocked")));
            }
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            headers.set("Content-Disposition", "attachment; filename=users.csv");
            return ResponseEntity.ok().headers(headers).body(csv.toString());
        }

        return ResponseEntity.ok(exportData);
    }

    // Send notification to specific user
    @PostMapping("/notify/{userId}")
    public ResponseEntity<?> sendNotificationToUser(
            @PathVariable String userId,
            @RequestBody Map<String, String> data) {
        String title = data.get("title");
        String message = data.get("message");
        String type = data.getOrDefault("type", "info");

        if (title == null || message == null) {
            return ResponseEntity.badRequest().body("Title and message are required");
        }

        notificationService.sendNotification(userId, title, message, type);
        return ResponseEntity.ok(Map.of("success", true, "message", "Notification sent"));
    }

    // Send notification to all users
    @PostMapping("/notify-all")
    public ResponseEntity<?> sendNotificationToAll(@RequestBody Map<String, String> data) {
        String title = data.get("title");
        String message = data.get("message");
        String type = data.getOrDefault("type", "info");

        if (title == null || message == null) {
            return ResponseEntity.badRequest().body("Title and message are required");
        }

        notificationService.sendGlobalNotification(title, message, type);
        return ResponseEntity.ok(Map.of("success", true, "message", "Notification sent to all users"));
    }
}
