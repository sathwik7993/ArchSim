package com.designlab.archsim.auth;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TokenService {
  private final byte[] secret;

  public TokenService(@Value("${archsim.security.token-secret}") String secret) {
    this.secret = secret.getBytes(StandardCharsets.UTF_8);
  }

  public String issue(String userId) {
    long expiresAt = Instant.now().plusSeconds(900).getEpochSecond();
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
    return fields[0];
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

