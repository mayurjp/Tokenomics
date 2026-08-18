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
            var errorMessage = TryExtractErrorMessage(rawJson) ?? $"Gemini API request failed with status {(int)response.StatusCode}";
            throw new GeminiApiException(errorMessage);
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
}

public sealed class GeminiApiException(string message) : Exception(message);
