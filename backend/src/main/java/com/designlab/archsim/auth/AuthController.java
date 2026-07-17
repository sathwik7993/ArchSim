package com.designlab.archsim.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
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
  public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
    users.findByEmail(request.email()).ifPresent(existing -> {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
    });
    UserAccount user = new UserAccount();
    user.id = "usr-" + UUID.randomUUID();
    user.email = request.email();
    user.displayName = request.displayName();
    user.passwordHash = passwordEncoder.encode(request.password());
    users.save(user);
    return AuthResponse.of(user, tokenService.issue(user.id));
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request) {
    UserAccount user = users.findByEmail(request.email())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    if (!passwordEncoder.matches(request.password(), user.passwordHash)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }
    return AuthResponse.of(user, tokenService.issue(user.id));
  }

  /** Revoke the caller's token so it can no longer be used (sign-out everywhere). */
  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
    if (authorization != null && authorization.startsWith("Bearer ")) {
      tokenService.revoke(authorization.substring(7));
    }
  }

  @PostMapping("/refresh")
  public Map<String, String> refresh(Principal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token");
    }
    return Map.of("accessToken", tokenService.issue(principal.getName()));
  }

  /** Restore the signed-in user from a stored token (used on app reload). */
  @GetMapping("/me")
  public UserDto me(Principal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not signed in");
    }
    UserAccount user = users.findById(principal.getName())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown user"));
    return new UserDto(user.id, user.email, user.displayName);
  }

  public record RegisterRequest(
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(min = 6, max = 200) String password,
      @Size(max = 100) String displayName) {}

  public record LoginRequest(
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(max = 200) String password) {}
  public record UserDto(String userId, String email, String displayName) {}
  public record AuthResponse(String userId, String email, String displayName, String accessToken) {
    static AuthResponse of(UserAccount user, String token) {
      return new AuthResponse(user.id, user.email, user.displayName, token);
    }
  }
}

