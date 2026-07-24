package com.seal.hackathon.demo;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class DemoSqlTimeAdjuster {

    private static final Pattern DATE_DECLARATION = Pattern.compile(
            "(?im)(DECLARE\\s+@(\\w+)\\s+DATETIME2\\s*=\\s*')([^']+)('\\s*;)"
    );
    private static final DateTimeFormatter SQL_DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    String shiftToAnchor(String sql, LocalDateTime targetAnchor) {
        LocalDateTime sourceAnchor = findScenarioAnchor(sql);
        Duration shift = Duration.between(sourceAnchor, targetAnchor);
        Matcher matcher = DATE_DECLARATION.matcher(sql);
        StringBuffer shiftedSql = new StringBuffer();

        while (matcher.find()) {
            LocalDateTime original = parseDateTime(matcher.group(3), matcher.group(2));
            String replacement = matcher.group(1)
                    + original.plus(shift).format(SQL_DATE_TIME)
                    + matcher.group(4);
            matcher.appendReplacement(shiftedSql, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(shiftedSql);
        return shiftedSql.toString();
    }

    private LocalDateTime findScenarioAnchor(String sql) {
        Matcher matcher = DATE_DECLARATION.matcher(sql);
        while (matcher.find()) {
            if ("ScenarioNow".equalsIgnoreCase(matcher.group(2))) {
                return parseDateTime(matcher.group(3), matcher.group(2));
            }
        }
        throw new IllegalArgumentException("Demo SQL does not declare @ScenarioNow DATETIME2");
    }

    private LocalDateTime parseDateTime(String value, String variableName) {
        try {
            return LocalDateTime.parse(value, SQL_DATE_TIME);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(
                    "Invalid DATETIME2 value for @" + variableName + ": " + value,
                    exception
            );
        }
    }
}
