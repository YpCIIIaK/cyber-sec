/* EN: Digital Forensics & Phishing Analysis */
window.CONTENT_EN = window.CONTENT_EN || {};

CONTENT_EN.forensics = {
  fo_intro: {
    t: "Forensics basics and evidence",
    intro: `
<h3>Collect the truth without spoiling the evidence</h3>
<p><b>Digital forensics</b> is investigating incidents from digital traces so the result is reliable and can serve as evidence. The key difference from "just poking around" is strict procedure: one mistake handling evidence makes it invalid.</p>

<h3>Order of volatility</h3>
<p>Data disappears at different rates. Collect <b>from the fastest-fading to the most durable</b>:</p>
<ul class="tl">
  <li><b>CPU registers and cache</b> — vanish instantly.</li>
  <li><b>RAM</b> — lost on power-off.</li>
  <li><b>Network connections</b> — live seconds to minutes.</li>
  <li><b>Disk</b> — persists.</li>
  <li><b>Backups, logs</b> — the most durable.</li>
</ul>
<div class="callout warn">⚠️ That's why a machine is often <b>not powered off</b> immediately during an incident: shutdown wipes RAM, which may hold encryption keys, processes and fileless malware.</div>

<h3>Reliability procedures</h3>
<table>
  <thead><tr><th>Principle</th><th>Why</th></tr></thead>
  <tbody>
    <tr><td><b>Work with a copy (image)</b></td><td>The original is untouched, so nothing changes</td></tr>
    <tr><td><b>Write blocker</b></td><td>A device that prevents writing to the examined disk</td></tr>
    <tr><td><b>Image hash (SHA-256)</b></td><td>Proves the copy = original and hasn't changed</td></tr>
    <tr><td><b>Chain of custody</b></td><td>Documented chain: who, when, did what with the evidence</td></tr>
  </tbody>
</table>
<div class="callout">🔬 Golden rule: take an image → compute the hash → work with the copy → the hash still matches at the end. That's how you prove nothing was swapped.</div>
`,
    tasks: {
      fo_read: ["Study the basics", "Read about volatility and reliability procedures."],
      fo_integrity: ["Prove immutability", "What do you compute to confirm an image's integrity? (one word)", ["SHA-256 produces exactly this."], { answers: ["hash"] }],
      fo_coc: ["The chain of ownership", "What is the documented chain of evidence ownership called? (3 words)", ["Chain of ..."], { answers: ["chain of custody", "chainofcustody"] }],
      fo_vol: ["What to collect first", "What is collected first by order of volatility? (3 letters)", ["Random-access memory."], { answers: ["ram"] }],
      fo_wb: ["Write protection", "What is the device that prevents writing to the examined disk called? (2 words)", ["Write ..."], { answers: ["write blocker", "writeblocker"] }],
      fo_image: ["What you work with", "What does a forensic analyst work with to avoid damaging the evidence?", null, { options: ["A bit-for-bit copy (image)", "The original disk itself", "A cloud version", "A printout"] }],
      fo_poweroff: ["Power off or not", "Why is an infected machine often NOT powered off right away during an incident?", null, { options: ["Shutdown wipes RAM with keys and fileless malware", "To save electricity", "Shutdown breaks the disk", "It's faster that way"] }],
    },
  },
  fo_artifacts: {
    t: "Windows artifacts",
    intro: `
<h3>Where the system stores traces</h3>
<p>Windows constantly leaves traces of what happened: what ran, who logged in, which devices were attached. A forensic analyst knows where these traces are and builds a <b>timeline</b> of events from them.</p>

<table>
  <thead><tr><th>Artifact</th><th>What it tells you</th></tr></thead>
  <tbody>
    <tr><td><b>Registry</b></td><td>Autostart (Run keys), USB history, recent documents</td></tr>
    <tr><td><b>Event Log (.evtx)</b></td><td>Logons (4624/4625), process creation (4688), log clearing (1102)</td></tr>
    <tr><td><b>Prefetch</b></td><td>Which program ran, how many times and when last</td></tr>
    <tr><td><b>MFT</b></td><td>NTFS file table: metadata, timestamps, even deleted entries</td></tr>
    <tr><td><b>Amcache / ShimCache</b></td><td>Traces of executed programs (even deleted ones)</td></tr>
    <tr><td><b>Browser</b></td><td>History, downloads, cache</td></tr>
  </tbody>
</table>

<h3>What a typical investigation looks for</h3>
<ul class="tl">
  <li><b>How they got in</b> — a phishing attachment, a vulnerable service (entry point).</li>
  <li><b>What they ran</b> — Prefetch, Event 4688, Amcache.</li>
  <li><b>How they persisted</b> — registry Run keys, scheduled tasks, services.</li>
  <li><b>Whether they covered tracks</b> — event 1102 (log cleared) is itself evidence.</li>
</ul>
<div class="callout warn">⚠️ Deleting a file doesn't wipe it from the MFT and Amcache at once — forensics often recovers the "deleted". That's why attackers clear logs (which itself leaves a trace).</div>
<div class="callout">🧪 In the sandbox: find the flag in the log with <code>findstr CYBER Documents\\system.log</code>. Then practice hunting persistence in the lab below.</div>
`,
    tasks: {
      foa_read: ["Study artifacts", "Read about traces in Windows and the timeline."],
      foa_evtx: ["Event logs", "What extension do Windows event-log files have? (with a dot)", ["Event log → .e____"]],
      foa_mft: ["The NTFS file table", "What is the main NTFS file table called? (acronym, 3 letters)", ["Master File Table."]],
      foa_prefetch: ["Execution traces", "Which Windows artifact holds traces of program execution (what ran and when)? (one word)", ["Pre + fetch"], { answers: ["prefetch"] }],
      foa_1102: ["Covering tracks", "The Windows event number for clearing the security log (itself evidence)?", ["11xx."], { answers: ["1102"] }],
      foa_flag: ["🚩 Flag in the log", "Find the flag in Documents\\system.log using findstr and enter it."],
      foa_lab: ["Lab: hunting autostart", "Find the malware persistence entries in the registry."],
    },
  },
  fo_memory: {
    t: "Memory analysis",
    intro: `
<h3>RAM remembers what isn't on disk</h3>
<p>RAM is a treasure trove for an investigator. A memory dump shows what never touches the disk: decrypted code, encryption keys, plain-text passwords, active network connections and malware injected into processes.</p>

<h3>What you find in a dump</h3>
<ul>
  <li>The list of <b>processes</b> — including hidden ones.</li>
  <li><b>Network connections</b> — C2 contact at capture time.</li>
  <li><b>Code injections</b> — foreign code inside a legitimate process.</li>
  <li><b>Keys and passwords</b> — decrypted in memory.</li>
</ul>

<h3>Volatility — the memory-analysis standard</h3>
<table>
  <thead><tr><th>Plugin</th><th>What it shows</th></tr></thead>
  <tbody>
    <tr><td><code>pslist</code> / <code>pstree</code></td><td>Processes and their hierarchy</td></tr>
    <tr><td><code>netscan</code></td><td>Network connections</td></tr>
    <tr><td><code>malfind</code></td><td>Signs of code injection</td></tr>
    <tr><td><code>cmdline</code></td><td>Process launch arguments</td></tr>
  </tbody>
</table>
<div class="callout danger">🧠 Many modern malware families are <b>fileless</b> — they live only in memory, writing nothing to disk. They can't be caught by disk analysis — only by a RAM dump. That's why order of volatility matters.</div>
`,
    tasks: {
      fom_read: ["Study memory analysis", "Read about RAM dumps and Volatility."],
      fom_vol: ["The analysis framework", "Name a popular memory-dump analysis framework? (one word)", ["Vola..."], { answers: ["volatility"] }],
      fom_fileless: ["Memory-only", "What is malware living only in memory with no file on disk called? (one word)", ["file + less"]],
      fom_pslist: ["Process list", "Which Volatility plugin shows the process list? (one word)", ["ps + list"], { answers: ["pslist"] }],
      fom_malfind: ["Finding injections", "Which Volatility plugin looks for signs of code injection into processes? (one word)", ["mal + find"], { answers: ["malfind"] }],
      fom_why: ["Why RAM at all", "Why can't disk analysis replace memory analysis?", null, { options: ["Fileless malware and keys exist only in RAM", "The disk is too big", "RAM reads faster", "The disk is always encrypted"] }],
    },
  },
};

