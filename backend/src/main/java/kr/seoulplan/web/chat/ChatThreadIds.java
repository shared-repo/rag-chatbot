package kr.seoulplan.web.chat;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * FastAPI(LangGraph thread_id)로 보낼 대화 ID (REQ-17-7).
 *
 * <p>브라우저가 보낸 session_id를 사용자 ID와 묶은 이름 기반 UUID로 바꾼다. 다른 사용자가 같은 session_id를
 * 보내도 서로 다른 대화로 처리된다. 같은 입력에는 항상 같은 값이 나온다.
 */
public final class ChatThreadIds {

	private ChatThreadIds() {
	}

	public static UUID forUser(long userId, UUID sessionId) {
		String name = "seoulplan-chat:user:" + userId + ":session:" + sessionId;
		return UUID.nameUUIDFromBytes(name.getBytes(StandardCharsets.UTF_8));
	}

}
