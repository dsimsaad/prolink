namespace ProLink.Engine.Algorithms;

// Binary search bounds over a sorted sequence using a key selector and comparison delegate.
// Needed by AuditIndex to locate start and end indices of timestamp windows in logarithmic time.
// Complexity: LowerBound and UpperBound both run in O(log n) time and O(1) space.
public static class BinarySearch
{
    // Returns the first index in [0..count] whose key is greater than or equal to target.
    public static int LowerBound<TItem, TKey>(
        IReadOnlyList<TItem> sortedItems,
        TKey target,
        Func<TItem, TKey> keySelector,
        Comparison<TKey> comparison)
    {
        if (sortedItems is null)
        {
            throw new ArgumentNullException(nameof(sortedItems));
        }
        if (keySelector is null)
        {
            throw new ArgumentNullException(nameof(keySelector));
        }
        if (comparison is null)
        {
            throw new ArgumentNullException(nameof(comparison));
        }

        int low = 0;
        int high = sortedItems.Count;

        while (low < high)
        {
            int mid = low + ((high - low) / 2);
            TKey midKey = keySelector(sortedItems[mid]);

            if (comparison(midKey, target) < 0)
            {
                low = mid + 1;
            }
            else
            {
                high = mid;
            }
        }

        return low;
    }

    // Returns the first index in [0..count] whose key is strictly greater than target.
    public static int UpperBound<TItem, TKey>(
        IReadOnlyList<TItem> sortedItems,
        TKey target,
        Func<TItem, TKey> keySelector,
        Comparison<TKey> comparison)
    {
        if (sortedItems is null)
        {
            throw new ArgumentNullException(nameof(sortedItems));
        }
        if (keySelector is null)
        {
            throw new ArgumentNullException(nameof(keySelector));
        }
        if (comparison is null)
        {
            throw new ArgumentNullException(nameof(comparison));
        }

        int low = 0;
        int high = sortedItems.Count;

        while (low < high)
        {
            int mid = low + ((high - low) / 2);
            TKey midKey = keySelector(sortedItems[mid]);

            if (comparison(midKey, target) <= 0)
            {
                low = mid + 1;
            }
            else
            {
                high = mid;
            }
        }

        return low;
    }
}
