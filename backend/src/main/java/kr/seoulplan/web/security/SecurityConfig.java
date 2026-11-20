package kr.seoulplan.web.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

/**
 * 세션 쿠키 기반 인증 (REQ-17-4 ~ REQ-17-6).
 *
 * <ul>
 * <li>인증 정보는 HttpSession에 저장한다 (JSESSIONID, HttpOnly, SameSite=Lax — application.yml).</li>
 * <li>CSRF: {@code csrf.spa()} — XSRF-TOKEN 쿠키(JS에서 읽기 가능) + X-XSRF-TOKEN 헤더.</li>
 * <li>회원가입·로그인·CSRF 발급만 공개, 나머지 /api/** 는 로그인 필요 (/api/chat 포함).</li>
 * </ul>
 */
@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
public class SecurityConfig {

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(); // REQ-17-3
	}

	@Bean
	SecurityContextRepository securityContextRepository() {
		return new HttpSessionSecurityContextRepository();
	}

	@Bean
	AuthenticationManager authenticationManager(UserDetailsService userDetailsService,
			PasswordEncoder passwordEncoder) {
		DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
		provider.setPasswordEncoder(passwordEncoder);
		return new ProviderManager(provider);
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityContextRepository securityContextRepository)
			throws Exception {
		http.csrf((csrf) -> csrf.spa())
			.securityContext((context) -> context.securityContextRepository(securityContextRepository))
			.authorizeHttpRequests((auth) -> auth.requestMatchers(HttpMethod.GET, "/api/auth/csrf")
				.permitAll()
				.requestMatchers(HttpMethod.POST, "/api/auth/signup", "/api/auth/login")
				.permitAll()
				.requestMatchers("/error")
				.permitAll()
				.anyRequest()
				.authenticated())
			.exceptionHandling((exceptions) -> exceptions
				.authenticationEntryPoint(JsonErrorWriter.authenticationEntryPoint())
				.accessDeniedHandler(JsonErrorWriter.accessDeniedHandler()))
			.logout((logout) -> logout.logoutUrl("/api/auth/logout")
				.logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
			.requestCache((cache) -> cache.disable())
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable);
		return http.build();
	}

}
