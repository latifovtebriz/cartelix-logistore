package com.logistore.security;

import com.logistore.service.TokenBlacklistService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final com.logistore.repository.UserRepository userRepository;
    private final TokenBlacklistService tokenBlacklistService;

    public JwtAuthenticationFilter(com.logistore.repository.UserRepository userRepository,
            TokenBlacklistService tokenBlacklistService) {
        this.userRepository = userRepository;
        this.tokenBlacklistService = tokenBlacklistService;
    }

    // Skip JWT filter for public endpoints and CORS preflight requests
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // CORS Preflight sorğularını yoxlamadan keçir
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        // Logları sildik. Artıq Railway "Rate Limit" verməyəcək.
        return path.startsWith("/api/categories") ||
                path.startsWith("/api/products") ||
                path.startsWith("/api/auth") ||
                path.startsWith("/api/public") ||
                path.startsWith("/ws") ||
                path.startsWith("/favicon.ico") ||
                path.startsWith("/images/") ||
                path.equals("/") ||
                path.equals("/index.html");
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private boolean validateToken(String token) {
        return token != null && !token.isEmpty();
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        try {
            String token = extractToken(request);
            if (token != null) {
                // 1. Check Blacklist
                if (tokenBlacklistService.isBlacklisted(token)) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                }

                // 2. Validate Token
                if (validateToken(token)) {
                    String username = token;
                    java.util.Optional<com.logistore.model.User> userOpt = userRepository.findByPhone(username);

                    java.util.List<org.springframework.security.core.authority.SimpleGrantedAuthority> authorities = new ArrayList<>();

                    if (userOpt.isPresent()) {
                        com.logistore.model.User user = userOpt.get();

                        if (user.isBlocked()) {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            return;
                        }

                        if (user.getRole() != null) {
                            authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                    "ROLE_" + user.getRole().name()));
                        } else {
                            authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                    "ROLE_USER"));
                        }
                    } else {
                        authorities.add(
                                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER"));
                    }

                    // Set Access
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userOpt.map(com.logistore.model.User::getPhone).orElse("user"), null, authorities);
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception e) {
            // Yalnız ciddi xəta olanda qırmızı log yazırıq
            System.err.println("Authentication Error: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}