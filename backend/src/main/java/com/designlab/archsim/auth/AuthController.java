package com.designlab.archsim.auth;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final UserAccountRepository users;
  private final PasswordEncoder passwordEncoder;
  private final TokenService tokenService;

  public AuthController(UserAccountRepository users, PasswordEncoder passwordEncoder, TokenService tokenService) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.tokenService = tokenService;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public AuthResponse register(@RequestBody RegisterRequest request) {
    users.findByEmail(request.email()).ifPresent(existing -> {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
    });
    UserAccount user = new UserAccount();
    user.id = "usr-" + UUID.randomUUID();
    user.email = request.email();
    user.displayName = request.displayName();
    user.passwordHash = passwordEncoder.encode(request.password());
    users.save(user);
    return new AuthResponse(user.id, tokenService.issue(user.id));
  }

  @PostMapping("/login")
  public AuthResponse login(@RequestBody LoginRequest request) {
    UserAccount user = users.findByEmail(request.email())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    if (!passwordEncoder.matches(request.password(), user.passwordHash)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }
    return new AuthResponse(user.id, tokenService.issue(user.id));
  }

  @PostMapping("/refresh")
  public Map<String, String> refresh(Principal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token");
    }
    return Map.of("accessToken", tokenService.issue(principal.getName()));
  }

  public record RegisterRequest(String email, String password, String displayName) {}
  public record LoginRequest(String email, String password) {}
  public record AuthResponse(String userId, String accessToken) {}
}

