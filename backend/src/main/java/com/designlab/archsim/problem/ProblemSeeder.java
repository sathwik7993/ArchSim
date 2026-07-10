package com.designlab.archsim.problem;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Loads the static problem catalog into the database on startup from
 * {@code classpath:seed/problems.json} (generated from the frontend composer so
 * the DB and the app ship identical content). Idempotent: it upserts by slug,
 * so re-running keeps the catalog in sync when the seed file changes.
 */
@Component
public class ProblemSeeder implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(ProblemSeeder.class);

  private final ProblemRepository problems;
  private final ObjectMapper objectMapper;

  public ProblemSeeder(ProblemRepository problems, ObjectMapper objectMapper) {
    this.problems = problems;
    this.objectMapper = objectMapper;
  }

  @Override
  public void run(ApplicationArguments args) {
    try (InputStream in = new ClassPathResource("seed/problems.json").getInputStream()) {
      JsonNode root = objectMapper.readTree(in);
      if (!root.isArray()) {
        log.warn("Problem seed is not an array; skipping seed.");
        return;
      }
      List<Problem> batch = new ArrayList<>();
      for (JsonNode node : root) {
        Problem p = new Problem();
        p.slug = node.path("slug").asText();
        p.name = node.path("name").asText();
        p.difficulty = node.path("difficulty").asText();
        p.topic = node.path("topic").asText();
        p.summary = node.path("summary").asText(null);
        p.note = node.hasNonNull("note") ? node.get("note").asText() : null;
        p.sources = node.path("sources");
        p.solution = node.path("solution");
        p.refArch = node.path("refArch");
        p.updatedAt = Instant.now();
        batch.add(p);
      }
      problems.saveAll(batch);
      log.info("Seeded {} system-design problems.", batch.size());
    } catch (Exception e) {
      // Non-fatal: the frontend bundles the same catalog as a fallback.
      log.error("Failed to seed problems: {}", e.getMessage());
    }
  }
}
