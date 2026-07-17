package com.designlab.archsim.auth;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
  private static final Logger log = LoggerFactory.getLogger(TokenService.class);

  // Access tokens are long-lived (30 days) so students stay signed in across
  // sessions. There is no refresh-token infrastructure; this is a deliberate
  // trade-off for a low-stakes learning app where the token only guards a user's
  // own designs and progress.
  private static final long TOKEN_TTL_SECONDS = 30L * 24 * 60 * 60;

  private static final String INSECURE_DEFAULT = "local-development-secret-change-me";
  private static final int MIN_SECRET_LENGTH = 32;

  private final byte[] secret;

  // Revoked token signatures → their expiry epoch-seconds, so a signed-out (or
  // compromised) token stops working before its natural 30-day expiry. In-memory
  // only; entries self-evict once past expiry. Swap for Redis when multi-instance.
  private final ConcurrentHashMap<String, Long> revoked = new ConcurrentHashMap<>();

  public TokenService(@Value("${archsim.security.token-secret}") String secret, Environment env) {
    boolean prod = env.acceptsProfiles(Profiles.of("prod"));
    boolean insecure = INSECURE_DEFAULT.equals(secret) || secret.length() < MIN_SECRET_LENGTH;
    if (insecure) {
      String msg = "archsim.security.token-secret is weak or left at the insecure default. "
          + "Set ARCHSIM_TOKEN_SECRET to a random value of at least " + MIN_SECRET_LENGTH
          + " characters (e.g. `openssl rand -base64 48`).";
      if (prod) {
        throw new IllegalStateException("Refusing to start under the 'prod' profile: " + msg);
      }
      log.warn("SECURITY WARNING: {}", msg);
    }
    this.secret = secret.getBytes(StandardCharsets.UTF_8);
  }

  public String issue(String userId) {
    long expiresAt = Instant.now().plusSeconds(TOKEN_TTL_SECONDS).getEpochSecond();
    String payload = userId + "." + expiresAt;
    return Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8))
        + "."
        + sign(payload);
  }

  public String verify(String token) {
    String[] parts = token.split("\\.", 2);
    if (parts.length != 2) {
      throw new IllegalArgumentException("Malformed token");
    }
    String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
    if (!sign(payload).equals(parts[1])) {
      throw new IllegalArgumentException("Invalid token signature");
    }
    String[] fields = payload.split("\\.", 2);
    if (fields.length != 2 || Long.parseLong(fields[1]) < Instant.now().getEpochSecond()) {
      throw new IllegalArgumentException("Expired token");
    }
    if (revoked.containsKey(parts[1])) {
      throw new IllegalArgumentException("Revoked token");
    }
    return fields[0];
  }

  /**
   * Revoke a token (e.g. on sign-out) so it can no longer authenticate. Stores
   * only the token's signature until its own expiry; malformed tokens are ignored.
   */
  public void revoke(String token) {
    String[] parts = token.split("\\.", 2);
    if (parts.length != 2) {
      return;
    }
    long now = Instant.now().getEpochSecond();
    try {
      String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
      String[] fields = payload.split("\\.", 2);
      long expiresAt = fields.length == 2 ? Long.parseLong(fields[1]) : now + TOKEN_TTL_SECONDS;
      revoked.put(parts[1], expiresAt);
    } catch (RuntimeException ignored) {
      return;
    }
    // Opportunistically evict entries whose tokens have already expired.
    revoked.values().removeIf(exp -> exp < now);
  }

  private String sign(String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret, "HmacSHA256"));
      return Base64.getUrlEncoder().withoutPadding()
          .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to sign token", ex);
    }
  }
}

