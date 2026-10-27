using ProLink.Engine.Admin;
using ProLink.Engine.RateLimiting;
using ProLink.Engine.Rules;

namespace ProLink.Engine.Tests;

public sealed class AdminAndRulesTests
{
    [Fact]
    public void SlidingWindowLimiter_EnforcesWindowAndReturnsRetryAfter()
    {
        var clock = new FakeClock();
        var limiter = new SlidingWindowLimiter(3, TimeSpan.FromSeconds(60), clock);

        Assert.True(limiter.TryAcquire("user-1", out int r1) && r1 == 0);
        clock.Advance(TimeSpan.FromSeconds(10));
        Assert.True(limiter.TryAcquire("user-1", out _));
        clock.Advance(TimeSpan.FromSeconds(10));
        Assert.True(limiter.TryAcquire("user-1", out _));

        // 4th request at t = 20s must be rejected with 40s remaining until first request expires at t = 60s
        Assert.False(limiter.TryAcquire("user-1", out int retryAfter));
        Assert.Equal(40, retryAfter);

        // Advance past first request's 60s window
        clock.Advance(TimeSpan.FromSeconds(41));
        Assert.True(limiter.TryAcquire("user-1", out _));
    }

    [Fact]
    public void JobStateMachine_EnforcesTransitionsForceCancelAndDisputeResolution()
    {
        var sm = new JobStateMachine();

        Assert.True(sm.CanTransition(JobStateMachine.Open, JobStateMachine.OffersReceived));
        Assert.False(sm.CanTransition(JobStateMachine.Completed, JobStateMachine.Open));
        Assert.False(sm.CanTransition("Unknown", JobStateMachine.Open));

        Assert.True(sm.CanForceCancel(JobStateMachine.Open));
        Assert.True(sm.CanForceCancel(JobStateMachine.OffersReceived));
        Assert.True(sm.CanForceCancel(JobStateMachine.Assigned));
        Assert.True(sm.CanForceCancel(JobStateMachine.InProgress));
        Assert.False(sm.CanForceCancel(JobStateMachine.Completed));
        Assert.False(sm.CanForceCancel(JobStateMachine.Disputed));
        Assert.False(sm.CanForceCancel(JobStateMachine.Cancelled));

        Assert.True(sm.CanResolveDispute(JobStateMachine.Disputed, JobStateMachine.Completed));
        Assert.True(sm.CanResolveDispute(JobStateMachine.Disputed, JobStateMachine.Cancelled));
        Assert.False(sm.CanResolveDispute(JobStateMachine.Disputed, JobStateMachine.Open));
        Assert.False(sm.CanResolveDispute(JobStateMachine.InProgress, JobStateMachine.Completed));

        var disputedActions = sm.GetAllowedActions(JobStateMachine.Disputed);
        Assert.False(disputedActions.CanForceCancel);
        Assert.True(disputedActions.CanResolveDispute);
        Assert.Equal(new[] { "completed", "cancelled" }, disputedActions.DisputeOutcomes);
    }

    [Fact]
    public void ReviewQueue_OrdersByUrgencyAndAgingAndPreservesItemsOnPeek()
    {
        var now = new DateTimeOffset(2026, 10, 27, 12, 0, 0, TimeSpan.Zero);
        var queue = new ReviewQueue();
        Assert.Empty(queue.Peek(5));

        var items = new[]
        {
            new ReviewQueueItem("app:1", ReviewItemKind.Application, "1", "Pending Pro", "Plumbing", now.AddHours(-2), "/admin/applications"),
            new ReviewQueueItem("rep:1", ReviewItemKind.Report, "2", "Open Report", "Late arrival", now.AddHours(-5), "/admin/reports"),
            new ReviewQueueItem("dis:1", ReviewItemKind.Dispute, "3", "Disputed Job", "Leak", now.AddHours(-1), "/admin/disputes/3"),
        };

        queue.Load(items, now);
        Assert.Equal(3, queue.Count);

        var top2 = queue.Peek(2);
        Assert.Equal(2, top2.Length);
        Assert.Equal("dis:1", top2[0].Key);
        Assert.Equal("rep:1", top2[1].Key);
        Assert.Equal(3, queue.Count);

        // If report ages by 120 hours, its priority drops below dispute (200 - 125 = 75 vs 100 - 121 = -21 if both age, or test older report)
        var agedItems = new[]
        {
            new ReviewQueueItem("dis:fresh", ReviewItemKind.Dispute, "3", "Fresh Dispute", "Leak", now, "/admin/disputes/3"),
            new ReviewQueueItem("rep:very-old", ReviewItemKind.Report, "2", "Ancient Report", "Spam", now.AddHours(-150), "/admin/reports"),
        };
        queue.Refresh(agedItems, now);
        var peeked = queue.Peek(2);
        Assert.Equal("rep:very-old", peeked[0].Key);

        queue.RecalculatePriorities(now.AddHours(10));
        Assert.True(queue.Remove("rep:very-old"));
        Assert.Equal(1, queue.Count);
    }

