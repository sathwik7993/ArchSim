package com.designlab.archsim.web;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Translates Bean Validation failures into a clean 400 response with per-field
 * messages, instead of the opaque default error body.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> onValidation(MethodArgumentNotValidException ex) {
    Map<String, String> fields = new LinkedHashMap<>();
    for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
      fields.putIfAbsent(fe.getField(), fe.getDefaultMessage());
    }
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("error", "Some fields are invalid.");
    body.put("fields", fields);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
  }
}
