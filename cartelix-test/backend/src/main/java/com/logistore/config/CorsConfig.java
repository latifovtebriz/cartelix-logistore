package com.logistore.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS is now configured in SecurityConfig.
 * This class remains for potential future WebMvc configurations.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    // CORS handled by SecurityConfig.corsConfigurationSource()
}
