package kr.seoulplan.web.common;

/** 모든 API의 오류 응답 형식 (F3-16, REQ-17-9). FastAPI의 {"detail": "..."}와 같다. */
public record ErrorResponse(String detail) {
}
