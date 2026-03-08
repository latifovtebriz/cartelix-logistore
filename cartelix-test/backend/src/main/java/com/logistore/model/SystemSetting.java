package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "system_settings")
public class SystemSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String settingKey;

    @Column(nullable = false)
    private String settingValue;

    private String description;

    // "INTEGER", "DOUBLE", "STRING", "BOOLEAN"
    private String type;
}
