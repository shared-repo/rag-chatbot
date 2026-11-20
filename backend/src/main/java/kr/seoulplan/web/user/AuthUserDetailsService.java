package kr.seoulplan.web.user;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 로그인 시 이메일로 회원을 조회한다. */
@Service
public class AuthUserDetailsService implements UserDetailsService {

	private final UserRepository userRepository;

	public AuthUserDetailsService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Override
	@Transactional(readOnly = true)
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
		return this.userRepository.findByEmail(UserService.normalizeEmail(username))
			.map(AuthUser::from)
			.orElseThrow(() -> new UsernameNotFoundException("user not found"));
	}

}
