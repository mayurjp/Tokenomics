using System.Text.Json.Serialization;

namespace Tokenomics.Core.Providers.Gemini;

// Shapes of the raw generateContent / models request-response, verified against
// https://ai.google.dev/api/generate-content and https://ai.google.dev/api/models.
// Field names are camelCase on the wire.

public sealed class GeminiGenerateRequest
{
    [JsonPropertyName("contents")]
    public required List<GeminiContent> Contents { get; init; }
}

public sealed class GeminiContent
{
    [JsonPropertyName("parts")]
    public required List<GeminiPart> Parts { get; init; }
}

public sealed class GeminiPart
{
    [JsonPropertyName("text")]
    public required string Text { get; init; }
}

public sealed class GeminiGenerateResponse
{
    [JsonPropertyName("candidates")]
    public List<GeminiCandidate>? Candidates { get; init; }

    [JsonPropertyName("usageMetadata")]
    public GeminiUsageMetadata? UsageMetadata { get; init; }

    [JsonPropertyName("modelVersion")]
    public string? ModelVersion { get; init; }
}

public sealed class GeminiCandidate
{
    [JsonPropertyName("content")]
    public GeminiContent? Content { get; init; }

    [JsonPropertyName("finishReason")]
    public string? FinishReason { get; init; }
}

public sealed class GeminiUsageMetadata
{
    [JsonPropertyName("promptTokenCount")]
    public int? PromptTokenCount { get; init; }

    [JsonPropertyName("candidatesTokenCount")]
    public int? CandidatesTokenCount { get; init; }

    [JsonPropertyName("totalTokenCount")]
    public int? TotalTokenCount { get; init; }

    [JsonPropertyName("cachedContentTokenCount")]
    public int? CachedContentTokenCount { get; init; }

    [JsonPropertyName("thoughtsTokenCount")]
    public int? ThoughtsTokenCount { get; init; }
}

public sealed class GeminiErrorEnvelope
{
    [JsonPropertyName("error")]
    public GeminiErrorDetail? Error { get; init; }
}

public sealed class GeminiErrorDetail
{
    [JsonPropertyName("message")]
    public string? Message { get; init; }

    [JsonPropertyName("status")]
    public string? Status { get; init; }
}
