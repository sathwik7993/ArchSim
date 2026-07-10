package com.designlab.archsim.problem;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/** Per-user practice state for a problem: attempted or solved. */
@Entity
@Table(name = "problem_progress")
@IdClass(ProblemProgress.Key.class)
public class ProblemProgress {
  @Id
  @Column(name = "user_id")
  public String userId;

  @Id
  public String slug;

  @Column(nullable = false)
  public String status; // "attempted" | "solved"

  @Column(name = "updated_at")
  public Instant updatedAt = Instant.now();

  public static class Key implements Serializable {
    public String userId;
    public String slug;

    public Key() {}

    public Key(String userId, String slug) {
      this.userId = userId;
      this.slug = slug;
    }

    @Override
    public boolean equals(Object o) {
      if (this == o) return true;
      if (!(o instanceof Key key)) return false;
      return Objects.equals(userId, key.userId) && Objects.equals(slug, key.slug);
    }

    @Override
    public int hashCode() {
      return Objects.hash(userId, slug);
    }
  }
}
