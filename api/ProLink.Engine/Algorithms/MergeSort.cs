namespace ProLink.Engine.Algorithms;

// Stable top-down merge sort over arrays and lists, plus a multi-key comparison chaining helper.
// Needed to sort search results, top-N analytics items, audit entries, and posting lists without framework sorting.
// Complexity: O(n log n) time in best, average, and worst cases; O(n) auxiliary space; stable.
public static class MergeSort
{
    public static void Sort<T>(T[] items, Comparison<T> comparison)
    {
        if (items is null)
        {
            throw new ArgumentNullException(nameof(items));
        }
        if (comparison is null)
        {
            throw new ArgumentNullException(nameof(comparison));
        }
        if (items.Length <= 1)
        {
            return;
        }

        var buffer = new T[items.Length];
        SortRange(items, buffer, 0, items.Length - 1, comparison);
    }

    public static void Sort<T>(List<T> items, Comparison<T> comparison)
    {
        if (items is null)
        {
            throw new ArgumentNullException(nameof(items));
        }
        if (comparison is null)
        {
            throw new ArgumentNullException(nameof(comparison));
        }
        if (items.Count <= 1)
        {
            return;
        }

        var array = new T[items.Count];
        for (int i = 0; i < items.Count; i++)
        {
            array[i] = items[i];
        }

        Sort(array, comparison);

        for (int i = 0; i < array.Length; i++)
        {
            items[i] = array[i];
        }
    }

    public static Comparison<T> ChainComparers<T>(params Comparison<T>[] comparers)
    {
        if (comparers is null || comparers.Length == 0)
        {
            throw new ArgumentException("At least one comparer is required.", nameof(comparers));
        }

        return (left, right) =>
        {
            for (int i = 0; i < comparers.Length; i++)
            {
                int result = comparers[i](left, right);
                if (result != 0)
                {
                    return result;
                }
            }
            return 0;
        };
    }

    private static void SortRange<T>(T[] items, T[] buffer, int left, int right, Comparison<T> comparison)
    {
        if (left >= right)
        {
            return;
        }

        int mid = left + ((right - left) / 2);
        SortRange(items, buffer, left, mid, comparison);
        SortRange(items, buffer, mid + 1, right, comparison);
        MergeHalves(items, buffer, left, mid, right, comparison);
    }

    private static void MergeHalves<T>(T[] items, T[] buffer, int left, int mid, int right, Comparison<T> comparison)
    {
        int i = left;
        int j = mid + 1;
        int k = left;

        while (i <= mid && j <= right)
        {
            // Using <= preserves relative order of equal keys, keeping the sort stable
            if (comparison(items[i], items[j]) <= 0)
            {
                buffer[k] = items[i];
                i++;
            }
            else
            {
                buffer[k] = items[j];
                j++;
            }
            k++;
        }

        while (i <= mid)
        {
            buffer[k] = items[i];
            i++;
            k++;
        }

        while (j <= right)
        {
            buffer[k] = items[j];
            j++;
            k++;
        }

        for (int idx = left; idx <= right; idx++)
        {
            items[idx] = buffer[idx];
        }
    }
}
