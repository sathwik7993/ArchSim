package com.designlab.archsim.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Bring-your-own-key proxy to the Google Gemini API. The student's key arrives
 * per-request in a header, is used once to call Gemini, and is never stored or
 * logged. Proxying keeps the key out of the browser bundle and avoids browser
 * CORS restrictions.
 *
 * The frontend sends provider-agnostic OpenAI-style messages; this controller
 * translates them to Gemini's generateContent format and requests a JSON
 * response (responseMimeType) so the structured evaluation parses reliably.
 * Every failure path returns { "error": "<human message>" } and logs the
 * underlying Gemini status/body.
 */
@RestController
@RequestMapping("/api/v1/evaluate")
public class EvaluationController {
  private static final Logger log = LoggerFactory.getLogger(EvaluationController.class);
  private static final String DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta";
  private static final String DEFAULT_MODEL = "gemini-3.5-flash";

  private final ObjectMapper mapper;
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
  private final String baseUrl = System.getenv().getOrDefault("GEMINI_BASE_URL", DEFAULT_BASE);

  public EvaluationController(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  @PostMapping
  public ResponseEntity<JsonNode> evaluate(
      @RequestHeader(value = "X-Gemini-Api-Key", required = false) String apiKey,
      @RequestBody EvalRequest req) {
    if (apiKey == null || apiKey.isBlank()) {
      return error(HttpStatus.BAD_REQUEST, "Missing Google Gemini API key — add it in Settings.");
    }
    if (req == null || req.messages() == null || req.messages().isEmpty()) {
      return error(HttpStatus.BAD_REQUEST, "No design to evaluate.");
    }

    String model = req.model() == null || req.model().isBlank() ? DEFAULT_MODEL : req.model();

    // Translate OpenAI-style messages -> Gemini format.
    ObjectNode body = mapper.createObjectNode();
    StringBuilder systemText = new StringBuilder();
    ArrayNode contents = mapper.createArrayNode();
    for (Message m : req.messages()) {
      if ("system".equals(m.role())) {
        if (systemText.length() > 0) systemText.append("\n\n");
        systemText.append(m.content());
      } else {
        ObjectNode c = contents.addObject();
        c.put("role", "assistant".equals(m.role()) ? "model" : "user");
        c.putArray("parts").addObject().put("text", m.content());
      }
    }
    if (systemText.length() > 0) {
      body.putObject("systemInstruction").putArray("parts").addObject().put("text", systemText.toString());
    }
    body.set("contents", contents);
    ObjectNode gen = body.putObject("generationConfig");
    gen.put("temperature", 0.3);
    gen.put("topP", 0.9);
    gen.put("maxOutputTokens", 8192);
    gen.put("responseMimeType", "application/json");

    HttpResponse<String> resp;
    try {
      HttpRequest httpReq = HttpRequest.newBuilder(URI.create(baseUrl + "/models/" + model + ":generateContent"))
          .timeout(Duration.ofSeconds(120))
          .header("Content-Type", "application/json")
          .header("x-goog-api-key", apiKey.trim())
          .POST(HttpRequest.BodyPublishers.ofString(writeJson(body)))
          .build();
      resp = http.send(httpReq, HttpResponse.BodyHandlers.ofString());
    } catch (Exception e) {
      log.warn("Gemini call failed for model {}: {}", model, e.toString());
      boolean timeout = e instanceof java.net.http.HttpTimeoutException || e.toString().toLowerCase().contains("timeout");
      return error(HttpStatus.BAD_GATEWAY, timeout
          ? "Gemini took too long to respond. Try again, or pick a lighter model (Flash-Lite)."
          : "Could not reach Google Gemini: " + e.getMessage());
    }

    int code = resp.statusCode();
    if (code / 100 != 2) {
      String detail = extractGeminiMessage(resp.body());
      log.warn("Gemini returned {} for model {}: {}", code, model, truncate(resp.body()));
      return switch (code) {
        case 400 -> detail.toLowerCase().contains("api key") || detail.toLowerCase().contains("api_key")
            ? error(HttpStatus.UNAUTHORIZED, "Google rejected your API key. Check it in Settings.")
            : error(HttpStatus.BAD_GATEWAY, "Gemini rejected the request: " + detail);
        case 401, 403 -> error(HttpStatus.UNAUTHORIZED, "Google rejected your API key (unauthorized). Check it in Settings.");
        case 404 -> error(HttpStatus.BAD_GATEWAY, "Model \"" + model + "\" isn't available. Pick another model. (" + detail + ")");
        case 429 -> error(HttpStatus.TOO_MANY_REQUESTS, "Gemini free-tier rate limit hit. Wait a minute and retry, or try a lighter model.");
        default -> error(HttpStatus.BAD_GATEWAY, "Gemini error " + code + ": " + detail);
      };
    }

    try {
      JsonNode root = mapper.readTree(resp.body());
      JsonNode candidate = root.path("candidates").path(0);
      String text = candidate.path("content").path("parts").path(0).path("text").asText("");

      if (text.isBlank()) {
        String blockReason = root.path("promptFeedback").path("blockReason").asText("");
        String finish = candidate.path("finishReason").asText("");
        if (!blockReason.isBlank()) {
          return error(HttpStatus.BAD_GATEWAY, "Gemini blocked the request (safety: " + blockReason + ").");
        }
        if ("MAX_TOKENS".equals(finish)) {
          return error(HttpStatus.BAD_GATEWAY, "The response was cut off (token limit). Try again or a lighter model.");
        }
        return error(HttpStatus.BAD_GATEWAY, "Gemini returned an empty response. Try again.");
      }

      ObjectNode out = mapper.createObjectNode();
      out.put("content", text);
      out.put("model", model);
      return ResponseEntity.ok(out);
    } catch (Exception e) {
      log.warn("Malformed Gemini response for model {}: {}", model, e.toString());
      return error(HttpStatus.BAD_GATEWAY, "Malformed response from Gemini. Try again.");
    }
  }

  private String writeJson(ObjectNode node) {
    try {
      return mapper.writeValueAsString(node);
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private ResponseEntity<JsonNode> error(HttpStatus status, String message) {
    ObjectNode node = mapper.createObjectNode();
    node.put("error", message);
    return ResponseEntity.status(status).body(node);
  }

  /** Gemini errors are {"error":{"code":.., "message":"..", "status":".."}}. */
  private String extractGeminiMessage(String body) {
    try {
      JsonNode n = mapper.readTree(body);
      if (n.path("error").hasNonNull("message")) return n.path("error").get("message").asText();
      if (n.hasNonNull("message")) return n.get("message").asText();
    } catch (Exception ignored) {
      // fall through
    }
    return truncate(body);
  }

  private static String truncate(String s) {
    if (s == null || s.isBlank()) return "no details";
    return s.length() > 300 ? s.substring(0, 300) : s;
  }

  public record EvalRequest(String model, List<Message> messages) {}

  public record Message(String role, String content) {}
}
