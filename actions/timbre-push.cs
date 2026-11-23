// Streamer.bot "Timbre Push" action — caches and broadcasts the visualizer
// config to every connected overlay page.
//
// HOW TO USE (see docs/SETUP.md for the full walkthrough):
//   1. Streamer.bot -> Actions -> add an action named EXACTLY "Timbre Push"
//      (the name matters: panel-client-sb.js does DoAction { name: "Timbre Push" }
//      on connect to recreate a sync-on-connect replay).
//   2. Add a sub-action: Core -> C# -> Execute C# Code. Paste EVERYTHING below and
//      click COMPILE — it must report success. A compile error means the action runs
//      but broadcasts nothing, which shows up as a default-settings overlay.
//   3. Put the action in a BLOCKING action queue (docs/SETUP.md, step 2). In the
//      default queue two runs can overlap and see one request's arguments, and a
//      change made in the dock can be lost.
//
// Two call shapes, both from the shared WebSocket:
//   • control.html pushes:  DoAction "Timbre Push" args { config: "<full JSON>" }
//       -> check it, persist it to the global var, then broadcast it.
//   • overlay sync-on-connect: DoAction "Timbre Push" args { reason: "overlay-connect" }
//       -> no config arg; broadcast whatever is cached (no-op when nothing cached yet —
//          the overlay just keeps its built-in defaults).
//
// The broadcast is { "type":"timbre:config", "config":<the stored text> }. The stored
// text is put into it as it is, never parsed, so it is checked first.
//
// WHAT IS CHECKED before a config is stored (a push), in this order:
//   • too-large       the text, without white space at its ends, is over 64 KB
//                     (65536 UTF-16 units; a full config is about 3.4 KB).
//   • bad-config      the text is not ONE balanced JSON object: it starts with {, every
//                     { and [ is closed by its own } or ] in the right order, strings and
//                     their backslash escapes are followed so that a brace inside a string
//                     does not count, no string holds a raw control character, nothing
//                     comes after the closing brace, and outside strings there are only
//                     the characters JSON uses there.
//   • partial-config  the object does not have every top-level key of a full config
//                     (RequiredKeys below). A partial config is refused, not merged.
// A saved config is checked before a sync replays it, for the structure only
// (bad-cache): one that fails is logged and NOT broadcast, and it is not deleted. It
// is not asked for every key, so a config saved by an older dock is still replayed.
//
// WHAT IS NOT CHECKED: this is a structure check, not a JSON validator. It does not
// see a misspelt literal (tru), a missing or doubled comma or colon, a malformed
// number, or an escape JSON does not have (\q, \u12) — such text is stored, and no
// page can read the broadcast it is put into. Values are not checked either: ranges,
// types and unknown keys are the pages' job (shared/viz-config.js sanitizeConfig, run
// by control.html before it sends and by every page on receipt).
//
// ERRORS. A refused config, a bad saved config and an exception are logged here and
// broadcast as { "type":"timbre:error", "code":"<code>", "message":"<fixed text>" }, so
// the dock can say why. The codes are too-large, bad-config, partial-config, bad-cache
// and exception. The message is one fixed text per code: an exception's own message
// goes to Streamer.bot's log only, never to the pages.
//
// NOTE: uses ONLY types in Streamer.bot's default C# reference set — JSON is
// hand-written (no Newtonsoft), and the syntax is C# 5.
//
// mock-sb-server.mjs (runTimbrePush) mirrors Execute() line for line, and
// tools/cs/push-cases.json is the table both are tested with. Change them together.

using System;
using System.Text;

public class CPHInline
{
    // The most a config may be, in UTF-16 units, after the white space at its ends is cut.
    const int MaxConfigChars = 64 * 1024;

    // The top-level keys of a full config: those of TIMBRE.defaultConfig() in
    // shared/viz-config.js. verify.mjs and verify-cs.mjs fail when the two lists differ.
    static readonly string[] RequiredKeys = {
        "activeViz", "mic", "bars", "bounce", "gain", "colorSpeed", "colorHue", "bgOpacity",
        "effectBgOpacity", "idleAnim", "showLabels", "showChevrons", "showDecorations",
        "showBorder", "placement", "afterglow", "perViz"
    };

    public bool Execute()
    {
        try
        {
            string cfg;
            if (CPH.TryGetArg("config", out cfg) && !string.IsNullOrEmpty(cfg))
            {
                // The payload is embedded raw into the broadcast JSON and replayed to every
                // page that connects, so nothing is stored that is not one object.
                string trimmed = TrimJsonSpace(cfg);
                if (trimmed.Length > MaxConfigChars)
                    return Refuse("too-large", "the config is over 64 KB", "a config of " + trimmed.Length + " chars is over the limit of " + MaxConfigChars);
                bool[] seen = new bool[RequiredKeys.Length];
                if (!IsOneJsonObject(trimmed, seen))
                    return Refuse("bad-config", "the config is not one JSON object", "the config arg is not one balanced JSON object (" + cfg.Length + " chars)");
                string missing = MissingKeys(seen);
                if (missing.Length > 0)
                    return Refuse("partial-config", "the config is not a full config", "a push must carry every top-level key of a full config; missing: " + missing + " (" + cfg.Length + " chars)");
                CPH.SetGlobalVar("timbre.config", trimmed, true);
                cfg = trimmed;
            }
            else
            {
                cfg = CPH.GetGlobalVar<string>("timbre.config", true);
                if (string.IsNullOrEmpty(cfg))
                {
                    CPH.LogInfo("[Timbre Push] sync requested but no cached config yet — skipping");
                    return true;
                }
                // The saved value is replayed as it is, so it gets the structure check too.
                // It is not asked for every key: an older dock saved fewer.
                string saved = TrimJsonSpace(cfg);
                if (!IsOneJsonObject(saved, null))
                    return Refuse("bad-cache", "the saved config is damaged; change a setting to replace it", "the saved timbre.config is not one balanced JSON object (" + cfg.Length + " chars); it was not broadcast and was left as it is");
                cfg = saved;
            }

            CPH.LogInfo("[Timbre Push] broadcast (" + cfg.Length + " chars)");
            CPH.WebsocketBroadcastJson("{\"type\":\"timbre:config\",\"config\":" + cfg + "}");
            return true;
        }
        catch (Exception ex)
        {
            // The exception goes to the log. The pages get a code and a fixed text.
            CPH.LogWarn("[Timbre Push] ERROR: " + ex);
            try { CPH.WebsocketBroadcastJson(ErrorJson("exception", "the action threw an exception")); }
            catch (Exception) { }
            return false;
        }
    }

