/* EN: Digital Forensics, Phishing Analysis */
window.CONTENT_EN = window.CONTENT_EN || {};

CONTENT_EN.forensics = {
  fo_intro: {
    t: "Forensics basics",
    intro: `
<h3>Collect evidence without spoiling it</h3>
<ul>
  <li><b>Order of volatility</b>: first collect what disappears fastest (RAM, network), then the disk.</li>
  <li><b>Chain of custody</b> — the documented chain of who handled the evidence.</li>
  <li><b>Integrity</b>: compute a hash (SHA-256) of the image to prove it wasn't changed.</li>
  <li>Work with a <b>copy</b> (an image), not the original.</li>
</ul>
<div class="callout">🔬 One mistake in handling evidence and it becomes invalid for the investigation.</div>
`,
    tasks: {
      fo_read: ["Learn the basics", "Read the introduction."],
      fo_integrity: ["Prove it's unchanged", "What do you compute to confirm the integrity of an image? (one word)", ["SHA-256 gives you exactly that."]],
      fo_coc: ["Chain of ownership", "What is the documented chain of evidence handling called? (3 words)", ["Chain of ..."]],
      fo_vol: ["What to collect first", "What is collected first according to the order of volatility? (3 letters)", ["Random access memory."]],
    },
  },
  fo_artifacts: {
    t: "Windows artifacts",
    intro: `
<h3>Where the system keeps traces</h3>
<ul>
  <li><b>Registry</b> — autostart (Run keys), USB history, recent documents.</li>
  <li><b>Event Log</b> — event logs (logons, errors, auditing) in <code>.evtx</code>.</li>
  <li><b>Prefetch</b> — traces of program execution (what ran and when).</li>
  <li><b>MFT</b> (Master File Table) — the NTFS file table with metadata and deleted records.</li>
</ul>
<div class="callout">🧪 In the sandbox: find the flag in the log with <code>findstr CYBER Documents\\system.log</code>.</div>
`,
    tasks: {
      foa_read: ["Learn artifacts", "Read about traces in Windows."],
      foa_evtx: ["Event logs", "What is the file extension of Windows event logs? (with the dot)", ["Event log → .e____"]],
      foa_mft: ["The NTFS file table", "What is the main NTFS file table called? (acronym, 3 letters)", ["Master File Table."]],
      foa_flag: ["🚩 A flag in the log", "Find the flag in Documents\\system.log using findstr and enter it.", ["findstr CYBER Documents\\system.log", "Look for the AUDIT line."]],
    },
  },
  fo_memory: {
    t: "Memory analysis",
    intro: `
<h3>RAM remembers what isn't on disk</h3>
<p>A memory dump can reveal running processes, network connections, code injections, passwords and encryption keys.</p>
<ul>
  <li>Acquiring a dump: via hardware, the hypervisor or a utility.</li>
  <li>Analysis: the <b>Volatility</b> framework — plugins <code>pslist</code>, <code>netscan</code>, <code>malfind</code>.</li>
</ul>
<div class="callout">🧠 Many malware families live only in memory (fileless) — you can't catch them without RAM analysis.</div>
`,
    tasks: {
      fom_read: ["Learn memory analysis", "Read about RAM dumps."],
      fom_vol: ["Analysis framework", "Name a popular framework for analyzing memory dumps? (one word)", ["Vola..."]],
      fom_fileless: ["Memory only", "What is malware that lives only in memory, with no file on disk, called? (one word)", ["file + less"]],
    },
  },
};

