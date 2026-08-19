using Tokenomics.Core.Models;

namespace Tokenomics.Core.Providers.OpenRouter;

internal static class OpenRouterTokenStatsMapper
{
    public static TokenStats ToTokenStats(OpenRouterUsage usage)
    {
        var inputTokens = usage.PromptTokens ?? 0;
        var outputTokens = usage.CompletionTokens ?? 0;

        return new TokenStats
        {
            InputTokens = inputTokens,
            OutputTokens = outputTokens,
            TotalTokens = usage.TotalTokens ?? (inputTokens + outputTokens),
            CacheReadTokens = usage.PromptTokensDetails?.CachedTokens,
            CacheWriteTokens = usage.PromptTokensDetails?.CacheWriteTokens,
            ReasoningTokens = usage.CompletionTokensDetails?.ReasoningTokens,
        };
    }
}
