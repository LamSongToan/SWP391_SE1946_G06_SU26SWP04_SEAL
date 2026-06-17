IF COL_LENGTH('Users', 'must_change_password') IS NULL
BEGIN
    ALTER TABLE Users
    ADD must_change_password BIT NOT NULL
        CONSTRAINT DF_Users_MustChangePassword DEFAULT 0;
END;

UPDATE Users
SET must_change_password = 0
WHERE must_change_password IS NULL;
