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
//
// Two call shapes, both from the shared WebSocket:
//   • control.html pushes:  DoAction "Timbre Push" args { config: "<full JSON>" }
//       -> persist to the global var, then broadcast.
//   • overlay sync-on-connect: DoAction "Timbre Push" args { reason: "overlay-connect" }
//       -> no config arg; broadcast whatever is cached (no-op when nothing cached yet —
//          the overlay just keeps its built-in defaults).
//
// The C# stays a dumb cache: the config JSON is validated + clamped by
// control.html (shared/viz-config.js sanitizeConfig) before it is sent, and the
// overlay re-sanitizes on receipt. Only a cheap structural check here.
//
// NOTE: uses ONLY types in Streamer.bot's default C# reference set — JSON is
// hand-written (no Newtonsoft). Verified pattern from the Tally/SlowPan ports
// on Streamer.bot 1.0.4. Any exception is logged AND broadcast as
// { type:"timbre:error", message } so failures are visible, not silent.

using System;
using System.Text;

public class CPHInline
{
    public bool Execute()
    {
        try
        {
            string cfg;
            if (CPH.TryGetArg("config", out cfg) && !string.IsNullOrEmpty(cfg))
            {
                // Cheap structural check — the payload is embedded raw into the
                // broadcast JSON, so reject anything that is obviously not an object.
                string trimmed = cfg.Trim();
                if (!trimmed.StartsWith("{") || !trimmed.EndsWith("}"))
                {
                    CPH.LogWarn("[Timbre Push] rejected non-object config arg (" + cfg.Length + " chars)");
                    return false;
                }
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
            }

            CPH.LogInfo("[Timbre Push] broadcast (" + cfg.Length + " chars)");
            CPH.WebsocketBroadcastJson("{\"type\":\"timbre:config\",\"config\":" + cfg + "}");
            return true;
        }
        catch (Exception ex)
        {
            CPH.LogWarn("[Timbre Push] ERROR: " + ex);
            CPH.WebsocketBroadcastJson("{\"type\":\"timbre:error\",\"message\":" + JsonStr(ex.Message) + "}");
            return false;
        }
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