CONTENT_EN.phishing = {
  ph_anatomy: {
    t: "Anatomy of a phishing email",
    intro: `
<h3>A SOC analyst's view</h3>
<p>In a SOC phishing is the daily bread: users forward suspicious emails and the analyst must quickly reach a verdict. That requires knowing both the psychology of the attack and its technical markers. In the "Fundamentals" course we touched phishing from the user's side — here we dissect it like a professional.</p>

<h3>Types of phishing</h3>
<table>
  <thead><tr><th>Type</th><th>Target</th></tr></thead>
  <tbody>
    <tr><td><b>Phishing</b></td><td>Mass mailing "to everyone"</td></tr>
    <tr><td><b>Spear phishing</b></td><td>A specific person, personalized</td></tr>
    <tr><td><b>Whaling</b></td><td>Top executives ("the big fish")</td></tr>
    <tr><td><b>BEC</b></td><td>Business email — fake invoices/transfers "from the boss"</td></tr>
    <tr><td><b>Smishing / Vishing</b></td><td>Via SMS / by voice over the phone</td></tr>
  </tbody>
</table>

<h3>Technical markers during triage</h3>
<ul>
  <li><b>Sender:</b> mismatch between display name and real address; look-alike domain (<code>paypa1.com</code>, Cyrillic "o").</li>
  <li><b>Links:</b> visible text ≠ real URL; shorteners; read the real domain right-to-left up to the first "/".</li>
  <li><b>Attachments:</b> <code>.exe</code>, <code>.scr</code>, <code>.iso</code>, <code>.html</code>, documents with macros, password-protected archives (to bypass antivirus).</li>
  <li><b>Psychology:</b> urgency, threats, authority, curiosity.</li>
</ul>
<div class="callout warn">⚠️ A dangerous trick is a <b>password-protected archive with the password in the email body</b>: the gateway antivirus can't unpack and scan it, while the victim opens it themselves.</div>
<div class="callout">🎣 Triage rule: don't click links in a suspicious email. Check a link in a URL sandbox or on hover, and an attachment in an isolated environment.</div>
`,
    tasks: {
      pha_read: ["Study the types", "Read about the types of phishing and markers."],
      pha_spear: ["Targeted phishing", "What is targeted phishing against a specific person called? (2 words or the first word)", ["Spear in English."], { answers: ["spear phishing", "spear"] }],
      pha_whaling: ["Phishing the executives", "What is phishing top executives called? (one word)", ["\"Hunting whales\"."]],
      pha_bec: ["Business email compromise", "The acronym for the attack on business correspondence (fake invoices)? (3 letters)", ["Business Email Compromise."]],
      pha_attach: ["A dangerous attachment", "Which attachment type in Office documents is dangerous because it runs code? (one word)", ["Macro..."], { answers: ["macro", "macros"] }],
      pha_zip: ["Bypassing antivirus", "Why is a password-protected archive in the email body an alarming sign?", null, { options: ["The gateway antivirus can't scan it", "It's large", "The password is easy to forget", "It's standard practice"] }],
      pha_choice: ["What is NOT a sign of phishing?", "Pick what is NOT in itself a sign of phishing.", null, { options: ["Urgency and threats", "A valid DKIM signature from a known domain", "A look-alike domain in a link", "A request to enter a password via a link"] }],
    },
  },
  ph_auth: {
    t: "Email authentication: SPF, DKIM, DMARC",
    intro: `
<h3>Why email can't be trusted "out of the box"</h3>
<p>SMTP was created without protection: the <b>From</b> field can say anything, like the return address on an envelope. To tell genuine emails from fakes, domains publish three mechanisms in DNS.</p>

<table>
  <thead><tr><th>Mechanism</th><th>What it checks</th><th>Protects against</th></tr></thead>
  <tbody>
    <tr><td><b>SPF</b></td><td>Which servers may send mail for the domain (by the envelope MAIL FROM)</td><td>Sending from foreign servers</td></tr>
    <tr><td><b>DKIM</b></td><td>A crypto signature of headers/body — integrity and authenticity</td><td>Content tampering</td></tr>
    <tr><td><b>DMARC</b></td><td>A policy over SPF/DKIM + <b>alignment</b> of the visible From + reports</td><td>Faking the visible From</td></tr>
  </tbody>
</table>

<h3>The key nuance: alignment</h3>
<p>SPF checks the <i>envelope</i> address (MAIL FROM), but the user sees the <i>From</i> field. An attacker can make SPF <b>pass</b> for their domain while the visible From says your bank. That's why <b>DMARC</b> is needed: it requires the From domain to <b>match</b> (align) the verified SPF/DKIM.</p>
<ul class="tl">
  <li><b>p=none</b> — monitoring only, nothing blocked.</li>
  <li><b>p=quarantine</b> — suspicious to spam.</li>
  <li><b>p=reject</b> — fakes rejected (the strictest, the target mode).</li>
</ul>
<div class="callout warn">⚠️ SPF=pass ≠ "the email is legitimate". Without DMARC alignment the visible From can still be faked. Always check the DMARC result.</div>
`,
    tasks: {
      pau_read: ["Study SPF/DKIM/DMARC", "Read about email authentication and alignment."],
      pau_spf: ["Permitted servers", "Which mechanism sets which servers may send mail for a domain? (acronym, 3 letters)", ["Sender Policy Framework."], { answers: ["spf"] }],
      pau_dkim: ["Email integrity", "Which mechanism adds a crypto signature and confirms email integrity? (acronym)", ["DomainKeys Identified Mail."]],
      pau_dmarc: ["The policy on top", "Which policy combines SPF/DKIM and sets the action + reports? (acronym)", ["...Reporting & Conformance."]],
      pau_reject: ["The strictest mode", "Which DMARC policy value (p=...) rejects fakes? (one word)", ["p=..."], { answers: ["reject"] }],
      pau_align: ["Why SPF isn't enough", "Why doesn't SPF=pass guarantee the visible From isn't faked?", null, { options: ["SPF checks the envelope address, not the visible From — DMARC alignment is needed", "SPF doesn't work at all", "SPF only checks attachments", "It's fine, From is always real"] }],
      pau_match: ["Match the mechanisms", "Connect each mechanism with what it does.", null, { pairs: [["SPF", "permitted servers"], ["DKIM", "integrity signature"], ["DMARC", "policy and reports"]] }],
    },
  },
  ph_headers: {
    t: "Analyzing email headers",
    intro: `
<h3>Where to look for the truth</h3>
<p>The email body is what they want to show you. The <b>technical headers</b> are what actually happened. The analyst opens "original"/"show headers" and reads them.</p>

<table>
  <thead><tr><th>Header</th><th>What you take from it</th></tr></thead>
  <tbody>
    <tr><td><b>Authentication-Results</b></td><td>SPF/DKIM/DMARC results (pass/fail) — the main thing</td></tr>
    <tr><td><b>Received</b></td><td>The email's path across servers (bottom-up from the sender), the real source IP</td></tr>
    <tr><td><b>Return-Path</b></td><td>The envelope address — compared with From</td></tr>
    <tr><td><b>From</b></td><td>The visible sender — can be faked</td></tr>
    <tr><td><b>Reply-To</b></td><td>Where a reply goes — a common swap to a foreign domain</td></tr>
  </tbody>
</table>

<h3>Triage order</h3>
<ul class="tl">
  <li><b>1.</b> Check <b>Authentication-Results</b>: a DMARC fail is almost a verdict.</li>
  <li><b>2.</b> Compare <b>From</b> ↔ <b>Return-Path</b> ↔ <b>Reply-To</b>: different domains are a red flag.</li>
  <li><b>3.</b> Check the source <b>IP from Received</b> for reputation (blocklists, geolocation).</li>
  <li><b>4.</b> Links and attachments — to the sandbox, don't click "live".</li>
  <li><b>5.</b> Verdict and action: quarantine, block the sender, warn users.</li>
</ul>
<div class="callout">🔎 Detonating attachments in a <b>sandbox</b> (an isolated environment) shows the file's real behavior with no risk to the network. You'll practice this in the lab below and in the Tools section.</div>
`,
    tasks: {
      phh_read: ["Study headers", "Read about header analysis and the triage order."],
      phh_ar: ["Where the check results are", "Which header holds the SPF/DKIM/DMARC results? (with a hyphen)", ["Authentication-..."], { answers: ["authentication-results", "authentication results"] }],
      phh_mismatch: ["A sign of spoofing", "A mismatch of From and which field (the return address) is a red flag? (with a hyphen)", ["Return-..."], { answers: ["return-path", "return path", "returnpath"] }],
      phh_received: ["The email's path", "Which header shows the email's path across servers and the real source IP? (one word)", ["Read bottom-up."], { answers: ["received"] }],
      phh_replyto: ["Where a reply goes", "Faking which header redirects the victim's reply to a foreign domain? (with a hyphen)", ["Reply-..."], { answers: ["reply-to", "reply to", "replyto"] }],
      phh_lab: ["Lab: email analysis", "Mark all the red flags in the email headers."],
    },
  },
};
