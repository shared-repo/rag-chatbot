package kr.seoulplan.web.user;

import java.io.Serial;
import java.util.Collection;
import java.util.List;

import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * 로그인한 사용자 (세션에 저장되는 인증 주체, REQ-17-4).
 *
 * <p>인증이 끝나면 {@link #eraseCredentials()}로 비밀번호 해시를 지워 세션에 남기지 않는다.
 */
public final class AuthUser implements UserDetails, CredentialsContainer {

	@Serial
	private static final long serialVersionUID = 1L;

	private final Long id;

	private final String email;

	private final String nickname;

	private String passwordHash;

	public AuthUser(Long id, String email, String nickname, String passwordHash) {
		this.id = id;
		this.email = email;
		this.nickname = nickname;
		this.passwordHash = passwordHash;
	}

	public static AuthUser from(User user) {
		return new AuthUser(user.getId(), user.getEmail(), user.getNickname(), user.getPasswordHash());
	}

	public Long getId() {
		return this.id;
	}

	public String getEmail() {
		return this.email;
	}

	public String getNickname() {
		return this.nickname;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return List.of();
	}

	@Override
	public String getPassword() {
		return this.passwordHash;
	}

	@Override
	public String getUsername() {
		return this.email;
	}

	@Override
	public void eraseCredentials() {
		this.passwordHash = null;
	}

}
