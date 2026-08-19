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

            CREATE TABLE IF NOT EXISTS UnavailableModels (
                ProviderId TEXT NOT NULL,
                Model TEXT NOT NULL,
                MarkedAtUtc TEXT NOT NULL,
                PRIMARY KEY (ProviderId, Model)
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

    public async Task MarkModelUnavailableAsync(string providerId, string model, CancellationToken ct = default)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO UnavailableModels (ProviderId, Model, MarkedAtUtc)
            VALUES ($providerId, $model, $markedAt)
            ON CONFLICT(ProviderId, Model) DO UPDATE SET MarkedAtUtc = excluded.MarkedAtUtc;
            """;
        command.Parameters.AddWithValue("$providerId", providerId);
        command.Parameters.AddWithValue("$model", model);
        command.Parameters.AddWithValue("$markedAt", DateTime.UtcNow.ToString("O"));
        await command.ExecuteNonQueryAsync(ct);
    }

    public async Task<IReadOnlySet<string>> GetUnavailableModelsAsync(string providerId, CancellationToken ct = default)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT Model FROM UnavailableModels WHERE ProviderId = $providerId;";
        command.Parameters.AddWithValue("$providerId", providerId);

        var results = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            results.Add((string)reader["Model"]);
        }

        return results;
    }

    public async Task ClearUnavailableModelAsync(string providerId, string model, CancellationToken ct = default)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM UnavailableModels WHERE ProviderId = $providerId AND Model = $model;";
        command.Parameters.AddWithValue("$providerId", providerId);
        command.Parameters.AddWithValue("$model", model);
        await command.ExecuteNonQueryAsync(ct);
    }
}
