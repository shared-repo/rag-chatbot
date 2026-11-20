package kr.seoulplan.web.user;

import java.util.List;
import java.util.UUID;

import kr.seoulplan.web.chat.ChatDtos.ChatRequest;
import kr.seoulplan.web.chat.ChatDtos.ChatResponse;
import kr.seoulplan.web.chat.ChatDtos.Source;
import kr.seoulplan.web.chat.ChatThreadIds;
import kr.seoulplan.web.chat.ChatbotApiClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 회원가입·로그인·로그아웃과 챗봇 인증 (REQ-17, AC-18 ~ AC-24). H2 사용 (REQ-18-4). */
@SpringBootTest
@ActiveProfiles("test")
class AuthApiTest {

	private static final String EMAIL = "tester@example.com";

	private static final String PASSWORD = "password123!";

	private static final String SESSION_ID = "6f1c2b9e-1d2a-4a59-9d7e-1b2c3d4e5f60";

	@Autowired
	private WebApplicationContext context;

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@MockitoBean
	private ChatbotApiClient chatbotApiClient;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		this.userRepository.deleteAll();
		this.mockMvc = MockMvcBuilders.webAppContextSetup(this.context).apply(springSecurity()).build();
	}

	private ResultActions signup(String email, String password, String nickname) throws Exception {
		return this.mockMvc.perform(post("/api/auth/signup").with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"email": "%s", "password": "%s", "nickname": "%s"}""".formatted(email, password, nickname)));
	}

	private ResultActions login(String email, String password) throws Exception {
		return this.mockMvc.perform(post("/api/auth/login").with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content("""
					{"email": "%s", "password": "%s"}""".formatted(email, password)));
	}

	private MockHttpSession signupAndLogin() throws Exception {
		signup(EMAIL, PASSWORD, "테스터").andExpect(status().isCreated());
		MvcResult result = login(EMAIL, PASSWORD).andExpect(status().isOk()).andReturn();
		MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
		assertThat(session).isNotNull();
		return session;
	}

	@Test
	void csrfEndpointIssuesXsrfCookie() throws Exception { // REQ-17-5
		this.mockMvc.perform(get("/api/auth/csrf"))
			.andExpect(status().isNoContent())
			.andExpect(cookie().exists("XSRF-TOKEN"))
			.andExpect(cookie().httpOnly("XSRF-TOKEN", false));
	}

	@Test
	void signupStoresNormalizedEmailAndBcryptHash() throws Exception { // AC-18
		signup("  Tester@Example.COM ", PASSWORD, " 테스터 ").andExpect(status().isCreated())
			.andExpect(jsonPath("$.email").value(EMAIL))
			.andExpect(jsonPath("$.nickname").value("테스터"))
			.andExpect(jsonPath("$.password").doesNotExist());

		User saved = this.userRepository.findByEmail(EMAIL).orElseThrow();
		assertThat(saved.getPasswordHash()).isNotEqualTo(PASSWORD).startsWith("$2");
		assertThat(this.passwordEncoder.matches(PASSWORD, saved.getPasswordHash())).isTrue();
	}

	@Test
	void duplicateEmailIsConflict() throws Exception { // AC-19
		signup(EMAIL, PASSWORD, "테스터").andExpect(status().isCreated());
		signup("TESTER@example.com", PASSWORD, "다른사람").andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value(UserService.DUPLICATE_EMAIL_MESSAGE));
	}

	@Test
	void signupValidatesInput() throws Exception { // REQ-17-2
		signup("not-an-email", PASSWORD, "테스터").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value(AuthDtos.EMAIL_INVALID));
		signup(EMAIL, "short", "테스터").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value(AuthDtos.PASSWORD_RULE));
		signup(EMAIL, "가".repeat(30), "테스터").andExpect(status().isBadRequest()) // 90바이트 > 72
			.andExpect(jsonPath("$.detail").value(AuthDtos.PASSWORD_RULE));
		signup(EMAIL, PASSWORD, " 가 ").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value(AuthDtos.NICKNAME_RULE));
		assertThat(this.userRepository.count()).isZero();
	}

	@Test
	void postWithoutCsrfTokenIsForbidden() throws Exception { // AC-23
		this.mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content("""
				{"email": "%s", "password": "%s", "nickname": "테스터"}""".formatted(EMAIL, PASSWORD)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.detail").exists());
		assertThat(this.userRepository.count()).isZero();
	}

	@Test
	void loginCreatesSessionAndMeReturnsUser() throws Exception {
		MockHttpSession session = signupAndLogin();

		this.mockMvc.perform(get("/api/auth/me").session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(EMAIL))
			.andExpect(jsonPath("$.nickname").value("테스터"));
	}

	@Test
	void loginIsCaseInsensitiveForEmail() throws Exception {
		signup(EMAIL, PASSWORD, "테스터").andExpect(status().isCreated());
		login("Tester@Example.com", PASSWORD).andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(EMAIL));
	}

	@Test
	void wrongPasswordOrUnknownEmailIsUnauthorized() throws Exception {
		signup(EMAIL, PASSWORD, "테스터").andExpect(status().isCreated());
		login(EMAIL, "wrong-password").andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.detail").value(AuthController.BAD_CREDENTIALS_MESSAGE));
		login("nobody@example.com", PASSWORD).andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.detail").value(AuthController.BAD_CREDENTIALS_MESSAGE));
	}

	@Test
	void meWithoutLoginIsUnauthorized() throws Exception {
		this.mockMvc.perform(get("/api/auth/me"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.detail").value("로그인이 필요합니다."));
	}

	@Test
	void logoutInvalidatesSession() throws Exception { // AC-22
		MockHttpSession session = signupAndLogin();

		this.mockMvc.perform(post("/api/auth/logout").with(csrf()).session(session))
			.andExpect(status().isNoContent());
		assertThat(session.isInvalid()).isTrue();
		this.mockMvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
	}

	@Test
	void chatRequiresLogin() throws Exception { // AC-20
		this.mockMvc.perform(post("/api/chat").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
				{"session_id": "%s", "message": "보행일상권이란?"}""".formatted(SESSION_ID)))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.detail").value("로그인이 필요합니다."));
		verify(this.chatbotApiClient, never()).chat(any());
	}

	@Test
	void chatAfterLoginForwardsUserScopedSessionId() throws Exception { // AC-21, AC-24
		MockHttpSession session = signupAndLogin();
		long userId = this.userRepository.findByEmail(EMAIL).orElseThrow().getId();
		UUID threadId = ChatThreadIds.forUser(userId, UUID.fromString(SESSION_ID));
		given(this.chatbotApiClient.chat(new ChatRequest(threadId, "보행일상권이란?")))
			.willReturn(new ChatResponse(threadId, "보행일상권은 ...", "urban_planning", List.of(new Source(54, "보행"))));

		this.mockMvc
			.perform(post("/api/chat").with(csrf()).session(session).contentType(MediaType.APPLICATION_JSON).content("""
					{"session_id": "%s", "message": "보행일상권이란?"}""".formatted(SESSION_ID)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.session_id").value(SESSION_ID))
			.andExpect(jsonPath("$.answer").value("보행일상권은 ..."))
			.andExpect(jsonPath("$.sources[0].page").value(54));
		verify(this.chatbotApiClient).chat(new ChatRequest(threadId, "보행일상권이란?"));
	}

}
