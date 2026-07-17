package com.designlab.archsim.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Value("${archsim.security.allowed-origins:http://localhost:5173}")
  private String allowedOrigins;

  @Value("${archsim.security.rate-limit.auth-requests:20}")
  private int authRateLimit;

  @Value("${archsim.security.rate-limit.window-seconds:60}")
  private long rateWindowSeconds;

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, TokenService tokenService) throws Exception {
    List<String> origins = Arrays.stream(allowedOrigins.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .toList();

    return http
        .csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(request -> {
          CorsConfiguration config = new CorsConfiguration();
          config.setAllowedOrigins(origins);
          config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
          config.setAllowedHeaders(List.of("*"));
          config.setMaxAge(3600L);
          return config;
        }))
        .headers(headers -> headers
            .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN))
            .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000)))
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            // Spring does an internal ERROR dispatch to /error to render error
            // bodies; it must be permitted or every thrown 4xx/5xx is masked as 403.
            .requestMatchers("/error").permitAll()
            .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
            .requestMatchers("/api/v1/auth/**", "/ws/**").permitAll()
            .requestMatchers("/api/v1/problems/**").permitAll()
            .anyRequest().authenticated())
        // Rate-limit runs first so abusive auth traffic never reaches the app.
        .addFilterBefore(new RateLimitFilter(authRateLimit, rateWindowSeconds), UsernamePasswordAuthenticationFilter.class)
        .addFilterBefore(new BearerTokenFilter(tokenService), UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  static class BearerTokenFilter extends OncePerRequestFilter {
    private final TokenService tokenService;

    BearerTokenFilter(TokenService tokenService) {
      this.tokenService = tokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
      String header = request.getHeader("Authorization");
      if (header != null && header.startsWith("Bearer ")) {
        try {
          String userId = tokenService.verify(header.substring(7));
          SecurityContextHolder.getContext().setAuthentication(
              new UsernamePasswordAuthenticationToken(userId, null, List.of(new SimpleGrantedAuthority("USER"))));
        } catch (IllegalArgumentException ignored) {
          SecurityContextHolder.clearContext();
        }
      }
      chain.doFilter(request, response);
    }
  }
}