    // A config that is not taken, or not replayed: one log line, one timbre:error.
    bool Refuse(string code, string message, string log)
    {
        CPH.LogWarn("[Timbre Push] refused (" + code + "): " + log);
        CPH.WebsocketBroadcastJson(ErrorJson(code, message));
        return false;
    }

    static string ErrorJson(string code, string message)
    {
        return "{\"type\":\"timbre:error\",\"code\":" + JsonStr(code) + ",\"message\":" + JsonStr(message) + "}";
    }

    // JSON's own white space: space, tab, line feed, carriage return. (string.Trim()
    // also cuts characters JSON does not allow there, such as a no-break space.)
    static bool IsJsonSpace(char c)
    {
        return c == ' ' || c == '\t' || c == '\n' || c == '\r';
    }

    static string TrimJsonSpace(string s)
    {
        int a = 0, b = s.Length;
        while (a < b && IsJsonSpace(s[a])) a++;
        while (b > a && IsJsonSpace(s[b - 1])) b--;
        return s.Substring(a, b - a);
    }

    // What JSON has outside a string, besides the brackets and the quote: white space,
    // the colon and the comma, the characters of a number, and the letters of true,
    // false and null.
    static bool IsJsonPlain(char c)
    {
        return IsJsonSpace(c) || c == ':' || c == ',' || (c >= '0' && c <= '9')
            || c == '-' || c == '+' || c == '.' || "eEaflnrstu".IndexOf(c) >= 0;
    }

    // Whether s (already trimmed) is exactly one balanced JSON object. One walk over the
    // text: brackets are matched on a stack, strings and their escapes are stepped over.
    // When `seen` is given, seen[i] is set for each RequiredKeys[i] found as a key of the
    // top object itself (a string at depth 1 that a colon follows), compared as written.
    // See the header for what this does not catch.
    static bool IsOneJsonObject(string s, bool[] seen)
    {
        int n = s.Length;
        if (n < 2 || s[0] != '{') return false;
        char[] open = new char[n];
        int depth = 0;
        int i = 0;
        while (i < n)
        {
            char c = s[i];
            if (c == '"')
            {
                int start = i + 1;
                bool closed = false;
                i++;
                while (i < n)
                {
                    char d = s[i];
                    if (d == '\\')
                    {
                        // An escape: the character after it is part of the string.
                        if (i + 1 >= n || s[i + 1] < ' ') return false;
                        i += 2;
                        continue;
                    }
                    if (d == '"') { closed = true; break; }
                    if (d < ' ') return false;
                    i++;
                }
                if (!closed) return false;
                if (depth == 1 && seen != null)
                {
                    int j = i + 1;
                    while (j < n && IsJsonSpace(s[j])) j++;
                    if (j < n && s[j] == ':')
                    {
                        int at = Array.IndexOf(RequiredKeys, s.Substring(start, i - start));
                        if (at >= 0) seen[at] = true;
                    }
                }
            }
            else if (c == '{' || c == '[')
            {
                open[depth] = c;
                depth++;
            }
            else if (c == '}' || c == ']')
            {
                if (depth == 0) return false;
                depth--;
                if ((c == '}') != (open[depth] == '{')) return false;
                // The top object has closed: it must be the last character.
                if (depth == 0) return i == n - 1;
            }
            else if (!IsJsonPlain(c))
            {
                return false;
            }
            i++;
        }
        return false;
    }

    // The required keys that were not seen, as "a, b, c"; empty when none is missing.
    static string MissingKeys(bool[] seen)
    {
        var sb = new StringBuilder();
        for (int k = 0; k < RequiredKeys.Length; k++)
        {
            if (seen[k]) continue;
            if (sb.Length > 0) sb.Append(", ");
            sb.Append(RequiredKeys[k]);
        }
        return sb.ToString();
    }

    // Minimal, correct JSON string encoder (escapes quotes, backslashes, controls).
    static string JsonStr(string s)
    {
        if (s == null) return "\"\"";
        var sb = new StringBuilder(s.Length + 2);
        sb.Append('"');
        foreach (char c in s)
        {
            switch (c)
            {
                case '"':  sb.Append("\\\""); break;
                case '\\': sb.Append("\\\\"); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                default:
                    if (c < ' ') sb.Append("\\u").Append(((int)c).ToString("x4"));
                    else sb.Append(c);
                    break;
            }
        }
        sb.Append('"');
        return sb.ToString();
    }
}
