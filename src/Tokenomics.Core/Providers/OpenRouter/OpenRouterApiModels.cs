using System.Text.Json.Serialization;

namespace Tokenomics.Core.Providers.OpenRouter;

// Shapes of the raw chat/completions and models request-response, verified against
// https://openrouter.ai/docs/api-reference/chat-completion and the models list endpoint.
// OpenRouter's wire format is OpenAI-compatible (snake_case), with extra cache/reasoning
// breakdowns folded into the standard usage object.

public sealed class OpenRouterChatRequest
{
    [JsonPropertyName("model")]
    public required string Model { get; init; }

    [JsonPropertyName("messages")]
    public required List<OpenRouterMessage> Messages { get; init; }

    // Without this, some models default max_tokens to their absolute max (e.g. 65536),
    // and OpenRouter rejects the call outright if the account can't afford that many
    // tokens even though the actual response would've been far shorter. A modest cap
    // avoids that affordability check for a plain measurement call.
    [JsonPropertyName("max_tokens")]
    public int MaxTokens { get; init; } = 1024;
}

public sealed class OpenRouterMessage
{
    [JsonPropertyName("role")]
    public required string Role { get; init; }

    [JsonPropertyName("content")]
    public required string Content { get; init; }
}

public sealed class OpenRouterChatResponse
{
    [JsonPropertyName("model")]
    public string? Model { get; init; }

    [JsonPropertyName("choices")]
    public List<OpenRouterChoice>? Choices { get; init; }

    [JsonPropertyName("usage")]
    public OpenRouterUsage? Usage { get; init; }
}

public sealed class OpenRouterChoice
{
    [JsonPropertyName("message")]
    public OpenRouterMessage? Message { get; init; }

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; init; }
}

public sealed class OpenRouterUsage
{
    [JsonPropertyName("prompt_tokens")]
    public int? PromptTokens { get; init; }

    [JsonPropertyName("completion_tokens")]
    public int? CompletionTokens { get; init; }

    [JsonPropertyName("total_tokens")]
    public int? TotalTokens { get; init; }

    [JsonPropertyName("prompt_tokens_details")]
    public OpenRouterPromptTokensDetails? PromptTokensDetails { get; init; }

    [JsonPropertyName("completion_tokens_details")]
    public OpenRouterCompletionTokensDetails? CompletionTokensDetails { get; init; }
}

public sealed class OpenRouterPromptTokensDetails
{
    [JsonPropertyName("cached_tokens")]
    public int? CachedTokens { get; init; }

    [JsonPropertyName("cache_write_tokens")]
    public int? CacheWriteTokens { get; init; }
}

public sealed class OpenRouterCompletionTokensDetails
{
    [JsonPropertyName("reasoning_tokens")]
    public int? ReasoningTokens { get; init; }
}

public sealed class OpenRouterModelsResponse
{
    [JsonPropertyName("data")]
    public List<OpenRouterModelInfo>? Data { get; init; }
}

public sealed class OpenRouterModelInfo
{
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("context_length")]
    public int? ContextLength { get; init; }

    [JsonPropertyName("pricing")]
    public OpenRouterPricing? Pricing { get; init; }
}

public sealed class OpenRouterPricing
{
    // Wire format is a decimal string, e.g. "0.0000015" (USD per token) — parsed at the
    // call site, not here, so a malformed value degrades to "no score" rather than a crash.
    [JsonPropertyName("completion")]
    public string? Completion { get; init; }
}

public sealed class OpenRouterErrorEnvelope
{
    [JsonPropertyName("error")]
    public OpenRouterErrorDetail? Error { get; init; }
}

public sealed class OpenRouterErrorDetail
{
    [JsonPropertyName("message")]
    public string? Message { get; init; }

    // Numeric, mirrors the HTTP status (402 = insufficient credits / free-tier daily
    // limit exhausted, 429 = transient rate limit — these mean different things).
    [JsonPropertyName("code")]
    public int? Code { get; init; }
}
