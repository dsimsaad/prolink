namespace ProLink.Engine.Rules;

public sealed record AllowedJobActions(
    string CurrentStatus,
    string[] NextStates,
    bool CanForceCancel,
    bool CanResolveDispute,
    string[] DisputeOutcomes);

// Directed graph adjacency list representing valid marketplace job lifecycle transitions and administrative override rules.
// Needed by force-cancel, dispute resolution, and allowed-actions endpoints to enforce state invariants consistently.
// Complexity: CanTransition, NextStates, CanForceCancel, and CanResolveDispute are all O(deg(v)) = O(1).
public sealed class JobStateMachine
{
    public const string Draft = "Draft";
    public const string Open = "Open";
    public const string OffersReceived = "Offers received";
    public const string Assigned = "Assigned";
    public const string InProgress = "In progress";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
    public const string Expired = "Expired";
    public const string Disputed = "Disputed";

    private readonly Dictionary<string, string[]> _adjacency = new()
    {
        [Draft] = new[] { Open, Cancelled },
        [Open] = new[] { OffersReceived, Cancelled, Expired },
        [OffersReceived] = new[] { Assigned, Cancelled, Expired },
        [Assigned] = new[] { InProgress, Cancelled, Disputed },
        [InProgress] = new[] { Completed, Disputed, Cancelled },
        [Disputed] = new[] { Completed, Cancelled },
        [Completed] = Array.Empty<string>(),
        [Cancelled] = Array.Empty<string>(),
        [Expired] = Array.Empty<string>(),
    };

    private static readonly string[] ForceCancellableStatuses =
    {
        Open,
        OffersReceived,
        Assigned,
        InProgress,
    };

    private static readonly string[] DisputeResolutionTargets =
    {
        Completed,
        Cancelled,
    };

    public bool IsKnownState(string? status)
    {
        return !string.IsNullOrWhiteSpace(status) && _adjacency.ContainsKey(status);
    }

    public string[] NextStates(string? fromStatus)
    {
        if (string.IsNullOrWhiteSpace(fromStatus) || !_adjacency.TryGetValue(fromStatus, out var targets))
        {
            return Array.Empty<string>();
        }

        var copy = new string[targets.Length];
        for (int i = 0; i < targets.Length; i++)
        {
            copy[i] = targets[i];
        }
        return copy;
    }

    public bool CanTransition(string? fromStatus, string? toStatus)
    {
        if (string.IsNullOrWhiteSpace(fromStatus) || string.IsNullOrWhiteSpace(toStatus))
        {
            return false;
        }
        if (!_adjacency.TryGetValue(fromStatus, out var targets))
        {
            return false;
        }

        for (int i = 0; i < targets.Length; i++)
        {
            if (targets[i] == toStatus)
            {
                return true;
            }
        }
        return false;
    }

    public bool CanForceCancel(string? currentStatus)
    {
        if (string.IsNullOrWhiteSpace(currentStatus))
        {
            return false;
        }

        for (int i = 0; i < ForceCancellableStatuses.Length; i++)
        {
            if (ForceCancellableStatuses[i] == currentStatus)
            {
                return true;
            }
        }
        return false;
    }

    public bool CanResolveDispute(string? currentStatus, string? targetStatus)
    {
        if (currentStatus != Disputed || string.IsNullOrWhiteSpace(targetStatus))
        {
            return false;
        }

        for (int i = 0; i < DisputeResolutionTargets.Length; i++)
        {
            if (DisputeResolutionTargets[i] == targetStatus)
            {
                return true;
            }
        }
        return false;
    }

    public AllowedJobActions GetAllowedActions(string currentStatus)
    {
        bool canForceCancel = CanForceCancel(currentStatus);
        bool canResolveDispute = currentStatus == Disputed;
        string[] outcomes = canResolveDispute
            ? new[] { "completed", "cancelled" }
            : Array.Empty<string>();

        return new AllowedJobActions(
            currentStatus,
            NextStates(currentStatus),
            canForceCancel,
            canResolveDispute,
            outcomes);
    }
}
