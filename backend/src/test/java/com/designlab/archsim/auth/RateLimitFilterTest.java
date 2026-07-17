package com.designlab.archsim.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class RateLimitFilterTest {

  @Test
  void allowsUpToTheLimitThenBlocks() {
    RateLimitFilter filter = new RateLimitFilter(3, 60);
    assertTrue(filter.allow("1.2.3.4"));
    assertTrue(filter.allow("1.2.3.4"));
    assertTrue(filter.allow("1.2.3.4"));
    assertFalse(filter.allow("1.2.3.4"), "4th request in the window is blocked");
  }

  @Test
  void limitsArePerClient() {
    RateLimitFilter filter = new RateLimitFilter(1, 60);
    assertTrue(filter.allow("1.1.1.1"));
    assertFalse(filter.allow("1.1.1.1"));
    // A different client still has its full budget.
    assertTrue(filter.allow("2.2.2.2"));
  }

  @Test
  void windowResetsAfterItElapses() throws Exception {
    RateLimitFilter filter = new RateLimitFilter(1, 0); // 0s window → each call is a fresh window
    assertTrue(filter.allow("9.9.9.9"));
    Thread.sleep(2);
    assertTrue(filter.allow("9.9.9.9"), "a new window admits the request again");
  }
}
