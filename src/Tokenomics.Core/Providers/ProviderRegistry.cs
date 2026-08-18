namespace Tokenomics.Core.Providers;

// Looks up a provider by id at runtime. This is the extension point for
// fan-out comparisons later — iterate all registered providers, call
// MeasureAsync on each with the same prompt.
public sealed class ProviderRegistry(IEnumerable<ILlmProvider> providers)
{
    private readonly Dictionary<string, ILlmProvider> _byId =
        providers.ToDictionary(p => p.ProviderId, StringComparer.OrdinalIgnoreCase);

    public IReadOnlyCollection<ILlmProvider> All => _byId.Values;

    public ILlmProvider Get(string providerId) =>
        _byId.TryGetValue(providerId, out var provider)
            ? provider
            : throw new KeyNotFoundException($"No LLM provider registered with id '{providerId}'.");

    public bool TryGet(string providerId, out ILlmProvider? provider) =>
        _byId.TryGetValue(providerId, out provider);
}
