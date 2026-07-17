package com.designlab.archsim.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * A lightweight, dependency-free per-IP fixed-window rate limiter guarding the
 * auth endpoints (login/register) against brute-force and abuse. In-memory only
 * — good enough for a single instance; swap for a Redis-backed limiter when the
 * app is scaled horizontally. Constructed in {@link SecurityConfig} (not a bean)
 * so Spring Boot does not auto-register it as a global servlet filter.
 */
public class RateLimitFilter extends OncePerRequestFilter {
  private final int maxRequests;
  private final long windowMs;
  private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

  public RateLimitFilter(int maxRequests, long windowSeconds) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000L;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    // Only rate-limit the sensitive auth endpoints.
    String path = request.getRequestURI();
    return !(path.startsWith("/api/v1/auth/login") || path.startsWith("/api/v1/auth/register"));
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (allow(clientKey(request))) {
      chain.doFilter(request, response);
    } else {
      response.setStatus(429);
      response.setHeader("Retry-After", String.valueOf(windowMs / 1000));
      response.setContentType("application/json");
      response.getWriter().write("{\"error\":\"Too many requests — slow down and try again shortly.\"}");
    }
  }

  boolean allow(String key) {
    long now = System.currentTimeMillis();
    Window w = windows.compute(key, (k, existing) -> {
      if (existing == null || now - existing.start >= windowMs) {
        return new Window(now, 1);
      }
      existing.count++;
      return existing;
    });
    // Opportunistically evict stale windows so the map does not grow unbounded.
    if (windows.size() > 10_000) {
      windows.entrySet().removeIf(e -> now - e.getValue().start >= windowMs);
    }
    return w.count <= maxRequests;
  }

  private String clientKey(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    return request.getRemoteAddr();
  }

  /** Test seam: current tracked window count. */
  Map<String, Window> windowsForTest() {
    return windows;
  }

  static final class Window {
    final long start;
    int count;

    Window(long start, int count) {
      this.start = start;
      this.count = count;
    }
  }
}
