namespace Tokenomics.Core.Storage;

// Non-secret per-provider preferences (selected model, models known to be quota-exhausted) —
// kept separate from IApiKeyStore since none of this is sensitive and doesn't need encryption.
public interface IProviderSettingsStore
{
    Task SaveSelectedModelAsync(string providerId, string model, CancellationToken ct = default);

    Task<string?> GetSelectedModelAsync(string providerId, CancellationToken ct = default);

    // "Probe and remember": called when a real call comes back quota-exhausted for this
    // model, so future model pickers can hide it without spending another call to find out.
    Task MarkModelUnavailableAsync(string providerId, string model, CancellationToken ct = default);

    Task<IReadOnlySet<string>> GetUnavailableModelsAsync(string providerId, CancellationToken ct = default);

    // Manual escape hatch — quota can reset (e.g. daily), so the user can un-hide a model
    // rather than being stuck with a permanent judgment from one past failure.
    Task ClearUnavailableModelAsync(string providerId, string model, CancellationToken ct = default);
}