CONTENT_EN.phishing = {
  ph_anatomy: {
    t: "Anatomy of a phishing email",
    intro: `
<h3>Types of phishing</h3>
<ul>
  <li><b>Spear phishing</b> — a targeted attack on a specific person/company.</li>
  <li><b>Whaling</b> — phishing aimed at top management ("big fish").</li>
  <li><b>BEC</b> (Business Email Compromise) — compromise of business correspondence, fake invoices/transfers.</li>
  <li><b>Smishing / Vishing</b> — phishing via SMS / voice.</li>
</ul>
<h3>Signs</h3>
<ul>
  <li>Urgency and pressure, threats of blocking.</li>
  <li>A mismatch between the display name and the real address.</li>
  <li>Links to lookalike domains, bait attachments.</li>
  <li>A request to share a password/code/bank details.</li>
</ul>
<div class="callout">🎣 SOC analysts triage emails like these every day — the skill of dissecting them is critical.</div>
`,
    tasks: {
      pha_read: ["Learn the types", "Read about the kinds of phishing."],
      pha_spear: ["Targeted phishing", "What is phishing targeted at a specific person called? (2 words or the first word)", ["A long throwing weapon."]],
      pha_whaling: ["Phishing the top brass", "What is phishing aimed at top management called? (1 word)", ["\"Hunting a whale\"."]],
      pha_bec: ["Correspondence compromise", "The acronym for an attack on business correspondence (fake invoices)? (3 letters)", ["Business Email Compromise."]],
      pha_choice: ["What is NOT a sign of phishing?", "Choose the item that is NOT by itself a sign of phishing.", null, { options: ["Urgency and threats", "A PGP signature from a known sender", "A lookalike domain in the link", "A request to enter a password via a link"] }],
    },
  },
  ph_auth: {
    t: "Email authentication: SPF, DKIM, DMARC",
    intro: `
<h3>Three pillars of sender trust</h3>
<ul>
  <li><b>SPF</b> (Sender Policy Framework) — which servers may send mail for a domain. It checks the envelope address (MAIL FROM), not the visible From field.</li>
  <li><b>DKIM</b> (DomainKeys Identified Mail) — a cryptographic signature of headers/body that confirms integrity and authenticity.</li>
  <li><b>DMARC</b> (Domain-based Message Authentication, Reporting &amp; Conformance) — a policy on top of SPF/DKIM plus "alignment" of the From domain, plus reports.</li>
</ul>
<div class="callout">⚠️ Important: SPF can "pass" even when the visible From is forged — that's why you need DMARC with alignment.</div>
`,
    tasks: {
      pau_read: ["Learn SPF/DKIM/DMARC", "Read about authentication."],
      pau_dkim: ["Message integrity", "Which mechanism adds a cryptographic signature and confirms message integrity? (acronym)", ["DomainKeys Identified Mail."]],
      pau_dmarc: ["The policy on top", "Which policy combines SPF/DKIM and defines an action + reports? (acronym)", ["...Reporting & Conformance."]],
      pau_match: ["Match the mechanisms", "Match each mechanism with what it does.", null, { pairs: [["SPF", "allowed servers"], ["DKIM", "integrity signature"], ["DMARC", "policy and reports"]] }],
    },
  },
  ph_headers: {
    t: "Analyzing email headers",
    intro: `
<h3>Where to look for the truth</h3>
<ul>
  <li><b>Authentication-Results</b> — the outcome of SPF/DKIM/DMARC checks (pass/fail).</li>
  <li><b>Received</b> — the path of the message through servers (read bottom-up — from the sender).</li>
  <li><b>Return-Path</b> vs <b>From</b> — mismatched domains often indicate spoofing.</li>
  <li><b>Reply-To</b> — substituting the reply address is a common trick.</li>
</ul>
<div class="callout">🔎 Triage order: Authentication-Results first, then compare From / Return-Path and check the IP reputation from Received.</div>
`,
    tasks: {
      phh_read: ["Learn about headers", "Read about header analysis."],
      phh_ar: ["Where the check results are", "Which header contains the SPF/DKIM/DMARC results? (hyphenated)", ["Authentication-..."]],
      phh_mismatch: ["A sign of spoofing", "A mismatch between From and which field (the return address) is a red flag? (hyphenated)", ["Return-..."]],
      phh_lab: ["Lab: dissect an email", "Mark all the red flags in the email headers."],
    },
  },
};
