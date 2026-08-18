namespace Tokenomics.Core.Storage;

// Non-secret per-provider preferences (currently just the selected model) —
// kept separate from IApiKeyStore since this isn't sensitive and doesn't need encryption.
public interface IProviderSettingsStore
{
    Task SaveSelectedModelAsync(string providerId, string model, CancellationToken ct = default);

    Task<string?> GetSelectedModelAsync(string providerId, CancellationToken ct = default);
}
