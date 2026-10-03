/* ============================================================
   EN — walkthroughs for solved tasks (explanation).
   Pairs with js/explanations.js (RU). Keys are task ids.
   Applied by js/i18n.js when the interface language is English;
   if an id is missing here, the RU text is not shown in EN mode.
   ============================================================ */
const CONTENT_EN_WHY = {
  /* ---------- Fundamentals ---------- */
  cia_choice: `<p><span class="yes">Correct:</span> CIA stands for <b>Confidentiality, Integrity, Availability</b>. Scalability is an architectural property, not a security goal, so it does not belong to the triad.</p>
    <p>Cross-check: encryption and ACLs protect confidentiality, signed hashes protect integrity, redundancy protects availability.</p>`,

  cia_defense: `<p><span class="yes">Correct:</span> Defense in Depth builds security as several independent layers — network, host, application, data — so failing one does not expose the system.</p>
    <ul><li><span class="no">Single point of entry</span> concentrates risk instead of spreading it.</li>
    <li><span class="no">Security through obscurity</span> is not a layer: hidden names do not stop a scanner.</li>
    <li><span class="no">Minimal password</span> is about one control, not architecture.</li></ul>`,

  pw_factor: `<p><span class="yes">Correct:</span> two-factor authentication needs factors of <b>different types</b>: something you know (password) plus something you have (TOTP code from an authenticator app).</p>
    <ul><li><span class="no">Password + security question</span> — both "something you know".</li>
    <li><span class="no">Long password + PIN</span> — still knowledge factors.</li>
    <li><span class="no">Two different passwords</span> — same type twice.</li></ul>`,

  ph_lever: `<p><span class="yes">Correct:</span> urgency and threats are the core social-engineering lever: they remove the time a victim needs to verify ("your account closes in an hour").</p>
    <ul><li><span class="no">Polite greeting</span> lowers alertness instead of pressuring.</li>
    <li><span class="no">A long email</span> gets read carefully; length is camouflage, not leverage.</li>
    <li><span class="no">A link to the law</span> may appear in the text but does not force fast action.</li></ul>`,

  ph_action: `<p><span class="yes">Correct:</span> the only safe move is to reach the bank yourself — open the app, type the address manually, or call the number printed on your card. A link from an email is untrusted input.</p>
    <ul><li><span class="no">Follow the link and log in</span> is exactly what the attacker wants.</li>
    <li><span class="no">Reply and ask for the password</span> — attackers ask for passwords "to verify".</li>
    <li><span class="no">Forward to friends</span> is how worm-phishing spreads from your mailbox.</li></ul>`,

  /* ---------- Windows ---------- */
  cmd_choice: `<p><span class="yes">Correct:</span> <code>ls</code> is a Linux/Unix command and does not exist in the standard Windows shell; Windows uses <code>dir</code>. (In PowerShell <code>ls</code> is an alias for <code>Get-ChildItem</code>, but not in cmd.)</p>`,

  ps_enc: `<p><span class="yes">Correct:</span> <code>powershell -w hidden -enc …</code> is a hidden window plus a base64-encoded command — a classic malware chain: nothing is visible to the user and the payload is unreadable at first glance.</p>
    <p>The other options are routine admin work; the real detection signal is hidden window + base64 + suspicious origin.</p>`,

  wu_choice: `<p><span class="yes">Correct:</span> a service running as <b>NT AUTHORITY\\SYSTEM</b> already has maximum rights. If a user can write to its executable, they replace the binary and the code runs as SYSTEM on the next service start — a classic local privilege escalation path.</p>
    <ul><li><span class="no">The file gets bigger</span> — size is irrelevant, control of content is what counts.</li>
    <li><span class="no">The service gets faster</span> — a side effect, not the attack.</li>
    <li><span class="no">Nothing dangerous</span> — quite the opposite.</li></ul>`,

  cmd_flag: `<p><span class="yes">Correct:</span> the flag sits in <code>secret.txt</code> in the sandbox home folder: <code>dir</code> then <code>type secret.txt</code>.</p>
    <p>The habit being trained: <code>dir</code> to list (<code>dir /a</code> for hidden), <code>type</code> to read, and hashing when you must prove contents were not altered.</p>`,

  /* ---------- Networking ---------- */
  tcp_telnet: `<p><span class="yes">Correct:</span> Telnet (port 23) sends credentials in clear text with no encryption or integrity, so anything on the wire — including a shared Wi-Fi — can capture and tamper with the session. SSH replaces it.</p>`,

  tcp_match: `<p><span class="yes">Correct:</span> well-known ports are registered by IANA. Knowing 22 (SSH), 53 (DNS), 443 (HTTPS) and 3389 (RDP) speeds up both scanning and triage. RDP itself is not a flaw, but it is a frequent entry point via stolen passwords.</p>`,

  na_https: `<p><span class="yes">Correct:</span> HTTPS (TLS) and VPN encrypt payloads, so a sniffer in open Wi-Fi sees only metadata (IP, SNI, volume), not text, passwords or cookies. Without certificate validation, HTTPS remains MITM-able.</p>`,

  na_segment: `<p><span class="yes">Correct:</span> segmentation splits the network into isolated zones (VLANs, subnets, DMZ) with filtering between them, so compromising one zone does not hand over the whole network. Defragmentation, load balancing and caching are unrelated.</p>`,

  nm_flag: `<p><span class="yes">Correct:</span> port <b>1337</b> is the only non-standard port in the <code>nmap 10.10.10.5</code> output next to the usual 135, 139, 445 and 3389.</p>
    <p>An unusual port is not a finding by itself — it is a reason to ask who opened it and why (<code>-sV</code>, <code>curl</code>, <code>nc</code>).</p>`,

  /* ---------- Web ---------- */
  ow_choice: `<p><span class="yes">Correct:</span> SQL injection belongs to <b>Injection</b> (A03 in the 2021 edition, A05 in 2025): user input ends up inside interpreted code.</p>`,

  sql_priv: `<p><span class="yes">Correct:</span> least privilege on the database account limits the damage of a successful injection: no <code>DROP</code>, and reading foreign tables runs into rights.</p>`,

  xss_defense: `<p><span class="yes">Correct:</span> output encoding by context is the primary defence — it turns <code>&lt;script&gt;</code> into text instead of an executable tag. CSP is the second layer for places someone forgets.</p>`,

  wa_obscurity: `<p><span class="yes">Correct:</span> IDOR lives on the server. Changing an id in the URL returns someone else's data unless the backend checks "is this object yours?". A hidden button is UI, not access control.</p>`,

  eth_disclosure: `<p><span class="yes">Correct:</span> report privately to the owner, attach reproduction steps and give a reasonable deadline (often 90 days). Publishing the exploit, selling it or using it for access all harm the client or break the law.</p>`,

  meth_order: `<p><span class="yes">Correct order:</span> reconnaissance → scanning → exploitation → post-exploitation → reporting. Each phase feeds the next, and the report is what turns findings into manageable risk for the client.</p>`,

  pte_exec: `<p><span class="yes">Correct:</span> the Executive Summary is the management-facing part: what happened, what the business risk is, what to do. Technical detail goes into a separate appendix for engineers.</p>`,

  rp_active: `<p><span class="yes">Correct:</span> port scanning is active reconnaissance — you send packets to someone else's system. WHOIS, search engines and social networks only touch public sources. Active scanning needs written permission and must be inside the agreed Scope.</p>`,

  /* ---------- Crypto ---------- */
  enc_choice: `<p><span class="yes">Correct:</span> only encryption (AES) makes content unreadable without the key. Base64, Hex and URL-encoding are encodings: no key, public algorithm, decoded in seconds. Passwords need slow salted hashes (bcrypt, argon2), data needs AEAD ciphers.</p>`,

  hash_broken: `<p><span class="yes">Correct:</span> MD5 is broken — a practical collision was demonstrated in 2004, and it is far too fast for password hashing (rainbow tables). SHA-256 for integrity, argon2/bcrypt for passwords.</p>`,

  asym_hybrid: `<p><span class="yes">Correct:</span> asymmetric crypto solves key <i>exchange</i> but is slow; symmetric crypto is fast but needs a shared secret. TLS therefore negotiates a session key asymmetrically and encrypts traffic with AES-GCM or ChaCha20-Poly1305.</p>`,

  /* ---------- OSINT, AD, reversing ---------- */
  os_ethics: `<p><span class="yes">Correct:</span> password-guessing someone's mailbox is an active access attack, not open-source intelligence. OSINT uses only what the owner published. Note that aggregating public data about a private person can itself violate privacy law.</p>`,

  op_privacy: `<p><span class="yes">Correct:</span> EXIF holds geotags, camera model, date and sometimes a serial number. Stripping metadata before publishing removes the easiest way to learn where you were; enabling geotags does the opposite.</p>`,

  add_cg: `<p><span class="yes">Correct:</span> Credential Guard isolates credential and Kerberos-ticket handling in a protected OS component, so even kernel-level code cannot read LSASS secrets directly — only the credential broker hands them out. BitLocker, Firewall and UAC solve different problems.</p>`,

  re_dynamic: `<p><span class="yes">Correct:</span> with packed or encrypted code the static view shows only the wrapper; dynamic analysis observes the unpacked code in memory, its network traffic and its changes to files and registry. The two techniques complement each other.</p>`,

  rea_antivm: `<p><span class="yes">Correct:</span> anti-VM techniques check the environment (process names, registry values, MAC address, VMware tools) and malware usually sleeps or exits when it detects a sandbox, so you see nothing. Analyse in several environments or you will wrongly conclude the sample is harmless.</p>`,

  /* ---------- Forensics and phishing ---------- */
  fom_why: `<p><span class="yes">Correct:</span> fileless malware and decrypted keys exist only in RAM. A disk image shows traces of activity but not the code in memory or the keys held in kernel memory — and with full-disk encryption the key itself lives in memory too.</p>`,

  fo_image: `<p><span class="yes">Correct:</span> the analyst works on a <b>bit-for-bit image</b> and leaves the original untouched: it is documented, hash-verified and may serve as evidence. Even recovery and analysis run on a copy or its forked image.</p>`,

  fo_poweroff: `<p><span class="yes">Correct:</span> powering off destroys RAM: decrypted keys (BitLocker/VeraCrypt), sessions and fileless malware live only there. Isolate the host from the network, capture memory, and only then shut it down — following the volatility order of NIST SP 800-61.</p>`,

  ct_warn: `<p><span class="yes">Correct:</span> an invalid certificate means the trust chain could not be verified — expired, unknown issuer, name mismatch, or interception with a substituted certificate. Never enter bank credentials through such a warning; open the site yourself and call the bank using the number on your card.</p>`,

  pha_zip: `<p><span class="yes">Correct:</span> a password-protected archive keeps the payload hidden from mail gateways and sandboxes, and the user types the password from the same email — a standard delivery stage for malware and BEC.</p>`,

  pha_choice: `<p><span class="yes">Correct:</span> a valid DKIM signature is not a phishing indicator by itself — it only proves the message was not altered in transit. Caveat: a compromised mailbox in the real domain would produce a valid signature too, so DKIM is read together with DMARC, the link domain and page behaviour.</p>`,

  pau_align: `<p><span class="yes">Correct:</span> SPF checks the envelope (MAIL FROM / Return-Path), while the visible <code>From:</code> header is trivially spoofed — so SPF passes and the user still sees someone else's address. DMARC alignment is what binds the visible sender to the authenticated domain.</p>`,

  pau_match: `<p><span class="yes">Correct:</span> the mechanisms do different jobs: SPF lists authorised sending servers, DKIM signs content and proves integrity, DMARC adds policy (none/quarantine/reject) plus aggregate reports on top of both.</p>`,

  /* ---------- Hardening, Blue Team, malware ---------- */
  hdp_defaults: `<p><span class="yes">Correct:</span> Secure Defaults means safe behaviour ships out of the box; if a product needs manual configuration, most users will never configure it. Disabling passwords, granting everyone admin rights or opening all ports are the opposite of the principle.</p>`,

  hdb_why: `<p><span class="yes">Correct:</span> most real-world intrusions exploit vulnerabilities that were already public and already patched — attackers simply hit the window between disclosure and installation. Timely patching closes that window; automate updates, inventory software, prioritise by CVSS and retire EOL versions.</p>`,

  hdw_audit: `<p><span class="yes">Correct:</span> roll out AppLocker/WDAC in Audit mode first: policies log what they would block, so you learn real scenarios without breaking workstations, then switch to Enforce gradually with exclusions.</p>`,

  bts_ioa: `<p><span class="yes">Correct:</span> an IOA describes <i>behaviour</i> ("Word spawning PowerShell with <code>-enc</code>"), which almost always means a malicious chain. Hashes, C2 IPs and registry key names are IOCs — cheap to change, so easy to evade.</p>`,

  bti_recover: `<p><span class="yes">Correct:</span> restore from clean, verified backups taken before the incident, and scan the image before returning it to service. Restoring from the compromised host itself brings the malware back and destroys evidence.</p>`,

  bti_order: `<p><span class="yes">Correct order (NIST SP 800-61 Rev. 2):</span> Preparation → Detection &amp; Analysis → Containment, Eradication &amp; Recovery → Post-Incident Activity. Rev. 3 (2025) restates the same ideas in NIST CSF 2.0 terms.</p>`,

  bta_easiest: `<p><span class="yes">Correct:</span> a file hash changes with any rebuild or repack, so the attacker recomputes it instantly — the cheapest indicator on the Pyramid of Pain. TTPs (behaviour) sit at the top because they are the hardest to change.</p>`,

  mwt_choice: `<p><span class="yes">Correct:</span> ransomware encrypts data and demands a ransom. Rootkits hide presence, worms spread across the network, spyware steals information — none of them encrypts files to extort you.</p>`,

  mwl_vtwarn: `<p><span class="yes">Correct:</span> VirusTotal shares samples with many vendors, and without an NDA with the customer the file can end up in public collections. Never upload personal data or client samples; use VirusTotal Private, OpenTIP or a rented sandbox instead.</p>`,

  /* ---------- Sandbox flags ---------- */
  enc_b64: `<p><span class="yes">Correct:</span> <code>Q1lCRVJ7YmFzZTY0X2lzX2Vhc3l9</code> decodes to <code>CYBER{base64_is_easy}</code> (<code>base64 -d …</code> in the sandbox). Lesson: Base64 hides, it does not protect — no key, public algorithm.</p>`,

  adr_flag: `<p><span class="yes">Correct:</span> the flag <code>CYBER{ad_recon_ok}</code> is in <code>Documents\\domain.txt</code> (<code>type Documents\\domain.txt</code>). Even a quick file review reveals the domain and DC — the base for further enumeration, which must stay inside the agreed Scope.</p>`,

  res_b64: `<p><span class="yes">Correct:</span> <code>Q1lCRVJ7cmV2X2VuZ19zdHJpbmdzfQ==</code> decodes to <code>CYBER{rev_eng_strings}</code>. Workflow: <code>strings</code> → find base64-looking blocks → decode → verify. Only verified findings become IOCs.</p>`,

  res_rot: `<p><span class="yes">Correct:</span> ROT13 is symmetric, so <code>PLORE{ebg13_qrpbqrq}</code> becomes <code>CYBER{rot13_decoded}</code>. Simple keyless ciphers like this are common in malware samples and CTFs.</p>`,

  foa_flag: `<p><span class="yes">Correct:</span> <code>findstr CYBER Documents\\system.log</code> reveals the flag. Real triage adds Event ID and time-window searches (±5 minutes) to build a timeline; event <b>1102</b> in the same file means the security log was cleared — itself evidence of anti-forensics.</p>`,

  mwb_flag: `<p><span class="yes">Correct:</span> <code>netstat</code> → <code>reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run</code> → <code>certutil -decode …</code> leads to <code>CYBER{persistence_found}</code>: the Run key holds <code>powershell -enc …</code> that decodes to the flag. Encoding the argument is not protection — <code>certutil</code> and <code>base64 -d</code> show it plainly.</p>`,
};
try { window.CONTENT_EN_WHY = CONTENT_EN_WHY; } catch (e) {}