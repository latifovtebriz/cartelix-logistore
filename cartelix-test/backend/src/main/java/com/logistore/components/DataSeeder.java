package com.logistore.components;

import com.logistore.model.*;
import com.logistore.repository.*;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.sql.Connection;
import java.sql.Statement;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import com.logistore.service.SystemSettingService;
import org.springframework.beans.factory.annotation.Autowired;
import javax.sql.DataSource;

@Component
public class DataSeeder implements CommandLineRunner {

        private final UserRepository userRepository;
        private final ProductRepository productRepository;
        private final MarketRepository marketRepository;
        private final MarketInventoryRepository marketInventoryRepository;
        private final ReviewRepository reviewRepository;
        private final ReceiptRepository receiptRepository;
        private final ComplaintRepository complaintRepository;
        private final PromoCodeRepository promoCodeRepository;
        private final UserChallengeRepository userChallengeRepository;
        private final CategoryRepository categoryRepository;
        private final PromoCodeUsageRepository promoCodeUsageRepository;

        @Autowired
        private SystemSettingService systemSettingService;

        @Autowired
        private DataSource dataSource;

        private final Random random = new Random();
        private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        public DataSeeder(UserRepository userRepository,
                        ProductRepository productRepository,
                        MarketRepository marketRepository,
                        MarketInventoryRepository marketInventoryRepository,
                        ReviewRepository reviewRepository,
                        ReceiptRepository receiptRepository,
                        ComplaintRepository complaintRepository,
                        PromoCodeRepository promoCodeRepository,
                        UserChallengeRepository userChallengeRepository,
                        CategoryRepository categoryRepository,
                        PromoCodeUsageRepository promoCodeUsageRepository) {
                this.userRepository = userRepository;
                this.productRepository = productRepository;
                this.marketRepository = marketRepository;
                this.marketInventoryRepository = marketInventoryRepository;
                this.reviewRepository = reviewRepository;
                this.receiptRepository = receiptRepository;
                this.complaintRepository = complaintRepository;
                this.promoCodeRepository = promoCodeRepository;
                this.userChallengeRepository = userChallengeRepository;
                this.categoryRepository = categoryRepository;
                this.promoCodeUsageRepository = promoCodeUsageRepository;
        }

        @Override
        public void run(String... args) throws Exception {
                // 0. Fix MySQL column types that ddl-auto=update won't resize
                fixEnumColumns();

                // 1. Standard Seed (only if empty)
                if (userRepository.count() == 0 || productRepository.count() == 0) {
                        System.out.println("Empty database detected. Starting initial data seeding...");
                        try {
                                seedCategories();
                                seedSettings();
                                List<Market> markets = seedMarkets();
                                List<Product> products = seedProducts();
                                seedInventory(markets, products);
                                seedUsers(products);
                                seedPromoCodes();
                                seedPhysicalReceipts(markets, products);
                        } catch (Exception e) {
                                System.out.println("CRITICAL SEEDING ERROR: " + e.getMessage());
                                e.printStackTrace();
                        }
                }

                // 2. Demo User Data Check & Re-seed (each step independent)
                String demoPhone = "0504350284";
                User demoUser = null;
                try {
                        Optional<User> demoUserOpt = userRepository.findByPhone(demoPhone);
                        if (demoUserOpt.isPresent()) {
                                demoUser = demoUserOpt.get();
                        } else {
                                System.out.println("Demo user missing. Creating...");
                                List<Product> products = productRepository.findAll();
                                if (!products.isEmpty()) {
                                        User demo = new User();
                                        demo.setName("Demo User (0504350284)");
                                        demo.setPhone(demoPhone);
                                        demo.setPoints(550);
                                        demo.setPasswordHash(passwordEncoder.encode("123456"));
                                        demo.setRole(Role.USER);
                                        demo.setBarcode(demoPhone);
                                        demoUser = userRepository.save(demo);
                                }
                        }
                } catch (Exception e) {
                        System.out.println("Error finding/creating demo user: " + e.getMessage());
                }

                if (demoUser != null) {
                        List<Product> products = productRepository.findAll();

                        // Step A: Seed receipts + reviews + complaints
                        try {
                                if (receiptRepository.countByUser(demoUser) < 5) {
                                        System.out.println("Re-seeding receipts/reviews/complaints for demo user...");
                                        seedRecentHistory(demoUser, products);
                                        System.out.println("Receipts/reviews/complaints seeded OK.");
                                } else {
                                        System.out.println("Demo user already has enough receipts ("
                                                        + receiptRepository.countByUser(demoUser) + ").");
                                }
                        } catch (Exception e) {
                                System.out.println("ERROR seeding receipts: " + e.getMessage());
                                e.printStackTrace();
                                try (java.io.PrintWriter pw = new java.io.PrintWriter(
                                                "C:\\Users\\zulfu\\seeder_error_2.txt")) {
                                        e.printStackTrace(pw);
                                } catch (Exception ignored) {
                                }
                        }

                        // Step B: Seed challenges (bonuses) - INDEPENDENT
                        try {
                                seedUserChallenges(demoUser);
                                System.out.println("Challenges seeded OK.");
                        } catch (Exception e) {
                                System.out.println("ERROR seeding challenges: " + e.getMessage());
                                e.printStackTrace();
                        }
                }

                System.out.println("Data seeding checks completed!");
        }

