package com.mangaproject.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Slf4j
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final int  MAX_ATTEMPTS    = 5;
    private static final long WINDOW_SECONDS  = 60;

    // Key = "IP:username" — mỗi account bị track riêng, không ảnh hưởng account khác
    private final Map<String, AtomicInteger> attempts    = new ConcurrentHashMap<>();
    private final Map<String, Long>          windowStart = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !(request.getMethod().equals("POST")
                && request.getRequestURI().contains("/auth/login"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String ip = getClientIp(request);

        // Frontend gửi kèm header X-Login-Username để rate limit theo account
        // Nếu không có header → fallback về IP (vẫn có 1 lớp bảo vệ)
        String username = request.getHeader("X-Login-Username");
        String key = (username != null && !username.isBlank())
                ? ip + ":" + username.toLowerCase().trim()
                : ip;

        long now     = Instant.now().getEpochSecond();
        windowStart.putIfAbsent(key, now);
        long elapsed = now - windowStart.get(key);

        if (elapsed > WINDOW_SECONDS) {
            attempts.remove(key);
            windowStart.put(key, now);
            elapsed = 0;
        }

        AtomicInteger count = attempts.computeIfAbsent(key, k -> new AtomicInteger(0));

        if (count.get() >= MAX_ATTEMPTS) {
            long remaining = WINDOW_SECONDS - elapsed;
            log.warn("Rate limit exceeded for [{}] — {}s remaining", key, remaining);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                "{\"success\":false,\"data\":null," +
                "\"message\":\"Tài khoản này đã bị tạm khoá do đăng nhập sai quá nhiều lần. " +
                "Vui lòng thử lại sau " + remaining + " giây.\"," +
                "\"retryAfter\":" + remaining + "}"
            );
            return;
        }

        chain.doFilter(request, response);

        if (response.getStatus() >= 400 && response.getStatus() < 500) {
            int current = count.incrementAndGet();
            log.info("Failed login {}/{} for [{}] — {} left",
                    current, MAX_ATTEMPTS, key, MAX_ATTEMPTS - current);
        } else if (response.getStatus() == 200) {
            attempts.remove(key);
            windowStart.remove(key);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}