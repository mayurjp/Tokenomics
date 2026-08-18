namespace Tokenomics.Core.Storage;

// Platform-specific storage (SQLite + DPAPI on Windows today) implements this.
// Keeping it here — not the concrete implementation — is what lets a future
// Blazor host swap in its own storage without touching provider/measurement code.
public interface IApiKeyStore
{
    Task SaveKeyAsync(string providerId, string apiKey, CancellationToken ct = default);

    Task<string?> GetKeyAsync(string providerId, CancellationToken ct = default);

    Task<bool> HasKeyAsync(string providerId, CancellationToken ct = default);

    Task DeleteKeyAsync(string providerId, CancellationToken ct = default);
}