        private void fixEnumColumns() {
                String[] alterStatements = {
                                "ALTER TABLE receipts MODIFY COLUMN status VARCHAR(50)",
                                "ALTER TABLE receipts MODIFY COLUMN type VARCHAR(50)",
                                "ALTER TABLE complaints MODIFY COLUMN status VARCHAR(50)",
                                "ALTER TABLE user_challenges MODIFY COLUMN discount_type VARCHAR(50)",
                                // Fix for 'Field store_id doesn't have a default value' error
                                "ALTER TABLE receipts DROP COLUMN store_id",
                                // Fix for 'Field line_total doesn't have a default value' error
                                "ALTER TABLE receipt_items DROP COLUMN line_total",
                                // Fix for 'Field unit_price doesn't have a default value' error
                                "ALTER TABLE receipt_items DROP COLUMN unit_price"
                };
                try (Connection conn = dataSource.getConnection();
                                Statement stmt = conn.createStatement()) {
                        System.out.println("Fixing DB schema (enums, legacy columns)...");
                        for (String sql : alterStatements) {
                                try {
                                        stmt.executeUpdate(sql);
                                        System.out.println("OK: " + sql);
                                } catch (Exception e) {
                                        // Ignore 'check that column/key exists' errors for DROP
                                        System.out.println("SKIP: " + sql + " -> " + e.getMessage());
                                }
                        }
                } catch (Exception e) {
                        System.out.println("fixEnumColumns error (non-fatal): " + e.getMessage());
                }
        }

        private void cleanDatabase() {
                System.out.println("Cleaning database...");
                promoCodeUsageRepository.deleteAll();
                userChallengeRepository.deleteAll();
                reviewRepository.deleteAll();
                complaintRepository.deleteAll();
                marketInventoryRepository.deleteAll();
                // Receipt items are cascaded usually but better safe
                // receiptRepository.deleteAll(); // Might need to delete items first if no
                // cascade
                // Manual cleanup if needed, assuming cascade works for now or order matters
                receiptRepository.deleteAll();
                promoCodeRepository.deleteAll();
                userRepository.deleteAll();
                productRepository.deleteAll();
                marketRepository.deleteAll();
                categoryRepository.deleteAll();
                // Settings are kept usually or checked in seedSettings
                System.out.println("Database cleaned.");
        }

        private void seedSettings() {
                systemSettingService.createSettingIfMissing("loyalty_points_threshold", "0",
                                "Loyallıq endirimi üçün tələb olunan minimum xal", "INTEGER");
                systemSettingService.createSettingIfMissing("loyalty_discount_percent", "10", "Loyallıq endirimi faizi",
                                "DOUBLE");
        }

        private void seedCategories() {
                if (categoryRepository.count() > 0)
                        return;

                Map<String, List<String>> hierarchy = new LinkedHashMap<>();
                hierarchy.put("Meyvə və Tərəvəz", List.of("Meyvə", "Tərəvəz"));
                hierarchy.put("Süd və Ağartı Məhsulları", List.of("Süd", "Pendir", "Kərə Yağı", "Qatıq və Digər"));
                hierarchy.put("Çörək və Un Məmulatları", List.of("Çörək", "Un", "Makaron"));
                hierarchy.put("Ət və Ət Məhsulları", List.of("Ət", "Toyuq", "Kolbasa və Sosiska"));
                hierarchy.put("Baqqaliyyə və Ərzaq", List.of("Düyü və Paxlalılar", "Yağlar", "Souslar"));
                hierarchy.put("İçkilər", List.of("Qazlı Sular", "Meyvə Şirələri", "Çay və Qəhvə", "Enerji İçkiləri"));
                hierarchy.put("Şirniyyat və Qəlyanaltı", List.of("Şokolad", "Çips və Çərəz", "Quru Meyvə"));
                hierarchy.put("Təmizlik və Gigiyena", List.of("Təmizlik", "Gigiyena"));

                Map<String, String> parentIcons = Map.of(
                                "Meyvə və Tərəvəz", "🍎",
                                "Süd və Ağartı Məhsulları", "🥛",
                                "Çörək və Un Məmulatları", "🍞",
                                "Ət və Ət Məhsulları", "🥩",
                                "Baqqaliyyə və Ərzaq", "🛒",
                                "İçkilər", "🥤",
                                "Şirniyyat və Qəlyanaltı", "🍬",
                                "Təmizlik və Gigiyena", "🧼");

                int parentOrder = 1;
                for (Map.Entry<String, List<String>> entry : hierarchy.entrySet()) {
                        Category parent = new Category();
                        parent.setName(entry.getKey());
                        parent.setIcon(parentIcons.getOrDefault(entry.getKey(), "📦"));
                        parent.setDisplayOrder(parentOrder++);
                        parent = categoryRepository.save(parent);

                        int subOrder = 1;
                        for (String subName : entry.getValue()) {
                                Category sub = new Category();
                                sub.setName(subName);
                                sub.setIcon("🔹"); // Default sub icon
                                sub.setDisplayOrder(subOrder++);
                                sub.setParent(parent);
                                categoryRepository.save(sub);
                        }
                }
        }

        private List<Market> seedMarkets() {
                if (marketRepository.count() > 0)
                        return marketRepository.findAll();

                List<Market> markets = new ArrayList<>();
                String[] locations = { "Yasamal", "Gənclik", "28 May", "Nərimanov", "Xətai" };
                for (int i = 0; i < locations.length; i++) {
                        Market m = new Market();
                        m.setName("LogiStore - " + locations[i]);
                        m.setLocation("Bakı ş., " + locations[i]);
                        m.setPosDeviceCode("POS_" + (100 + i));
                        markets.add(marketRepository.save(m));
                }
                return markets;
        }

        // Helper class for seeding
        static class SeedItem {
                String category; // Subcategory basically or broad mapping
                String name;
                String image;
                double price;
                String unit;
                String tags;

                public SeedItem(String cat, String n, String img, double p, String u, String t) {
                        category = cat;
                        name = n;
                        image = img;
                        price = p;
                        unit = u;
                        tags = t;
                }
        }

