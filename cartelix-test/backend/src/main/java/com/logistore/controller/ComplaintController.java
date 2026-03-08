package com.logistore.controller;

import com.logistore.model.Complaint;
import com.logistore.model.User;
import com.logistore.model.Product;
import com.logistore.repository.ComplaintRepository;
import com.logistore.repository.UserRepository;
import com.logistore.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    @Autowired
    private ComplaintRepository complaintRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ProductRepository productRepository;

    // Get all complaints (admin) with pagination - sorted by date desc
    @GetMapping
    public ResponseEntity<?> getComplaints(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        int pageSize = Math.min(size, 20);
        Page<Complaint> complaints = complaintRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, pageSize));
        
        // Enrich with user details
        List<Map<String, Object>> enrichedList = complaints.getContent().stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("userId", c.getUserId());
            map.put("userName", c.getUserName());
            map.put("subject", c.getSubject());
            map.put("description", c.getDescription());
            map.put("productId", c.getProductId());
            map.put("productName", c.getProductName());
            map.put("productBarcode", c.getProductBarcode());
            map.put("status", c.getStatus());
            map.put("createdAt", c.getCreatedAt());
            return map;
        }).toList();
        
        Map<String, Object> response = new HashMap<>();
        response.put("content", enrichedList);
        response.put("totalPages", complaints.getTotalPages());
        response.put("totalElements", complaints.getTotalElements());
        response.put("number", complaints.getNumber());
        
        return ResponseEntity.ok(response);
    }

    // Get complaints by user
    @GetMapping("/user/{userId}")
    public Page<Complaint> getComplaintsByUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        int pageSize = Math.min(size, 20);
        return complaintRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, pageSize));
    }

    // Create new complaint
    @PostMapping
    public ResponseEntity<?> createComplaint(@RequestBody Map<String, Object> data) {
        Complaint complaint = new Complaint();
        
        String userId = (String) data.get("userId");
        complaint.setUserId(userId);
        
        // Get user name
        if (userId != null) {
            userRepository.findById(userId).ifPresent(user -> {
                complaint.setUserName(user.getName() + (user.getSurname() != null ? " " + user.getSurname() : ""));
            });
        }
        
        complaint.setSubject((String) data.get("subject"));
        complaint.setDescription((String) data.get("description"));
        
        // Handle product reference
        if (data.containsKey("productId") && data.get("productId") != null) {
            Long productId = Long.valueOf(data.get("productId").toString());
            complaint.setProductId(productId);
            productRepository.findById(productId).ifPresent(product -> {
                complaint.setProductName(product.getName());
                complaint.setProductBarcode(product.getBarcode());
            });
        }
        
        complaint.setCreatedAt(LocalDateTime.now());
        complaint.setStatus(Complaint.ComplaintStatus.OPEN);
        
        return ResponseEntity.ok(complaintRepository.save(complaint));
    }

    // Admin resolve complaint
    @PatchMapping("/{id}/resolve")
    public ResponseEntity<?> resolveComplaint(@PathVariable Long id) {
        return complaintRepository.findById(id)
                .map(complaint -> {
                    complaint.setStatus(Complaint.ComplaintStatus.RESOLVED);
                    return ResponseEntity.ok(complaintRepository.save(complaint));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Admin update complaint status
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateComplaintStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return complaintRepository.findById(id)
                .map(complaint -> {
                    String status = body.get("status");
                    if (status != null) {
                        complaint.setStatus(Complaint.ComplaintStatus.valueOf(status.toUpperCase()));
                    }
                    return ResponseEntity.ok(complaintRepository.save(complaint));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete complaint
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteComplaint(@PathVariable Long id) {
        if (complaintRepository.existsById(id)) {
            complaintRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
