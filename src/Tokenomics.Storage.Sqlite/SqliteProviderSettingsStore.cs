using Microsoft.Data.Sqlite;
using Tokenomics.Core.Storage;

namespace Tokenomics.Storage.Sqlite;

// Same SQLite file as SqliteApiKeyStore by default, different table — no encryption
// needed here since a model name isn't sensitive.
public sealed class SqliteProviderSettingsStore : IProviderSettingsStore
{
    private readonly string _connectionString;

    public SqliteProviderSettingsStore(string? dbPath = null)
    {
        dbPath ??= Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Tokenomics",
            "tokenomics.db");

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
            CREATE TABLE IF NOT EXISTS ProviderSettings (
                ProviderId TEXT PRIMARY KEY,
                SelectedModel TEXT NOT NULL,
                UpdatedAtUtc TEXT NOT NULL
            );
            """;
        command.ExecuteNonQuery();
    }

    public async Task SaveSelectedModelAsync(string providerId, string model, CancellationToken ct = default)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO ProviderSettings (ProviderId, SelectedModel, UpdatedAtUtc)
            VALUES ($providerId, $model, $updatedAt)
            ON CONFLICT(ProviderId) DO UPDATE SET
                SelectedModel = excluded.SelectedModel,
                UpdatedAtUtc = excluded.UpdatedAtUtc;
            """;
        command.Parameters.AddWithValue("$providerId", providerId);
        command.Parameters.AddWithValue("$model", model);
        command.Parameters.AddWithValue("$updatedAt", DateTime.UtcNow.ToString("O"));
        await command.ExecuteNonQueryAsync(ct);
    }

    public async Task<string?> GetSelectedModelAsync(string providerId, CancellationToken ct = default)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT SelectedModel FROM ProviderSettings WHERE ProviderId = $providerId;";
        command.Parameters.AddWithValue("$providerId", providerId);

        var result = await command.ExecuteScalarAsync(ct);
        return result as string;
    }
}
