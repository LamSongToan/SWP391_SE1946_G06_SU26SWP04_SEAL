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
import java.util.Locale;

@Service
public class GitMetadataService {

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
            return fetchAndStore(submissionId);
        }
        try {
            return objectMapper.readValue(submission.getGithubMetadata(), GitMetadataDto.class);
        } catch (Exception e) {
            return fetchAndStore(submissionId);
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
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create("https://api.github.com/repos/" + owner + "/" + repo))
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .GET();
        if (githubToken != null && !githubToken.isBlank()) {
            builder.header("Authorization", "Bearer " + githubToken);
        }
        HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 404) throw new ApiException(HttpStatus.NOT_FOUND, "Repository not found or is private");
        if (response.statusCode() != 200) throw new ApiException(HttpStatus.BAD_GATEWAY, "GitHub API returned " + response.statusCode());

        JsonNode node = objectMapper.readTree(response.body());

        int commitCount = 0;
        try {
            HttpRequest.Builder cBuilder = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.github.com/repos/" + owner + "/" + repo + "/commits?per_page=1"))
                    .header("Accept", "application/vnd.github+json").GET();
            if (githubToken != null && !githubToken.isBlank()) {
                cBuilder.header("Authorization", "Bearer " + githubToken);
            }
            HttpResponse<String> cResponse = httpClient.send(cBuilder.build(), HttpResponse.BodyHandlers.ofString());
            String link = cResponse.headers().firstValue("Link").orElse("");
            if (link.contains("rel=\"last\"")) {
                String lastUrl = link.replaceAll(".*<([^>]+)>; rel=\"last\".*", "$1");
                for (String param : URI.create(lastUrl).getQuery().split("&")) {
                    if (param.startsWith("page=")) commitCount = Integer.parseInt(param.substring(5));
                }
            }
        } catch (Exception ignored) {}

        return new GitMetadataDto(url, owner, repo, "github",
                node.path("stargazers_count").asInt(0),
                node.path("forks_count").asInt(0),
                node.path("open_issues_count").asInt(0),
                node.path("default_branch").asText("main"),
                node.path("description").asText(null),
                node.path("language").asText(null),
                node.path("pushed_at").asText(null),
                commitCount,
                node.path("license").path("spdx_id").asText(null));
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
        return new GitMetadataDto(url, owner, repo, "gitlab",
                node.path("star_count").asInt(0),
                node.path("forks_count").asInt(0),
                node.path("open_issues_count").asInt(0),
                node.path("default_branch").asText("main"),
                node.path("description").asText(null),
                null,
                node.path("last_activity_at").asText(null),
                0, null);
    }

    private SubmissionEntity getOrThrow(Integer submissionId) {
        return submissionRepository.findDetailedById(submissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Submission not found"));
    }
}