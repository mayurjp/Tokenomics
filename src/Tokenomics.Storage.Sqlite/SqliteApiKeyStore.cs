using System.Runtime.Versioning;
using System.Security.Cryptography;
using Microsoft.Data.Sqlite;
using Tokenomics.Core.Storage;

namespace Tokenomics.Storage.Sqlite;

// Keys are encrypted with Windows DPAPI (current-user scope) before hitting disk,
// so the .db file alone is useless if copied off this machine or this Windows account.
[SupportedOSPlatform("windows")]
public sealed class SqliteApiKeyStore : IApiKeyStore
{
    private readonly string _connectionString;

    public SqliteApiKeyStore(string? dbPath = null)
    {
        dbPath ??= Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Tokenomics",
            "tokenexplorer.db");

        Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
        _connectionString = new SqliteConnectionStringBuilder { DataSource = dbPath }.ToString();

        EnsureSchema();
    }

    private void EnsureSchema()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS ApiKeys (
                ProviderId TEXT PRIMARY KEY,
                EncryptedKey BLOB NOT NULL,
                UpdatedAtUtc TEXT NOT NULL
            );
            """;
        command.ExecuteNonQuery();
    }

    public async Task SaveKeyAsync(string providerId, string apiKey, CancellationToken ct = default)
    {
        var encrypted = ProtectedData.Protect(
            System.Text.Encoding.UTF8.GetBytes(apiKey),
            optionalEntropy: null,
            DataProtectionScope.CurrentUser);

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO ApiKeys (ProviderId, EncryptedKey, UpdatedAtUtc)
            VALUES ($providerId, $encryptedKey, $updatedAt)
            ON CONFLICT(ProviderId) DO UPDATE SET
                EncryptedKey = excluded.EncryptedKey,
                UpdatedAtUtc = excluded.UpdatedAtUtc;
            """;
        command.Parameters.AddWithValue("$providerId", providerId);
        command.Parameters.AddWithValue("$encryptedKey", encrypted);
        command.Parameters.AddWithValue("$updatedAt", DateTime.UtcNow.ToString("O"));
        await command.ExecuteNonQueryAsync(ct);
    }

    public async Task<string?> GetKeyAsync(string providerId, CancellationToken ct = default)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT EncryptedKey FROM ApiKeys WHERE ProviderId = $providerId;";
        command.Parameters.AddWithValue("$providerId", providerId);

        await using var reader = await command.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        var encrypted = (byte[])reader["EncryptedKey"];
        try
        {
            var decrypted = ProtectedData.Unprotect(encrypted, optionalEntropy: null, DataProtectionScope.CurrentUser);
            return System.Text.Encoding.UTF8.GetString(decrypted);
        }
        catch (CryptographicException)
        {
            // Encrypted under a different Windows user/machine — treat as no key stored.
            return null;
        }
    }

    public async Task<bool> HasKeyAsync(string providerId, CancellationToken ct = default)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(1) FROM ApiKeys WHERE ProviderId = $providerId;";
        command.Parameters.AddWithValue("$providerId", providerId);
        var count = (long)(await command.ExecuteScalarAsync(ct))!;
        return count > 0;
    }

    public async Task DeleteKeyAsync(string providerId, CancellationToken ct = default)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM ApiKeys WHERE ProviderId = $providerId;";
        command.Parameters.AddWithValue("$providerId", providerId);
        await command.ExecuteNonQueryAsync(ct);
    }
}
