namespace Tokenomics.Core.Models;

// Absent fields stay null, never 0 — a provider that didn't report a number
// is not the same as that number being zero.
public sealed class TokenStats
{
    public required int InputTokens { get; init; }
    public required int OutputTokens { get; init; }
    public required int TotalTokens { get; init; }
    public int? CacheReadTokens { get; init; }
    public int? CacheWriteTokens { get; init; }
    public int? ReasoningTokens { get; init; }
}
