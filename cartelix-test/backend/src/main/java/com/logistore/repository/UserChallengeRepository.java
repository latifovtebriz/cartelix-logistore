package com.logistore.repository;

import com.logistore.model.UserChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserChallengeRepository extends JpaRepository<UserChallenge, Long> {
    List<UserChallenge> findByUserId(String userId);

    List<UserChallenge> findByUserIdAndCompletedFalse(String userId);

    // Find global campaign templates (no specific user assignment)
    List<UserChallenge> findByUserIsNullAndTargetUserIdIsNull();

    // Find specific challenge tracker for a user
    UserChallenge findByUserIdAndChallengeName(String userId, String challengeName);
}
