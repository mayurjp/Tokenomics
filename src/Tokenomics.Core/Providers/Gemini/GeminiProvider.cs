using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Tokenomics.Core.Models;

namespace Tokenomics.Core.Providers.Gemini;

public sealed class GeminiProvider(HttpClient httpClient) : ILlmProvider
{
    public string ProviderId => "gemini";
    public string DisplayName => "Google Gemini";
    public string DefaultModel => "gemini-3.5-flash";

    public async Task<ConnectionTestResult> TestConnectionAsync(string apiKey, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "models?pageSize=1");
        request.Headers.Add("x-goog-api-key", apiKey);

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
        using var request = new HttpRequestMessage(HttpMethod.Get, "models?pageSize=1000");
        request.Headers.Add("x-goog-api-key", apiKey);

        using var response = await httpClient.SendAsync(request, ct);
        var rawJson = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            var errorMessage = TryExtractErrorMessage(rawJson) ?? $"Gemini API request failed with status {(int)response.StatusCode}";
            throw new GeminiApiException(errorMessage);
        }

        var parsed = JsonSerializer.Deserialize<GeminiModelsResponse>(rawJson)
            ?? throw new GeminiApiException("Gemini API returned an empty response");

        return parsed.Models?
            .Where(m => m.SupportedGenerationMethods?.Contains("generateContent") == true && !string.IsNullOrEmpty(m.Name))
            .Select(m =>
            {
                var id = m.Name!.StartsWith("models/", StringComparison.Ordinal) ? m.Name["models/".Length..] : m.Name!;
                return new ModelInfo(id, m.InputTokenLimit);
            })
            .OrderBy(m => m.Id, StringComparer.OrdinalIgnoreCase)
            .ToList()
            ?? [];
    }

    public async Task<MeasureResult> MeasureAsync(string apiKey, string model, string prompt, CancellationToken ct = default)
    {
        var body = new GeminiGenerateRequest
        {
            Contents = [new GeminiContent { Parts = [new GeminiPart { Text = prompt }] }],
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"models/{model}:generateContent")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Add("x-goog-api-key", apiKey);

        using var response = await httpClient.SendAsync(request, ct);
        var rawJson = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            ThrowForError(rawJson, response.StatusCode);
        }

        var parsed = JsonSerializer.Deserialize<GeminiGenerateResponse>(rawJson)
            ?? throw new GeminiApiException("Gemini API returned an empty response");

        var text = parsed.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text ?? string.Empty;
        var usage = parsed.UsageMetadata ?? throw new GeminiApiException("Gemini API response did not include usage metadata");

        return new MeasureResult
        {
            Model = model,
            ResponseText = text,
            Stats = GeminiTokenStatsMapper.ToTokenStats(usage),
            RawJson = rawJson,
        };
    }

    private static string? TryExtractErrorMessage(string rawJson)
    {
        try
        {
            var envelope = JsonSerializer.Deserialize<GeminiErrorEnvelope>(rawJson);
            return envelope?.Error?.Message;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    // RESOURCE_EXHAUSTED is the standard googleapis status for "no quota left" —
    // distinct from other 4xx causes (bad key, bad request) that don't mean the
    // model itself is unusable. Only that specific status should mark a model
    // unavailable; everything else is a normal error.
    private static void ThrowForError(string rawJson, HttpStatusCode statusCode)
    {
        GeminiErrorDetail? error = null;
        try
        {
            error = JsonSerializer.Deserialize<GeminiErrorEnvelope>(rawJson)?.Error;
        }
        catch (JsonException)
        {
            // fall through — rawJson wasn't a parseable error envelope
        }

        var message = error?.Message ?? $"Gemini API request failed with status {(int)statusCode}";

        if (statusCode == HttpStatusCode.TooManyRequests && error?.Status == "RESOURCE_EXHAUSTED")
        {
            throw new QuotaExceededException(message);
        }

        throw new GeminiApiException(message);
    }
}

public sealed class GeminiApiException(string message) : Exception(message);
