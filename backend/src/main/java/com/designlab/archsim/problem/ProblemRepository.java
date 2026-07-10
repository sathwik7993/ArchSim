package com.designlab.archsim.problem;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProblemRepository extends JpaRepository<Problem, String> {
  // Lightweight list projection — avoids shipping the heavy solution/refArch JSON.
  List<ProblemSummary> findAllByOrderByDifficultyAscNameAsc();

  interface ProblemSummary {
    String getSlug();
    String getName();
    String getDifficulty();
    String getTopic();
    String getSummary();
  }
}