        private List<Product> seedProducts() {
                if (productRepository.count() > 20)
                        return productRepository.findAll();

                List<SeedItem> items = new ArrayList<>();

                // Meyvə və Tərəvəz
                items.add(new SeedItem("Meyvə", "Qırmızı Alma",
                                "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.50, "KG", "vitamin,healthy"));
                items.add(new SeedItem("Meyvə", "Yaşıl Alma",
                                "https://images.pexels.com/photos/574919/pexels-photo-574919.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.60, "KG", "vitamin,diet"));
                items.add(new SeedItem("Meyvə", "Banan",
                                "https://images.pexels.com/photos/61127/pexels-photo-61127.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.40,
                                "KG", "potassium,fruit"));
                items.add(new SeedItem("Meyvə", "Portağal",
                                "https://images.pexels.com/photos/3299/postit-scrub-fruit-citrus.jpg?auto=compress&cs=tinysrgb&w=600",
                                2.20, "KG", "vitamin_c"));
                items.add(new SeedItem("Meyvə", "Mandarin",
                                "https://images.pexels.com/photos/2294477/pexels-photo-2294477.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.00, "KG", "sweet,citrus"));
                items.add(new SeedItem("Meyvə", "Limon",
                                "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.80, "KG", "sour,tea"));
                items.add(new SeedItem("Meyvə", "Çiyələk",
                                "https://images.pexels.com/photos/70746/strawberries-red-fruit-royalty-free-70746.jpeg?auto=compress&cs=tinysrgb&w=600",
                                5.00, "KG", "berry,sweet"));
                items.add(new SeedItem("Meyvə", "Qarpız",
                                "https://images.pexels.com/photos/1313267/pexels-photo-1313267.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.60, "KG", "summer"));
                items.add(new SeedItem("Meyvə", "Yemiş",
                                "https://images.pexels.com/photos/5946081/pexels-photo-5946081.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.80, "KG", "summer,sweet"));
                items.add(new SeedItem("Meyvə", "Üzüm (Qara)",
                                "https://images.pexels.com/photos/708777/pexels-photo-708777.jpeg?auto=compress&cs=tinysrgb&w=600",
                                3.00, "KG", "fruit"));
                items.add(new SeedItem("Meyvə", "Üzüm (Yaşıl)",
                                "https://images.pexels.com/photos/60021/grapes-wine-fruit-vines-60021.jpeg?auto=compress&cs=tinysrgb&w=600",
                                3.20, "KG", "fruit"));
                items.add(new SeedItem("Meyvə", "Armud",
                                "https://images.pexels.com/photos/568471/pexels-photo-568471.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.50, "KG", "fruit"));
                items.add(new SeedItem("Meyvə", "Şaftalı",
                                "https://images.pexels.com/photos/1268122/pexels-photo-1268122.jpeg?auto=compress&cs=tinysrgb&w=600",
                                3.50, "KG", "soft"));
                items.add(new SeedItem("Meyvə", "Albalı",
                                "https://images.pexels.com/photos/109274/pexels-photo-109274.jpeg?auto=compress&cs=tinysrgb&w=600",
                                4.00, "KG", "berry"));
                items.add(new SeedItem("Meyvə", "Nar",
                                "https://images.pexels.com/photos/65256/pomegranate-open-kernels-fruit-65256.jpeg?auto=compress&cs=tinysrgb&w=600",
                                3.00, "KG", "fruit,red"));
                items.add(new SeedItem("Meyvə", "Kivi",
                                "https://images.pexels.com/photos/51312/kiwi-fruit-vitamins-healthy-eating-51312.jpeg?auto=compress&cs=tinysrgb&w=600",
                                4.50, "KG", "vitamin"));
                items.add(new SeedItem("Meyvə", "Ananas",
                                "https://images.pexels.com/photos/947879/pexels-photo-947879.jpeg?auto=compress&cs=tinysrgb&w=600",
                                6.00, "COUNT", "tropical"));
                items.add(new SeedItem("Meyvə", "Avokado",
                                "https://images.pexels.com/photos/557659/pexels-photo-557659.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.50, "COUNT", "healthy,fat"));
                items.add(new SeedItem("Tərəvəz", "Pomidor",
                                "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.80, "KG", "salad"));
                items.add(new SeedItem("Tərəvəz", "Xiyar",
                                "https://images.pexels.com/photos/2329440/pexels-photo-2329440.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.40, "KG", "salad,fresh"));
                items.add(new SeedItem("Tərəvəz", "Kartof",
                                "https://images.pexels.com/photos/144248/potatoes-vegetables-food-agriculture-144248.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.90, "KG", "basic"));
                items.add(new SeedItem("Tərəvəz", "Soğan",
                                "https://images.pexels.com/photos/533342/pexels-photo-533342.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.70, "KG", "basic"));
                items.add(new SeedItem("Tərəvəz", "Sarımsaq",
                                "https://images.pexels.com/photos/928251/pexels-photo-928251.jpeg?auto=compress&cs=tinysrgb&w=600",
                                5.00, "KG", "spice"));
                items.add(new SeedItem("Tərəvəz", "Kök",
                                "https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.00, "KG", "carrot"));
                items.add(new SeedItem("Tərəvəz", "Kələm",
                                "https://images.pexels.com/photos/2518893/pexels-photo-2518893.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.50, "KG", "green"));
                items.add(new SeedItem("Tərəvəz", "Brokoli",
                                "https://images.pexels.com/photos/47347/broccoli-vegetable-food-healthy-47347.jpeg?auto=compress&cs=tinysrgb&w=600",
                                3.50, "KG", "green,healthy"));
                items.add(new SeedItem("Tərəvəz", "Bibər (Qırmızı)",
                                "https://images.pexels.com/photos/57497/berry-pepper-pepper-red-food-57497.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.80, "KG", "salad"));
                items.add(new SeedItem("Tərəvəz", "Badımcan",
                                "https://images.pexels.com/photos/321551/pexels-photo-321551.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.50, "KG", "vegetable"));
                items.add(new SeedItem("Tərəvəz", "Göbələk",
                                "https://images.pexels.com/photos/1374564/pexels-photo-1374564.jpeg?auto=compress&cs=tinysrgb&w=600",
                                4.00, "KG", "fungi"));
                items.add(new SeedItem("Tərəvəz", "Göyərti",
                                "https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.20, "COUNT", "fresh"));

                // Süd və Ağartı
                items.add(new SeedItem("Süd", "Süd (Şüşə) 1L",
                                "https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.90, "COUNT", "dairy"));
                items.add(new SeedItem("Qatıq və Digər", "Kənd Yumurtası (10 ədəd)",
                                "https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.50, "COUNT", "protein"));
                items.add(new SeedItem("Pendir", "Ağ Pendir",
                                "https://images.pexels.com/photos/4187778/pexels-photo-4187778.jpeg?auto=compress&cs=tinysrgb&w=600",
                                6.50, "KG", "cheese,breakfast"));
                items.add(new SeedItem("Pendir", "Holland Pendiri",
                                "https://images.pexels.com/photos/773253/pexels-photo-773253.jpeg?auto=compress&cs=tinysrgb&w=600",
                                12.00, "KG", "cheese,import"));
                items.add(new SeedItem("Kərə Yağı", "Kərə Yağı 200g",
                                "https://images.pexels.com/photos/531336/pexels-photo-531336.jpeg?auto=compress&cs=tinysrgb&w=600",
                                4.20, "COUNT", "butter,fat"));
                items.add(new SeedItem("Qatıq və Digər", "Xama",
                                "https://images.pexels.com/photos/1200669/pexels-photo-1200669.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.80, "COUNT", "dairy"));
                items.add(new SeedItem("Qatıq və Digər", "Yoqurt",
                                "https://images.pexels.com/photos/414262/pexels-photo-414262.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.80, "COUNT", "snack,dairy"));
                items.add(new SeedItem("Qatıq və Digər", "Kəsmik",
                                "https://images.pexels.com/photos/3522518/pexels-photo-3522518.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.20, "KG", "protein,dairy"));
                items.add(new SeedItem("Qatıq və Digər", "Dondurma (Külah)",
                                "https://images.pexels.com/photos/1362534/pexels-photo-1362534.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.00, "COUNT", "sweet,icecream"));
                items.add(new SeedItem("Süd", "Qatılaşdırılmış süd",
                                "https://images.pexels.com/photos/306803/pexels-photo-306803.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.00, "COUNT", "sweet,milk"));

                // Çörək və Un
                items.add(new SeedItem("Çörək", "Ağ Çörək",
                                "https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.65, "COUNT", "bread,gluten"));
                items.add(new SeedItem("Çörək", "Qara Çörək",
                                "https://images.pexels.com/photos/209403/pexels-photo-209403.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.80, "COUNT", "bread,diet"));
                items.add(new SeedItem("Çörək", "Bulka",
                                "https://images.pexels.com/photos/89778/strawberries-frisch-ripe-sweet-89778.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.40, "COUNT", "sweet"));
                items.add(new SeedItem("Çörək", "Kruasan",
                                "https://images.pexels.com/photos/3724/food-morning-breakfast-orange-juice.jpg?auto=compress&cs=tinysrgb&w=600",
                                1.20, "COUNT", "bakery"));
                items.add(new SeedItem("Un", "Un (Paket 1kg)",
                                "https://images.pexels.com/photos/5765/flour-powder.jpg?auto=compress&cs=tinysrgb&w=600",
                                1.40, "COUNT",
                                "baking"));
                items.add(new SeedItem("Makaron", "Spagetti 500g",
                                "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.50, "COUNT", "pasta"));
                items.add(new SeedItem("Makaron", "Makaron (Burma) 500g",
                                "https://images.pexels.com/photos/1487511/pexels-photo-1487511.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.30, "COUNT", "pasta"));
                items.add(new SeedItem("Un", "Pizza xəmiri",
                                "https://images.pexels.com/photos/1653877/pexels-photo-1653877.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.00, "COUNT", "dough"));
                items.add(new SeedItem("Çörək", "Lavaş",
                                "https://images.pexels.com/photos/5737254/pexels-photo-5737254.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.50, "COUNT", "bread"));
                items.add(new SeedItem("Çörək", "Peçenye",
                                "https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.50, "KG", "cookies"));

                // Ət
                items.add(new SeedItem("Ət", "Mal əti (Çəkilmiş)",
                                "https://images.pexels.com/photos/65175/pexels-photo-65175.jpeg?auto=compress&cs=tinysrgb&w=600",
                                13.50,
                                "KG", "beef,red_meat"));
                items.add(new SeedItem("Toyuq", "Toyuq (Bütöv)",
                                "https://images.pexels.com/photos/2611917/pexels-photo-2611917.jpeg?auto=compress&cs=tinysrgb&w=600",
                                5.50, "KG", "chicken"));
                items.add(new SeedItem("Toyuq", "Toyuq filesi",
                                "https://images.pexels.com/photos/616353/pexels-photo-616353.jpeg?auto=compress&cs=tinysrgb&w=600",
                                7.80, "KG", "chicken,diet"));
                items.add(new SeedItem("Kolbasa və Sosiska", "Sosiska",
                                "https://images.pexels.com/photos/3023479/pexels-photo-3023479.jpeg?auto=compress&cs=tinysrgb&w=600",
                                8.00, "KG", "meat"));
                items.add(new SeedItem("Kolbasa və Sosiska", "Kolbasa (Dilimlənmiş)",
                                "https://images.pexels.com/photos/1927383/pexels-photo-1927383.jpeg?auto=compress&cs=tinysrgb&w=600",
                                15.00, "KG", "meat"));
                items.add(new SeedItem("Ət", "Balıq (Qızılbalıq)",
                                "https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?auto=compress&cs=tinysrgb&w=600",
                                22.00, "KG", "fish,omega"));
                items.add(new SeedItem("Ət", "Kabab əti",
                                "https://images.pexels.com/photos/410648/pexels-photo-410648.jpeg?auto=compress&cs=tinysrgb&w=600",
                                14.00, "KG", "bbq"));
                items.add(new SeedItem("Ət", "Steyk",
                                "https://images.pexels.com/photos/1251198/pexels-photo-1251198.jpeg?auto=compress&cs=tinysrgb&w=600",
                                25.00, "KG", "premium,beef"));

                // Baqqaliyyə
                items.add(new SeedItem("Düyü və Paxlalılar", "Düyü (Uzun)",
                                "https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=600",
                                3.00, "KG", "grain"));
                items.add(new SeedItem("Düyü və Paxlalılar", "Qarabaşaq (Greçka)",
                                "https://images.pexels.com/photos/6963574/pexels-photo-6963574.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.50, "KG", "grain"));
                items.add(new SeedItem("Düyü və Paxlalılar", "Mərci (Qırmızı)",
                                "https://images.pexels.com/photos/6963571/pexels-photo-6963571.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.80, "KG", "grain"));
                items.add(new SeedItem("Düyü və Paxlalılar", "Noxud",
                                "https://images.pexels.com/photos/37351/wool-fruit-produce-vegetables.jpg?auto=compress&cs=tinysrgb&w=600",
                                2.20, "KG", "grain"));
                items.add(new SeedItem("Düyü və Paxlalılar", "Lobya",
                                "https://images.pexels.com/photos/3696162/pexels-photo-3696162.jpeg?auto=compress&cs=tinysrgb&w=600",
                                3.20, "KG", "grain"));
                items.add(new SeedItem("Baqqaliyyə və Ərzaq", "Şəkər tozu",
                                "https://images.pexels.com/photos/6129048/pexels-photo-6129048.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.50, "KG", "sugar"));
                items.add(new SeedItem("Baqqaliyyə və Ərzaq", "Qənd",
                                "https://images.pexels.com/photos/1120464/pexels-photo-1120464.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.70, "KG", "sugar"));
                items.add(new SeedItem("Baqqaliyyə və Ərzaq", "Duz",
                                "https://images.pexels.com/photos/1109123/pexels-photo-1109123.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.50, "KG", "salt"));
                items.add(new SeedItem("Yağlar", "Zeytun yağı 500ml",
                                "https://images.pexels.com/photos/33525/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=600",
                                8.00, "COUNT", "oil,healthy"));
                items.add(new SeedItem("Yağlar", "Günəbaxan yağı 1L",
                                "https://images.pexels.com/photos/357743/pexels-photo-357743.jpeg?auto=compress&cs=tinysrgb&w=600",
                                3.50, "COUNT", "oil"));
                items.add(new SeedItem("Souslar", "Ketçup",
                                "https://images.pexels.com/photos/4016598/pexels-photo-4016598.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.80, "COUNT", "sauce"));
                items.add(new SeedItem("Souslar", "Mayonez",
                                "https://images.pexels.com/photos/2724391/pexels-photo-2724391.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.00, "COUNT", "sauce"));
                items.add(new SeedItem("Souslar", "Tomat pastası",
                                "https://images.pexels.com/photos/53121/tomato-paste-tomatoes-red-cooking-53121.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.90, "COUNT", "sauce,tomato"));

                // İçkilər
                items.add(new SeedItem("Qazlı Sular", "Qazlı su (Cola) 0.5L",
                                "https://images.pexels.com/photos/50593/cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.00, "COUNT", "soda"));
                items.add(new SeedItem("Qazlı Sular", "Qazsız Su 0.5L",
                                "https://images.pexels.com/photos/1000084/pexels-photo-1000084.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.50, "COUNT", "water"));
                items.add(new SeedItem("Qazlı Sular", "Mineral Su",
                                "https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.80, "COUNT", "water,mineral"));
                items.add(new SeedItem("Meyvə Şirələri", "Portağal şirəsi 1L",
                                "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.50, "COUNT", "juice"));
                items.add(new SeedItem("Meyvə Şirələri", "Alma şirəsi 1L",
                                "https://images.pexels.com/photos/39566/apple-juice-drink-fruit-juice-apple-39566.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.40, "COUNT", "juice"));
                items.add(new SeedItem("Qazlı Sular", "Limonad",
                                "https://images.pexels.com/photos/210906/pexels-photo-210906.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.20, "COUNT", "soda"));
                items.add(new SeedItem("Çay və Qəhvə", "Çay (Qara, quru)",
                                "https://images.pexels.com/photos/905485/pexels-photo-905485.jpeg?auto=compress&cs=tinysrgb&w=600",
                                4.00, "COUNT", "tea"));
                items.add(new SeedItem("Çay və Qəhvə", "Qəhvə (Dənəvər)",
                                "https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=600",
                                8.00, "COUNT", "coffee"));
                items.add(new SeedItem("Çay və Qəhvə", "Qəhvə (Hazır)",
                                "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600",
                                5.00, "COUNT", "coffee"));
                items.add(new SeedItem("Enerji İçkiləri", "Enerji içkisi",
                                "https://images.pexels.com/photos/7319156/pexels-photo-7319156.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.50, "COUNT", "energy"));

                // Şirniyyat
                items.add(new SeedItem("Şokolad", "Şokolad (Plitka)",
                                "https://images.pexels.com/photos/65882/chocolate-dark-coffee-confiserie-65882.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.00, "COUNT", "sweet,cocoa"));
                items.add(new SeedItem("Çips və Çərəz", "Kartof Çipsi",
                                "https://images.pexels.com/photos/568805/pexels-photo-568805.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.50, "COUNT", "snack"));
                items.add(new SeedItem("Çips və Çərəz", "Popkorn",
                                "https://images.pexels.com/photos/33129/popcorn-movie-party-entertainment.jpg?auto=compress&cs=tinysrgb&w=600",
                                1.50, "COUNT", "snack"));
                items.add(new SeedItem("Şirniyyat və Qəlyanaltı", "Jelibon",
                                "https://images.pexels.com/photos/1906435/pexels-photo-1906435.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.20, "COUNT", "sweet"));
                items.add(new SeedItem("Quru Meyvə", "Qoz ləpəsi",
                                "https://images.pexels.com/photos/39304/walnut-nuts-fruits-shell-39304.jpeg?auto=compress&cs=tinysrgb&w=600",
                                15.00, "KG", "nuts"));
                items.add(new SeedItem("Quru Meyvə", "Fındıq",
                                "https://images.pexels.com/photos/45206/hazelnut-nut-hazelnuts-eat-45206.jpeg?auto=compress&cs=tinysrgb&w=600",
                                12.00, "KG", "nuts"));
                items.add(new SeedItem("Quru Meyvə", "Badam",
                                "https://images.pexels.com/photos/56926/almond-nuts-healthy-snack-56926.jpeg?auto=compress&cs=tinysrgb&w=600",
                                18.00, "KG", "nuts"));
                items.add(new SeedItem("Şirniyyat və Qəlyanaltı", "Bal",
                                "https://images.pexels.com/photos/33266/honey-sweet-syrup-organic.jpg?auto=compress&cs=tinysrgb&w=600",
                                10.00, "COUNT", "sweet,healthy"));
                items.add(new SeedItem("Şirniyyat və Qəlyanaltı", "Mürəbbə",
                                "https://images.pexels.com/photos/4051660/pexels-photo-4051660.jpeg?auto=compress&cs=tinysrgb&w=600",
                                4.00, "COUNT", "sweet"));
                items.add(new SeedItem("Quru Meyvə", "Quru meyvə",
                                "https://images.pexels.com/photos/1055271/pexels-photo-1055271.jpeg?auto=compress&cs=tinysrgb&w=600",
                                8.00, "KG", "snack"));

                // Təmizlik
                items.add(new SeedItem("Gigiyena", "Diş məcunu",
                                "https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=600",
                                3.00, "COUNT", "hygiene"));
                items.add(new SeedItem("Gigiyena", "Sabun (Bərk)",
                                "https://images.pexels.com/photos/4210339/pexels-photo-4210339.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.80, "COUNT", "hygiene"));
                items.add(new SeedItem("Gigiyena", "Maye sabun",
                                "https://images.pexels.com/photos/3997983/pexels-photo-3997983.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.00, "COUNT", "hygiene"));
                items.add(new SeedItem("Gigiyena", "Şampun",
                                "https://images.pexels.com/photos/4239014/pexels-photo-4239014.jpeg?auto=compress&cs=tinysrgb&w=600",
                                4.50, "COUNT", "hygiene"));
                items.add(new SeedItem("Gigiyena", "Tualet kağızı (8 ədəd)",
                                "https://images.pexels.com/photos/3951628/pexels-photo-3951628.jpeg?auto=compress&cs=tinysrgb&w=600",
                                5.00, "COUNT", "paper"));
                items.add(new SeedItem("Gigiyena", "Salfetka",
                                "https://images.pexels.com/photos/4439446/pexels-photo-4439446.jpeg?auto=compress&cs=tinysrgb&w=600",
                                1.00, "COUNT", "paper"));
                items.add(new SeedItem("Təmizlik", "Qabyuyan maye",
                                "https://images.pexels.com/photos/4239011/pexels-photo-4239011.jpeg?auto=compress&cs=tinysrgb&w=600",
                                2.50, "COUNT", "cleaning"));
                items.add(new SeedItem("Təmizlik", "Paltaryuyan tozu 3kg",
                                "https://images.pexels.com/photos/5202867/pexels-photo-5202867.jpeg?auto=compress&cs=tinysrgb&w=600",
                                8.00, "COUNT", "cleaning"));
                items.add(new SeedItem("Təmizlik", "Süngər (Qab üçün)",
                                "https://images.pexels.com/photos/4239019/pexels-photo-4239019.jpeg?auto=compress&cs=tinysrgb&w=600",
                                0.50, "COUNT", "cleaning"));
                items.add(new SeedItem("Gigiyena", "Əl kremi",
                                "https://images.pexels.com/photos/3059398/pexels-photo-3059398.jpeg?auto=compress&cs=tinysrgb&w=600",
                                3.00, "COUNT", "cosmetic"));

                List<Product> savedProducts = new ArrayList<>();
                int i = 1000;
                for (SeedItem item : items) {
                        Product p = new Product();
                        // Generate deterministic barcode
                        p.setBarcode("476" + (i++));
                        p.setName(item.name);
                        p.setPrice(item.price);

                        // Randomly assign UnitType if generic
                        p.setUnitType("KG".equals(item.unit) ? Product.UnitType.KG : Product.UnitType.COUNT);

                        p.setImageUrl(item.image);
                        p.setHealthTags(item.tags);
                        p.setDescription(
                                        item.name + " - Təbii və keyfiyyətli məhsul. Gündəlik istehlak üçün idealdır.");
                        p.setIngredients("Təbii inqrediyentlər.");
                        p.setBrand("LogiStore Brand");
                        p.setStockQuantity(100);

                        // Find Sub Category
                        Optional<Category> cat = categoryRepository.findByName(item.category);
                        p.setCategory(cat.orElse(null));

                        savedProducts.add(productRepository.save(p));
                }
                System.out.println("Seeded " + savedProducts.size() + " products.");
                return savedProducts;
        }

        private void seedInventory(List<Market> markets, List<Product> products) {
                Random rnd = new Random();
                for (Market m : markets) {
                        for (Product p : products) {
                                // Randomly add some products to each market
                                if (rnd.nextBoolean()) {
                                        MarketInventory inv = new MarketInventory();
                                        inv.setMarket(m);
                                        inv.setProduct(p);
                                        inv.setQuantity(20 + rnd.nextInt(50));
                                        inv.setLocalPrice(p.getPrice());
                                        marketInventoryRepository.save(inv);
                                }
                        }
                }
        }

        private void seedUsers(List<Product> products) {
                System.out.println("Seeding users...");

                // 1. Admin
                User admin = new User();
                admin.setName("Super Admin");
                admin.setPhone("admin");
                admin.setPasswordHash(passwordEncoder.encode("admin123"));
                admin.setRole(Role.ADMIN);
                admin.setBarcode("0000000000");
                userRepository.save(admin);

                // 2. Demo User (Requested)
                User demo = new User();
                demo.setName("Demo User (0504350284)");
                demo.setPhone("0504350284");
                demo.setPoints(550); // Some loyalty points
                demo.setPasswordHash(passwordEncoder.encode("123456")); // Real hashed password
                demo.setRole(Role.USER);
                demo.setBarcode("0504350284");
                demo = userRepository.save(demo);

                // Seed data for Demo User
                seedRecentHistory(demo, products);

                // 3. Random Users
                for (int i = 0; i < 5; i++) {
                        User u = new User();
                        u.setName("User " + i);
                        u.setPhone("055000000" + i);
                        u.setPasswordHash(passwordEncoder.encode("123"));
                        u.setRole(Role.USER);
                        u.setBarcode("055000000" + i);
                        u.setPoints(random.nextInt(200));
                        userRepository.save(u);
                }
        }

        private void seedRecentHistory(User user, List<Product> products) {
                if (products.isEmpty())
                        return;

                // 1. Receipts (Purchase History) - Min 5 mixed
                List<Long> boughtIds = new ArrayList<>();

                // Find target product for user request
                Product targetProduct = products.stream()
                                .filter(p -> p.getBarcode() != null && p.getBarcode().contains("4761000"))
                                .findFirst()
                                .orElse(null);

                for (int i = 0; i < 6; i++) {
                        Receipt r = new Receipt();
                        r.setUser(user);
                        r.setDate(LocalDateTime.now().minusDays(i * 3 + 1));
                        r.setType(i % 2 == 0 ? Receipt.ReceiptType.SCAN_GO : Receipt.ReceiptType.PHYSICAL);
                        r.setStatus(Receipt.ReceiptStatus.CLAIMED);
                        r.setIdempotencyKey(UUID.randomUUID().toString());

                        List<ReceiptItem> items = new ArrayList<>();
                        double total = 0;
                        int distinctItems = 2 + random.nextInt(4);

                        // Force add target product to first receipt if found
                        if (i == 0 && targetProduct != null) {
                                ReceiptItem item = new ReceiptItem();
                                item.setReceipt(r);
                                item.setProduct(targetProduct);
                                item.setQuantity(2);
                                item.setOriginalPrice(targetProduct.getPrice());
                                item.setDiscountedPrice(targetProduct.getPrice());
                                item.setPriceAtPurchase(targetProduct.getPrice());
                                item.setDiscountLabel("");
                                items.add(item);
                                total += (targetProduct.getPrice() * item.getQuantity());
                                boughtIds.add(targetProduct.getId());
                        }

                        for (int j = 0; j < distinctItems; j++) {
                                Product p = products.get(random.nextInt(products.size()));
                                ReceiptItem item = new ReceiptItem();
                                item.setReceipt(r);
                                item.setProduct(p);
                                item.setQuantity(1 + random.nextInt(2));
                                item.setOriginalPrice(p.getPrice());
                                item.setDiscountedPrice(p.getPrice());
                                item.setPriceAtPurchase(p.getPrice());
                                item.setDiscountLabel("");
                                items.add(item);
                                total += (p.getPrice() * item.getQuantity());
                                boughtIds.add(p.getId());
                        }
                        r.setItems(items);
                        r.setTotal(total);
                        r.setOriginalTotal(total);
                        r.setDiscountTotal(0.0);
                        r.setCardSpent(total);
                        r.setBonusSpent(0.0);
                        receiptRepository.save(r);
                }

                // Update user purchase history
                user.setPurchaseHistory(boughtIds);
                userRepository.save(user);

                // 2. Reviews (Min 5)
                Set<Long> reviewedIds = new HashSet<>();

                // Specific review for target product
                if (targetProduct != null) {
                        Review review = new Review();
                        review.setUserId(user.getId());
                        review.setUserName(user.getName());
                        review.setProductId(targetProduct.getId());
                        review.setRating(5);
                        review.setComment("Əla məhsuldur, çox bəyəndim! Təşəkkürlər.");
                        review.setDate(LocalDate.now().minusDays(2));
                        review.setVerifiedPurchase(true);
                        reviewRepository.save(review);
                        reviewedIds.add(targetProduct.getId());

                        // Update product aggregate
                        targetProduct.setReviewCount(targetProduct.getReviewCount() + 1);
                        targetProduct.setRating(5.0); // Reset or avg
                        productRepository.save(targetProduct);
                }

                for (int i = 0; i < 5; i++) {
                        Long pid = boughtIds.get(random.nextInt(boughtIds.size()));

                        if (reviewedIds.contains(pid))
                                continue;

                        Product p = products.stream().filter(prod -> prod.getId().equals(pid)).findFirst().orElse(null);
                        if (p == null)
                                continue;

                        Review review = new Review();
                        review.setUserId(user.getId());
                        review.setUserName(user.getName());
                        review.setProductId(pid);
                        review.setRating(3 + random.nextInt(3)); // 3 to 5
                        review.setComment("Bu məhsulu bəyəndim, keyfiyyəti yerindədir.");
                        review.setDate(LocalDate.now().minusDays(random.nextInt(20)));
                        review.setVerifiedPurchase(true);
                        reviewRepository.save(review);

                        reviewedIds.add(pid);

                        // Update product aggregate
                        p.setReviewCount(p.getReviewCount() + 1);
                        // Simple new average
                        p.setRating((p.getRating() * (p.getReviewCount() - 1) + review.getRating())
                                        / p.getReviewCount());
                        productRepository.save(p);
                }

                // 3. Complaints
                Complaint c1 = new Complaint();
                c1.setUserId(user.getId());
                c1.setSubject("Kassir davranışı");
                c1.setDescription("Kassir nömrə 4 çox nəzakətli idi, təşəkkürlər.");
                c1.setStatus(Complaint.ComplaintStatus.RESOLVED);
                c1.setCreatedAt(LocalDateTime.now().minusDays(10));
                c1.setUserName(user.getName());
                complaintRepository.save(c1);
        }

        private void seedPromoCodes() {
                PromoCode pc = new PromoCode();
                pc.setCode("WELCOME");
                pc.setName("Xoş Gəldin");
                pc.setDescription("İlk alış-veriş üçün bonus");
                pc.setDiscountAmount(5.0);
                pc.setPercentage(false);
                pc.setActive(true);
                pc.setStartDate(LocalDate.now().minusMonths(1));
                pc.setExpiryDate(LocalDate.now().plusMonths(6));
                promoCodeRepository.save(pc);
        }

        private void seedPhysicalReceipts(List<Market> markets, List<Product> products) {
                // Some random unclaimed receipts for testing scanning
        }

        private void seedUserChallenges(User user) {
                System.out.println("Checking challenges for user: " + user.getPhone());

                // 1. Welcome Challenge
                if (userChallengeRepository.findByUserIdAndChallengeName(user.getId(), "Xoş Gəldin Bonusu") == null) {
                        UserChallenge c1 = new UserChallenge();
                        c1.setUser(user);
                        c1.setChallengeName("Xoş Gəldin Bonusu");
                        c1.setDescription("İlk 3 alış-verişi tamamlayın");
                        c1.setTargetValue(3);
                        c1.setCurrentValue(1);
                        c1.setCompleted(false);
                        c1.setStartDate(LocalDate.now().minusDays(5));
                        c1.setExpiryDate(LocalDate.now().plusDays(25));
                        c1.setDiscountType(UserChallenge.DiscountType.FIXED_AMOUNT);
                        c1.setDiscountValue(5.0);
                        userChallengeRepository.save(c1);
                        System.out.println("Seeded Welcome Challenge");
                }

                // 2. Weekly Spender
                if (userChallengeRepository.findByUserIdAndChallengeName(user.getId(), "Həftəlik Alış-veriş") == null) {
                        UserChallenge c2 = new UserChallenge();
                        c2.setUser(user);
                        c2.setChallengeName("Həftəlik Alış-veriş");
                        c2.setDescription("Bu həftə 50 AZN dəyərində alış-veriş edin");
                        c2.setTargetValue(50);
                        c2.setCurrentValue(15);
                        c2.setCompleted(false);
                        c2.setStartDate(LocalDate.now().minusDays(2));
                        c2.setExpiryDate(LocalDate.now().plusDays(5));
                        c2.setDiscountType(UserChallenge.DiscountType.PERCENTAGE);
                        c2.setDiscountValue(10.0);
                        userChallengeRepository.save(c2);
                        System.out.println("Seeded Weekly Challenge");
                }

                // 3. Expired Challenge
                if (userChallengeRepository.findByUserIdAndChallengeName(user.getId(), "Keçən Ayın Bonusu") == null) {
                        UserChallenge c3 = new UserChallenge();
                        c3.setUser(user);
                        c3.setChallengeName("Keçən Ayın Bonusu");
                        c3.setDescription("Keçən ayın xüsusi təklifi");
                        c3.setTargetValue(100);
                        c3.setCurrentValue(20);
                        c3.setCompleted(false);
                        c3.setStartDate(LocalDate.now().minusDays(40));
                        c3.setExpiryDate(LocalDate.now().minusDays(10)); // Expired
                        c3.setDiscountType(UserChallenge.DiscountType.FIXED_AMOUNT);
                        c3.setDiscountValue(2.0);
                        userChallengeRepository.save(c3);
                        System.out.println("Seeded Expired Challenge");
                }

                // 4. Redeemed (Completed) Challenge
                if (userChallengeRepository.findByUserIdAndChallengeName(user.getId(), "Uğurlu Başlanğıc") == null) {
                        UserChallenge c4 = new UserChallenge();
                        c4.setUser(user);
                        c4.setChallengeName("Uğurlu Başlanğıc");
                        c4.setDescription("İlk qeydiyyat hədiyyəsi");
                        c4.setTargetValue(1);
                        c4.setCurrentValue(1);
                        c4.setCompleted(true);
                        c4.setRedeemed(true); // Used
                        c4.setStartDate(LocalDate.now().minusMonths(2));
                        c4.setExpiryDate(LocalDate.now().minusMonths(1));
                        c4.setDiscountType(UserChallenge.DiscountType.FIXED_AMOUNT);
                        c4.setDiscountValue(1.0);
                        userChallengeRepository.save(c4);
                        System.out.println("Seeded Redeemed Challenge");
                }
        }
}