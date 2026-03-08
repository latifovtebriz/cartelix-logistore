package com.logistore.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "categories")
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;

    private String icon; // Emoji or icon name

    private String description;

    private int displayOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private Category parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private java.util.List<Category> subCategories = new java.util.ArrayList<>();

}
