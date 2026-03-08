package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String phone;

    @Column(unique = true)
    private String email;

    private String passwordHash;
    private String lastOtp;

    private String name;
    private String surname;
    @Column(name = "dob")
    private LocalDate birthDate;

    private int points;

    @Enumerated(EnumType.STRING)
    private Role role;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Receipt> receipts = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<UserChallenge> challenges = new java.util.ArrayList<>();

    @ElementCollection
    private List<Long> purchaseHistory = new java.util.ArrayList<>(); // Product IDs

    private String barcode;

    // Market ID for cashiers - links cashier to a specific store
    private Long marketId;

    @Column(columnDefinition = "boolean default false")
    private Boolean scanGoBlocked = false;

    // Explicit Getters/Setters for barcode if Lombok misses it (though @Data
    // handles it, explicit is safe)
    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    // Also ensuring role, points etc are present as they were missing in lint
    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public int getPoints() {
        return points;
    }

    public void setPoints(int points) {
        this.points = points;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSurname() {
        return surname;
    }

    public void setSurname(String surname) {
        this.surname = surname;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    // Setter for String date parsing utility if needed
    public void setBirthDate(String date) {
        if (date != null && !date.isEmpty()) {
            this.birthDate = LocalDate.parse(date);
        }
    }

    public void setBirthDate(LocalDate date) {
        this.birthDate = date;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("isScanGoBlocked")
    public Boolean isScanGoBlocked() {
        return scanGoBlocked != null ? scanGoBlocked : false;
    }

    public void setScanGoBlocked(Boolean blocked) {
        this.scanGoBlocked = blocked;
    }

    @Column(columnDefinition = "boolean default false")
    private Boolean blocked = false;

    @com.fasterxml.jackson.annotation.JsonProperty("isBlocked")
    public Boolean isBlocked() {
        return blocked != null ? blocked : false;
    }

    public void setBlocked(Boolean blocked) {
        this.blocked = blocked;
    }
}
