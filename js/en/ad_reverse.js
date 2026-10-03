/* EN: Active Directory & Reverse Engineering */
window.CONTENT_EN = window.CONTENT_EN || {};

CONTENT_EN.ad = {
  ad_intro: {
    t: "What is Active Directory",
    intro: `
<h3>The directory of the whole organization</h3>
<p><b>Active Directory (AD)</b> is Microsoft's directory service, around which most corporate networks are built. It centrally manages users, computers, groups and policies. For an attacker AD is the main goal: take the domain controller — own the whole network. For a defender it's the main asset.</p>

<h3>Structure</h3>
<ul>
  <li><b>Forest</b> — the top level, one or more domain trees.</li>
  <li><b>Domain</b> — a logical unit (<code>corp.local</code>) with its own database.</li>
  <li><b>OU</b> (Organizational Unit) — containers for grouping objects and applying policies.</li>
  <li><b>Objects</b> — users, computers, groups; each has a unique <b>SID</b>.</li>
</ul>

<h3>Key components</h3>
<table>
  <thead><tr><th>Component</th><th>Role</th></tr></thead>
  <tbody>
    <tr><td><b>Domain Controller (DC)</b></td><td>Server with the AD database, performs authentication</td></tr>
    <tr><td><b>Kerberos</b></td><td>The main authentication protocol (TGT/TGS tickets)</td></tr>
    <tr><td><b>LDAP</b></td><td>The directory query protocol</td></tr>
    <tr><td><b>GPO</b></td><td>Group Policy — settings applied to objects</td></tr>
    <tr><td><b>NTLM</b></td><td>The old authentication protocol (by hash), still around</td></tr>
  </tbody>
</table>

<h3>How Kerberos login works (simplified)</h3>
<ul class="tl">
  <li>The user logs in → the DC issues a <b>TGT</b> (ticket-granting ticket).</li>
  <li>To access a service → the TGT requests a <b>TGS</b> (service ticket).</li>
  <li>The service checks the TGS and grants access. The password never travels the network — that's Kerberos' strength.</li>
</ul>
<div class="callout">🔎 Understanding AD is critical: the quirks of Kerberos, NTLM and domain rights produce the classic attacks — Kerberoasting, Pass-the-Hash, Golden Ticket.</div>
`,
    tasks: {
      ad_read: ["Study AD basics", "Read about AD structure and components."],
      ad_dc: ["The domain's heart", "What is the server holding the AD database called? (acronym, 2 letters)", ["Domain Controller."]],
      ad_kerb: ["Authentication", "The main authentication protocol in a domain? (one word)", ["Named after a three-headed dog."]],
      ad_ldap: ["Directory queries", "The directory query protocol? (acronym, 4 letters)", ["Lightweight Directory Access Protocol."]],
      ad_tgt: ["The master ticket", "What is the Kerberos ticket issued at login and needed to get other tickets called? (acronym, 3 letters)", ["Ticket Granting Ticket."]],
      ad_forest: ["The top level", "What is the top level of AD structure, joining domains, called? (one word)", ["Forest."], { answers: ["forest"] }],
      ad_gpo: ["Policies", "The acronym for group policy in AD? (3 letters)", ["Group Policy Object."]],
    },
  },
  ad_recon: {
    t: "Domain recon (legal)",
    intro: `
<h3>Enumeration during an audit</h3>
<p>After gaining access to any domain machine, the first thing is to build a <b>map of the domain</b>: who's who, where the admins are, which paths lead to the controller. Both pentesters (with permission) and attackers do this — so defenders need to know the techniques to spot them.</p>

<h3>Recon commands</h3>
<table>
  <thead><tr><th>Command</th><th>What it shows</th></tr></thead>
  <tbody>
    <tr><td><code>net user /domain</code></td><td>Domain users</td></tr>
    <tr><td><code>net group "Domain Admins" /domain</code></td><td>Members of domain admins</td></tr>
    <tr><td><code>nltest /dclist:domain</code></td><td>List of domain controllers</td></tr>
    <tr><td><code>setspn -Q */*</code></td><td>Service accounts with an SPN (Kerberoasting targets)</td></tr>
  </tbody>
</table>
<p><b>Tools:</b> <b>BloodHound</b> builds a graph of relationships and finds the shortest path to Domain Admin; <b>PowerView</b> — recon from PowerShell.</p>

<h3>Classic Kerberos attacks</h3>
<ul class="tl">
  <li><b>Kerberoasting</b> — request a TGS for a service account (with an SPN) and brute-force its password offline. Defense: long service-account passwords, gMSA, AES.</li>
  <li><b>AS-REP Roasting</b> — for accounts without Kerberos pre-authentication, a hash can be obtained without a password.</li>
  <li><b>Pass-the-Hash</b> — reuse a stolen NTLM hash without knowing the password.</li>
</ul>
<div class="callout warn">⚠️ Mass LDAP queries and TGS requests for many SPNs leave a visible trail in the logs. That's exactly how a SOC catches recon and Kerberoasting (event 4769).</div>
<div class="callout">🧪 In the sandbox: <code>type Documents\\domain.txt</code> — a training flag is there. Then practice the audit in the lab below.</div>
`,
    tasks: {
      adr_read: ["Study AD recon", "Read about enumeration and Kerberos attacks."],
      adr_users: ["Domain users", "Which command (3 words) shows domain users?", ["net user ...", "net user /domain"], { answers: ["net user /domain"] }],
      adr_kerb: ["Attack on services", "What is the attack of requesting a TGS and offline-cracking service-account passwords called? (one word)", ["Kerber..."], { answers: ["kerberoasting"] }],
      adr_bh: ["The domain relationship graph", "Which tool builds a graph of paths to Domain Admin? (one word)", ["Blood + hound"], { answers: ["bloodhound"] }],
      adr_spn: ["What Kerberoasting targets", "Which attribute on an account makes it a Kerberoasting target? (acronym, 3 letters)", ["Service Principal Name."], { answers: ["spn"] }],
      adr_flag: ["🚩 Flag in the sandbox", "Read the file Documents\\domain.txt in the sandbox and enter the flag."],
      adr_lab: ["Lab: Kerberoasting audit", "Find the service accounts vulnerable to Kerberoasting."],
      adr_path: ["Path to Domain Admin", "An attacker controls an account in a group that is nested on the domain controller itself. What is the fastest route to Domain Admin?", ["The domain admin password was changed on that same DC — so a copy of the AD database is there."], { answers: ["Through the domain database backups (ntds.dit) on the controller"] }],
      adr_ntds: ["The AD database file", "Which Active Directory database file yields hashes of every domain account when copied? (file name)", ["Lives in C:\\Windows\\NTDS on a domain controller."], { answers: ["ntds.dit", "ntds"] }],
      adr_bh_lab: ["Lab: path to Domain Admin", "Assemble the shortest privilege chain in the graph and decide which action to take first."],
    },
  },
  ad_defense: {
    t: "Active Directory defense",
    intro: `
<h3>How to make the attacker's life hard</h3>
<p>A domain can't be made "unbreakable", but you can cut attack paths and make recon noisy. AD defense rests on separating rights, account hygiene and monitoring.</p>

<h3>Privilege separation (Tiering)</h3>
<p>The tier model stops one compromised account from opening the whole domain:</p>
<ul>
  <li><b>Tier 0</b> — domain controllers, domain admins (the crown jewels).</li>
  <li><b>Tier 1</b> — servers and applications.</li>
  <li><b>Tier 2</b> — user workstations.</li>
</ul>
<p>A workstation admin <b>must not</b> be a DC admin: otherwise phishing one laptop = the whole domain falls.</p>

<h3>Account hygiene and anti-theft</h3>
<table>
  <thead><tr><th>Measure</th><th>What it defends against</th></tr></thead>
  <tbody>
    <tr><td><b>LAPS</b></td><td>Unique local-admin password → no Pass-the-Hash across the network</td></tr>
    <tr><td><b>Credential Guard</b></td><td>Isolates hashes/tickets in memory from theft</td></tr>
    <tr><td><b>gMSA + long service passwords</b></td><td>Kerberoasting becomes useless</td></tr>
    <tr><td><b>Disable NTLM where possible</b></td><td>Pass-the-Hash, relay attacks</td></tr>
  </tbody>
</table>

<h3>Monitoring (security events)</h3>
<ul>
  <li><b>4624 / 4625</b> — successful / failed logon.</li>
  <li><b>4768 / 4769</b> — TGT / TGS issuance (a spike in 4769 = Kerberoasting).</li>
  <li><b>4672</b> — logon with admin privileges.</li>
</ul>
<div class="callout">🛡️ The secure-domain formula: least privilege (tiering) + account hygiene (LAPS, gMSA) + monitoring of key events. No single measure is enough on its own.</div>
`,
    tasks: {
      add_read: ["Study AD defense", "Read about tiering, account hygiene and monitoring."],
      add_laps: ["Unique admin passwords", "What is the solution for unique local-admin passwords called? (acronym, 4 letters)", ["Local Administrator Password Solution."]],
      add_pth: ["Hash theft", "The attack where a stolen NTLM hash is reused without a password? (3 words with hyphens)", ["Pass ... Hash"], { answers: ["pass-the-hash", "pass the hash", "passthehash"] }],
      add_admins: ["Domain admins group", "What is the group with full control over the domain called? (2 words)", ["Domain ..."], { answers: ["domain admins"] }],
      add_tier: ["The most protected level", "Which Tier in the tier model is controllers and domain admins? (a number, with the word Tier or just the number)", ["The most valuable level, numbering from zero."], { answers: ["tier 0", "0", "tier0"] }],
      add_event: ["The Kerberoasting event", "A spike in which Windows event (number) indicates Kerberoasting (TGS issuance)?", ["47xx, TGS issuance."], { answers: ["4769"] }],
      add_cg: ["Memory protection", "What isolates hashes and tickets in memory, hindering their theft?", null, { options: ["Credential Guard", "BitLocker", "Defender Firewall", "UAC"] }],
    },
  },
};

