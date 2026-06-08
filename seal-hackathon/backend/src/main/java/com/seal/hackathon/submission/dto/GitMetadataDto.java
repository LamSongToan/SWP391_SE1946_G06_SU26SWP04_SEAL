package com.seal.hackathon.submission.dto;

public record GitMetadataDto(
        String repositoryUrl,
        String owner,
        String repoName,
        String platform,
        Integer stars,
        Integer forks,
        Integer openIssues,
        String defaultBranch,
        String description,
        String language,
        String lastPushedAt,
        Integer commitCount,
        String license
) {}