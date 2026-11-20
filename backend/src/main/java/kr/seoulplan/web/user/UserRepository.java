package kr.seoulplan.web.user;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

	/** 이메일은 정규화(소문자)된 값으로 조회한다 (REQ-17-2). */
	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

}
