package com.designlab.archsim.project;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, String> {
  List<Project> findByOwnerIdOrderByUpdatedAtDesc(String ownerId);
}

