package com.mangaproject.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response for token validation")
public class ValidateTokenResponse {

    @Schema(description = "Whether the token is valid", example = "true")
    private boolean valid;

    @Schema(description = "Error message if token is invalid", example = "Token has expired")
    private String message;

    @Schema(description = "User email associated with the token (only if valid)", example = "user@example.com")
    private String email;

    // Constructor for valid token
    public ValidateTokenResponse(boolean valid, String email) {
        this.valid = valid;
        this.email = email;
        this.message = valid ? "Token is valid" : null;
    }

    // Constructor for invalid token
    public static ValidateTokenResponse invalid(String message) {
        return new ValidateTokenResponse(false, message, null);
    }

    // Constructor for valid token
    public static ValidateTokenResponse valid(String email) {
        return new ValidateTokenResponse(true, "Token is valid", email);
    }
}