package kr.seoulplan.web.user;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 회원 (REQ-17-1, REQ-18). 스키마는 db/migration/V1__create_users.sql. */
@Entity
@Table(name = "users")
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 255)
	private String email;

	@Column(name = "password_hash", nullable = false, length = 100)
	private String passwordHash;

	@Column(nullable = false, length = 50)
	private String nickname;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	protected User() {
	}

	public User(String email, String passwordHash, String nickname) {
		this.email = email;
		this.passwordHash = passwordHash;
		this.nickname = nickname;
		this.createdAt = LocalDateTime.now();
	}

	public Long getId() {
		return this.id;
	}

	public String getEmail() {
		return this.email;
	}

	public String getPasswordHash() {
		return this.passwordHash;
	}

	public String getNickname() {
		return this.nickname;
	}

	public LocalDateTime getCreatedAt() {
		return this.createdAt;
	}

}
