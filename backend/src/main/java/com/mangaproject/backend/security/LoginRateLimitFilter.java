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

    // Tối đa 5 lần login thất bại trong 60 giây mỗi IP
    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_SECONDS = 60;

    private final Map<String, AtomicInteger> attempts = new ConcurrentHashMap<>();
    private final Map<String, Long> windowStart = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Chỉ áp dụng cho POST /api/auth/login
        return !(request.getMethod().equals("POST")
                && request.getRequestURI().contains("/auth/login"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String ip = getClientIp(request);
        long now = Instant.now().getEpochSecond();

        // Reset counter nếu window đã qua
        windowStart.putIfAbsent(ip, now);
        if (now - windowStart.get(ip) > WINDOW_SECONDS) {
            attempts.remove(ip);
            windowStart.put(ip, now);
        }

        AtomicInteger count = attempts.computeIfAbsent(ip, k -> new AtomicInteger(0));
        if (count.get() >= MAX_ATTEMPTS) {
            log.warn("Rate limit exceeded for IP: {}", ip);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\":false,\"data\":null,\"message\":\"Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 60 giây.\"}"
            );
            return;
        }

        // Tiếp tục request, sau khi xử lý check kết quả
        chain.doFilter(request, response);

        // Nếu login thất bại (4xx) thì tăng counter
        if (response.getStatus() >= 400 && response.getStatus() < 500) {
            count.incrementAndGet();
            log.info("Failed login attempt {}/{} from IP: {}", count.get(), MAX_ATTEMPTS, ip);
        } else if (response.getStatus() == 200) {
            // Login thành công → reset counter
            attempts.remove(ip);
            windowStart.remove(ip);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
