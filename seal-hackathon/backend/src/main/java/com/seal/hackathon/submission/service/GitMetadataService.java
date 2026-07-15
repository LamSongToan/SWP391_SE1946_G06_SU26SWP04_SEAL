package com.seal.hackathon.submission.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.submission.dto.GitMetadataDto;
import com.seal.hackathon.submission.entity.SubmissionEntity;
import com.seal.hackathon.submission.repository.SubmissionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.Locale;

@Service
public class GitMetadataService {

    private static final String GITHUB_USER_AGENT = "SEAL-Hackathon-Management-System";

    private final SubmissionRepository submissionRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${app.github.token:}")
    private String githubToken;

    public GitMetadataService(SubmissionRepository submissionRepository, ObjectMapper objectMapper) {
        this.submissionRepository = submissionRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    @Transactional
    public GitMetadataDto fetchAndStore(Integer submissionId) {
        SubmissionEntity submission = getOrThrow(submissionId);
        GitMetadataDto metadata = fetch(submission.getRepositoryUrl());
        try {
            submission.setGithubMetadata(objectMapper.writeValueAsString(metadata));
            submissionRepository.save(submission);
        } catch (Exception ignored) {}
        return metadata;
    }

    @Transactional(readOnly = true)
    public GitMetadataDto getStored(Integer submissionId) {
        SubmissionEntity submission = getOrThrow(submissionId);
        if (submission.getGithubMetadata() == null) {
            return null;
        }
        try {
            return objectMapper.readValue(submission.getGithubMetadata(), GitMetadataDto.class);
        } catch (Exception e) {
            return null;
        }
    }

    public GitMetadataDto fetch(String repositoryUrl) {
        try {
            URI uri = URI.create(repositoryUrl);
            String host = uri.getHost().toLowerCase(Locale.ROOT).replace("www.", "");
            String path = uri.getPath().replaceAll("^/+|/+$|\\.git$", "");
            String[] parts = path.split("/");
            if (parts.length < 2) throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid repository URL");
            String owner = parts[0];
            String repo = parts[1];
            if (host.equals("github.com")) return fetchGitHub(owner, repo, repositoryUrl);
            if (host.equals("gitlab.com")) return fetchGitLab(owner, repo, repositoryUrl);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only GitHub and GitLab repositories are supported");
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Failed to fetch repository metadata: " + e.getMessage());
        }
    }

    private GitMetadataDto fetchGitHub(String owner, String repo, String url) throws Exception {
        HttpRequest.Builder builder = githubRequest("https://api.github.com/repos/" + owner + "/" + repo)
                .GET();
        HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 404) throw new ApiException(HttpStatus.NOT_FOUND, "Repository not found or is private");
        if (response.statusCode() != 200) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, githubErrorMessage(response));
        }

        JsonNode node = objectMapper.readTree(response.body());

        int commitCount = 0;
        try {
            HttpRequest.Builder cBuilder = githubRequest("https://api.github.com/repos/" + owner + "/" + repo + "/commits?per_page=1").GET();
            HttpResponse<String> cResponse = httpClient.send(cBuilder.build(), HttpResponse.BodyHandlers.ofString());
            String link = cResponse.headers().firstValue("Link").orElse("");
            if (link.contains("rel=\"last\"")) {
                String lastUrl = link.replaceAll(".*<([^>]+)>; rel=\"last\".*", "$1");
                for (String param : URI.create(lastUrl).getQuery().split("&")) {
                    if (param.startsWith("page=")) commitCount = Integer.parseInt(param.substring(5));
                }
            }
        } catch (Exception ignored) {}

        int contributorCount = 0;
        try {
            HttpRequest.Builder contributorsBuilder = githubRequest("https://api.github.com/repos/" + owner + "/" + repo + "/contributors?per_page=1&anon=1").GET();
            HttpResponse<String> contributorsResponse = httpClient.send(contributorsBuilder.build(), HttpResponse.BodyHandlers.ofString());
            String link = contributorsResponse.headers().firstValue("Link").orElse("");
            if (link.contains("rel=\"last\"")) {
                String lastUrl = link.replaceAll(".*<([^>]+)>; rel=\"last\".*", "$1");
                for (String param : URI.create(lastUrl).getQuery().split("&")) {
                    if (param.startsWith("page=")) contributorCount = Integer.parseInt(param.substring(5));
                }
            } else if (contributorsResponse.statusCode() == 200) {
                JsonNode contributorsNode = objectMapper.readTree(contributorsResponse.body());
                if (contributorsNode.isArray()) {
                    contributorCount = contributorsNode.size();
                }
            }
        } catch (Exception ignored) {}

        double repositorySizeMb = node.path("size").asDouble(0D) / 1024D;

        return new GitMetadataDto(url, owner, repo, "github",
                node.path("private").asBoolean(false) ? "Private" : "Public",
                node.path("stargazers_count").asInt(0),
                node.path("forks_count").asInt(0),
                node.path("open_issues_count").asInt(0),
                contributorCount,
                repositorySizeMb,
                node.path("default_branch").asText("main"),
                node.path("description").asText(null),
                node.path("language").asText(null),
                node.path("pushed_at").asText(null),
                commitCount,
                node.path("license").path("spdx_id").asText(null));
    }

    private HttpRequest.Builder githubRequest(String apiUrl) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("User-Agent", GITHUB_USER_AGENT);
        String token = resolveGithubToken();
        if (token != null && !token.isBlank()) {
            builder.header("Authorization", "Bearer " + token.trim());
        }
        return builder;
    }

    private String resolveGithubToken() {
        if (githubToken != null && !githubToken.isBlank()) {
            return githubToken;
        }
        return System.getenv("GITHUB_TOKEN");
    }

    private String githubErrorMessage(HttpResponse<String> response) {
        if (response.statusCode() == 403) {
            String resetAt = response.headers()
                    .firstValue("X-RateLimit-Reset")
                    .map(this::formatRateLimitReset)
                    .orElse("the rate limit reset time");
            return "GitHub API rate limit exceeded. Try again after " + resetAt
                    + " or configure app.github.token, APP_GITHUB_TOKEN, or GITHUB_TOKEN.";
        }
        return "GitHub API returned " + response.statusCode();
    }

    private String formatRateLimitReset(String epochSeconds) {
        try {
            return Instant.ofEpochSecond(Long.parseLong(epochSeconds)).toString();
        } catch (Exception e) {
            return "the rate limit reset time";
        }
    }

    private GitMetadataDto fetchGitLab(String owner, String repo, String url) throws Exception {
        String encoded = (owner + "/" + repo).replace("/", "%2F");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://gitlab.com/api/v4/projects/" + encoded))
                .header("Accept", "application/json").GET().build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 404) throw new ApiException(HttpStatus.NOT_FOUND, "Repository not found or is private");
        if (response.statusCode() != 200) throw new ApiException(HttpStatus.BAD_GATEWAY, "GitLab API returned " + response.statusCode());
        JsonNode node = objectMapper.readTree(response.body());
        JsonNode statistics = node.path("statistics");
        double repositorySizeMb = statistics.path("repository_size").asDouble(0D) / (1024D * 1024D);
        return new GitMetadataDto(url, owner, repo, "gitlab",
                normalizeGitLabVisibility(node.path("visibility").asText(null)),
                node.path("star_count").asInt(0),
                node.path("forks_count").asInt(0),
                node.path("open_issues_count").asInt(0),
                null,
                repositorySizeMb > 0 ? repositorySizeMb : null,
                node.path("default_branch").asText("main"),
                node.path("description").asText(null),
                null,
                node.path("last_activity_at").asText(null),
                0, null);
    }

    private String normalizeGitLabVisibility(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "private" -> "Private";
            case "public" -> "Public";
            case "internal" -> "Internal";
            default -> value;
        };
    }

    private SubmissionEntity getOrThrow(Integer submissionId) {
        return submissionRepository.findDetailedById(submissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Submission not found"));
    }
}
