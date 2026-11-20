package kr.seoulplan.web.user;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import kr.seoulplan.web.common.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 회원가입 (REQ-17-1 ~ REQ-17-3). */
@Service
public class UserService {

	static final String DUPLICATE_EMAIL_MESSAGE = "이미 가입된 이메일입니다.";

	/** BCrypt는 72바이트까지만 사용한다 (REQ-17-2). */
	static final int BCRYPT_MAX_BYTES = 72;

	private static final Logger log = LoggerFactory.getLogger(UserService.class);

	private final UserRepository userRepository;

	private final PasswordEncoder passwordEncoder;

	public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	/** 이메일은 앞뒤 공백을 지우고 소문자로 저장·비교한다 (REQ-17-2). */
	public static String normalizeEmail(String email) {
		return (email != null) ? email.strip().toLowerCase(Locale.ROOT) : null;
	}

	public static boolean fitsBcrypt(String rawPassword) {
		return rawPassword != null && rawPassword.getBytes(StandardCharsets.UTF_8).length <= BCRYPT_MAX_BYTES;
	}

	@Transactional
	public User signup(String email, String rawPassword, String nickname) {
		String normalizedEmail = normalizeEmail(email);
		if (this.userRepository.existsByEmail(normalizedEmail)) {
			throw new ApiException(HttpStatus.CONFLICT, DUPLICATE_EMAIL_MESSAGE);
		}
		User user = new User(normalizedEmail, this.passwordEncoder.encode(rawPassword), nickname.strip());
		try {
			user = this.userRepository.saveAndFlush(user);
		}
		catch (DataIntegrityViolationException ex) {
			// 동시에 같은 이메일로 가입한 경우 (UNIQUE 제약)
			throw new ApiException(HttpStatus.CONFLICT, DUPLICATE_EMAIL_MESSAGE);
		}
		log.info("회원가입 userId={}", user.getId());
		return user;
	}

}
