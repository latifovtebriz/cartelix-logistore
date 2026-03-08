package com.logistore.service;

import com.logistore.model.User;
import com.logistore.model.Role;
import com.logistore.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * Login with phone and password
     */
    public User login(String phone, String password) {
        // Validate phone format
        if (!phone.matches("^(?:\\+994|0)\\d{9}$")) {
            throw new IllegalArgumentException("Invalid phone format");
        }

        // Find user by phone
        // Find user by phone (Try exact match first)
        Optional<User> userOpt = userRepository.findByPhone(phone);

        // If not found, try alternative format
        if (userOpt.isEmpty()) {
            String altPhone;
            if (phone.startsWith("+994")) {
                // Convert +99450... to 050...
                altPhone = "0" + phone.substring(4);
            } else {
                // Convert 050... to +99450...
                altPhone = "+994" + phone.substring(1);
            }
            userOpt = userRepository.findByPhone(altPhone);
        }

        if (userOpt.isEmpty()) {
            System.out.println("LOGIN FAILED: User not found for phone: " + phone);
            throw new IllegalArgumentException("User not found. Please sign up first.");
        }

        User user = userOpt.get();

        // Check password
        if (user.getPasswordHash() == null || user.getPasswordHash().isEmpty()) {
            throw new IllegalArgumentException("Account has no password set. Please contact support.");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid password");
        }

        return user;
    }

    /**
     * Sign up new user with phone, name, and password
     */
    public User signUp(String phone, String name, String surname, String email, String password,
            java.time.LocalDate dob) {
        // Validate phone format
        if (!phone.matches("^(?:\\+994|0)\\d{9}$")) {
            throw new IllegalArgumentException("Invalid phone format");
        }

        // Check if user already exists
        if (userRepository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException("User already exists with this phone number");
        }

        // Validate password
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        // Create new user
        User newUser = new User();
        newUser.setPhone(phone);
        newUser.setName(name);
        newUser.setSurname(surname);
        newUser.setEmail(email);
        newUser.setBirthDate(dob);
        newUser.setPasswordHash(passwordEncoder.encode(password));
        newUser.setPoints(0);
        newUser.setBarcode(String.valueOf((long) (Math.random() * 9000000000L) + 1000000000L));
        newUser.setRole(Role.USER);
        newUser.setBlocked(false);
        newUser.setScanGoBlocked(false);

        return userRepository.save(newUser);
    }

    /**
     * Change password
     */
    public void changePassword(String userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void logout() {
        // Handle logout - clear session if needed
    }
}
