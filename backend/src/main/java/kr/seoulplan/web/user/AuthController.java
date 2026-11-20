package kr.seoulplan.web.user;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import kr.seoulplan.web.common.ApiException;
import kr.seoulplan.web.common.ErrorResponse;
import kr.seoulplan.web.user.AuthDtos.LoginRequest;
import kr.seoulplan.web.user.AuthDtos.SignupRequest;
import kr.seoulplan.web.user.AuthDtos.UserResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 회원가입·로그인 API (REQ-17). 로그아웃은 Spring Security의 LogoutFilter가 처리한다
 * ({@code POST /api/auth/logout}, SecurityConfig).
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

	static final String BAD_CREDENTIALS_MESSAGE = "이메일 또는 비밀번호가 올바르지 않습니다.";

	static final String INVALID_INPUT_MESSAGE = "입력값을 확인해 주세요.";

	private static final Logger log = LoggerFactory.getLogger(AuthController.class);

	private final UserService userService;

	private final AuthenticationManager authenticationManager;

	private final SecurityContextRepository securityContextRepository;

	private final SecurityContextHolderStrategy securityContextHolderStrategy = SecurityContextHolder
		.getContextHolderStrategy();

	public AuthController(UserService userService, AuthenticationManager authenticationManager,
			SecurityContextRepository securityContextRepository) {
		this.userService = userService;
		this.authenticationManager = authenticationManager;
		this.securityContextRepository = securityContextRepository;
	}

	/** XSRF-TOKEN 쿠키를 발급한다 (REQ-17-5). 프론트엔드가 앱 시작·로그인·로그아웃 후 호출한다. */
	@GetMapping("/csrf")
	public ResponseEntity<Void> csrf(CsrfToken csrfToken) {
		csrfToken.getToken(); // 지연 로딩된 토큰을 읽어 쿠키에 기록되게 한다
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/signup")
	public ResponseEntity<UserResponse> signup(@Valid @RequestBody SignupRequest request) {
		if (!UserService.fitsBcrypt(request.password())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, AuthDtos.PASSWORD_RULE);
		}
		User user = this.userService.signup(request.email(), request.password(), request.nickname());
		return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
	}

	@PostMapping("/login")
	public UserResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest,
			HttpServletResponse httpResponse) {
		if (!UserService.fitsBcrypt(request.password())) {
			throw new ApiException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS_MESSAGE);
		}
		Authentication authentication;
		try {
			authentication = this.authenticationManager.authenticate(UsernamePasswordAuthenticationToken
				.unauthenticated(UserService.normalizeEmail(request.email()), request.password()));
		}
		catch (AuthenticationException ex) {
			log.info("로그인 실패: {}", ex.getClass().getSimpleName());
			throw new ApiException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS_MESSAGE);
		}

		// REQ-17-4: 세션 고정 공격 방지 — 기존 세션이 있으면 ID를 새로 발급한다.
		if (httpRequest.getSession(false) != null) {
			httpRequest.changeSessionId();
		}
		SecurityContext context = this.securityContextHolderStrategy.createEmptyContext();
		context.setAuthentication(authentication);
		this.securityContextHolderStrategy.setContext(context);
		this.securityContextRepository.saveContext(context, httpRequest, httpResponse);

		AuthUser user = (AuthUser) authentication.getPrincipal();
		log.info("로그인 userId={}", user.getId());
		return UserResponse.from(user);
	}

	@GetMapping("/me")
	public UserResponse me(@AuthenticationPrincipal AuthUser user) {
		return UserResponse.from(user);
	}

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ErrorResponse> handleApi(ApiException ex) {
		return ResponseEntity.status(ex.getStatus()).body(new ErrorResponse(ex.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ErrorResponse> handleInvalid(MethodArgumentNotValidException ex) {
		String message = ex.getBindingResult()
			.getFieldErrors()
			.stream()
			.map(FieldError::getDefaultMessage)
			.findFirst()
			.orElse(INVALID_INPUT_MESSAGE);
		return ResponseEntity.badRequest().body(new ErrorResponse(message));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException ex) {
		return ResponseEntity.badRequest().body(new ErrorResponse(INVALID_INPUT_MESSAGE));
	}

}
