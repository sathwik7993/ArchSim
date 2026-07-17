package com.designlab.archsim.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class TokenServiceTest {
  // A sufficiently long, non-default secret so the security guard stays quiet.
  private static final String STRONG_SECRET = "a-sufficiently-long-random-test-secret-value-123456";

  private TokenService service(String secret, String... profiles) {
    MockEnvironment env = new MockEnvironment();
    env.setActiveProfiles(profiles);
    return new TokenService(secret, env);
  }

  @Test
  void issuesAndVerifiesRoundTrip() {
    TokenService tokens = service(STRONG_SECRET);
    String token = tokens.issue("usr-42");
    assertEquals("usr-42", tokens.verify(token));
  }

  @Test
  void rejectsTamperedSignature() {
    TokenService tokens = service(STRONG_SECRET);
    String token = tokens.issue("usr-42");
    String tampered = token.substring(0, token.length() - 2) + "xy";
    assertThrows(IllegalArgumentException.class, () -> tokens.verify(tampered));
  }

  @Test
  void rejectsMalformedToken() {
    TokenService tokens = service(STRONG_SECRET);
    assertThrows(IllegalArgumentException.class, () -> tokens.verify("not-a-valid-token"));
  }

  @Test
  void tokenFromADifferentSecretIsRejected() {
    String forged = service("another-sufficiently-long-secret-value-000000000").issue("usr-42");
    assertThrows(IllegalArgumentException.class, () -> service(STRONG_SECRET).verify(forged));
  }

  @Test
  void refusesToStartWithWeakSecretUnderProdProfile() {
    assertThrows(IllegalStateException.class,
        () -> service("local-development-secret-change-me", "prod"));
    assertThrows(IllegalStateException.class, () -> service("too-short", "prod"));
  }

  @Test
  void allowsWeakSecretOutsideProdProfile() {
    // Should warn but not throw in local/dev.
    TokenService tokens = service("local-development-secret-change-me");
    assertEquals("usr-1", tokens.verify(tokens.issue("usr-1")));
  }
}
