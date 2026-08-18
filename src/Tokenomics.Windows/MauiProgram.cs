using Microsoft.Extensions.Logging;
using Tokenomics.Core;
using Tokenomics.Core.Storage;
using Tokenomics.Storage.Sqlite;

namespace Tokenomics.Windows;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.ConfigureFonts(fonts =>
			{
				fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
			});

		builder.Services.AddMauiBlazorWebView();

		// Provider abstraction (ILlmProvider, ProviderRegistry) lives in Core and is
		// platform-agnostic. Storage is Windows-specific (DPAPI + SQLite) and registered
		// only here, per the split documented in docs/phase1r-windows-app-design.md.
		builder.Services.AddTokenomicsCore();
		builder.Services.AddSingleton<IApiKeyStore>(new SqliteApiKeyStore());

#if DEBUG
		builder.Services.AddBlazorWebViewDeveloperTools();
		builder.Logging.AddDebug();
#endif

		return builder.Build();
	}
}
