using Tokenomics.Core.Models;

namespace Tokenomics.Core.Providers.Gemini;

internal static class GeminiTokenStatsMapper
{
    // Gemini has no separate "cache write" count for implicit caching, so that
    // field is always null here — absent, not zero.
    public static TokenStats ToTokenStats(GeminiUsageMetadata usage)
    {
        var inputTokens = usage.PromptTokenCount ?? 0;
        var outputTokens = usage.CandidatesTokenCount ?? 0;

        return new TokenStats
        {
            InputTokens = inputTokens,
            OutputTokens = outputTokens,
            TotalTokens = usage.TotalTokenCount ?? (inputTokens + outputTokens),
            CacheReadTokens = usage.CachedContentTokenCount,
            CacheWriteTokens = null,
            ReasoningTokens = usage.ThoughtsTokenCount,
        };
    }
}
