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

  /* ---------- Web ---------- */
  ow_idor: `<p><span class="yes">Correct:</span> IDOR — reaching another user's object by changing the identifier in the URL. Part of A01:2025 Broken Access Control, the most common real flaw class in APIs.</p>`,
  ow_org: `<p><span class="yes">Correct:</span> OWASP — Open Worldwide Application Security Project, the non-profit behind the Top 10, WSTG, ASVS and the Cheat Sheet Series.</p>`,
  ow_first: `<p><span class="yes">Correct:</span> Broken Access Control is A01 in the 2025, 2021 and 2019 editions. It leads because forgetting a server-side permission check is the most common mistake.</p>`,
  ow_ssrf: `<p><span class="yes">Correct:</span> SSRF makes the server fetch internal resources for you: cloud metadata endpoints, internal APIs, 127.0.0.1. Defend with an address allow-list and blocking link-local ranges.</p>`,
  ow_cve: `<p><span class="yes">Correct:</span> a CVE is the public identifier of a vulnerability (e.g. CVE-2021-44228, Log4Shell). It turns "we have a hole" into one specific, verifiable problem.</p>`,
  sql_payload: `<p><span class="yes">Correct:</span> <code>1' OR '1'='1</code> closes the quote, adds an always-true condition and comments out the rest, so <code>WHERE name='' OR '1'='1</code> returns the first row — usually admin.</p>
    <p>The root cause is concatenating input into code; the fix is parameterised queries, not "filtering quotes".</p>`,
  sql_defense: `<p><span class="yes">Correct:</span> with prepared statements the SQL is parsed once and values travel separately as data — a quote or <code>OR</code> inside a value stays a string.</p>`,
  sql_union: `<p><span class="yes">Correct:</span> <b>UNION</b> appends a second SELECT to the first when column counts match: <code>' UNION SELECT username, password FROM users--</code>.</p>`,
  sql_blind: `<p><span class="yes">Correct:</span> in <b>blind</b> SQLi the page never shows data, so it is extracted bit by bit with conditional queries or by measuring response time.</p>`,
  xss_stored: `<p><span class="yes">Correct:</span> <b>stored</b> XSS is saved server-side (comment, profile field) and fires for every visitor — the most dangerous type, since it can steal every session.</p>`,
  xss_reflected: `<p><span class="yes">Correct:</span> <b>reflected</b> XSS arrives in a link or parameter and is echoed in the response. No storage needed — ideal for phishing emails.</p>`,
  xss_csp: `<p><span class="yes">Correct:</span> <b>CSP</b> restricts where scripts may load from (<code>script-src 'self'</code>). Second layer: it does not replace output encoding but breaks forgotten payloads.</p>`,
  xss_cookie: `<p><span class="yes">Correct:</span> <b>HttpOnly</b> blocks JavaScript from reading the cookie, so XSS cannot steal the session token. Protecting the value with a password does not help — it still gets sent.</p>`,
  wa_idor: `<p><span class="yes">Correct:</span> IDOR means the server never asks "is this object yours?". Fix it with a server-side check (<code>if (obj.ownerId !== user.id) 403</code>), not by hiding the link.</p>`,
  wa_csrf: `<p><span class="yes">Correct:</span> <b>CSRF</b> makes the victim's browser send an authenticated request to a site where she is logged in, because an attacker page contains a form or script.</p>`,
  wa_token: `<p><span class="yes">Correct:</span> a <b>CSRF token</b> is an unpredictable form value the server compares with its session copy. A foreign site cannot read it, so the request is rejected.</p>`,
  wa_samesite: `<p><span class="yes">Correct:</span> <b>SameSite</b> stops the browser sending cookies cross-site (<code>Lax</code> on top-level clicks, <code>Strict</code> never) — the cheapest CSRF defence.</p>`,
  wa_secure: `<p><span class="yes">Correct:</span> <b>Secure</b> limits the cookie to HTTPS. Without it the cookie leaks on open Wi-Fi during any plain HTTP request to the same host.</p>`,

  /* ---------- Pentest ---------- */
  eth_scope: `<p><span class="yes">Correct:</span> <b>Scope</b> defines the agreed boundaries: systems, addresses, time window and allowed techniques. Anything outside Scope is off-limits even if it "looks harmless".</p>`,
  eth_roe: `<p><span class="yes">Correct:</span> <b>RoE</b> (Rules of Engagement) — how the test may be performed: allowed techniques, contacts, escalation, incident handling, data handling. Signed before work starts.</p>`,
  eth_blackbox: `<p><span class="yes">Correct:</span> <b>black box</b> means no prior knowledge — only externally observable behaviour. Opposites: white box (source access) and grey box (partial knowledge).</p>`,
  eth_bounty: `<p><span class="yes">Correct:</span> a <b>bug bounty</b> programme publicly rewards vulnerabilities reported under its rules. Read the rules: they define what counts as a bug.</p>`,
  meth_first: `<p><span class="yes">Correct:</span> <b>reconnaissance</b> gathers information passively: domains, staff, technologies, exposed repositories. The result tells you where to look next.</p>`,
  meth_last: `<p><span class="yes">Correct:</span> <b>reporting</b> is the phase that delivers value: findings, risk, remediation and priorities. Without it the exercise means nothing to the business.</p>`,
  meth_privesc: `<p><span class="yes">Correct:</span> <b>privesc</b> (privilege escalation) — from a normal user to admin, from a domain user to Domain Admin, from a service account to SYSTEM.</p>`,
  meth_lateral: `<p><span class="yes">Correct:</span> <b>lateral movement</b> — pivoting to neighbouring machines after the first foothold, usually via credentials in memory, SMB, RDP, Kerberos and inter-host trust.</p>`,
  meth_attack: `<p><span class="yes">Correct:</span> <b>ATT&amp;CK</b> is MITRE's knowledge base of real tactics and techniques — useful for planning attacks and for building detections.</p>`,
  rp_passive: `<p><span class="yes">Correct:</span> <b>passive</b> reconnaissance uses only open sources: WHOIS, DNS, GitHub, job ads, social media, search caches. The target never notices.</p>`,
  rp_dork: `<p><span class="yes">Correct:</span> a <b>google dork</b> uses operators (<code>site:</code>, <code>filetype:</code>, <code>inurl:</code>) to hunt leaks: exposed keys, configs, databases, admin panels.</p>`,
  rp_whois: `<p><span class="yes">Correct:</span> <b>whois</b> shows domain ownership, contacts and registration dates — a domain registered yesterday is itself a signal.</p>`,
  rp_dns: `<p><span class="yes">Correct:</span> <b>MX</b> records point at the domain's mail servers; TXT reveals SPF/DKIM and mail providers, while NS and CNAME expose the stack in use.</p>`,
  pte_msf: `<p><span class="yes">Correct:</span> <b>Metasploit</b> is an exploitation framework with modules, payloads, Meterpreter and post-exploitation — used legally to validate hypotheses in a lab.</p>`,
  pte_burp: `<p><span class="yes">Correct:</span> <b>Burp Suite</b> is an intercepting proxy for manual web testing: capture, replay, fuzzing and vulnerability analysis.</p>`,
  pte_cvss: `<p><span class="yes">Correct:</span> <b>CVSS</b> scores vulnerabilities 0–10 by attack vector, complexity, required privileges and CIA impact — letting you compare different bug classes on one scale.</p>`,
  pte_cve: `<p><span class="yes">Correct:</span> a <b>CVE</b> identifier such as <code>CVE-2021-44228</code> makes a finding specific and verifiable for the vendor and the report.</p>`,

  /* ---------- Crypto ---------- */
  enc_reversible: `<p><span class="yes">Correct:</span> Base64 is <b>encoding</b>: anyone reverses it without a key. Encryption needs an algorithm and a key you do not have.</p>`,
  enc_hex: `<p><span class="yes">Correct:</span> <b>hex</b> — two characters (0–9, a–f) per byte. Readable by eye and handy for keys and hashes, but it protects nothing.</p>`,
  enc_sign: `<p><span class="yes">Correct:</span> <b>=</b> is padding: Base64 length must be a multiple of 4, so the last block is padded with equals signs.</p>`,
  hash_salt: `<p><span class="yes">Correct:</span> a <b>salt</b> is a random per-user string mixed in before hashing. Identical passwords hash differently and precomputed rainbow tables stop working.</p>`,
  hash_pw: `<p><span class="yes">Correct:</span> <b>bcrypt</b> (also argon2, scrypt) are deliberately slow hashes: brute force costs thousands of times more than SHA-256, and every password gets its own salt.</p>`,
  hash_len256: `<p><span class="yes">Correct:</span> SHA-256 produces a <b>256-bit</b> digest (32 bytes, 64 hex characters). Collisions at that size are considered practically impossible.</p>`,
  hash_collision: `<p><span class="yes">Correct:</span> a <b>collision</b> — two different inputs, one hash. This is what broke MD5 and SHA-1 (a forged certificate with the same digest as a trusted one).</p>`,
  hash_hmac: `<p><span class="yes">Correct:</span> <b>HMAC</b> hashes with a secret key, so it proves both integrity and authenticity — an attacker without the key cannot forge it.</p>`,
  asym_aes: `<p><span class="yes">Correct:</span> <b>AES</b> is the NIST symmetric standard (2001) with 128/192/256-bit keys; hardware support makes it the default choice for bulk data.</p>`,
  asym_pub: `<p><span class="yes">Correct:</span> encryption uses the <b>public</b> key, decryption the private one — which is exactly what makes safe key exchange possible.</p>`,
  asym_priv: `<p><span class="yes">Correct:</span> the <b>private</b> key decrypts. As long as it stays secret, nobody else can read the data.</p>`,
  asym_rsa: `<p><span class="yes">Correct:</span> <b>RSA</b> is the classic asymmetric scheme, used for signatures and key exchange. It is inefficient for bulk data, so payloads are encrypted with AES.</p>`,
  ct_sign: `<p><span class="yes">Correct:</span> signatures are created with the <b>private</b> key — that is what proves authorship.</p>`,
  ct_verify: `<p><span class="yes">Correct:</span> signatures are verified with the <b>public</b> key. Public availability is safe: verification neither reveals nor enables forging.</p>`,
  ct_ca: `<p><span class="yes">Correct:</span> a <b>CA</b> (Certificate Authority) issues and signs certificates after validating the domain. Root CA fingerprints ship inside browsers and operating systems.</p>`,
  ct_pki: `<p><span class="yes">Correct:</span> <b>PKI</b> is the whole system: certificates, authorities, trust chains, revocation (CRL/OCSP) and policy. HTTPS, code signing and certificate-based VPN all sit on it.</p>`,
  ct_tls: `<p><span class="yes">Correct:</span> <b>TLS</b> replaced the obsolete SSL. Only TLS 1.2/1.3 are acceptable; SSL 2/3 and TLS 1.0/1.1 are considered broken.</p>`,
  /* ---------- OSINT ---------- */
  os_abbr: `<p><span class="yes">Correct:</span> OSINT = <b>Open Source Intelligence</b>: unlike HUMINT or SIGINT it works exclusively on public, lawfully available data.</p>`,
  os_exif: `<p><span class="yes">Correct:</span> <b>EXIF</b> holds metadata in photos: camera model and serial, date, geotags, sometimes GPS altitude — published together with the file.</p>`,
  os_archive: `<p><span class="yes">Correct:</span> the <b>Wayback Machine</b> keeps dated copies of pages — useful for reconnaissance and for tracing past data leaks.</p>`,
  os_hibp: `<p><span class="yes">Correct:</span> <b>HIBP</b> tells you whether an email appears in known breaches. Checking your own address is how you learn about compromise before attackers use it.</p>`,
  so_site: `<p><span class="yes">Correct:</span> <code>site:</code> restricts results to a domain: <code>site:example.com filetype:pdf</code>.</p>`,
  so_filetype: `<p><span class="yes">Correct:</span> <code>filetype:</code> searches by file type (<code>xlsx</code>, <code>sql</code>, <code>env</code>) — a classic way to find forgotten database dumps and config files with keys.</p>`,
  so_intitle: `<p><span class="yes">Correct:</span> <code>intitle:</code> searches the page title — handy for open directory listings (<code>intitle:"index of"</code>) and internal document titles.</p>`,
  so_shodan: `<p><span class="yes">Correct:</span> <b>Shodan</b> indexes internet-exposed devices from banners: cameras, RDP, forgotten admin panels. Verifying what you find is your responsibility.</p>`,
  op_username: `<p><span class="yes">Correct:</span> <b>username enumeration</b> looks for the same handle across sites, giving attackers candidate emails and a profile of the target's interests.</p>`,
  op_reverse: `<p><span class="yes">Correct:</span> <b>reverse image search</b> finds where a picture already appears: other versions, the original page, unrelated accounts.</p>`,
  op_chrono: `<p><span class="yes">Correct:</span> <b>chronolocation</b> narrows a photo's location by shadows, weather, visible signage and events on the date.</p>`,
  so_hibp: `<p><span class="yes">Correct:</span> HIBP is the same breach-checking service, seen from the search-operations room: it checks <i>your own</i> address against known leaks so you learn about compromise early.</p>`,
  op_puppet: `<p><span class="yes">Correct:</span> a <b>sock puppet</b> is a separate account unlinked to the researcher's identity, letting you observe a platform without exposing yourself.</p>`,

  /* ---------- AD ---------- */
  ad_dc: `<p><span class="yes">Correct:</span> a <b>Domain Controller</b> stores the AD database (NTDS.dit) and authenticates users — without it the domain does not work, which makes the DC the top target and the most critical thing to back up.</p>`,
  ad_kerb: `<p><span class="yes">Correct:</span> <b>Kerberos</b> is the main domain authentication protocol: a TGT at logon, then service tickets (TGS). NTLM remains as a fallback and is itself attackable.</p>`,
  ad_ldap: `<p><span class="yes">Correct:</span> <b>LDAP</b> queries the directory — enumerating users, groups, computers. Kerberos authenticates, LDAP returns the data.</p>`,
  ad_tgt: `<p><span class="yes">Correct:</span> the <b>TGT</b> is issued by the KDC at logon and used as the pass to request service tickets. Stealing it from memory or cache is a standard attack step.</p>`,
  ad_forest: `<p><span class="yes">Correct:</span> the <b>forest</b> is the top level of AD: several domains sharing one schema, configuration and Global Catalog. The domain inside the forest is the unit of security and policy.</p>`,
  ad_gpo: `<p><span class="yes">Correct:</span> a <b>GPO</b> applies rules to users and computers in a domain or OU. With domain rights it can deploy both hardening settings and malware.</p>`,
  adr_users: `<p><span class="yes">Correct:</span> <code>net user /domain</code> lists domain users (plain <code>net user</code> lists local ones) — reconnaissance that is legitimate only inside the agreed Scope.</p>`,
  adr_kerb: `<p><span class="yes">Correct:</span> <b>Kerberoasting</b>: request a service ticket for an SPN account and crack it offline — effective because domain password policies are usually weaker than local ones.</p>`,
  adr_bh: `<p><span class="yes">Correct:</span> <b>BloodHound</b> graphs user → group → session → host and finds shortest paths to Domain Admin. Attackers use it to plan, defenders to shorten those paths.</p>`,
  adr_spn: `<p><span class="yes">Correct:</span> an account with an <b>SPN</b> is "kerberoastable": it can be used in place of the user, and its hash can be obtained through a TGS request.</p>`,
  add_laps: `<p><span class="yes">Correct:</span> <b>LAPS</b> gives each admin a unique random local-admin password per machine, removing the shared admin password that can take the whole network.</p>`,
  add_pth: `<p><span class="yes">Correct:</span> <b>pass-the-hash</b> reuses a stolen NTLM hash instead of the password, so password-based 2FA does not help. Defend with LAPS, Credential Guard and disabling NTLM.</p>`,
  add_admins: `<p><span class="yes">Correct:</span> <b>Domain Admins</b> owns the entire domain: any member can take ownership of any AD object, including the domain controller.</p>`,
  add_tier: `<p><span class="yes">Correct:</span> <b>Tier 0</b> covers domain controllers, domain admins and the security tier. Tiering keeps admins of ordinary servers away from Tier 0 assets.</p>`,
  add_event: `<p><span class="yes">Correct:</span> event <b>4769</b> is "service ticket issued". A burst of 4769 with unusual frequency or SPNs suggests Kerberoasting; look next to 4624 (logons) and 4662 (AD object access).</p>`,

  /* ---------- Reverse engineering ---------- */
  re_pe: `<p><span class="yes">Correct:</span> <b>PE</b> (Portable Executable) is the Windows executable format (.exe, .dll, .sys) — DOS header, PE header, sections, import table: what every analyser reads.</p>`,
  re_static: `<p><span class="yes">Correct:</span> <b>static</b> analysis studies the file without running it: disassembly, strings, hashes, headers. Safe, but packed code shows only a wrapper.</p>`,
  re_tool: `<p><span class="yes">Correct:</span> <b>Ghidra</b> (open source) and <b>IDA Pro</b> (commercial) are disassemblers; <code>x64dbg</code> and <code>radare2</code> are debuggers/analysers for dynamic work.</p>`,
  re_iat: `<p><span class="yes">Correct:</span> the <b>IAT</b> lists imported functions. Seeing <code>CreateRemoteThread</code>, <code>VirtualAllocEx</code> or <code>WriteProcessMemory</code> immediately suggests the purpose; packers rebuild it at runtime.</p>`,
  re_mz: `<p><span class="yes">Correct:</span> a PE file starts with the <b>MZ</b> signature (0x4D5A) and the PE header sits at the offset in <code>e_lfanew</code>. The "MZ…PE" check is the first filter for real executables.</p>`,
  res_tool: `<p><span class="yes">Correct:</span> <b>strings</b> pulls printable sequences out of a binary — C2 domains, paths, registry keys, error messages. Often the fastest finding in malware triage.</p>`,
  res_ioc: `<p><span class="yes">Correct:</span> an <b>IOC</b> is an observable sign of compromise: file hash, C2 IP or domain, registry key, mutex name. Findings must be validated before they are published as IOCs.</p>`,
  rea_pack: `<p><span class="yes">Correct:</span> <b>packing</b> compresses or encrypts code and unpacks it in memory at run time. Signs: high entropy, few strings, imports such as <code>VirtualAlloc</code> and <code>WriteProcessMemory</code>.</p>`,
  rea_dbg: `<p><span class="yes">Correct:</span> <b>IsDebuggerPresent</b> reads the BeingDebugged flag in the PEB; malware that detects a debugger changes behaviour — sleeps, exits or returns garbage.</p>`,
  rea_upx: `<p><span class="yes">Correct:</span> <b>UPX</b> is the best-known open-source PE packer. Malware uses it too, so <code>UPX0</code>/<code>UPX1</code> sections are a reason to be suspicious.</p>`,
  rea_entropy: `<p><span class="yes">Correct:</span> <b>entropy</b> measures byte randomness. High values (near 8) mean encryption, compression or packing; low values mean readable code or data — a cheap first filter in bulk triage.</p>`,

  /* ---------- Forensics ---------- */
  fo_integrity: `<p><span class="yes">Correct:</span> a <b>hash</b> (SHA-256 or better). It is recorded right after imaging and re-checked before analysis: a mismatch means the evidence changed.</p>`,
  fo_coc: `<p><span class="yes">Correct:</span> the <b>Chain of Custody</b> documents who handled the evidence, when and how — that is what turns technical artefacts into admissible evidence.</p>`,
  fo_vol: `<p><span class="yes">Correct:</span> <b>RAM</b> is collected first (NIST SP 800-61 volatility order) because it disappears on power-off, together with keys, sessions and fileless malware.</p>`,
  fo_wb: `<p><span class="yes">Correct:</span> a <b>write blocker</b> physically prevents writes to the drive while it is attached to the workstation, guaranteeing the original is never modified.</p>`,
  foa_evtx: `<p><span class="yes">Correct:</span> Windows event logs are <code>.evtx</code> files (<code>Security</code>, <code>System</code>, <code>PowerShell Operational</code>) under <code>%SystemRoot%\\System32\\winevt\\Logs</code>.</p>`,
  foa_mft: `<p><span class="yes">Correct:</span> the <b>MFT</b> is the NTFS master table: file names, sizes, timestamps (created, modified, accessed) and deleted entries — often recoverable even without content.</p>`,
  foa_prefetch: `<p><span class="yes">Correct:</span> <b>Prefetch</b> records which programs ran, how often and when (<code>Windows\\Prefetch</code>). For malware, an executable launched from an unusual folder is the key signal.</p>`,
  foa_1102: `<p><span class="yes">Correct:</span> event <b>1102</b> means the security log was cleared. In an investigation that is evidence by itself — and the act of clearing is recorded in other logs.</p>`,
  fom_vol: `<p><span class="yes">Correct:</span> <b>Volatility</b> analyses memory dumps: processes, networking, kernel modules, injections and artefacts — without rebooting the system.</p>`,
  fom_fileless: `<p><span class="yes">Correct:</span> <b>fileless</b> malware lives only in memory (PowerShell, in-memory DLLs). The disk keeps only traces in logs and PowerShell artefacts.</p>`,
  fom_pslist: `<p><span class="yes">Correct:</span> <b>pslist</b> lists processes from a dump. Useful companions: <code>pstree</code> (parents), <code>psscan</code> (hidden processes), <code>cmdline</code> (arguments).</p>`,
  fom_malfind: `<p><span class="yes">Correct:</span> <b>malfind</b> looks for processes with anonymous or executable private memory not backed by an image — the classic sign of code injection (process hollowing, reflective DLL).</p>`,

  /* ---------- Phishing analysis ---------- */
  pha_spear: `<p><span class="yes">Correct:</span> <b>spear phishing</b> is tailored to one person using their role, language and current projects — which is why impersonating their manager works so well.</p>`,
  pha_whaling: `<p><span class="yes">Correct:</span> <b>whaling</b> targets top management. The goal is not mailbox access but money: fake invoices, redirected payments — defended by out-of-band payment verification.</p>`,
  pha_bec: `<p><span class="yes">Correct:</span> <b>BEC</b> (Business Email Compromise) hijacks legitimate correspondence to change invoice details or request urgent transfers — record losses because "everything looked legitimate".</p>`,
  pha_attach: `<p><span class="yes">Correct:</span> <b>macros</b> in Office documents (docm, xlsm) execute code when the file is opened — a classic mail-delivery stage ("invoice", "resume" with a macro that pulls the payload).</p>`,
  pau_spf: `<p><span class="yes">Correct:</span> <b>SPF</b> is a DNS list of servers allowed to send mail for the domain. It validates the <i>envelope</i> (MAIL FROM), not the visible From header.</p>`,
  pau_dkim: `<p><span class="yes">Correct:</span> <b>DKIM</b> signs the message with the domain's private key; recipients verify it publicly, proving the content was not altered in transit.</p>`,
  pau_dmarc: `<p><span class="yes">Correct:</span> <b>DMARC</b> combines SPF and DKIM results, adds alignment checking and sets policy: <code>none</code> / <code>quarantine</code> / <code>reject</code> plus aggregate reports.</p>`,
  pau_reject: `<p><span class="yes">Correct:</span> the strictest mode is <code>p=reject</code> — mail that fails DMARC is not delivered at all. Move gradually from <code>p=none</code>.</p>`,
  phh_ar: `<p><span class="yes">Correct:</span> the <b>Authentication-Results</b> header carries the verdicts (<code>spf=pass</code>, <code>dkim=pass</code>, <code>dmarc=fail</code>) — the first header an analyst reads.</p>`,
  phh_mismatch: `<p><span class="yes">Correct:</span> a mismatch between <b>Return-Path</b> (real envelope sender) and the visible <b>From</b> is a classic spoofing signal; legitimate mail usually aligns.</p>`,
  phh_received: `<p><span class="yes">Correct:</span> the <b>Received</b> chain shows the hops and the originating IP. Read it bottom-up: the first line is closest to the sender.</p>`,
  phh_replyto: `<p><span class="yes">Correct:</span> a spoofed <b>Reply-To</b> sends answers to the attacker: the mail looks like it came from finance, but replies land elsewhere. Compare reply address with sender.</p>`,

  /* ---------- Hardening ---------- */
  hdp_cis: `<p><span class="yes">Correct:</span> <b>CIS</b> publishes Benchmarks — detailed secure-configuration lists for Windows, Linux, network gear and cloud. CIS Controls is a separate, higher-level set of safeguards.</p>`,
  hdp_priv: `<p><span class="yes">Correct:</span> <b>least privilege</b> grants only what a role needs. Verify it in practice: file and service ACLs, group memberships, process privileges.</p>`,
  hdp_level: `<p><span class="yes">Correct:</span> <b>Level 1</b> is the baseline profile applied without losing functionality; <b>Level 2</b> is hardened for high-risk systems and may break applications.</p>`,
  hdp_asr: `<p><span class="yes">Correct:</span> reducing the attack surface means disabling what is unused, removing unneeded services and ports and blocking risky macros and scripts — including Defender's <b>ASR</b> rules.</p>`,
  hdw_smb: `<p><span class="yes">Correct:</span> <b>SMBv1</b> is the obsolete protocol behind the WannaCry exploit (EternalBlue). Disable it and keep SMBv2/3, which are signed and patched.</p>`,
  hdw_bitlocker: `<p><span class="yes">Correct:</span> <b>BitLocker</b> is the built-in Windows disk encryption; without it a stolen laptop hands over every secret the user handled.</p>`,
  hdw_applock: `<p><span class="yes">Correct:</span> <b>AppLocker</b> and its successor <b>WDAC</b> allow only explicitly permitted apps and scripts to run — stronger than an antivirus because unknown binaries simply never start.</p>`,
  hdw_whitelist: `<p><span class="yes">Correct:</span> <b>allowlisting</b> permits only what is listed; a blocklist always leaves room for whatever is new.</p>`,
  hdb_patch: `<p><span class="yes">Correct:</span> <b>patch management</b> covers testing, prioritisation (CVSS, business impact), maintenance windows and verification. Without the process, patches never reach machines.</p>`,
  hdb_drift: `<p><span class="yes">Correct:</span> <b>configuration drift</b> is divergence from the intended baseline — someone changed a setting "just for today" and nobody remembers why six months later.</p>`,
  hdb_baseline: `<p><span class="yes">Correct:</span> a <b>security baseline</b> (e.g. a CIS Benchmark) is the reference configuration systems are compared against; without it "properly configured" is just an opinion.</p>`,
  /* ---------- Blue Team ---------- */
  bts_siem: `<p><span class="yes">Correct:</span> a <b>SIEM</b> collects, normalises and correlates log events and raises alerts — the point is to see one attack spread across hundreds of hosts.</p>`,
  bts_edr: `<p><span class="yes">Correct:</span> <b>EDR</b> provides endpoint telemetry and response: processes, network, registry, behaviour, remote isolation. Unlike classic AV it reacts to behaviour.</p>`,
  bts_ioc: `<p><span class="yes">Correct:</span> an <b>IOC</b> is a concrete indicator (hash, IP, domain, filename) — good for known threats, weak against new ones, which is why IOAs and behavioural rules matter.</p>`,
  bts_l1: `<p><span class="yes">Correct:</span> <b>L1</b> is the first SOC tier: triage against runbooks and escalation. Better L1 filtering keeps expensive L2/L3 analysis for real cases.</p>`,
  bts_hunt: `<p><span class="yes">Correct:</span> <b>threat hunting</b> is proactive: hypotheses, queries against telemetry, hunting mapped to ATT&amp;CK. This is where missed intrusions are found.</p>`,
  bti_std: `<p><span class="yes">Correct:</span> <b>NIST SP 800-61</b> is the incident response standard. Rev. 2 (2012) gives the four phases you learned; Rev. 3 (April 2025) reframes them in NIST CSF 2.0 terms.</p>`,
  bti_contain: `<p><span class="yes">Correct:</span> <b>containment</b> is the short-term action that stops the spread: isolate the host, disable the account, revoke tokens. Contain first, then cure.</p>`,
  bti_first: `<p><span class="yes">Correct:</span> <b>Preparation</b> happens before the incident: roles, contacts, playbooks, access and credentials for response. Without it, response becomes chaos.</p>`,
  bta_tactics: `<p><span class="yes">Correct:</span> <b>14</b> tactics in MITRE ATT&amp;CK for Enterprise, from Reconnaissance to Impact.</p>`,
  bta_ttp: `<p><span class="yes">Correct:</span> the top of the Pyramid of Pain is <b>TTP</b> — attacker behaviour. Hashes change with every rebuild and domains with every registration, but the way someone operates stays recognisable.</p>`,
  bta_author: `<p><span class="yes">Correct:</span> the Pyramid of Pain was created by <b>David Bianco</b> (2013) to explain why "just add an indicator" is not enough.</p>`,
  bta_tactic: `<p><span class="yes">Correct:</span> a <b>tactic</b> answers "why" (Initial Access, Persistence, Exfiltration) while a <b>technique</b> answers "how" (PowerShell, LSASS dump) — hence the hierarchy tactic → technique → sub-technique.</p>`,

  /* ---------- Malware analysis ---------- */
  mwt_static: `<p><span class="yes">Correct:</span> <b>static</b> analysis examines the file without running it: hash, type, strings, PE structure, signature, packing. Safe and fast, but behaviour stays invisible.</p>`,
  mwt_dynamic: `<p><span class="yes">Correct:</span> <b>dynamic</b> analysis runs the sample in an isolated lab (malware sandbox, VM with egress blocked) and observes files, registry, processes and network activity.</p>`,
  mwt_worm: `<p><span class="yes">Correct:</span> a <b>worm</b> spreads by itself, scanning and infecting vulnerable hosts — WannaCry is the classic example, unlike a virus that needs a carrier.</p>`,
  mwt_rat: `<p><span class="yes">Correct:</span> a <b>RAT</b> (Remote Access Trojan) provides full remote control: keystrokes, screen, files, command execution — visible as long-lived C2 sessions.</p>`,
  mwl_snapshot: `<p><span class="yes">Correct:</span> a <b>snapshot</b> is the VM rollback point that lets you analyse the next sample from a clean state, without artefacts left by previous runs.</p>`,
  mwl_vt: `<p><span class="yes">Correct:</span> <b>VirusTotal</b> checks a file with dozens of engines and shows community verdicts — handy for validating a file, risky for confidential samples.</p>`,
  mwl_hash: `<p><span class="yes">Correct:</span> a <b>hash</b> (usually SHA-256) identifies a sample unambiguously and links it to past incidents and IOC feeds.</p>`,
  mwl_inetsim: `<p><span class="yes">Correct:</span> <b>INetSim</b> (or Fakenet-NG) emulates network services so you see where malware tries to reach without letting it out.</p>`,
  mwb_persist: `<p><span class="yes">Correct:</span> <b>persistence</b> mechanisms include <code>Run</code>/<code>RunOnce</code> keys, scheduled tasks, services, WMI subscriptions and modified shortcuts — check these first on a suspect host.</p>`,
  mwb_c2: `<p><span class="yes">Correct:</span> <b>C2</b> is the channel back to the operator. Signals: rare connections to unknown IPs or domains, odd TLS, high-entropy DNS, a steady stream to one address.</p>`,
  mwb_beacon: `<p><span class="yes">Correct:</span> a <b>beacon</b> is the periodic pattern of C2 check-ins (e.g. every 60 seconds with jitter) — such regularity is itself a strong indicator.</p>`,
  mwb_inject: `<p><span class="yes">Correct:</span> <b>process injection</b> runs your code inside another process to inherit its name and privileges and survive the original binary exiting. Visible in memory as <code>malfind</code> hits or anomalous RWX regions.</p>`,

  /* ---------- Fundamentals ---------- */
  cia_ddos: `<p><span class="yes">Correct:</span> DDoS takes the service down: users cannot reach the site or API. Nothing is stolen or altered — <b>availability</b> is what breaks.</p>`,
  cia_leak: `<p><span class="yes">Correct:</span> leaking private data violates <b>confidentiality</b>. Availability is intact and integrity is untouched — the data was exposed, not changed.</p>`,
  cia_abbr: `<p><span class="yes">Correct:</span> I stands for <b>Integrity</b>: data must not change unnoticed. Enforced with hashes, signatures and version control.</p>`,
  cia_integrity: `<p><span class="yes">Correct:</span> altering a transfer amount is a textbook <b>integrity</b> failure — prevented by digital signatures and out-of-band verification.</p>`,
  cia_risk: `<p><span class="yes">Correct:</span> the classic formula is <b>Risk = Likelihood × Impact</b>: a rare catastrophe and a frequent nuisance are treated differently because you multiply, not add.</p>`,
  cia_stride: `<p><span class="yes">Correct:</span> E in STRIDE is <b>Elevation of Privilege</b>: gaining rights above the ones you were granted.</p>`,
  cia_nonrep: `<p><span class="yes">Correct:</span> that is <b>non-repudiation</b>: the author of an action cannot later deny it. Provided by signatures, immutable logs and trusted time.</p>`,
  pw_2fa: `<p><span class="yes">Correct:</span> 2FA stands for two-factor authentication — two factors, not "two passwords".</p>`,
  pw_attack: `<p><span class="yes">Correct:</span> <b>credential stuffing</b> replays leaked username/password pairs against other services; it works because passwords are reused. Defence: password manager plus MFA.</p>`,
  pw_spray: `<p><span class="yes">Correct:</span> <b>password spraying</b> tries one common password across many accounts to stay under lockout thresholds. Defence: MFA and risk-based blocking.</p>`,
  pw_entropy: `<p><span class="yes">Correct:</span> <b>length</b> — every extra character multiplies possibilities, while symbol substitution widens the alphabet only a few times (NIST SP 800-63B: 15+ characters).</p>`,
  pw_best: `<p><span class="yes">Correct:</span> a <b>password manager</b> stores unique passwords per site; autofill also blocks phishing, since the entry will not match a lookalike domain.</p>`,
  pw_storage: `<p><span class="yes">Correct:</span> that is a <b>salt</b> — a random per-user string mixed in before hashing, so identical passwords hash differently.</p>`,
  ph_domain: `<p><span class="yes">Correct:</span> <code>paypa1.com</code> uses the digit <b>1</b> instead of the letter "l": a cheap lookalike domain.</p>`,
  ph_realdomain: `<p><span class="yes">Correct:</span> the real domain is <code>secure-login.ru</code>. Everything left of the last dot ("paypal.com.") is a subdomain the attacker controls — read domains right-to-left.</p>`,
  ph_term: `<p><span class="yes">Correct:</span> <b>social engineering</b> gets access through people, not code: impersonation, flattery, authority, urgency.</p>`,
  ph_vishing: `<p><span class="yes">Correct:</span> <b>vishing</b> is voice phishing — a "bank security service" asking for an SMS code. Call back using the number on your card.</p>`,
  ph_spear: `<p><span class="yes">Correct:</span> <b>spear phishing</b> is crafted for one person using their role and projects, which makes it far more convincing than a mass mailing.</p>`,

  /* ---------- Windows ---------- */
  cmd_dir: `<p><span class="yes">Correct:</span> <code>dir</code> lists directory contents; <code>dir /a</code> includes hidden and system files.</p>`,
  cmd_type: `<p><span class="yes">Correct:</span> <code>type</code> prints a text file (<code>type secret.txt</code>); <code>more</code> paginates long output.</p>`,
  cmd_clear: `<p><span class="yes">Correct:</span> <code>cls</code> clears the screen (<code>clear</code> in PowerShell); scripts often start with it to keep output readable.</p>`,
  cmd_findstr: `<p><span class="yes">Correct:</span> <code>findstr</code> is the Windows grep: <code>findstr /S /I "error" *.log</code>.</p>`,
  cmd_redirect: `<p><span class="yes">Correct:</span> <code>&gt;</code> redirects output and overwrites the file, <code>&gt;&gt;</code> appends. Overwriting destroys previous evidence — for reports use <code>2&gt;&amp;1 |</code> or <code>Start-Transcript</code>.</p>`,
  ps_verb: `<p><span class="yes">Correct:</span> the verb is <b>Get-</b>. The verb-noun pattern lets you learn a whole family at once: <code>Get-Service</code>, <code>Get-Process</code>, <code>Get-Content</code>.</p>`,
  ps_read_file: `<p><span class="yes">Correct:</span> <code>Get-Content</code> (alias <code>gc</code>) reads a file; <code>-Tail</code> and <code>-Wait</code> are handy for live logs.</p>`,
  ps_proc: `<p><span class="yes">Correct:</span> <code>Get-Process</code> (alias <code>ps</code>) lists processes, often filtered and sorted by CPU.</p>`,
  ps_pipe: `<p><span class="yes">Correct:</span> <code>|</code> is the pipeline passing objects to the next cmdlet — the basis of chains like <code>Get-Process | Where-Object CPU -gt 100</code>.</p>`,
  ps_verb_new: `<p><span class="yes">Correct:</span> <b>New-</b> creates objects (<code>New-Item</code>, <code>New-LocalUser</code>); <code>Set-</code> modifies existing ones.</p>`,
  ps_log: `<p><span class="yes">Correct:</span> <b>Script Block Logging</b> records executed PowerShell content (Event ID 4104), revealing even base64-encoded commands.</p>`,
  wu_netuser: `<p><span class="yes">Correct:</span> <code>net user</code> lists local accounts, <code>net user /domain</code> domain ones; <code>net localgroup administrators</code> shows group membership.</p>`,
  wu_uac: `<p><span class="yes">Correct:</span> <b>UAC</b> separates standard from administrative actions and asks for confirmation on elevation — a baseline control that should stay enabled.</p>`,
  wu_icacls: `<p><span class="yes">Correct:</span> <code>icacls</code> shows and edits file/folder ACLs. Rights must be checked server-side: hiding a button in the UI changes nothing.</p>`,
  wu_system: `<p><span class="yes">Correct:</span> <b>NT AUTHORITY\\SYSTEM</b> has more rights than Administrator and owns most system resources — which is why replacing a SYSTEM service binary is instant privilege escalation.</p>`,
  wu_priv: `<p><span class="yes">Correct:</span> <b>least privilege</b> — grant exactly what the job needs. Check it with <code>whoami /priv</code>.</p>`,
  wr_systeminfo: `<p><span class="yes">Correct:</span> <code>systeminfo</code> shows OS, architecture, hostname and installed patches — the OS build alone tells you which updates are missing.</p>`,
  wr_tasklist: `<p><span class="yes">Correct:</span> <code>tasklist</code> lists processes. Triage hints: unknown names, duplicate system processes, binaries running from Temp or Downloads.</p>`,
  wr_netstat: `<p><span class="yes">Correct:</span> <code>netstat</code> shows connections and listening ports (<code>-ano</code> adds PIDs) — used to find where a process connects and to spot suspicious outbound traffic.</p>`,
  wr_priv: `<p><span class="yes">Correct:</span> <code>whoami /priv</code> lists token privileges. SeDebugPrivilege or SeImpersonatePrivilege in an unexpected process is a classic escalation lead.</p>`,
  wr_schtasks: `<p><span class="yes">Correct:</span> <code>schtasks</code> lists scheduled tasks (<code>/query</code>) — a favourite persistence spot together with Run keys and services.</p>`,

  /* ---------- Networking ---------- */
  tcp_https: `<p><span class="yes">Correct:</span> 443/tcp is the standard HTTPS port (HTTP over TLS), registered as <code>https</code> in IANA.</p>`,
  tcp_ssh: `<p><span class="yes">Correct:</span> 22/tcp is SSH — the encrypted replacement for Telnet (23), supporting key-based authentication.</p>`,
  tcp_handshake: `<p><span class="yes">Correct:</span> the client sends <b>SYN</b> first, the server answers SYN+ACK, the client sends ACK. A SYN scan (<code>-sS</code>) sends only the SYN and never completes the connection.</p>`,
  tcp_udp: `<p><span class="yes">Correct:</span> <b>UDP</b> is connectionless: data is sent immediately, with no handshake — hence DNS, VoIP and streaming, and hence harder filtering and amplification attacks.</p>`,
  tcp_layer: `<p><span class="yes">Correct:</span> IP works at <b>layer 3</b> (network). Below it are data link and physical; above, transport (TCP/UDP) and application (HTTP, DNS).</p>`,
  nm_version: `<p><span class="yes">Correct:</span> <code>-sV</code> detects service versions. It is noisy, so on sensitive hosts run it only within the agreed Scope.</p>`,
  nm_allports: `<p><span class="yes">Correct:</span> <code>-p-</code> means "all ports" (1–65535). If a full scan is unnecessary, <code>--top-ports 1000</code> is faster and quieter.</p>`,
  nm_syn: `<p><span class="yes">Correct:</span> <code>-sS</code> is the "half-open" SYN scan: the connection is never completed, so application logs stay quiet. Requires raw sockets (root/admin).</p>`,
  nm_filtered: `<p><span class="yes">Correct:</span> <b>filtered</b> means the port did not answer or the reply was dropped by a firewall; a closed port shows as <code>closed</code>, which tells you where filtering happens.</p>`,
  nm_os: `<p><span class="yes">Correct:</span> <code>-O</code> guesses the OS from TCP/IP stack fingerprints. It is inaccurate on modern systems and visible to administrators; service versions (<code>-sV</code>) are usually more reliable.</p>`,
  na_sniffer: `<p><span class="yes">Correct:</span> <b>Wireshark</b> is the graphical packet analyser. Capturing traffic you are not authorised to capture is an offence — use it on your own or explicitly permitted traffic.</p>`,
  na_mitm: `<p><span class="yes">Correct:</span> <b>MITM</b> intercepts and modifies traffic between two parties. Defence: TLS with certificate validation; in the LAN, Dynamic ARP Inspection and port security.</p>`,
  na_arp: `<p><span class="yes">Correct:</span> <b>ARP</b> maps IP to MAC locally. A forged ARP reply (ARP spoofing) turns the attacker into the victim's gateway; defend with Dynamic ARP Inspection and static entries.</p>`,
  na_dns: `<p><span class="yes">Correct:</span> forged <b>DNS</b> answers (spoofing, cache poisoning) send users to a fake site under the right name. Defend with DNSSEC, encrypted DNS (DoH/DoT) and certificate validation.</p>`,
};
try { window.CONTENT_EN_WHY = CONTENT_EN_WHY; } catch (e) {}