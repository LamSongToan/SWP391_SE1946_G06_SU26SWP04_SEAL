package com.seal.hackathon.demo;

import com.seal.hackathon.common.ApiException;
import com.seal.hackathon.demo.dto.DemoEventSnapshotDto;
import com.seal.hackathon.demo.dto.DemoImportResultDto;
import com.seal.hackathon.demo.dto.DemoImportStatusDto;
import com.seal.hackathon.demo.dto.DemoScenarioDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Pattern;

@Service
public class DemoImportService {

    private static final String EXPECTED_EVENT_NAME = "SEAL Summer 2026";
    private static final String EXPECTED_EVENT_MARKER = "WHERE name = N'SEAL Summer 2026'";
    private static final ReentrantLock IMPORT_LOCK = new ReentrantLock();
    private static final Pattern GO_BATCH_SEPARATOR = Pattern.compile("(?im)^\\s*GO\\s*$");

    private final JdbcTemplate jdbcTemplate;
    private final DemoSqlTimeAdjuster timeAdjuster = new DemoSqlTimeAdjuster();
    private final boolean enabled;
    private final String configuredScriptRoot;
    private final ZoneId zoneId;

    public DemoImportService(JdbcTemplate jdbcTemplate,
                             @Value("${app.demo.enabled:false}") boolean enabled,
                             @Value("${app.demo.script-root:../database/demo}") String configuredScriptRoot,
                             @Value("${app.demo.zone-id:Asia/Ho_Chi_Minh}") String zoneId) {
        this.jdbcTemplate = jdbcTemplate;
        this.enabled = enabled;
        this.configuredScriptRoot = configuredScriptRoot;
        this.zoneId = ZoneId.of(zoneId);
    }

    public DemoImportStatusDto getStatus() {
        Path scriptRoot = resolveScriptRoot();
        List<DemoScenarioDto> scenarios = Arrays.stream(DemoScenario.values())
                .map(scenario -> toScenarioDto(scenario, scriptRoot))
                .toList();
        return new DemoImportStatusDto(
                enabled,
                zoneId.getId(),
                currentAnchorDate(),
                scriptRoot.toString(),
                scenarios.stream().allMatch(DemoScenarioDto::available),
                scenarios
        );
    }

    @Transactional(timeout = 120)
    public DemoImportResultDto importScenario(String scenarioKey) {
        ensureEnabled();
        DemoScenario scenario;
        try {
            scenario = DemoScenario.fromKey(scenarioKey);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.NOT_FOUND, exception.getMessage());
        }

        if (!IMPORT_LOCK.tryLock()) {
            throw new ApiException(HttpStatus.CONFLICT, "Another demo import is already running");
        }

