/* EN: Cybersecurity Fundamentals */
(window.CONTENT_EN = window.CONTENT_EN || {}).fundamentals = {
  cia: {
    t: "The CIA triad, threat modeling and risk",
    intro: `
<h3>Where security begins</h3>
<p>Before you can "protect" anything, you have to answer three questions: <b>what</b> are we protecting (assets), <b>from whom</b> (threats and actors), and <b>how badly</b> would it hurt if protection failed (risk). The rest of this course is a toolbox for answering them.</p>

<h3>The CIA triad — three pillars</h3>
<p>Every security measure ultimately serves one of three properties:</p>
<table>
  <thead><tr><th>Property</th><th>What it guarantees</th><th>Example attack</th><th>Example defense</th></tr></thead>
  <tbody>
    <tr><td><b>Confidentiality</b></td><td>Data is seen only by those allowed to</td><td>Database leak, traffic interception</td><td>Encryption, access control</td></tr>
    <tr><td><b>Integrity</b></td><td>Data isn't changed silently</td><td>Tampered payment, MITM</td><td>Hashes, signatures, version control</td></tr>
    <tr><td><b>Availability</b></td><td>The system works when needed</td><td>DDoS, ransomware</td><td>Redundancy, backups, DDoS protection</td></tr>
  </tbody>
</table>
<div class="callout">💡 The three properties often conflict. Encrypting and locking data behind "seven locks" is maximum confidentiality, but availability drops. Security is always a balance for a specific need.</div>

<h3>Beyond the triad: AAA and two more properties</h3>
<ul>
  <li><b>Authentication</b> — who are you? (password, token, fingerprint).</li>
  <li><b>Authorization</b> — what are you allowed to do? (permissions, roles).</li>
  <li><b>Accounting / audit</b> — what did you do? (logs, journals).</li>
  <li><b>Authenticity</b> — the source is genuine, not a fake.</li>
  <li><b>Non-repudiation</b> — the author of an action can't later claim "it wasn't me" (achieved with signatures and logs).</li>
</ul>

<h3>Threat modeling: assets → threats → vulnerabilities → risk</h3>
<p>Thinking about defense "in general" is useless. Professionals build a <b>threat model</b>:</p>
<ul class="tl">
  <li><b>Asset</b> — what's valuable: customer database, money, reputation.</li>
  <li><b>Threat</b> — who could do harm and why: competitor, extortionist, insider.</li>
  <li><b>Vulnerability</b> — the weak spot the threat uses: old software, weak password.</li>
  <li><b>Risk</b> — the combination: how likely and how painful.</li>
</ul>
<div class="deepdive"><b>The risk formula</b>
<p><b>Risk = Likelihood × Impact.</b> That's why an unlikely but catastrophic threat (a data-center fire) and a frequent but minor one (spam) are handled differently. Resources are always limited — you protect first where the product is largest.</p></div>

<h4>STRIDE — a cheat sheet of threat types</h4>
<p>Microsoft created a mnemonic so nothing is missed when analyzing a system:</p>
<table>
  <thead><tr><th>Letter</th><th>Threat</th><th>Breaks</th></tr></thead>
  <tbody>
    <tr><td>S — Spoofing</td><td>Impersonating someone</td><td>Authenticity</td></tr>
    <tr><td>T — Tampering</td><td>Altering data</td><td>Integrity</td></tr>
    <tr><td>R — Repudiation</td><td>Denying actions</td><td>Non-repudiation</td></tr>
    <tr><td>I — Information disclosure</td><td>Leak</td><td>Confidentiality</td></tr>
    <tr><td>D — Denial of service</td><td>Making it unavailable</td><td>Availability</td></tr>
    <tr><td>E — Elevation of privilege</td><td>Gaining more rights</td><td>Authorization</td></tr>
  </tbody>
</table>

<h3>Defense in depth</h3>
<p>One lock isn't enough. Robust systems are built in <b>layers</b>: if an attacker breaks through one barrier, the next one meets them — firewall, network segmentation, antivirus, access rights, staff training, backups. The failure of one layer shouldn't mean total compromise.</p>
<div class="callout warn">⚠️ Real case: in 2017 the ransomware <b>WannaCry</b> infected hundreds of thousands of machines worldwide within hours. It hit <i>availability</i> (files encrypted), exploited a <i>vulnerability</i> in the old SMBv1 protocol, and the ones who were saved had <i>backups</i> — a clear illustration of both the triad and defense in depth.</div>
`,
    tasks: {
      cia_read: ["Read the material", "Get familiar with the CIA triad, threat modeling and risk above."],
      cia_ddos: ["Which property does DDoS break?", "One word: confidentiality, integrity or availability.", ["DDoS takes a service down.", "Users can't reach the site."], { answers: ["availability"] }],
      cia_leak: ["A password leak breaks…", "Which property of the triad does a leak of private data violate?", ["The data was seen by people who shouldn't see it."], { answers: ["confidentiality"] }],
      cia_abbr: ["Decode the acronym", "What does the letter I in CIA stand for (one word)?", ["It means data stays unmodified."]],
      cia_integrity: ["A tampered payment amount", "An attacker silently changed the transfer amount in a document. Which triad property is violated?", ["Data was changed without permission."], { answers: ["integrity"] }],
      cia_risk: ["The risk formula", "Risk = Likelihood × … ? Enter the second word.", ["How painful it is if the threat happens."], { answers: ["impact", "damage"] }],
      cia_stride: ["The E in STRIDE", "What does E stand for in STRIDE? (Elevation …)", ["Gaining more rights."], { answers: ["elevation of privilege", "elevation", "elevation of privileges"] }],
      cia_nonrep: ["Can't be denied", "What is the property called where the author of an action can't claim \"it wasn't me\"? (one word)", ["Non-repudiation.", "Achieved with signatures and logs."], { answers: ["non-repudiation", "nonrepudiation"] }],
      cia_choice: ["Odd one out", "Which is NOT part of the CIA triad?", null, { options: ["Confidentiality", "Integrity", "Scalability", "Availability"] }],
      cia_defense: ["Defense principle", "What is the approach called where protection is built in several independent layers?", null, { options: ["Defense in depth", "Single point of entry", "Security through obscurity", "Minimum password"] }],
    },
  },
  passwords: {
    t: "Passwords, authentication and MFA",
    intro: `
<h3>Why the password is still the main hole</h3>
<p>The password is the oldest and most broken form of authentication. Most account takeovers don't start with a "hack" but with a <b>guessed, leaked or shoulder-surfed</b> password.</p>

<h4>How passwords actually get cracked</h4>
<table>
  <thead><tr><th>Attack</th><th>How it works</th><th>What helps</th></tr></thead>
  <tbody>
    <tr><td><b>Brute-force</b></td><td>Trying every combination in a row</td><td>Password length, lockout after N tries</td></tr>
    <tr><td><b>Dictionary</b></td><td>Trying a list of popular passwords</td><td>Don't use dictionary words</td></tr>
    <tr><td><b>Credential stuffing</b></td><td>Reusing leaked login/password pairs on other sites</td><td>A unique password per site</td></tr>
    <tr><td><b>Password spraying</b></td><td>One common password (e.g. <code>Qwerty123</code>) against thousands of accounts</td><td>Banning popular passwords</td></tr>
    <tr><td><b>Phishing / shoulder surfing</b></td><td>The user hands over the password</td><td>MFA, vigilance</td></tr>
  </tbody>
</table>

<h3>Entropy: why length beats "complexity"</h3>
<p>Strength is measured in <b>bits of entropy</b> — roughly, the logarithm of how many options must be tried. Each extra character multiplies the number of options, so <b>length grows strength exponentially</b>, while swapping <code>a</code>→<code>@</code> barely helps.</p>
<div class="deepdive"><b>Compare</b>
<p><code>P@ssw0rd!</code> — 9 characters, in every leak dictionary → cracked in <b>seconds</b>.<br>
<code>purple-elephant-runs-2043</code> — a long phrase of ordinary words → brute-forcing takes <b>centuries</b>. Long and memorable beats short and "clever".</p></div>
<div class="callout">🔐 In practice: 4+ random words or 14+ characters, unique per site, stored in a password manager. You only need to remember the master password.</div>

<h3>Authentication factors</h3>
<p>A factor is a "category" of proof that you are you:</p>
<ul>
  <li><b>Knowledge</b> — something you know: password, PIN.</li>
  <li><b>Possession</b> — something you have: phone, hardware key, smart card.</li>
  <li><b>Inherence</b> — something you are: fingerprint, face, voice.</li>
</ul>
<p><b>MFA / 2FA</b> is a combination of <i>different</i> factors. Password + SMS code = two factors (knowledge + possession). Two passwords is still one factor.</p>

<h4>Not all second factors are equal</h4>
<table>
  <thead><tr><th>2FA method</th><th>Strength</th><th>Weakness</th></tr></thead>
  <tbody>
    <tr><td>SMS code</td><td>Low-medium</td><td>SIM-swap, interception</td></tr>
    <tr><td>TOTP app (Google/Microsoft Authenticator)</td><td>Good</td><td>Real-time phishing of the code</td></tr>
    <tr><td>Hardware key (FIDO2/WebAuthn)</td><td>Excellent</td><td>You can lose the key</td></tr>
  </tbody>
</table>

<h3>How passwords are properly stored on the server</h3>
<p>A good service <b>never stores passwords in plain text</b>. It stores their <b>hash</b> with a <b>salt</b> (unique per user) and a slow algorithm (<code>bcrypt</code>, <code>argon2</code>, <code>scrypt</code>). Then even if the database leaks, recovering passwords is extremely expensive.</p>
<div class="callout danger">🚫 If a service emails you your own password as a "reminder", it stores it in plain text. That's a red flag: don't trust such a service with anything important.</div>
`,
    tasks: {
      pw_read: ["Study password theory", "Read the material about passwords, entropy and MFA."],
      pw_2fa: ["Second factor", "What is the acronym for two-factor authentication? (3 characters)", ["Two-Factor Authentication.", "A digit plus two letters."]],
      pw_attack: ["Attack using leaked databases", "What is the attack called where leaked login/password pairs are tried on other sites? (2 words)", ["Credential ...", "Starts with 'credential'."]],
      pw_spray: ["One password for all", "What is the attack called where one popular password is tried against many accounts? (2 words)", ["Password ...", "\"Spraying\" the password."], { answers: ["password spraying", "passwordspraying", "spraying"] }],
      pw_entropy: ["What matters more", "What increases password strength more — adding length or swapping letters for symbols? (one word)", ["Number of options grows exponentially."], { answers: ["length"] }],
      pw_best: ["Best practice", "What do you use to store a unique password for every site? (2 words)", ["A dedicated vault app."], { answers: ["password manager"] }],
      pw_factor: ["Two factors?", "Which of these is real two-factor authentication (different factors)?", null, { options: ["Password + code from an app", "Password + security question", "A long password + a PIN", "Two different passwords"] }],
      pw_storage: ["Storage on the server", "What is the random value added to a password before hashing, unique per user? (one word)", ["Against rainbow tables."], { answers: ["salt"] }],
      pw_lab: ["Lab: a strong password", "Build an «Excellent»-level password in the interactive meter below."],
    },
  },
  phishing: {
    t: "Phishing and social engineering",
    intro: `
<h3>People are the weakest link</h3>
<p>You can build perfect technical defenses, but a single employee clicking a link undoes them. <b>Social engineering</b> is manipulating people to gain access or data, and it exploits not bugs in code but bugs in psychology: trust, fear, haste, deference to authority.</p>

<h3>Levers of influence attackers use</h3>
<ul>
  <li><b>Urgency</b> — "your account will be blocked in 24 hours", so you don't stop to think.</li>
  <li><b>Authority</b> — an email "from the director" or "from the bank".</li>
  <li><b>Fear</b> — "a virus was detected", "suspicious login".</li>
  <li><b>Greed / curiosity</b> — "you won", "payroll sheet attached".</li>
  <li><b>Trust</b> — the attacker pretends to be a colleague or support.</li>
</ul>

<h3>Types of phishing</h3>
<table>
  <thead><tr><th>Term</th><th>What it is</th></tr></thead>
  <tbody>
    <tr><td><b>Phishing</b></td><td>Mass fake emails sent "to everyone"</td></tr>
    <tr><td><b>Spear phishing</b></td><td>A targeted attack on a specific person, personalized</td></tr>
    <tr><td><b>Whaling</b></td><td>"Hunting whales" — phishing top executives</td></tr>
    <tr><td><b>Vishing</b></td><td>Voice phishing over the phone</td></tr>
    <tr><td><b>Smishing</b></td><td>Phishing via SMS</td></tr>
    <tr><td><b>BEC</b></td><td>Business Email Compromise — a fake "from the boss" asking for an urgent transfer</td></tr>
  </tbody>
</table>

<h3>Signs of a phishing email</h3>
<ul>
  <li>Mismatch between the sender's name and the real address (hover over the sender).</li>
  <li>Look-alike domain: <code>paypa1.com</code> (a one), <code>microsоft.com</code> (a Cyrillic "o"), <code>paypal-support.ru</code>.</li>
  <li>A link that visually says one thing but leads elsewhere (check on hover).</li>
  <li>A demand to enter a password/code via a link in the email.</li>
  <li>Attachments <code>.exe</code>, <code>.scr</code>, <code>.html</code>, documents with macros.</li>
  <li>A generic "Dear customer" instead of your name.</li>
</ul>
<div class="callout warn">⚠️ Read a domain <b>right to left</b> up to the first slash. In <code>paypal.com.secure-login.ru/pay</code> the real domain is <b>secure-login.ru</b>, and "paypal.com" is just bait at the start.</div>

<h3>What to do and what not to do</h3>
<ul class="tl">
  <li><b>Don't rush.</b> Urgency is the attacker's main tool. If in doubt, stop.</li>
  <li><b>Verify the channel.</b> Call the bank using the number on your card, not from the email.</li>
  <li><b>Never enter 2FA codes</b> on third-party sites and don't read them out to "support".</li>
  <li><b>Report it.</b> A suspicious email at work — forward it to security, don't just delete it.</li>
</ul>
<div class="callout">🎣 Golden rule: a real bank, government service or employer will <b>never</b> ask for your password or full code. If they do — it's an attack.</div>
`,
    tasks: {
      ph_read: ["Study the signs of phishing", "Read the material on social engineering and phishing."],
      ph_domain: ["Find the fake", "Which domain is fake: paypal.com or paypa1.com? Enter the fake one in full.", ["Look carefully at letters and digits.", "A one instead of the letter L."], { answers: ["paypa1.com"] }],
      ph_realdomain: ["The real domain", "What is the REAL domain of the link paypal.com.secure-login.ru/pay ? Enter it in full.", ["Read right to left up to the first slash.", "What's right before the /"], { answers: ["secure-login.ru"] }],
      ph_term: ["General term", "What is the manipulation of people for access called? (2 words)", ["Social engineering."], { answers: ["social engineering"] }],
      ph_vishing: ["Phishing by phone", "What is voice phishing over the phone called? (one word)", ["Voice + phishing."]],
      ph_spear: ["Targeted phishing", "What is targeted phishing against a specific person called? (2 words or the first word)", ["\"Spear\"."], { answers: ["spear phishing", "spear", "spearphishing"] }],
      ph_lever: ["The main lever", "Which technique is most often used so the victim doesn't stop to think?", null, { options: ["Urgency and threats", "A polite greeting", "A long email", "A reference to the law"] }],
      ph_action: ["The right reaction", "An \"email from the bank\" asks you to urgently log in via a link. What do you do?", null, { options: ["Go to the bank yourself via the known address/app", "Click the link and log in", "Reply and ask for the password", "Forward it to friends"] }],
      ph_lab: ["Lab: red flags in an email", "Mark the phishing signs visible without a header analysis."],
    },
  },
};
