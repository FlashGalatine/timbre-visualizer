// Runs the Timbre Push action (compiled in beside this file as class CPHInline) through
// a script of calls and writes what happened. Used only by verify-cs.mjs. Every case
// runs in ONE process, so the program is started once.
//
//   timbre-push.exe <script.txt> <out.txt>      both UTF-8
//
// Script lines:
//   #reset                 forget every global, log line and broadcast
//   #global <key>=<value>  set a global directly
//   #throw=<key>           make writing that global throw (empty = off)
//   (no args)              one Execute() with no arguments
//   <k>=<v><TAB><k>=<v>…   one Execute() with those arguments (all strings)
// Output, one line per Execute(), TAB separated:
//   ret=<true|false>  warn=<new warnings>  info=<new info lines>
//   log=<the new log lines, warnings first, joined by U+001E; line breaks and tabs as spaces>
//   bc=<broadcast JSON, joined by U+001E>  then every global as <key>=<value>, sorted.

using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public static class Harness
{
    static string OneLine(string s) { return s.Replace('\r', ' ').Replace('\n', ' ').Replace('\t', ' '); }

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
            if (line.StartsWith("#global ")) { string kv = line.Substring(8); int e = kv.IndexOf('='); cph.Globals[kv.Substring(0, e)] = kv.Substring(e + 1); continue; }
            if (line.StartsWith("#throw=")) { string k = line.Substring(7); cph.ThrowOnSetKey = k.Length == 0 ? null : k; continue; }
            if (line.StartsWith("#")) continue;

            cph.Args = new Dictionary<string, object>();
            if (line != "(no args)")
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

            outp.Append("ret=").Append(ret ? "true" : "false");
            outp.Append("\twarn=").Append(cph.Warnings.Count - warnBefore);
            outp.Append("\tinfo=").Append(cph.Infos.Count - infoBefore);
            outp.Append("\tlog=").Append(string.Join("\u001e", log.ToArray()));
            outp.Append("\tbc=").Append(string.Join("\u001e", cph.Broadcasts.GetRange(bcBefore, cph.Broadcasts.Count - bcBefore).ToArray()));
            var keys = new List<string>(cph.Globals.Keys);
            keys.Sort(StringComparer.Ordinal);
            foreach (string k in keys) outp.Append('\t').Append(k).Append('=').Append(cph.Globals[k]);
            outp.Append('\n');
        }
        File.WriteAllText(argv[1], outp.ToString(), utf8);
        return 0;
    }
}
