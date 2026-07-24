package com.seal.hackathon.demo;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DemoSqlTimeAdjusterTest {

    private final DemoSqlTimeAdjuster adjuster = new DemoSqlTimeAdjuster();

    @Test
    void shiftToAnchor_shouldPreserveEveryRelativeOffset() {
        String sql = """
                DECLARE @ScenarioNow DATETIME2 = '2026-07-23T09:00:00';
                DECLARE @PublishedAt DATETIME2 = '2026-07-18T09:00:00';
                DECLARE @RegistrationEnd DATETIME2 = '2026-07-28T09:00:00';
                """;

        String shifted = adjuster.shiftToAnchor(sql, LocalDateTime.of(2026, 8, 10, 9, 0));

        Assertions.assertTrue(shifted.contains("@ScenarioNow DATETIME2 = '2026-08-10T09:00:00'"));
        Assertions.assertTrue(shifted.contains("@PublishedAt DATETIME2 = '2026-08-05T09:00:00'"));
        Assertions.assertTrue(shifted.contains("@RegistrationEnd DATETIME2 = '2026-08-15T09:00:00'"));
    }

    @Test
    void shiftToAnchor_shouldRejectScriptWithoutScenarioAnchor() {
        IllegalArgumentException exception = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> adjuster.shiftToAnchor(
                        "DECLARE @RegistrationEnd DATETIME2 = '2026-07-28T09:00:00';",
                        LocalDateTime.of(2026, 8, 10, 9, 0)
                )
        );

        Assertions.assertTrue(exception.getMessage().contains("@ScenarioNow"));
    }

    @Test
    void prepareExecutableSql_shouldRemoveDatabaseBatchAndShiftDates() {
        DemoImportService service = new DemoImportService(
                null,
                true,
                "../database/demo",
                "Asia/Ho_Chi_Minh"
        );
        String sql = """
                USE SEAL_Hackathon_G06;
                GO

                SET NOCOUNT ON;
                DECLARE @ScenarioNow DATETIME2 = '2026-07-23T09:00:00';
                DECLARE @CompetitionEnd DATETIME2 = '2026-08-01T09:00:00';
                """;

        String executable = service.prepareExecutableSql(
                sql,
                LocalDateTime.of(2026, 7, 24, 9, 0)
        );

        Assertions.assertFalse(executable.contains("USE SEAL_Hackathon_G06"));
        Assertions.assertFalse(executable.matches("(?s).*\\nGO\\s*\\n.*"));
        Assertions.assertTrue(executable.contains("@ScenarioNow DATETIME2 = '2026-07-24T09:00:00'"));
        Assertions.assertTrue(executable.contains("@CompetitionEnd DATETIME2 = '2026-08-02T09:00:00'"));
    }

    @Test
    void resetNonSeedEventsSql_shouldKeepOnlySeedEventNames() {
        DemoImportService service = new DemoImportService(
                null,
                true,
                "../database/demo",
                "Asia/Ho_Chi_Minh"
        );

        String resetSql = service.resetNonSeedEventsSql();

        Assertions.assertTrue(resetSql.contains("name NOT IN (N'SEAL Spring 2026', N'SEAL Summer 2026')"));
        Assertions.assertTrue(resetSql.contains("DELETE FROM HackathonEvent"));
        Assertions.assertTrue(resetSql.contains("DELETE FROM TeamMember"));
        Assertions.assertTrue(resetSql.contains("DELETE FROM Submission"));
    }

    @Test
    void executeDemoSql_shouldAlwaysRestoreNoCountAfterScriptFailure() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        Connection connection = mock(Connection.class);
        Statement scriptStatement = mock(Statement.class);
        Statement resetStatement = mock(Statement.class);
        when(connection.createStatement()).thenReturn(scriptStatement, resetStatement);
        when(scriptStatement.execute("demo sql")).thenThrow(new SQLException("script failed"));
        when(jdbcTemplate.execute(any(ConnectionCallback.class))).thenAnswer(invocation -> {
            ConnectionCallback<?> callback = invocation.getArgument(0);
            return callback.doInConnection(connection);
        });
        DemoImportService service = new DemoImportService(
                jdbcTemplate,
                true,
                "../database/demo",
                "Asia/Ho_Chi_Minh"
        );

        Assertions.assertThrows(SQLException.class, () -> service.executeDemoSql("demo sql"));

        verify(resetStatement).execute("SET NOCOUNT OFF");
    }
}
