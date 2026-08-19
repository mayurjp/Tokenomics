using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Tokenomics.Core.Models;

namespace Tokenomics.Core.Providers.OpenRouter;

public sealed class OpenRouterProvider(HttpClient httpClient) : ILlmProvider
{
    public string ProviderId => "openrouter";
    public string DisplayName => "OpenRouter";
    public string DefaultModel => "openai/gpt-4o-mini";

    public async Task<ConnectionTestResult> TestConnectionAsync(string apiKey, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "models");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        try
        {
            using var response = await httpClient.SendAsync(request, ct);
            if (response.IsSuccessStatusCode)
            {
                return ConnectionTestResult.Ok();
            }

            var body = await response.Content.ReadAsStringAsync(ct);
            return ConnectionTestResult.Fail(TryExtractErrorMessage(body) ?? $"Request failed with status {(int)response.StatusCode}");
        }
        catch (HttpRequestException ex)
        {
            return ConnectionTestResult.Fail(ex.Message);
        }
    }

    public async Task<IReadOnlyList<ModelInfo>> ListModelsAsync(string apiKey, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "models");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        using var response = await httpClient.SendAsync(request, ct);
        var rawJson = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            ThrowForError(rawJson, response.StatusCode);
        }

        var parsed = JsonSerializer.Deserialize<OpenRouterModelsResponse>(rawJson)
            ?? throw new OpenRouterApiException("OpenRouter API returned an empty response");

        return parsed.Data?
            .Where(m => !string.IsNullOrEmpty(m.Id))
            .Select(m => new ModelInfo(m.Id!, ParseCompletionPrice(m.Pricing)))
            .OrderBy(m => m.Id, StringComparer.OrdinalIgnoreCase)
            .ToList()
            ?? [];
    }

    // Completion price per token is a real, provider-supplied signal of how "flagship"
    // a model is within its vendor's lineup — pricier models are consistently the more
    // capable ones. Returns null (not a guess) when the field is missing or unparseable.
    private static double? ParseCompletionPrice(OpenRouterPricing? pricing) =>
        double.TryParse(pricing?.Completion, System.Globalization.CultureInfo.InvariantCulture, out var price)
            ? price
            : null;

    public async Task<MeasureResult> MeasureAsync(string apiKey, string model, string prompt, CancellationToken ct = default)
    {
        var body = new OpenRouterChatRequest
        {
            Model = model,
            Messages = [new OpenRouterMessage { Role = "user", Content = prompt }],
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        using var response = await httpClient.SendAsync(request, ct);
        var rawJson = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            ThrowForError(rawJson, response.StatusCode);
        }

        var parsed = JsonSerializer.Deserialize<OpenRouterChatResponse>(rawJson)
            ?? throw new OpenRouterApiException("OpenRouter API returned an empty response");

        var text = parsed.Choices?.FirstOrDefault()?.Message?.Content ?? string.Empty;
        var usage = parsed.Usage ?? throw new OpenRouterApiException("OpenRouter API response did not include usage");

        return new MeasureResult
        {
            Model = parsed.Model ?? model,
            ResponseText = text,
            Stats = OpenRouterTokenStatsMapper.ToTokenStats(usage),
            RawJson = rawJson,
        };
    }

    private static string? TryExtractErrorMessage(string rawJson)
    {
        try
        {
            var envelope = JsonSerializer.Deserialize<OpenRouterErrorEnvelope>(rawJson);
            return envelope?.Error?.Message;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    // 402 = out of credits or a free-tier daily limit exhausted — the model itself is
    // unusable right now, worth marking unavailable. 429 is a transient rate limit
    // (too many requests per minute), not a quota problem, so it's a normal error.
    private static void ThrowForError(string rawJson, HttpStatusCode statusCode)
    {
        OpenRouterErrorDetail? error = null;
        try
        {
            error = JsonSerializer.Deserialize<OpenRouterErrorEnvelope>(rawJson)?.Error;
        }
        catch (JsonException)
        {
            // fall through — rawJson wasn't a parseable error envelope
        }

        var message = error?.Message ?? $"OpenRouter API request failed with status {(int)statusCode}";

        if (statusCode == HttpStatusCode.PaymentRequired)
        {
            throw new QuotaExceededException(message);
        }

        throw new OpenRouterApiException(message);
    }
}

public sealed class OpenRouterApiException(string message) : Exception(message);
