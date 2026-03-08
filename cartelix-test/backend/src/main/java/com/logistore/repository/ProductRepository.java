package com.logistore.repository;

import com.logistore.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    List<Product> findByCategory_Name(String categoryName);

    List<Product> findByNameContainingIgnoreCase(String name);

    // Dynamic Top Selling from Products table
    List<Product> findTop5ByOrderBySoldCountDesc();

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p.category.name FROM Product p")
    List<String> findDistinctCategories();

    long countByCategory_Name(String categoryName);

    java.util.Optional<Product> findByBarcode(String barcode);
}
