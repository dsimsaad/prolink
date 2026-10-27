namespace ProLink.Engine.Abstractions;

// Abstracts wall-clock time so caches, rate limiters, and priority aging can be tested deterministically.
// Main operation: UtcNow is O(1).
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
