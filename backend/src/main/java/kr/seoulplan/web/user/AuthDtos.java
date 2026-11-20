package kr.seoulplan.web.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 인증 API 요청/응답 (REQ-17). */
public final class AuthDtos {

	static final String EMAIL_REQUIRED = "이메일을 입력해 주세요.";

	static final String EMAIL_INVALID = "이메일 형식이 올바르지 않습니다.";

	static final String PASSWORD_REQUIRED = "비밀번호를 입력해 주세요.";

	static final String PASSWORD_RULE = "비밀번호는 8~64자로 입력해 주세요.";

	static final String NICKNAME_REQUIRED = "닉네임을 입력해 주세요.";

	static final String NICKNAME_RULE = "닉네임은 2~20자로 입력해 주세요.";

	private AuthDtos() {
	}

	private static String strip(String value) {
		return (value != null) ? value.strip() : null;
	}

	/** 회원가입 요청. 이메일·닉네임은 앞뒤 공백을 지운 뒤 검증한다. */
	public record SignupRequest(
			@NotBlank(message = EMAIL_REQUIRED) @Email(message = EMAIL_INVALID) @Size(max = 255,
					message = EMAIL_INVALID) String email,
			@NotBlank(message = PASSWORD_REQUIRED) @Size(min = 8, max = 64, message = PASSWORD_RULE) String password,
			@NotBlank(message = NICKNAME_REQUIRED) @Size(min = 2, max = 20, message = NICKNAME_RULE) String nickname) {

		public SignupRequest {
			email = strip(email);
			nickname = strip(nickname);
		}

	}

	public record LoginRequest(
			@NotBlank(message = EMAIL_REQUIRED) String email,
			@NotBlank(message = PASSWORD_REQUIRED) String password) {

		public LoginRequest {
			email = strip(email);
		}

	}

	public record UserResponse(Long id, String email, String nickname) {

		public static UserResponse from(User user) {
			return new UserResponse(user.getId(), user.getEmail(), user.getNickname());
		}

		public static UserResponse from(AuthUser user) {
			return new UserResponse(user.getId(), user.getEmail(), user.getNickname());
		}

	}

}
