package abopijservice.code.aiirtran.controller;

import abopijservice.code.aiirtran.service.AiProviderException;
import abopijservice.code.aiirtran.service.AiUnavailableException;
import abopijservice.code.aiirtran.service.DocumentAccessException;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst().filter(
                        error -> error.getDefaultMessage() != null
                )
                .map(DefaultMessageSourceResolvable::getDefaultMessage)
                .orElse("Некорректный запрос");
        return response(HttpStatus.BAD_REQUEST, "invalid_request", message);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiError> badRequest(IllegalArgumentException exception) {
        return response(HttpStatus.BAD_REQUEST, "invalid_request", exception.getMessage());
    }

    @ExceptionHandler(DocumentAccessException.class)
    ResponseEntity<ApiError> inaccessibleDocument(DocumentAccessException exception) {
        return response(HttpStatus.NOT_FOUND, "document_not_found", exception.getMessage());
    }

    @ExceptionHandler(AiUnavailableException.class)
    ResponseEntity<ApiError> unavailable(AiUnavailableException exception) {
        return response(HttpStatus.SERVICE_UNAVAILABLE, "ai_not_configured", exception.getMessage());
    }

    @ExceptionHandler(AiProviderException.class)
    ResponseEntity<ApiError> providerFailure(AiProviderException exception) {
        return response(HttpStatus.BAD_GATEWAY, "ai_provider_error", exception.getMessage());
    }

    private ResponseEntity<ApiError> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ApiError(code, message, Instant.now()));
    }

    record ApiError(String error, String message, Instant timestamp) {
    }
}
