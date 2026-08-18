namespace Tokenomics.Core.Models;

public sealed class MeasureResult
{
    public required string Model { get; init; }
    public required string ResponseText { get; init; }
    public required TokenStats Stats { get; init; }

    // Untouched provider response, for the curious / debugging.
    public required string RawJson { get; init; }
}
