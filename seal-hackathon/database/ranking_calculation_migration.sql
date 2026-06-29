IF COL_LENGTH('Ranking', 'qualification_status') IS NULL
BEGIN
    ALTER TABLE Ranking
    ADD qualification_status VARCHAR(30) NOT NULL
        CONSTRAINT DF_Ranking_QualificationStatus DEFAULT 'Pending';
END;

IF COL_LENGTH('Ranking', 'qualification_note') IS NULL
BEGIN
    ALTER TABLE Ranking
    ADD qualification_note NVARCHAR(500) NULL;
END;

IF COL_LENGTH('Ranking', 'qualification_calculated_at') IS NULL
BEGIN
    ALTER TABLE Ranking
    ADD qualification_calculated_at DATETIME2 NULL;
END;
