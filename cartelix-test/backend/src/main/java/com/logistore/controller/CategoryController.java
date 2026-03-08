package com.logistore.controller;

import com.logistore.model.Category;
import com.logistore.repository.CategoryRepository;
import com.logistore.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    @org.springframework.web.bind.annotation.CrossOrigin(origins = "*")
    public List<com.logistore.dto.CategoryDTO> getAllCategories() {
        List<Category> categories = categoryRepository.findAllByOrderByDisplayOrderAsc();

        // Filter only root categories (where parent is null) to avoid duplication if
        // fetching all
        // OR if the repository returns everything, we need to handle the tree structure
        // manually or relies on the fact that we lazy load children
        // Actually, if we want the tree, we should find roots or map everything
        // carefully.
        // Assuming the repository returns flat list of all categories:

        // Better approach: Get all, then convert.
        // But if subCategories are fetched eagerly in Entity, we might have roots.
        // Let's stick to the previous behavior but map to DTO.

        return categories.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private com.logistore.dto.CategoryDTO convertToDTO(Category category) {
        com.logistore.dto.CategoryDTO dto = new com.logistore.dto.CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setIcon(category.getIcon());

        if (category.getParent() != null) {
            dto.setParentId(category.getParent().getId());
        }

        if (category.getSubCategories() != null) {
            dto.setSubCategories(category.getSubCategories().stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    /**
     * Get only categories that have products, with product count
     */
    @GetMapping("/active")
    public List<Map<String, Object>> getActiveCategories() {
        List<Category> allCategories = categoryRepository.findAllByOrderByDisplayOrderAsc();

        return allCategories.stream()
                .map(cat -> {
                    long count = productRepository.countByCategory_Name(cat.getName());
                    Map<String, Object> result = new HashMap<>();
                    result.put("id", cat.getId());
                    result.put("name", cat.getName());
                    result.put("icon", cat.getIcon());
                    result.put("displayOrder", cat.getDisplayOrder());
                    result.put("productCount", count);
                    return result;
                })
                .filter(map -> (Long) map.get("productCount") > 0)
                .collect(Collectors.toList());
    }
}
