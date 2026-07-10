package com.designlab.archsim.problem;

import com.designlab.archsim.problem.ProblemRepository.ProblemSummary;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Public read-only catalog API. The problem set is static reference content, so
 * these endpoints are unauthenticated and cache-friendly.
 */
@RestController
@RequestMapping("/api/v1/problems")
public class ProblemController {
  private final ProblemRepository problems;

  public ProblemController(ProblemRepository problems) {
    this.problems = problems;
  }

  @GetMapping
  public List<ProblemSummary> list() {
    return problems.findAllByOrderByDifficultyAscNameAsc();
  }

  @GetMapping("/{slug}")
  public Problem get(@PathVariable String slug) {
    return problems.findById(slug)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Problem not found"));
  }
}
