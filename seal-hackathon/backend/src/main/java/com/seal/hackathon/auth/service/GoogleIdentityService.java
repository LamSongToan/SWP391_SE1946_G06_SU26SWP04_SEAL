package com.seal.hackathon.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.hackathon.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class GoogleIdentityService {

    private static final String TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    public GoogleIdentityService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public GoogleUserProfile verifyIdToken(String idToken) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Google sign-in is not configured");
        }

        try {
            String encodedIdToken = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(TOKEN_INFO_URL + encodedIdToken))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Google account");
            }

            JsonNode payload = objectMapper.readTree(response.body());
            String audience = payload.path("aud").asText("");
            if (!googleClientId.equals(audience)) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Google account is not valid for this application");
            }

            String emailVerified = payload.path("email_verified").asText("false");
            if (!"true".equalsIgnoreCase(emailVerified)) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Google account email is not verified");
            }

            String email = payload.path("email").asText("").trim().toLowerCase(Locale.ROOT);
            if (email.isBlank()) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Google account does not provide an email");
            }

            String fullName = payload.path("name").asText("").trim();
            String pictureUrl = payload.path("picture").asText(null);
            return new GoogleUserProfile(email, fullName, pictureUrl);
        } catch (ApiException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Failed to read Google account information");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Google sign-in was interrupted");
        }
    }

    public record GoogleUserProfile(
            String email,
            String fullName,
            String pictureUrl
    ) {
    }
}
