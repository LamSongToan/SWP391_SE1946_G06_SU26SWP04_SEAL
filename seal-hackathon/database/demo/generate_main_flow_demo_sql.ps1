param(
    [string]$AnchorDate = ""
)

$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$lifecycleDirectory = Join-Path $scriptDirectory "lifecycle"
$lifecycleGenerator = Join-Path $lifecycleDirectory "generate_lifecycle_demo_sql.ps1"

if (-not (Test-Path $lifecycleGenerator)) {
    throw "Lifecycle generator was not found at $lifecycleGenerator"
}

if ([string]::IsNullOrWhiteSpace($AnchorDate)) {
    & $lifecycleGenerator
} else {
    & $lifecycleGenerator -AnchorDate $AnchorDate
}

$flowMappings = @(
    @{
        Folder = "01_event_configuration"
        Files = @(
            @{
                Source = "00_base_system_clean.sql"
                Target = "00_event_configuration_base.sql"
                Description = "Fresh Summer 2026 baseline with no teams, registrations, or submissions."
            }
        )
    },
    @{
        Folder = "02_team_formation_submission_management"
        Files = @(
            @{
                Source = "01_registration_open.sql"
                Target = "01_registration_open_team_formation.sql"
                Description = "Registration is open so coordinators and students can create teams, invite members, accept invitations, and register into Summer 2026."
            },
            @{
                Source = "03_qualifier_submission_open.sql"
                Target = "02_round1_submission_open.sql"
                Description = "Registration is closed, Summer 2026 already has enough teams to be valid, and the qualifier submission window is open."
            }
        )
    },
    @{
        Folder = "03_scoring_promotion_publish"
        Files = @(
            @{
                Source = "04_qualifier_submission_closed_scoring_open.sql"
                Target = "01_scoring_open_judge_ready.sql"
                Description = "Qualifier submission deadline is over, all submissions exist, and judges can begin scoring."
            },
            @{
                Source = "05_qualifier_scoring_closed_ready_for_finalize.sql"
                Target = "02_ready_for_finalize_promote_publish.sql"
                Description = "Qualifier submissions are fully scored so the coordinator can finalize, calculate, promote, and publish."
            },
            @{
                Source = "06_final_round_open.sql"
                Target = "03_advance_to_final_after_promotion.sql"
                Description = "Standalone final-round setup with qualifier rankings finalized, promoted, and published; qualified teams can submit while eliminated teams are blocked."
            }
        )
    },
    @{
        Folder = "04_awards"
        Files = @(
            @{
                Source = "08_final_scoring_closed_ready_to_publish.sql"
                Target = "01_final_ready_for_award_publish.sql"
                Description = "Final round submissions and scores are ready so the coordinator can finalize and publish final results with awards."
            }
        )
    },
    @{
        Folder = "05_special_cases"
        Files = @(
            @{
                Source = "02b_individual_matching_track_balance.sql"
                Target = "01_individual_matching_track_balance.sql"
                Description = "Registration is closed with waiting individual students and uneven tracks so the coordinator can demonstrate automatic team matching and track balancing."
            }
        )
    }
)

foreach ($mapping in $flowMappings) {
    $targetFolder = Join-Path $scriptDirectory $mapping.Folder
    New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null

    $readmeLines = @(
        "# $($mapping.Folder)",
        "",
        "Run order:",
        "1. ../../seal_hackathon.sql",
        "2. ../../seed_test_data.sql",
        "3. one SQL file in this folder",
        ""
    )

    foreach ($file in $mapping.Files) {
        $sourcePath = Join-Path $lifecycleDirectory $file.Source
        $targetPath = Join-Path $targetFolder $file.Target
        if (-not (Test-Path $sourcePath)) {
            throw "Source lifecycle file was not found: $sourcePath"
        }

        Copy-Item -Path $sourcePath -Destination $targetPath -Force
        $readmeLines += "- ./$($file.Target)"
        $readmeLines += "  - $($file.Description)"
    }

    Set-Content -Path (Join-Path $targetFolder "README.md") -Value ($readmeLines -join "`r`n") -Encoding UTF8
    Write-Host ("Prepared flow demo folder: {0}" -f $targetFolder)
}

Write-Host "Main flow demo SQL files are ready."
