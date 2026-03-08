package com.logistore.controller;

import com.logistore.model.User;
import com.logistore.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    // In a real app, get ID from SecurityContext
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                return ResponseEntity.status(401).build();
            }

            Object principal = auth.getPrincipal(); // Check type safely
            String phone;
            if (principal instanceof String) {
                phone = (String) principal;
            } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                phone = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
            } else {
                System.err.println("Unknown principal type: " + principal.getClass().getName());
                return ResponseEntity.status(500).body("Internal Auth Error: Unknown Principal");
            }

            if ("user".equals(phone)) {
                return ResponseEntity.notFound().build();
            }

            return userService.getUserByPhone(phone)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            e.printStackTrace(); // Log the error!
            return ResponseEntity.status(500).body("Internal Error: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        return userService.getUserById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable String id, @RequestBody User user) {
        User updated = userService.updateUser(id, user);
        return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
    }
}
