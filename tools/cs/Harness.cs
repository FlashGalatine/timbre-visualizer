// Runs the Timbre Push action (compiled in beside this file as class CPHInline) through
// a script of calls and writes what happened. Used only by verify-cs.mjs. Every case
// runs in ONE process, so the program is started once.
//
//   timbre-push.exe <script.txt> <out.txt>      both UTF-8
//
// Script lines:
//   #reset                 forget every global, log line and broadcast
//   #global <key>=<value>  set a global directly
//   #global64 <key>=<b64>  the same, the value given as base64 of its UTF-8 (any text at all)
//   #throw=<key>           make writing that global throw (empty = off)
//   (no args)              one Execute() with no arguments
//   <k>=<v><TAB><k>=<v>…   one Execute() with those arguments (all strings)
//   #run64 <key>=<b64>     one Execute() with that one argument, given as base64 of its UTF-8
// Output, one line per Execute(), TAB separated:
//   ret=<true|false>  warn=<new warnings>  info=<new info lines>
//   log=<the new log lines, warnings first, joined by U+001E; line breaks and tabs as spaces>
//   bc=<broadcast JSON, joined by U+001E>  then every global as <key>=<value>, sorted.
// In bc and in the globals a backslash is written \\, a tab \t, a line feed \n, a carriage
// return \r and U+001E \e, so that any text stays on its line.

using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public static class Harness
{
    static string OneLine(string s) { return s.Replace('\r', ' ').Replace('\n', ' ').Replace('\t', ' '); }
    static string Esc(string s) { return s.Replace("\\", "\\\\").Replace("\t", "\\t").Replace("\n", "\\n").Replace("\r", "\\r").Replace("\u001e", "\\e"); }
    static string From64(string b64) { return new UTF8Encoding(false).GetString(Convert.FromBase64String(b64)); }

    public static int Main(string[] argv)
    {
        var utf8 = new UTF8Encoding(false);
        string[] lines = File.ReadAllLines(argv[0], utf8);
        var outp = new StringBuilder();
        var cph = new CphStub();

        foreach (string raw in lines)
        {
            string line = raw.TrimEnd('\r');
            if (line.Length == 0) continue;
            if (line == "#reset") { cph = new CphStub(); continue; }
            if (line.StartsWith("#global64 ")) { string kv = line.Substring(10); int e = kv.IndexOf('='); cph.Globals[kv.Substring(0, e)] = From64(kv.Substring(e + 1)); continue; }
            if (line.StartsWith("#global ")) { string kv = line.Substring(8); int e = kv.IndexOf('='); cph.Globals[kv.Substring(0, e)] = kv.Substring(e + 1); continue; }
            if (line.StartsWith("#throw=")) { string k = line.Substring(7); cph.ThrowOnSetKey = k.Length == 0 ? null : k; continue; }
            bool run64 = line.StartsWith("#run64 ");
            if (line.StartsWith("#") && !run64) continue;

            cph.Args = new Dictionary<string, object>();
            if (run64)
            {
                string kv = line.Substring(7);
                int e = kv.IndexOf('=');
                cph.Args[kv.Substring(0, e)] = From64(kv.Substring(e + 1));
            }
            else if (line != "(no args)")
            {
                foreach (string part in line.Split('\t'))
                {
                    int e = part.IndexOf('=');
                    if (e < 0) continue;
                    cph.Args[part.Substring(0, e)] = part.Substring(e + 1);
                }
            }
            int warnBefore = cph.Warnings.Count, infoBefore = cph.Infos.Count, bcBefore = cph.Broadcasts.Count;

            var action = new CPHInline();
            action.CPH = cph;
            bool ret = action.Execute();

            var log = new List<string>();
            foreach (string w in cph.Warnings.GetRange(warnBefore, cph.Warnings.Count - warnBefore)) log.Add(OneLine(w));
            foreach (string i in cph.Infos.GetRange(infoBefore, cph.Infos.Count - infoBefore)) log.Add(OneLine(i));
            var bcs = new List<string>();
            foreach (string b in cph.Broadcasts.GetRange(bcBefore, cph.Broadcasts.Count - bcBefore)) bcs.Add(Esc(b));

            outp.Append("ret=").Append(ret ? "true" : "false");
            outp.Append("\twarn=").Append(cph.Warnings.Count - warnBefore);
            outp.Append("\tinfo=").Append(cph.Infos.Count - infoBefore);
            outp.Append("\tlog=").Append(string.Join("\u001e", log.ToArray()));
            outp.Append("\tbc=").Append(string.Join("\u001e", bcs.ToArray()));
            var keys = new List<string>(cph.Globals.Keys);
            keys.Sort(StringComparer.Ordinal);
            foreach (string k in keys) outp.Append('\t').Append(k).Append('=').Append(Esc(cph.Globals[k]));
            outp.Append('\n');
        }
        File.WriteAllText(argv[1], outp.ToString(), utf8);
        return 0;
    }
}
