namespace Tokenomics.Core.Providers;

// Thrown specifically when a provider reports the key/tier has no quota left for a
// model (as opposed to a transient network/auth/bad-request error). Callers use this
// to distinguish "mark this model unavailable" from "just show the error and move on."
public sealed class QuotaExceededException(string message) : Exception(message);
