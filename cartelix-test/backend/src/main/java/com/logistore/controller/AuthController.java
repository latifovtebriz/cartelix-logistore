package com.logistore.controller;

import com.logistore.model.User;
import com.logistore.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam String phone, @RequestParam String password) {
        try {
            User user = authService.login(phone, password);
            if (user.isBlocked()) {
                return ResponseEntity.status(403).body("Hesabınız bloklanıb.");
            }
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(
            @RequestParam String phone,
            @RequestParam String name,
            @RequestParam(required = false) String surname,
            @RequestParam(required = false) String email,
            @RequestParam String password,
            @RequestParam(required = false) String dob) {
        try {
            java.time.LocalDate birthDate = null;
            if (dob != null && !dob.isEmpty()) {
                birthDate = java.time.LocalDate.parse(dob);
            }
            User user = authService.signUp(phone, name, surname, email, password, birthDate);
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestParam String userId,
            @RequestParam String oldPassword,
            @RequestParam String newPassword) {
        try {
            authService.changePassword(userId, oldPassword, newPassword);
            return ResponseEntity.ok("Password changed successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        authService.logout();
        return ResponseEntity.ok().build();
    }
}
