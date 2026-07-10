package com.designlab.archsim.project;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "projects")
public class Project {
  @Id
  public String id;

  @Column(nullable = false)
  public String name;

  public String description;

  @Column(name = "tenant_id", nullable = false)
  public String tenantId;

  @Column(name = "owner_id", nullable = false)
  public String ownerId;

  /** When set, this project is a practice workspace linked to a problem slug. */
  @Column(name = "problem_slug")
  public String problemSlug;

  @Column(name = "created_at")
  public Instant createdAt = Instant.now();

  @Column(name = "updated_at")
  public Instant updatedAt = Instant.now();

  public int version = 1;
}

