using Tokenomics.Core.Models;

namespace Tokenomics.Core.Providers;

// One implementation per LLM provider (Gemini today; Claude/OpenAI later).
// Keeping this to two methods is deliberate: it's the minimum needed for A1
// measurement plus a key-validation check, and it's what a future fan-out
// comparison (same prompt across providers) will call once per provider.
public interface ILlmProvider
{
    // Stable id used as the key in storage/config, e.g. "gemini".
    string ProviderId { get; }

    // Human-readable name for the UI, e.g. "Google Gemini".
    string DisplayName { get; }

    // Default model to use when the caller doesn't specify one.
    string DefaultModel { get; }

    Task<ConnectionTestResult> TestConnectionAsync(string apiKey, CancellationToken ct = default);

    Task<MeasureResult> MeasureAsync(string apiKey, string model, string prompt, CancellationToken ct = default);
}
