using ProLink.Engine.Abstractions;

namespace ProLink.Engine.Tests;

public sealed class FakeClock : IClock
{
    public FakeClock(DateTimeOffset? initialUtc = null)
    {
        UtcNow = initialUtc ?? new DateTimeOffset(2026, 10, 27, 12, 0, 0, TimeSpan.Zero);
    }

    public DateTimeOffset UtcNow { get; set; }

    public void Advance(TimeSpan delta)
    {
        UtcNow = UtcNow.Add(delta);
    }
}
