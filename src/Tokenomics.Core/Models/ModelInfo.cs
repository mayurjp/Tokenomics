namespace Tokenomics.Core.Models;

// CapabilityScore is a provider-supplied proxy for "how flagship is this model",
// built from real fields the provider's API already returns — never guessed from
// the model's name. Gemini uses inputTokenLimit; OpenRouter uses completion price
// (pricier models are consistently the more capable ones in a vendor's lineup).
// Null means the provider had no such signal available for this model.
public sealed record ModelInfo(string Id, double? CapabilityScore);
