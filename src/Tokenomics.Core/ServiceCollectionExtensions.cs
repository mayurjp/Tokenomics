using Microsoft.Extensions.DependencyInjection;
using Tokenomics.Core.Providers;
using Tokenomics.Core.Providers.Gemini;

namespace Tokenomics.Core;

public static class ServiceCollectionExtensions
{
    // Registers all built-in LLM providers plus the registry that looks them up by id.
    // Storage (IApiKeyStore) is deliberately NOT registered here — that's platform-specific
    // and the host app (Windows today, Blazor later) wires its own implementation.
    public static IServiceCollection AddTokenomicsCore(this IServiceCollection services)
    {
        services.AddHttpClient<GeminiProvider>(client =>
        {
            client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/v1beta/");
        });
        services.AddSingleton<ILlmProvider>(sp => sp.GetRequiredService<GeminiProvider>());

        services.AddSingleton<ProviderRegistry>();

        return services;
    }
}
