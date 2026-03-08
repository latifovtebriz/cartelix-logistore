package com.logistore.service;

import com.logistore.model.Product;
import com.logistore.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;

@Service
public class InventoryService {

    @Autowired
    private ProductRepository productRepository;

    /**
     * Stok azalt - transaction parent tərəfindən idarə olunur
     */
    public void decreaseStock(Long productId, int quantity) {
        try {
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            if (product.getStockQuantity() < quantity) {
                throw new RuntimeException("Stok tükəndi: " + product.getName());
            }

            product.setStockQuantity(product.getStockQuantity() - quantity);
            productRepository.save(product);
        } catch (OptimisticLockingFailureException e) {
            // Retry logic could be added here, but for now we fail fast
            throw new RuntimeException("Stok tükəndi, səhifəni yeniləyin (Concurrency Error)");
        }
    }
}
