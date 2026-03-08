package com.logistore.controller;

import com.logistore.model.Product;
import com.logistore.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private com.logistore.repository.CategoryRepository categoryRepository;

    @GetMapping
    public List<Product> getAllProducts(@RequestParam(required = false) String userId) {
        List<Product> products = productService.getAllProducts();
        products.forEach(p -> productService.enrichProductWithPrices(p, userId));
        return products;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id,
            @RequestParam(required = false) String userId) {
        return productService.getProductById(id)
                .map(p -> productService.enrichProductWithPrices(p, userId))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public org.springframework.data.domain.Page<Product> searchProducts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) Long marketId,
            @RequestParam(required = false) Boolean onlyDiscounted,
            @RequestParam(required = false) String userId,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Product> page = productService.searchProducts(q, minPrice, maxPrice,
                category, tags, marketId, onlyDiscounted, userId, pageable);
        page.getContent().forEach(p -> productService.enrichProductWithPrices(p, userId));
        return page;
    }

    @GetMapping("/recommendations")
    public List<Product> getRecommendations(@RequestParam String userId) {
        List<Product> products = productService.getRecommendations(userId);
        products.forEach(p -> productService.enrichProductWithPrices(p, userId));
        return products;
    }

    @GetMapping("/bestsellers")
    public List<Product> getBestSellers(@RequestParam(required = false) String userId) {
        List<Product> products = productService.getBestSellers();
        products.forEach(p -> productService.enrichProductWithPrices(p, userId));
        return products;
    }

    @Autowired
    private com.logistore.repository.UserRepository userRepository;

    @GetMapping("/barcode/{barcode}")
    public ResponseEntity<?> getByBarcode(@PathVariable String barcode, @RequestParam(required = false) String userId) {
        if (userId != null) {
            com.logistore.model.User user = userRepository.findById(userId).orElse(null);
            if (user != null && user.isScanGoBlocked()) {
                return ResponseEntity.status(403).body("Sizin Scan & Go icazəniz bloklanıb.");
            }
        }

        return productService.getProductByBarcode(barcode)
                .map(p -> {
                    productService.enrichProductWithPrices(p, userId);
                    return ResponseEntity.ok(p);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Autowired
    private com.logistore.service.GeminiService geminiService;

    @Autowired
    private com.logistore.service.FileStorageService fileStorageService;

    @PostMapping("/{id}/analyze-health")
    public ResponseEntity<String> analyzeHealth(@PathVariable Long id) {
        return productService.getProductById(id)
                .map(product -> ResponseEntity.ok(geminiService.analyzeProductHealth(product)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<String> uploadProductImage(@PathVariable Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        return productService.getProductById(id)
                .map(product -> {
                    String fileName = fileStorageService.storeFile(file);
                    // Update product image URL in DB (assuming setter exists)
                    // product.setImageUrl("/api/products/images/" + fileName);
                    // productService.save(product); // Need to expose save method or update via
                    // service
                    return ResponseEntity.ok("/api/products/images/" + fileName);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Product> createProduct(
            @RequestParam("name") String name,
            @RequestParam("price") Double price,
            @RequestParam("description") String description,
            @RequestParam("stockQuantity") int stockQuantity,
            @RequestParam("category") String categoryName,
            @RequestParam("barcode") String barcode,
            @RequestParam(value = "image", required = false) org.springframework.web.multipart.MultipartFile image) {

        Product product = new Product();
        product.setName(name);
        product.setPrice(price);
        product.setDescription(description);
        product.setStockQuantity(stockQuantity);

        // Lookup Category by name and set it
        categoryRepository.findByName(categoryName).ifPresent(product::setCategory);

        product.setBarcode(barcode);

        if (image != null && !image.isEmpty()) {
            String fileName = fileStorageService.storeFile(image);
            product.setImageUrl("/api/products/images/" + fileName);
        }

        return ResponseEntity.ok(productService.saveProduct(product));
    }

    @GetMapping("/images/{fileName:.+}")
    public ResponseEntity<org.springframework.core.io.Resource> downloadFile(@PathVariable String fileName,
            jakarta.servlet.http.HttpServletRequest request) {
        org.springframework.core.io.Resource resource = fileStorageService.loadFileAsResource(fileName);

        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (java.io.IOException ex) {
            // logger.info("Could not determine file type.");
        }

        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id, @RequestBody Product productData) {
        return productService.getProductById(id)
                .map(product -> {
                    if (productData.getName() != null)
                        product.setName(productData.getName());
                    if (productData.getPrice() != 0)
                        product.setPrice(productData.getPrice());
                    if (productData.getDescription() != null)
                        product.setDescription(productData.getDescription());
                    if (productData.getCategory() != null)
                        product.setCategory(productData.getCategory());
                    if (productData.getStockQuantity() != 0)
                        product.setStockQuantity(productData.getStockQuantity());
                    if (productData.getBarcode() != null)
                        product.setBarcode(productData.getBarcode());
                    if (productData.getImageUrl() != null)
                        product.setImageUrl(productData.getImageUrl());
                    return ResponseEntity.ok(productService.saveProduct(product));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        return productService.getProductById(id)
                .map(product -> {
                    productService.deleteProduct(id);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/global-discount")
    public ResponseEntity<String> applyGlobalDiscount(@RequestParam double percentage) {
        List<Product> products = productService.getAllProducts();
        for (Product product : products) {
            double oldPrice = product.getPrice();
            double newPrice = oldPrice - (oldPrice * percentage / 100.0);
            // Round to 2 decimal places
            newPrice = Math.round(newPrice * 100.0) / 100.0;

            product.setPrice(newPrice);
            product.setOldPrice(oldPrice);
            product.setDiscount(true);
            productService.saveProduct(product);
        }
        return ResponseEntity.ok("Global discount applied to " + products.size() + " products.");
    }
}