CONTENT_EN.reverse = {
  re_intro: {
    t: "Reverse-engineering basics",
    intro: `
<h3>Take a program apart without the source</h3>
<p><b>Reverse engineering</b> is recovering a program's logic from a compiled file. It's the basis of malware analysis (what does the trojan do?), finding vulnerabilities and studying closed software. The compiler turned code into machine instructions — our job is to walk the path back.</p>

<h3>Two approaches</h3>
<table>
  <thead><tr><th></th><th>Static analysis</th><th>Dynamic analysis</th></tr></thead>
  <tbody>
    <tr><td>Run</td><td>Without running</td><td>During execution</td></tr>
    <tr><td>Tools</td><td>Disassembler, strings, PE-viewer</td><td>Debugger, sandbox, API monitor</td></tr>
    <tr><td>Plus</td><td>Safe, you see the whole structure</td><td>You see real behavior, bypasses packing</td></tr>
    <tr><td>Minus</td><td>Packing/obfuscation get in the way</td><td>The malware really runs — needs isolation</td></tr>
  </tbody>
</table>

<h3>The PE (Portable Executable) format</h3>
<p>Windows executables (<code>.exe</code>, <code>.dll</code>) use the <b>PE</b> format. Inside:</p>
<ul>
  <li><b>Header</b> — starts with <code>MZ</code>, holds the entry point.</li>
  <li><b>.text</b> — executable code.</li>
  <li><b>.data / .rdata</b> — data and strings.</li>
  <li><b>Import Address Table (IAT)</b> — which WinAPI functions the program calls. The imports already hint at intent: <code>InternetOpen</code> + <code>CreateProcess</code> → downloads and runs.</li>
</ul>

<h3>Tools</h3>
<ul>
  <li><b>Ghidra</b> — a free disassembler/decompiler from the NSA.</li>
  <li><b>IDA Pro</b> — the industry standard.</li>
  <li><b>x64dbg</b> — a debugger for dynamic analysis.</li>
  <li><b>PEview / CFF Explorer</b> — view the PE structure.</li>
</ul>
<div class="callout warn">⚖️ Reverse only your own software, malware in an isolated lab, or where it's allowed by license/law. Run malware only in an isolated VM with no network.</div>
`,
    tasks: {
      re_read: ["Study the basics", "Read about approaches, the PE format and tools."],
      re_pe: ["The exe format", "What is the format of Windows executables called? (acronym, 2 letters)", ["Portable Executable."]],
      re_static: ["Without running", "What is analysis without running the program called? (one word)", ["The opposite of dynamic."], { answers: ["static"] }],
      re_tool: ["A disassembler", "Name one popular disassembler (e.g. G... or I...).", ["Ghidra / IDA / x64dbg"]],
      re_iat: ["Which APIs it calls", "What is the table of imported functions in a PE, used to judge intent, called? (acronym, 3 letters)", ["Import Address Table."]],
      re_mz: ["The PE signature", "Which two letters does a PE header start with? (2 letters)", ["Mark Zbikowski's initials."], { answers: ["mz"] }],
      re_dynamic: ["When dynamic is needed", "When is dynamic analysis stronger than static?", null, { options: ["When the code is packed and unreadable statically", "When there's no computer", "When the file is small", "Always the same"] }],
    },
  },
  re_strings: {
    t: "Strings and secrets in a binary",
    intro: `
<h3>The first step of any analysis — strings</h3>
<p>Before diving into assembly, look at the <b>strings</b>. Often C2-server URLs, paths, registry keys, mutex names, messages and even passwords sit in the binary as plain text. They're extracted by the <b>strings</b> utility (on Windows — <code>strings.exe</code> from Sysinternals).</p>

<h3>What to look for in strings (IOCs)</h3>
<table>
  <thead><tr><th>String</th><th>What it tells you</th></tr></thead>
  <tbody>
    <tr><td>URL / IP</td><td>A C2 server address</td></tr>
    <tr><td><code>...\\CurrentVersion\\Run</code></td><td>Persistence via the registry</td></tr>
    <tr><td><code>Global\\Mutex_...</code></td><td>An "already running" marker — a unique IOC</td></tr>
    <tr><td>API names (<code>VirtualAlloc</code>…)</td><td>A hint of code injection</td></tr>
  </tbody>
</table>

<h3>Hidden secrets</h3>
<p>Secrets are often "hidden" by simple encoding — <b>Base64</b>, <b>XOR</b>, <b>ROT13</b>. That's not protection: it's decoded instantly. So an analyst always tries to decode suspicious strings.</p>
<div class="callout">🧪 In the sandbox try <code>base64 -d</code> and <code>rot13</code>, and the Tools section has a Decoder. Practice extracting IOCs in the lab below.</div>
`,
    tasks: {
      res_read: ["Study strings", "Read about strings and IOCs in binaries."],
      res_tool: ["Extract text", "Which utility extracts readable strings from a binary file? (one word)", ["Named exactly that."], { answers: ["strings"] }],
      res_ioc: ["Indicator of compromise", "What is an observable sign of a breach (C2 IP, hash, registry key) called? (acronym, 3 letters)", ["Indicator of Compromise."]],
      res_b64: ["🚩 Decode the string", "A string Q1lCRVJ7cmV2X2VuZ19zdHJpbmdzfQ== was extracted from a binary — decode it (base64 -d in the sandbox) and enter the flag.", ["base64 -d Q1lCRVJ7cmV2X2VuZ19zdHJpbmdzfQ==", "Starts with CYBER{"]],
      res_rot: ["🚩 A shifted string", "The string PLORE{ebg13_qrpbqrq} is ROT13-encoded. Decode it (rot13 in the sandbox) and enter the result.", ["rot13 PLORE{ebg13_qrpbqrq}", "ROT13 is its own inverse."]],
      res_lab: ["Lab: extracting IOCs", "Mark the indicators of compromise in the strings output."],
      res_pe_lab: ["Lab: static PE triage", "From headers, strings and imports: which file is packed, which technique is used and what comes next."],
    },
  },
  re_anti: {
    t: "Anti-reversing and packing",
    intro: `
<h3>How software resists analysis</h3>
<p>Malware authors and copy-protection fight reversing. Knowing these techniques lets you recognize and bypass them.</p>

<h3>Main techniques</h3>
<table>
  <thead><tr><th>Technique</th><th>Essence</th><th>Tell-tale</th></tr></thead>
  <tbody>
    <tr><td><b>Packing</b></td><td>Compress/encrypt code, unpack in memory at launch</td><td>High entropy, few strings, a UPX section</td></tr>
    <tr><td><b>Anti-debugging</b></td><td>Detect a debugger and change behavior</td><td>A call to <code>IsDebuggerPresent</code></td></tr>
    <tr><td><b>Obfuscation</b></td><td>Scrambling code and strings</td><td>Meaningless names, junk instructions</td></tr>
    <tr><td><b>Anti-VM</b></td><td>Detect a sandbox/virtual machine</td><td>Checking for VMware/VirtualBox artifacts</td></tr>
  </tbody>
</table>

<h3>How the analyst responds</h3>
<ul class="tl">
  <li><b>Unpack in memory</b> — let the packed code unpack, then dump it.</li>
  <li><b>Patching checks</b> — replace a conditional jump so the anti-debug "doesn't fire".</li>
  <li><b>Emulation</b> — run the code in an emulator, not on a real system.</li>
</ul>
<div class="callout warn">⚠️ High file <b>entropy</b> (almost random bytes) and near-total absence of readable strings are a clear sign of packing or encryption.</div>
`,
    tasks: {
      rea_read: ["Study anti-reversing", "Read about packing and anti-debugging."],
      rea_pack: ["Hiding the code", "What is compressing/encrypting a binary with unpacking at launch called? (one word)", ["UPX is a famous ..."], { answers: ["packing", "packer"] }],
      rea_dbg: ["Debugger detection", "The WinAPI function checking for a debugger starts with IsDebugger...? Enter it in full.", ["IsDebugger + Present"]],
      rea_upx: ["A famous packer", "Name the best-known open-source executable packer. (acronym, 3 letters)", ["Ultimate Packer for eXecutables."]],
      rea_entropy: ["A sign of packing", "A high value of which metric (byte randomness) hints at packing/encryption? (one word)", ["A measure of disorder/randomness."], { answers: ["entropy"] }],
      rea_antivm: ["Fooling the sandbox", "What does anti-VM malware do when it lands in a sandbox/VM?", null, { options: ["Detects it and shows no malicious activity", "Runs faster", "Deletes the hypervisor", "Nothing changes"] }],
      rea_oep: ["Entry point of a packer", "Where do you set a breakpoint to catch the moment the code is unpacked? (acronym, 3 letters)", ["Original Entry Point — the real entry point after unpacking."], { answers: ["oep", "o.e.p"] }],
      rea_rwx: ["Memory permissions", "What do the page permissions RWX mean? Choose the correct reading.", null, { options: ["Read/Write/Execute — readable, writable and executable memory", "Read/Write/Xor — on-the-fly encryption", "Read/Write/Exclude — writes are blocked", "Read/Write/Execute — read only"] }],
      rea_dyn_lab: ["Lab: walking a sample in the debugger", "Follow the packed sample through OEP → VirtualAlloc → WinHttpOpen → CreateRemoteThread and write the conclusion."],
    },
  },
};
