package com.logistore.service;

import com.logistore.model.Product;
import com.logistore.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private com.logistore.repository.CategoryRepository categoryRepository;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Autowired
    private SystemSettingService systemSettingService;

    public List<String> getAllDistinctCategories() {
        return categoryRepository.findAll().stream()
                .map(com.logistore.model.Category::getName)
                .toList();
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }

    public Optional<Product> getProductByBarcode(String barcode) {
        return productRepository.findByBarcode(barcode);
    }

    public Product saveProduct(Product product) {
        Product saved = productRepository.save(product);
        messagingTemplate.convertAndSend("/topic/products", saved);
        return saved;
    }

    public void deleteProduct(Long id) {
        try {
            productRepository.deleteById(id);
            messagingTemplate.convertAndSend("/topic/products", "{\"deletedId\": " + id + "}");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Bu məhsul istifadə olunub (Qəbzlərdə və ya Stokda mövcuddur) və silinə bilməz.");
        }
    }

    @Autowired
    private com.logistore.repository.MarketInventoryRepository marketInventoryRepository;

    public org.springframework.data.domain.Page<Product> searchProducts(String searchTerm, Double minPrice,
            Double maxPrice, String categoryName, String tags, Long marketId, Boolean onlyDiscounted,
            String userId, org.springframework.data.domain.Pageable pageable) {

        // 1. Resolve Category Hierarchy if categoryName is provided
        List<com.logistore.model.Category> categoriesToFilter = new ArrayList<>();
        if (categoryName != null && !categoryName.isEmpty() && !categoryName.equals("all")) {
            categoryRepository.findByName(categoryName).ifPresent(parent -> {
                categoriesToFilter.add(parent);
                categoriesToFilter.addAll(parent.getSubCategories());
            });
        }

        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (searchTerm != null && !searchTerm.isEmpty()) {
                String lowerTerm = searchTerm.toLowerCase();
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), "%" + lowerTerm + "%");
                Predicate barcodeMatch = cb.like(root.get("barcode"), "%" + lowerTerm + "%");
                Predicate brandMatch = cb.like(cb.lower(root.get("brand")), "%" + lowerTerm + "%");
                predicates.add(cb.or(nameMatch, barcodeMatch, brandMatch));
            }

            if (minPrice != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            if (maxPrice != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));

            // Category Filter (check against list of parent + children)
            if (!categoriesToFilter.isEmpty()) {
                predicates.add(root.get("category").in(categoriesToFilter));
            }

            if (tags != null && !tags.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("healthTags")), "%" + tags.toLowerCase() + "%"));
            }

            if (Boolean.TRUE.equals(onlyDiscounted)) {
                predicates.add(cb.isTrue(root.get("isDiscount")));
            }

            // Filter out products with 0 stock for customer views (userId provided)
            if (userId != null && !userId.isEmpty()) {
                predicates.add(cb.greaterThan(root.get("stockQuantity"), 0));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // Use MarketInventory context if marketId is present
        if (marketId != null) {
            Specification<com.logistore.model.MarketInventory> invSpec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                predicates.add(cb.equal(root.get("market").get("id"), marketId));
                predicates.add(cb.greaterThan(root.get("quantity"), 0));

                jakarta.persistence.criteria.Join<com.logistore.model.MarketInventory, Product> productJoin = root
                        .join("product");

                if (searchTerm != null && !searchTerm.isEmpty()) {
                    String lowerTerm = searchTerm.toLowerCase();
                    predicates.add(cb.or(
                            cb.like(cb.lower(productJoin.get("name")), "%" + lowerTerm + "%"),
                            cb.like(productJoin.get("barcode"), "%" + lowerTerm + "%")));
                }

                if (minPrice != null)
                    predicates.add(cb.greaterThanOrEqualTo(root.get("localPrice"), minPrice));
                if (maxPrice != null)
                    predicates.add(cb.lessThanOrEqualTo(root.get("localPrice"), maxPrice));

                if (!categoriesToFilter.isEmpty()) {
                    predicates.add(productJoin.get("category").in(categoriesToFilter));
                }

                return cb.and(predicates.toArray(new Predicate[0]));
            };

            Page<com.logistore.model.MarketInventory> invPage = marketInventoryRepository.findAll(invSpec, pageable);
            return invPage.map(mi -> {
                Product p = mi.getProduct();
                p.setPrice(mi.getLocalPrice());
                p.setStockQuantity(mi.getQuantity());
                return p;
            });
        }

        return productRepository.findAll(spec, pageable);
    }

    // ... normalizeString ...

    @Autowired
    private com.logistore.repository.UserRepository userRepository;

    public List<Product> getRecommendations(String userId) {
        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty())
            return productRepository.findAll().stream().limit(5).toList();

        var user = userOpt.get();
        var purchaseHistory = user.getPurchaseHistory(); // List of Product IDs

        if (purchaseHistory == null || purchaseHistory.isEmpty())
            return java.util.Collections.emptyList();

        var purchasedProducts = productRepository.findAllById(purchaseHistory);

        // Extract Categories (Entities)
        var purchasedCategories = purchasedProducts.stream()
                .map(Product::getCategory) // Now returns Category object
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        if (purchasedCategories.isEmpty())
            return productRepository.findAll().stream().limit(5).toList();

        var purchasedIds = new java.util.HashSet<>(purchaseHistory);

        return productRepository.findAll().stream()
                .filter(p -> purchasedCategories.contains(p.getCategory()))
                .filter(p -> !purchasedIds.contains(p.getId()))
                .limit(8)
                .toList();
    }

    public List<Product> getBestSellers() {
        // Mock Best Sellers: return first 10 products
        // In real app: query receipt_items -> group by product_id -> count -> sort
        return productRepository.findAll().stream().limit(10).toList();
    }

    @Autowired
    private DiscountService discountService;

    public Product enrichProductWithPrices(Product product, String userId) {
        // Reset transient fields
        product.setPersonalPrice(null);
        product.setHasPersonalDiscount(false);
        product.setDiscountLabel(null);

        // 1. Base Price & Global Discount
        product.setGlobalDiscountPrice(product.getPrice());

        // If product has discount, ensure oldPrice is set properly
        if (product.isDiscount()) {
            if (product.getOldPrice() == null || product.getOldPrice() <= product.getPrice()) {
                // Calculate old price as 25% higher than current price
                double originalPrice = Math.round(product.getPrice() * 1.25 * 100.0) / 100.0;
                product.setOldPrice(originalPrice);
            }
            product.setOriginalPriceDisplay(product.getOldPrice());
        } else if (product.getOldPrice() != null && product.getOldPrice() > product.getPrice()) {
            product.setOriginalPriceDisplay(product.getOldPrice());
        } else {
            product.setOriginalPriceDisplay(product.getPrice());
        }

        // 2. Personal Discount Logic
        if (userId != null) {
            // A. Check for Admin-created Personal Discounts
            List<com.logistore.model.Discount> activeDiscounts = discountService.getActiveDiscounts();
            double bestPersonalPrice = product.getGlobalDiscountPrice();
            boolean foundPersonal = false;
            String label = null;

            for (com.logistore.model.Discount d : activeDiscounts) {
                if (d.appliesToUser(userId)) {
                    // Check if discount applies to this product
                    boolean appliesToProduct = false;
                    if (d.getTarget() == com.logistore.model.Discount.DiscountTarget.ALL_PRODUCTS) {
                        appliesToProduct = true;
                    } else if (d.getTarget() == com.logistore.model.Discount.DiscountTarget.SPECIFIC_PRODUCTS) {
                        appliesToProduct = d.getProducts().stream().anyMatch(p -> p.getId().equals(product.getId()));
                    } else if (d.getTarget() == com.logistore.model.Discount.DiscountTarget.SPECIFIC_CATEGORIES) {
                        // Check category match
                        if (product.getCategory() != null) {
                            appliesToProduct = d.getCategories().stream()
                                    .anyMatch(c -> c.getName().equals(product.getCategory().getName()));
                        }
                    }

                    if (appliesToProduct) {
                        double discounted = product.getGlobalDiscountPrice();
                        if (d.getType() == com.logistore.model.Discount.DiscountType.PERCENTAGE) {
                            discounted = discounted * (1.0 - d.getValue() / 100.0);
                        } else if (d.getType() == com.logistore.model.Discount.DiscountType.FIXED_AMOUNT) {
                            discounted = Math.max(0, discounted - d.getValue());
                        }

                        // Keep the best (lowest) price
                        if (discounted < bestPersonalPrice) {
                            bestPersonalPrice = discounted;
                            foundPersonal = true;
                            label = d.getName(); // Use discount name as label
                        }
                    }
                }
            }

            if (foundPersonal) {
                bestPersonalPrice = Math.round(bestPersonalPrice * 100.0) / 100.0;
                if (bestPersonalPrice < product.getGlobalDiscountPrice()) {
                    product.setPersonalPrice(bestPersonalPrice);
                    product.setHasPersonalDiscount(true);
                    product.setDiscountLabel(label != null ? label : "Sizə Özəl");
                }
            }

            // B. Loyalty Program Fallback (only if no specific personal discount found)
            if (!foundPersonal) {
                userRepository.findById(userId).ifPresent(user -> {
                    int threshold = systemSettingService.getInt("loyalty_points_threshold", 100);
                    double discountPercent = systemSettingService.getDouble("loyalty_discount_percent", 10.0);

                    if (user.getPoints() >= threshold) {
                        double factor = 1.0 - (discountPercent / 100.0);
                        double personal = product.getGlobalDiscountPrice() * factor;
                        // Round to 2 decimals
                        personal = Math.round(personal * 100.0) / 100.0;

                        if (personal > 0.01 && personal < product.getGlobalDiscountPrice()) {
                            product.setPersonalPrice(personal);
                            product.setHasPersonalDiscount(true);
                            product.setDiscountLabel("Sizə Özəl (Sadiqlik)");
                        }
                    }
                });
            }
        }

        return product;
    }
}
