package com.designlab.archsim.problem;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A system-design practice problem plus its composed solution and reference
 * architecture. This is static reference content, seeded on startup from
 * {@code classpath:seed/problems.json} (see {@link ProblemSeeder}).
 */
@Entity
@Table(name = "problems")
public class Problem {
  @Id
  public String slug;

  @Column(nullable = false)
  public String name;

  @Column(nullable = false)
  public String difficulty;

  @Column(nullable = false)
  public String topic;

  @Column(columnDefinition = "text")
  public String summary;

  @Column(columnDefinition = "text")
  public String note;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  public JsonNode sources;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  public JsonNode solution;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "ref_arch", nullable = false, columnDefinition = "jsonb")
  public JsonNode refArch;

  @Column(name = "updated_at")
  public Instant updatedAt = Instant.now();
}
