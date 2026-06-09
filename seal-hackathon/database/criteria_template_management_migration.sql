IF OBJECT_ID('dbo.CriteriaTemplate', 'U') IS NULL
BEGIN
    CREATE TABLE CriteriaTemplate (
        template_id INT IDENTITY(1,1) PRIMARY KEY,
        template_name NVARCHAR(150) NOT NULL,
        description NVARCHAR(500) NULL,
        created_by_user_id INT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (created_by_user_id) REFERENCES [Users](user_id) ON DELETE NO ACTION
    );
END;
GO

IF OBJECT_ID('dbo.CriteriaTemplateItem', 'U') IS NULL
BEGIN
    CREATE TABLE CriteriaTemplateItem (
        template_item_id INT IDENTITY(1,1) PRIMARY KEY,
        template_id INT NOT NULL,
        criteria_name NVARCHAR(150) NOT NULL,
        weight DECIMAL(5,2) NOT NULL,
        criteria_type VARCHAR(50) NOT NULL,
        sort_order INT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES CriteriaTemplate(template_id) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_CriteriaTemplate_TemplateName'
      AND object_id = OBJECT_ID('dbo.CriteriaTemplate')
)
BEGIN
    CREATE UNIQUE INDEX UQ_CriteriaTemplate_TemplateName
        ON CriteriaTemplate(template_name);
END;
GO
