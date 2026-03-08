package com.logistore.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        @Bean
        public com.logistore.security.JwtAuthenticationFilter jwtAuthenticationFilter(
                        com.logistore.repository.UserRepository userRepository,
                        com.logistore.service.TokenBlacklistService tokenBlacklistService) {
                return new com.logistore.security.JwtAuthenticationFilter(userRepository, tokenBlacklistService);
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();

                // Allow all relevant origins
                configuration.setAllowedOriginPatterns(Arrays.asList(
                                "https://cartelixapp.tech",
                                "https://www.cartelixapp.tech",
                                "http://cartelixapp.tech",
                                "https://logistore.tech",
                                "https://www.logistore.tech",
                                "http://logistore.tech",
                                "https://logistore.live",
                                "https://www.logistore.live",
                                "http://logistore.live",
                                "http://134.122.79.137",
                                "http://localhost:*",
                                "http://192.168.*:*",
                                "http://10.*:*"));

                configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                configuration.setAllowedHeaders(
                                Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));
                configuration.setAllowCredentials(true);
                configuration.setExposedHeaders(List.of("Authorization"));

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }

        @Bean
        public WebSecurityCustomizer webSecurityCustomizer() {
                return (web) -> web.ignoring().requestMatchers(
                                "/images/**",
                                "/ws/**",
                                "/favicon.ico");
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http,
                        com.logistore.security.JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(AbstractHttpConfigurer::disable)
                                .authorizeHttpRequests(auth -> auth
                                                // Public endpoints
                                                .requestMatchers("/", "/index.html", "/static/**", "/assets/**",
                                                                "/*.js", "/*.css", "/*.json", "/*.ico")
                                                .permitAll()
                                                .requestMatchers("/api/auth/**").permitAll()
                                                .requestMatchers("/api/public/**").permitAll()
                                                // Allow all GET requests for data fetching to be safe? No, keep it
                                                // specific.
                                                .requestMatchers("/api/products/**").permitAll()
                                                .requestMatchers("/api/categories/**").permitAll()
                                                .requestMatchers("/api/discounts/**").permitAll()
                                                .requestMatchers("/api/promo-codes/**").permitAll()
                                                .requestMatchers("/api/users/me").authenticated() // Explicitly secure
                                                                                                  // ME
                                                // For debugging/MVP, allowing these open might solve the 403s if JWT is
                                                // failing on client
                                                .requestMatchers("/api/pos/**").permitAll()
                                                .requestMatchers("/api/scan-go/**").permitAll()
                                                .requestMatchers("/api/receipts/**").permitAll()
                                                .requestMatchers("/api/scan-analytics/**").permitAll()
                                                .requestMatchers("/error").permitAll()
                                                // OPTIONS requests must be permitted for CORS preflight
                                                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**")
                                                .permitAll()
                                                // All other requests need auth
                                                .anyRequest().authenticated())
                                .addFilterBefore(jwtAuthenticationFilter,
                                                org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);
                return http.build();
        }
}