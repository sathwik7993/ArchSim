package com.designlab.archsim.problem;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Per-user practice progress — the dynamic, account-scoped data that genuinely
 * belongs server-side (as opposed to the static catalog). Requires auth.
 */
@RestController
@RequestMapping("/api/v1/progress")
public class ProgressController {
  private static final Set<String> STATUSES = Set.of("attempted", "solved");

  private final ProblemProgressRepository progress;

  public ProgressController(ProblemProgressRepository progress) {
    this.progress = progress;
  }

  @GetMapping
  public List<ProgressDto> list(Principal principal) {
    return progress.findByUserId(principal.getName()).stream()
        .map(p -> new ProgressDto(p.slug, p.status))
        .toList();
  }

  @PutMapping("/{slug}")
  public ProgressDto upsert(@PathVariable String slug, @RequestBody StatusRequest body, Principal principal) {
    if (body == null || !STATUSES.contains(body.status())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be 'attempted' or 'solved'");
    }
    ProblemProgress p = progress
        .findById(new ProblemProgress.Key(principal.getName(), slug))
        .orElseGet(ProblemProgress::new);
    p.userId = principal.getName();
    p.slug = slug;
    p.status = body.status();
    p.updatedAt = Instant.now();
    progress.save(p);
    return new ProgressDto(p.slug, p.status);
  }

  public record StatusRequest(String status) {}

  public record ProgressDto(String slug, String status) {}
}
