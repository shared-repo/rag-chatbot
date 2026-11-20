package kr.seoulplan.web.common;

import org.springframework.http.HttpStatus;

/** 사용자에게 그대로 보여줄 메시지와 상태 코드를 담는 예외. */
public class ApiException extends RuntimeException {

	private final HttpStatus status;

	public ApiException(HttpStatus status, String userMessage) {
		super(userMessage);
		this.status = status;
	}

	public HttpStatus getStatus() {
		return this.status;
	}

}
