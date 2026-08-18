namespace Tokenomics.Core.Models;

public sealed class ConnectionTestResult
{
    public required bool Success { get; init; }
    public string? ErrorMessage { get; init; }

    public static ConnectionTestResult Ok() => new() { Success = true };
    public static ConnectionTestResult Fail(string message) => new() { Success = false, ErrorMessage = message };
}
