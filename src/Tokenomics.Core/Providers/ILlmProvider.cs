using Tokenomics.Core.Models;

namespace Tokenomics.Core.Providers;

// One implementation per LLM provider (Gemini today; Claude/OpenAI later).
// Kept small and deliberate: this is the minimum needed for A1 measurement,
// a key-validation check, and model selection — and it's what a future
// fan-out comparison (same prompt across providers) will call once per provider.
public interface ILlmProvider
{
    // Stable id used as the key in storage/config, e.g. "gemini".
    string ProviderId { get; }

    // Human-readable name for the UI, e.g. "Google Gemini".
    string DisplayName { get; }

    // Default model to use when the caller doesn't specify one, or hasn't picked one yet.
    string DefaultModel { get; }

    Task<ConnectionTestResult> TestConnectionAsync(string apiKey, CancellationToken ct = default);

    // Models this key can actually call, restricted to ones that support text generation
    // (excludes embedding-only models etc.) — used to populate a model picker in the UI.
    // Each entry carries a CapabilityScore proxy so callers can pick a "flagship" model
    // per family without guessing from the name.
    Task<IReadOnlyList<ModelInfo>> ListModelsAsync(string apiKey, CancellationToken ct = default);

    Task<MeasureResult> MeasureAsync(string apiKey, string model, string prompt, CancellationToken ct = default);
}
