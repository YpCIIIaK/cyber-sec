/* EN: Active Directory, Reverse Engineering */
window.CONTENT_EN = window.CONTENT_EN || {};

CONTENT_EN.ad = {
  ad_intro: {
    t: "What is Active Directory",
    intro: `
<h3>The directory of the whole organization</h3>
<p><b>Active Directory (AD)</b> is Microsoft's directory service: centralized management of users, computers and policies in a domain.</p>
<ul>
  <li><b>Domain Controller (DC)</b> — the server that stores the AD database and performs authentication.</li>
  <li><b>OU</b> (Organizational Unit) — containers for grouping objects.</li>
  <li><b>Kerberos</b> — the main authentication protocol in a domain (TGT/TGS tickets).</li>
  <li><b>LDAP</b> — the protocol for querying the directory.</li>
  <li><b>GPO</b> — group policies applied to objects.</li>
</ul>
<div class="callout">🔎 Understanding AD is critical: most corporate networks are built around it.</div>
`,
    tasks: {
      ad_read: ["Learn AD basics", "Read the introduction."],
      ad_dc: ["The heart of the domain", "What is the server that stores the AD database called? (acronym, 2 letters)", ["Domain Controller."]],
      ad_kerb: ["Authentication", "The main authentication protocol in a domain? (one word)", ["Named after a three-headed dog."]],
      ad_ldap: ["Directory queries", "The protocol for querying the directory? (acronym, 4 letters)", ["Lightweight Directory Access Protocol."]],
    },
  },
  ad_recon: {
    t: "Domain reconnaissance (legally)",
    intro: `
<h3>Enumeration as part of an audit</h3>
<p>During an authorized test you build a map of the domain:</p>
<ul>
  <li><code>net user /domain</code> — domain users.</li>
  <li><code>net group "Domain Admins" /domain</code> — members of the domain admins group.</li>
  <li><code>nltest /dclist:domain</code> — list of domain controllers.</li>
  <li>Tools: BloodHound (relationship graph), PowerView.</li>
</ul>
<p>A well-known technique: <b>Kerberoasting</b> — requesting TGS tickets for service accounts and cracking their passwords offline (defense: long service account passwords and gMSA).</p>
<div class="callout">🧪 In the sandbox: <code>type Documents\\domain.txt</code> — there's a training flag there.</div>
`,
    tasks: {
      adr_read: ["Learn AD reconnaissance", "Read about enumeration."],
      adr_users: ["Domain users", "Which command (3 words) shows domain users?", ["net user ...", "net user /domain"]],
      adr_kerb: ["Attacking services", "What is the attack called that requests TGS tickets and cracks service account passwords offline? (one word)", ["Kerber..."]],
      adr_flag: ["🚩 A flag in the sandbox", "Read the file Documents\\domain.txt in the sandbox and enter the flag.", ["cd Documents, then type domain.txt", "type Documents\\domain.txt"]],
    },
  },
  ad_defense: {
    t: "Defending Active Directory",
    intro: `
<h3>Making the attacker's life harder</h3>
<ul>
  <li><b>Tiering</b> — separating admin tiers (Tier 0/1/2) so a workstation admin is not a DC admin.</li>
  <li><b>LAPS</b> — a unique random local administrator password on every machine.</li>
  <li>Event monitoring: 4624/4625 (logons), 4768/4769 (Kerberos tickets).</li>
  <li>Protection against <b>Pass-the-Hash</b>: Credential Guard, restricting admin RDP.</li>
</ul>
<div class="callout">🛡️ Least privilege + monitoring = the foundation of a secure domain.</div>
`,
    tasks: {
      add_read: ["Learn AD defense", "Read about the protective measures."],
      add_laps: ["Unique admin passwords", "What is the solution for unique local admin passwords called? (acronym, 4 letters)", ["Local Administrator Password Solution."]],
      add_pth: ["Stealing a hash", "The attack where a stolen NTLM hash is reused without the password? (words joined by hyphens)", ["Pass ... Hash"]],
      add_admins: ["The domain admins group", "What is the group with full control over the domain called? (2 words)", ["Domain ..."]],
    },
  },
};

