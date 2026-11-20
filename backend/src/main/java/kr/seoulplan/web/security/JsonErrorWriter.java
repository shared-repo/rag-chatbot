package kr.seoulplan.web.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

/** Spring Security 필터 단계의 오류를 {"detail": "..."} JSON으로 응답한다 (REQ-17-9). */
final class JsonErrorWriter {

	static final String LOGIN_REQUIRED_MESSAGE = "로그인이 필요합니다.";

	static final String FORBIDDEN_MESSAGE = "요청이 거부되었습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.";

	private JsonErrorWriter() {
	}

	/** 미인증 → 401 (REQ-17-6). */
	static AuthenticationEntryPoint authenticationEntryPoint() {
		return (request, response, ex) -> write(response, HttpStatus.UNAUTHORIZED, LOGIN_REQUIRED_MESSAGE);
	}

	/** CSRF 토큰 누락·불일치 등 → 403 (REQ-17-5). */
	static AccessDeniedHandler accessDeniedHandler() {
		return (request, response, ex) -> write(response, HttpStatus.FORBIDDEN, FORBIDDEN_MESSAGE);
	}

	/** detail은 따옴표·역슬래시가 없는 고정 문구만 사용한다. */
	private static void write(HttpServletResponse response, HttpStatus status, String detail) throws IOException {
		response.setStatus(status.value());
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.getWriter().write("{\"detail\":\"" + detail + "\"}");
	}

}
