// Normalizes Gemini's usageMetadata into the stats shape the frontend renders.
//
// The rule that matters: a field the provider did NOT report comes back as null, never 0.
// "Absent" and "zero" are different facts and the UI renders them differently
// ("not reported" vs "0"). Inherited from the removed .NET app, which got this right.
//
// Gemini has no separate "cache write" count for implicit caching, so cache_write_tokens
// is always null here — absent, not zero. Do not invent a value for it.

export function toTokenStats(usage) {
  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: usage?.totalTokenCount ?? inputTokens + outputTokens,
    cache_read_tokens: usage?.cachedContentTokenCount ?? null,
    cache_write_tokens: null,
    reasoning_tokens: usage?.thoughtsTokenCount ?? null,
  };
}