CONTENT_EN.reverse = {
  re_intro: {
    t: "Reverse engineering basics",
    intro: `
<h3>Taking a program apart without the source code</h3>
<p><b>Reverse engineering</b> is recovering a program's logic from a compiled file. Two approaches:</p>
<ul>
  <li><b>Static</b> — analysis without running it (disassembler, strings, imports).</li>
  <li><b>Dynamic</b> — analysis while it runs (debugger, sandbox).</li>
</ul>
<p>The Windows executable format is <b>PE</b> (Portable Executable): <code>.exe</code>, <code>.dll</code>. Inside are sections (.text — code, .data — data) and an import table (which APIs are called).</p>
<p>Tools: <b>Ghidra</b> (free), <b>IDA</b>, <b>x64dbg</b> (debugger).</p>
<div class="callout">⚖️ Only reverse your own software or where the license/law allows it.</div>
`,
    tasks: {
      re_read: ["Learn the basics", "Read the introduction."],
      re_pe: ["The exe format", "What is the Windows executable format called? (acronym, 2 letters)", ["Portable Executable."]],
      re_static: ["Without running it", "What is analysis without running the program called? (one word)", ["The opposite of dynamic."], { answers: ["static"] }],
      re_tool: ["Disassembler", "Name one popular disassembler (e.g. G... or I...).", ["Ghidra / IDA / x64dbg"]],
    },
  },
  re_strings: {
    t: "Strings and secrets in a binary",
    intro: `
<h3>The first step of any analysis is strings</h3>
<p>Passwords, URLs, keys and flags often sit right inside a binary as plain text. They are extracted with the <b>strings</b> utility (Sysinternals <code>strings.exe</code> on Windows).</p>
<p>Secrets are often "hidden" with simple encoding — <b>Base64</b>, XOR, ROT13. That's not protection: it decodes instantly.</p>
<div class="callout">🧪 In the sandbox, try <code>base64 -d</code> and <code>rot13</code> to decode the strings from the tasks.</div>
`,
    tasks: {
      res_read: ["Learn about strings", "Read about strings in binaries."],
      res_tool: ["Extract text", "Which utility extracts readable strings from a binary file? (one word)", ["That's literally its name."]],
      res_b64: ["🚩 Decode the string", "The string Q1lCRVJ7cmV2X2VuZ19zdHJpbmdzfQ== was extracted from a binary — decode it (base64 -d in the sandbox) and enter the flag.", ["base64 -d Q1lCRVJ7cmV2X2VuZ19zdHJpbmdzfQ==", "It starts with CYBER{"]],
      res_rot: ["🚩 A shifted string", "The string PLORE{ebg13_qrpbqrq} is ROT13-encoded. Decode it (rot13 in the sandbox) and enter the result.", ["rot13 PLORE{ebg13_qrpbqrq}", "ROT13 is reversed by applying ROT13 again."]],
    },
  },
  re_anti: {
    t: "Anti-reversing techniques",
    intro: `
<h3>How software resists analysis</h3>
<ul>
  <li><b>Packing</b> — compressing/encrypting code that unpacks itself in memory at launch (UPX etc.).</li>
  <li><b>Anti-debugging</b> — detecting a debugger (<code>IsDebuggerPresent</code>) and changing behavior.</li>
  <li><b>Obfuscation</b> — making code and strings hard to read.</li>
</ul>
<p>The analyst's answer: unpacking in memory, patching the checks, emulation.</p>
`,
    tasks: {
      rea_read: ["Learn anti-reversing", "Read about protection against analysis."],
      rea_pack: ["Hiding code", "What is compressing/encrypting a binary that unpacks at launch called? (one word)", ["UPX is a well-known ..."]],
      rea_dbg: ["Detecting a debugger", "The WinAPI function that checks for a debugger starts with IsDebugger...? Enter it in full.", ["IsDebugger + Present"]],
    },
  },
};
