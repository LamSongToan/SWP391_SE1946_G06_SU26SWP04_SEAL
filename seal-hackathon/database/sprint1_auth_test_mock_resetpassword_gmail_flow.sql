USE SEAL_Hackathon_G06;
GO

-- Token blacklist for logout invalidation
CREATE TABLE TokenBlacklist (
    id INT IDENTITY(1,1) PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 of the JWT
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Password reset tokens (mock email flow)
CREATE TABLE PasswordResetToken (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES [Users](user_id) ON DELETE CASCADE
);
GO