    [Fact]
    public void AuditIndex_SupportsPagingTimeWindowsAndDailyCounts()
    {
        var baseTime = new DateTimeOffset(2026, 10, 27, 10, 0, 0, TimeSpan.Zero);
        var index = new AuditIndex();

        var entries = new[]
        {
            new AuditEntry("a3", "adm1", "Admin", "act3", "job", "j3", "{}", baseTime),
            new AuditEntry("a1", "adm1", "Admin", "act1", "user", "u1", "{}", baseTime.AddDays(-2)),
            new AuditEntry("a2", "adm1", "Admin", "act2", "report", "r1", "{}", baseTime.AddDays(-1)),
        };

        index.Load(entries);
        Assert.Equal(3, index.Count);
        Assert.Equal(2, index.CountBetween(baseTime.AddDays(-1).AddHours(-1), baseTime.AddHours(1)));

        var newestPage = index.Page(1, 2, newestFirst: true, from: null, to: null, out int total);
        Assert.Equal(3, total);
        Assert.Equal(new[] { "a3", "a2" }, newestPage.Select(x => x.Id).ToArray());

        var daily = index.CountPerDay(3, baseTime);
        Assert.Equal(3, daily.Length);
        Assert.Equal(1, daily[0].Count);
        Assert.Equal(1, daily[1].Count);
        Assert.Equal(1, daily[2].Count);
    }

    [Fact]
    public void UserAndJobSearchIndices_ReturnRankedResultsAndSuggestions()
    {
        var now = new DateTimeOffset(2026, 10, 27, 12, 0, 0, TimeSpan.Zero);
        var userIndex = new UserSearchIndex();
        userIndex.Load(new[]
        {
            new UserSearchEntry("u1", "Demo Ahmed Khan", now.AddDays(-5)),
            new UserSearchEntry("u2", "Demo Ahmed Raza", now.AddDays(-1)),
            new UserSearchEntry("u3", "Demo Bilal Khan", now.AddDays(-2)),
        });

        var suggestions = userIndex.Suggest("demo ah", 5);
        Assert.Equal(2, suggestions.Length);

        // Searching "Demo Ahmed" ranks u2 (2 tokens, newer), u1 (2 tokens, older), then u3 (1 token)
        var userHits = userIndex.Search("Demo Ahmed");
        Assert.Equal(new[] { "u2", "u1", "u3" }, userHits.Select(x => x.Id).ToArray());
        Assert.Equal(2, userHits[0].MatchedTokens);
        Assert.Equal(2, userHits[1].MatchedTokens);
        Assert.Equal(1, userHits[2].MatchedTokens);

        var jobIndex = new JobSearchIndex();
        jobIndex.Load(new[]
        {
            new JobSearchEntry("j1", "Kitchen pipe repair", "Fix leaking pipe under sink", now.AddDays(-3)),
            new JobSearchEntry("j2", "Bathroom pipe leak", "Emergency kitchen and bathroom pipe leak", now.AddDays(-1)),
            new JobSearchEntry("j3", "Split AC service", "Gas refill and filter wash", now),
        });

        string[] jobHits = jobIndex.Search("kitchen pipe leak");
        Assert.Equal(new[] { "j2", "j1" }, jobHits);
    }
}
