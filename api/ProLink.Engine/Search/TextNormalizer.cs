using System.Text;

namespace ProLink.Engine.Search;

// Shared text normalization and word tokenization used by both Trie and InvertedIndex.
// Complexity: Normalize and Tokenize both run in O(L) where L is the input character length.
public static class TextNormalizer
{
    public static string Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        string trimmed = text.Trim();
        var builder = new StringBuilder(trimmed.Length);
        bool prevWhitespace = false;

        for (int i = 0; i < trimmed.Length; i++)
        {
            char c = char.ToLowerInvariant(trimmed[i]);
            if (char.IsWhiteSpace(c))
            {
                if (!prevWhitespace)
                {
                    builder.Append(' ');
                    prevWhitespace = true;
                }
            }
            else
            {
                builder.Append(c);
                prevWhitespace = false;
            }
        }

        return builder.ToString();
    }

    public static string[] Tokenize(string? text)
    {
        string normalized = Normalize(text);
        if (normalized.Length == 0)
        {
            return Array.Empty<string>();
        }

        var tokens = new List<string>();
        var current = new StringBuilder();

        for (int i = 0; i < normalized.Length; i++)
        {
            char c = normalized[i];
            if (char.IsLetterOrDigit(c))
            {
                current.Append(c);
            }
            else if (current.Length > 0)
            {
                tokens.Add(current.ToString());
                current.Clear();
            }
        }

        if (current.Length > 0)
        {
            tokens.Add(current.ToString());
        }

        var result = new string[tokens.Count];
        for (int i = 0; i < tokens.Count; i++)
        {
            result[i] = tokens[i];
        }
        return result;
    }
}