        long startedAt = System.nanoTime();
        LocalDateTime anchor = currentAnchorDate().atTime(9, 0);
        try {
            Path scriptPath = resolveScenarioPath(scenario);
            String sourceSql = readAndValidateScript(scriptPath);
            String executableSql = resetNonSeedEventsSql() + prepareExecutableSql(sourceSql, anchor);
            executeDemoSql(executableSql);

            return new DemoImportResultDto(
                    scenario.getKey(),
                    scenario.getTitle(),
                    anchor,
                    LocalDateTime.now(zoneId),
                    (System.nanoTime() - startedAt) / 1_000_000,
                    loadEventSnapshot()
            );
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to read demo SQL: " + exception.getMessage());
        } catch (DataAccessException exception) {
            String detail = exception.getMostSpecificCause() == null
                    ? exception.getMessage()
                    : exception.getMostSpecificCause().getMessage();
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Demo import failed and was rolled back: " + detail);
        } finally {
            IMPORT_LOCK.unlock();
        }
    }

    String prepareExecutableSql(String sourceSql, LocalDateTime anchor) {
        String withoutBom = sourceSql.startsWith("\uFEFF") ? sourceSql.substring(1) : sourceSql;
        String withoutDatabaseBatch = withoutBom.replaceFirst(
                "(?is)^\\s*USE\\s+\\[?SEAL_Hackathon_G06]?\\s*;\\s*\\R\\s*GO\\s*\\R",
                ""
        );
        if (GO_BATCH_SEPARATOR.matcher(withoutDatabaseBatch).find()) {
            throw new IllegalArgumentException("Demo SQL contains an unsupported GO batch separator");
        }
        return timeAdjuster.shiftToAnchor(withoutDatabaseBatch, anchor);
    }

    /**
     * The seed database contains only the Spring and Summer demo events. Event
     * creation from the UI is intentionally supported, so a later demo import
     * must remove those extra events before the scenario script runs. This is
     * the event-level equivalent of starting again from seal_hackathon.sql +
     * seed_test_data.sql, while keeping the shared identity accounts intact.
     */
    String resetNonSeedEventsSql() {
        return """
                SET NOCOUNT ON;

                DECLARE @DemoResetEvents TABLE (event_id INT PRIMARY KEY);
                INSERT INTO @DemoResetEvents (event_id)
                SELECT event_id
                FROM HackathonEvent
                WHERE name NOT IN (N'SEAL Spring 2026', N'SEAL Summer 2026');

                DECLARE @DemoResetTracks TABLE (track_id INT PRIMARY KEY);
                INSERT INTO @DemoResetTracks (track_id)
                SELECT track_id
                FROM Track
                WHERE event_id IN (SELECT event_id FROM @DemoResetEvents);

                DECLARE @DemoResetRounds TABLE (round_id INT PRIMARY KEY);
                INSERT INTO @DemoResetRounds (round_id)
                SELECT round_id
                FROM [Round]
                WHERE event_id IN (SELECT event_id FROM @DemoResetEvents);

                DECLARE @DemoResetTeams TABLE (team_id INT PRIMARY KEY);
                INSERT INTO @DemoResetTeams (team_id)
                SELECT team_id
                FROM Team
                WHERE track_id IN (SELECT track_id FROM @DemoResetTracks);

                DECLARE @DemoResetSubmissions TABLE (submission_id INT PRIMARY KEY);
                INSERT INTO @DemoResetSubmissions (submission_id)
                SELECT submission_id
                FROM Submission
                WHERE team_id IN (SELECT team_id FROM @DemoResetTeams)
                   OR round_id IN (SELECT round_id FROM @DemoResetRounds);

                DECLARE @DemoResetEvaluations TABLE (evaluation_id INT PRIMARY KEY);
                INSERT INTO @DemoResetEvaluations (evaluation_id)
                SELECT evaluation_id
                FROM JudgeEvaluation
                WHERE submission_id IN (SELECT submission_id FROM @DemoResetSubmissions);

                DECLARE @DemoResetPrizes TABLE (prize_id INT PRIMARY KEY);
                INSERT INTO @DemoResetPrizes (prize_id)
                SELECT prize_id
                FROM Prize
                WHERE event_id IN (SELECT event_id FROM @DemoResetEvents);

                DELETE FROM AuditLog
                WHERE (target_entity = 'EVENT' AND target_id IN (SELECT event_id FROM @DemoResetEvents))
                   OR (target_entity = 'ROUND' AND target_id IN (SELECT round_id FROM @DemoResetRounds))
                   OR (target_entity = 'TRACK' AND target_id IN (SELECT track_id FROM @DemoResetTracks))
                   OR (target_entity = 'TEAM' AND target_id IN (SELECT team_id FROM @DemoResetTeams))
                   OR (target_entity = 'SUBMISSION' AND target_id IN (SELECT submission_id FROM @DemoResetSubmissions));

                IF OBJECT_ID('dbo.EventUpdateNotification', 'U') IS NOT NULL
                    DELETE FROM dbo.EventUpdateNotification
                    WHERE event_id IN (SELECT event_id FROM @DemoResetEvents);

                IF OBJECT_ID('dbo.Announcement', 'U') IS NOT NULL
                    DELETE FROM dbo.Announcement
                    WHERE event_id IN (SELECT event_id FROM @DemoResetEvents);

                DELETE FROM Feedback
                WHERE submission_id IN (SELECT submission_id FROM @DemoResetSubmissions);

                DELETE FROM ScoreHistory
                WHERE evaluation_id IN (SELECT evaluation_id FROM @DemoResetEvaluations);

                DELETE FROM Score
                WHERE submission_id IN (SELECT submission_id FROM @DemoResetSubmissions);

                DELETE FROM JudgeEvaluation
                WHERE evaluation_id IN (SELECT evaluation_id FROM @DemoResetEvaluations);

                DELETE FROM SubmissionHistory
                WHERE submission_id IN (SELECT submission_id FROM @DemoResetSubmissions);

                DELETE FROM EliminationRecord
                WHERE submission_id IN (SELECT submission_id FROM @DemoResetSubmissions);

                DELETE FROM Ranking
                WHERE round_id IN (SELECT round_id FROM @DemoResetRounds);

                DELETE FROM TeamPrize
                WHERE prize_id IN (SELECT prize_id FROM @DemoResetPrizes);

                DELETE FROM Prize
                WHERE prize_id IN (SELECT prize_id FROM @DemoResetPrizes);

                DELETE FROM IndividualRegistration
                WHERE event_id IN (SELECT event_id FROM @DemoResetEvents);

                DELETE FROM TeamInvitation
                WHERE team_id IN (SELECT team_id FROM @DemoResetTeams);

                DELETE FROM Submission
                WHERE submission_id IN (SELECT submission_id FROM @DemoResetSubmissions);

                DELETE FROM TeamMember
                WHERE team_id IN (SELECT team_id FROM @DemoResetTeams);

                DELETE FROM Team
                WHERE team_id IN (SELECT team_id FROM @DemoResetTeams);

                DELETE FROM TrackMentor
                WHERE track_id IN (SELECT track_id FROM @DemoResetTracks);

                DELETE FROM JudgeAssignment
                WHERE round_id IN (SELECT round_id FROM @DemoResetRounds)
                   OR track_id IN (SELECT track_id FROM @DemoResetTracks);

                DELETE FROM RoundTrackPromotionRule
                WHERE round_id IN (SELECT round_id FROM @DemoResetRounds)
                   OR track_id IN (SELECT track_id FROM @DemoResetTracks);

                DELETE FROM ScoringCriteria
                WHERE round_id IN (SELECT round_id FROM @DemoResetRounds);

                DELETE FROM EventCoordinatorAssignment
                WHERE event_id IN (SELECT event_id FROM @DemoResetEvents);

                DELETE FROM [Round]
                WHERE round_id IN (SELECT round_id FROM @DemoResetRounds);

                DELETE FROM Track
                WHERE track_id IN (SELECT track_id FROM @DemoResetTracks);

                DELETE FROM HackathonEvent
                WHERE event_id IN (SELECT event_id FROM @DemoResetEvents);
                """;
    }

    /**
     * Demo scripts use SET NOCOUNT ON to suppress hundreds of intermediate
     * update counts. NOCOUNT is a SQL Server connection-session setting, so it
     * must be restored before Hikari returns this connection to the pool.
     * Otherwise a later Hibernate identity insert can intermittently receive a
     * result set where it expects an update count/generated key.
     */
    void executeDemoSql(String executableSql) {
        jdbcTemplate.execute((ConnectionCallback<Void>) connection -> {
            SQLException executionFailure = null;
            try (Statement statement = connection.createStatement()) {
                statement.execute(executableSql);
            } catch (SQLException exception) {
                executionFailure = exception;
                throw exception;
            } finally {
                try (Statement resetStatement = connection.createStatement()) {
                    resetStatement.execute("SET NOCOUNT OFF");
                } catch (SQLException resetException) {
                    if (executionFailure != null) {
                        executionFailure.addSuppressed(resetException);
                    } else {
                        throw resetException;
                    }
                }
            }
            return null;
        });
    }

    private DemoScenarioDto toScenarioDto(DemoScenario scenario, Path scriptRoot) {
        Path path = scriptRoot.resolve(scenario.getRelativePath()).normalize();
        return new DemoScenarioDto(
                scenario.getKey(),
                scenario.getGroup(),
                scenario.getTitle(),
                scenario.getDescription(),
                scenario.getRelativePath(),
                scenario.isReset(),
                path.startsWith(scriptRoot) && Files.isRegularFile(path)
        );
    }

    private Path resolveScenarioPath(DemoScenario scenario) {
        Path root = resolveScriptRoot();
        Path path = root.resolve(scenario.getRelativePath()).normalize();
        if (!path.startsWith(root) || !Files.isRegularFile(path)) {
            throw new ApiException(HttpStatus.NOT_FOUND,
                    "Demo SQL file was not found: " + scenario.getRelativePath());
        }
        return path;
    }

    private Path resolveScriptRoot() {
        Path workingDirectory = Paths.get("").toAbsolutePath().normalize();
        List<Path> candidates = List.of(
                resolveCandidate(workingDirectory, configuredScriptRoot),
                workingDirectory.resolve("database/demo").normalize(),
                workingDirectory.resolve("seal-hackathon/database/demo").normalize(),
                workingDirectory.resolve("../database/demo").normalize()
        );
        return candidates.stream()
                .filter(Files::isDirectory)
                .findFirst()
                .orElse(candidates.get(0));
    }

    private Path resolveCandidate(Path workingDirectory, String value) {
        Path configured = Paths.get(value);
        return (configured.isAbsolute() ? configured : workingDirectory.resolve(configured))
                .toAbsolutePath()
                .normalize();
    }

    private String readAndValidateScript(Path scriptPath) throws IOException {
        String sql = Files.readString(scriptPath, StandardCharsets.UTF_8);
        String upperSql = sql.toUpperCase(Locale.ROOT);
        if (!sql.contains(EXPECTED_EVENT_MARKER)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Demo SQL is not scoped to " + EXPECTED_EVENT_NAME);
        }
        if (upperSql.contains("DROP DATABASE")
                || upperSql.contains("CREATE DATABASE")
                || upperSql.contains("ALTER LOGIN")) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Demo SQL contains a prohibited database-level statement");
        }
        return sql;
    }

    private DemoEventSnapshotDto loadEventSnapshot() {
        List<DemoEventSnapshotDto> events = jdbcTemplate.query(
                """
                SELECT TOP 1
                    event_id,
                    name,
                    semester,
                    year,
                    status,
                    registration_start_at,
                    registration_end_at,
                    competition_start_at,
                    competition_end_at
                FROM HackathonEvent
                WHERE name = ?
                ORDER BY event_id DESC
                """,
                (resultSet, rowNum) -> new DemoEventSnapshotDto(
                        resultSet.getInt("event_id"),
                        resultSet.getString("name"),
                        resultSet.getString("semester"),
                        resultSet.getInt("year"),
                        resultSet.getString("status"),
                        resultSet.getTimestamp("registration_start_at").toLocalDateTime(),
                        resultSet.getTimestamp("registration_end_at").toLocalDateTime(),
                        resultSet.getTimestamp("competition_start_at").toLocalDateTime(),
                        resultSet.getTimestamp("competition_end_at").toLocalDateTime()
                ),
                EXPECTED_EVENT_NAME
        );
        if (events.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND,
                    EXPECTED_EVENT_NAME + " was not found. Initialize the base database first.");
        }
        return events.get(0);
    }

    private LocalDate currentAnchorDate() {
        return LocalDate.now(zoneId);
    }

    private void ensureEnabled() {
        if (!enabled) {
            throw new ApiException(HttpStatus.NOT_FOUND,
                    "Demo data import is disabled. Set DEMO_ENABLED=true in the demo environment.");
        }
    }
}
