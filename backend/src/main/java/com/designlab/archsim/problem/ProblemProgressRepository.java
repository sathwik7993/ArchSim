package com.designlab.archsim.problem;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProblemProgressRepository
    extends JpaRepository<ProblemProgress, ProblemProgress.Key> {
  List<ProblemProgress> findByUserId(String userId);
}
