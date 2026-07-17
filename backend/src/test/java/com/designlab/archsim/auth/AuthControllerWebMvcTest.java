package com.designlab.archsim.auth;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.designlab.archsim.web.GlobalExceptionHandler;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Full request→response coverage of the auth API through the real security
 * filter chain + validation + advice, with the persistence/token layers mocked
 * (so it runs without a database).
 */
@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class AuthControllerWebMvcTest {

  @Autowired MockMvc mvc;

  @MockBean UserAccountRepository users;
  @MockBean PasswordEncoder passwordEncoder;
  @MockBean TokenService tokenService;

  @Test
  void registerRejectsInvalidEmail() throws Exception {
    mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"not-an-email\",\"password\":\"secret1\",\"displayName\":\"X\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.email").exists());
  }

  @Test
  void registerRejectsShortPassword() throws Exception {
    mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"a@b.io\",\"password\":\"123\",\"displayName\":\"X\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.password").exists());
  }

  @Test
  void registerCreatesAccount() throws Exception {
    when(users.findByEmail("new@archsim.io")).thenReturn(Optional.empty());
    when(passwordEncoder.encode(anyString())).thenReturn("hashed");
    when(tokenService.issue(anyString())).thenReturn("tok-123");

    mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"new@archsim.io\",\"password\":\"secret1\",\"displayName\":\"New\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.email").value("new@archsim.io"))
        .andExpect(jsonPath("$.accessToken").value("tok-123"));
  }

  @Test
  void registerRejectsDuplicateEmail() throws Exception {
    UserAccount existing = new UserAccount();
    existing.id = "usr-1";
    existing.email = "dupe@archsim.io";
    when(users.findByEmail("dupe@archsim.io")).thenReturn(Optional.of(existing));

    mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"dupe@archsim.io\",\"password\":\"secret1\",\"displayName\":\"X\"}"))
        .andExpect(status().isConflict());
  }

  @Test
  void loginRejectsWrongPassword() throws Exception {
    UserAccount user = new UserAccount();
    user.id = "usr-1";
    user.email = "a@archsim.io";
    user.passwordHash = "hashed";
    when(users.findByEmail("a@archsim.io")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

    mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"a@archsim.io\",\"password\":\"wrongpass\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void loginSucceedsWithCorrectPassword() throws Exception {
    UserAccount user = new UserAccount();
    user.id = "usr-1";
    user.email = "a@archsim.io";
    user.passwordHash = "hashed";
    when(users.findByEmail("a@archsim.io")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
    when(tokenService.issue("usr-1")).thenReturn("tok-xyz");

    mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"a@archsim.io\",\"password\":\"secret1\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").value("tok-xyz"));
  }

  @Test
  void meRequiresAuthentication() throws Exception {
    mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
  }
}
