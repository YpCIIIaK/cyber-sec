/* EN: Network Security, OSINT, Cryptography */
window.CONTENT_EN = window.CONTENT_EN || {};

CONTENT_EN.networking = {
  tcpip: {
    t: "TCP/IP and ports",
    intro: `
<h3>The model and ports</h3>
<p>Data travels through the TCP/IP stack. Key concepts:</p>
<ul>
  <li><b>IP</b> — a host's address. <b>Port</b> — the number of a service on the host (0–65535).</li>
  <li><b>TCP</b> — reliable, connection-oriented (three-way handshake: SYN → SYN/ACK → ACK).</li>
  <li><b>UDP</b> — fast, no delivery guarantees (DNS, video).</li>
</ul>
<p>Well-known ports:</p>
<ul>
  <li>22 — SSH, 80 — HTTP, 443 — HTTPS</li>
  <li>21 — FTP, 25 — SMTP, 53 — DNS, 3389 — RDP</li>
</ul>
`,
    tasks: {
      tcp_read: ["Learn about ports", "Read about TCP/IP and ports."],
      tcp_https: ["HTTPS port", "Which port does HTTPS use by default?", ["HTTP=80, HTTPS=..."]],
      tcp_ssh: ["SSH port", "The standard SSH port?", ["Secure remote access."]],
      tcp_handshake: ["TCP handshake", "Which flag does the client send first in the three-way handshake? (3 letters)", ["SYN → SYN/ACK → ACK"]],
      tcp_match: ["Match the ports", "Match each port to its standard service."],
    },
  },
  nmap: {
    t: "Scanning with Nmap",
    intro: `
<h3>Nmap — the network cartographer</h3>
<p><b>Nmap</b> discovers hosts, open ports and services. Use it only on your own or authorized targets!</p>
<ul>
  <li><code>nmap 10.0.0.5</code> — quick scan of the top 1000 ports.</li>
  <li><code>nmap -sV target</code> — detect service versions.</li>
  <li><code>nmap -p- target</code> — all 65535 ports.</li>
  <li><code>nmap -sS target</code> — SYN scan ("stealthy").</li>
  <li><code>nmap -A target</code> — aggressive: OS, versions, scripts.</li>
</ul>
<div class="callout">🧪 The sandbox has a training target. Try <code>nmap 10.10.10.5</code>.</div>
`,
    tasks: {
      nm_read: ["Learn Nmap", "Read about Nmap."],
      nm_version: ["Version detection", "Which Nmap flag detects service versions? (e.g. -X)", ["s + Version"]],
      nm_allports: ["All ports", "Which flag scans all 65535 ports?", ["p and a hyphen."]],
      nm_flag: ["🚩 Scan the target in the sandbox", "Run nmap against 10.10.10.5 in the sandbox. One of the ports is unusual — enter its number.", ["nmap 10.10.10.5", "Look for a port that isn't in the standard list."]],
    },
  },
};

CONTENT_EN.osint = {
  osint_intro: {
    t: "What is OSINT",
    intro: `
<h3>Information all around us</h3>
<p><b>OSINT</b> (Open Source Intelligence) is collecting and analyzing publicly available data. It's used in investigations, journalism, privacy assessments and brand protection.</p>
<ul>
  <li>Social networks, forums, public registries.</li>
  <li>File metadata (EXIF in photos — GPS, camera model!).</li>
  <li>Archives (Wayback Machine), leaked databases (check yourself on HIBP).</li>
</ul>
<div class="callout">🕵️ Ethics: public data only, respect for privacy, no hacking.</div>
`,
    tasks: {
      os_read: ["Learn OSINT", "Read the introduction."],
      os_abbr: ["Decode the acronym", "What does OSINT stand for — the first word?", ["Open Source Intelligence."]],
      os_exif: ["Data inside photos", "What is the metadata inside photos (GPS, camera) called? (4 letters)", ["Exchangeable Image File Format."]],
    },
  },
  search_ops: {
    t: "Search operators",
    intro: `
<h3>Google dorking for defenders</h3>
<p>Operators narrow a search and help find accidentally exposed data (so you can remove it!):</p>
<ul>
  <li><code>site:</code> — within a domain.</li>
  <li><code>filetype:</code> — file type (pdf, xls).</li>
  <li><code>intitle:</code> / <code>inurl:</code> — in the title/URL.</li>
  <li><code>"exact phrase"</code>, <code>-minus</code> to exclude.</li>
</ul>
<div class="callout">🛡️ Check your own site: <code>site:yourdomain filetype:xlsx</code> — something may have slipped into the index.</div>
`,
    tasks: {
      so_read: ["Learn operators", "Read about dorks."],
      so_site: ["Limit to a domain", "Which operator limits a search to one site? (with the colon)", ["site plus a colon."]],
      so_filetype: ["Find a PDF", "Which operator searches by file type? (with the colon)", ["file..."]],
      so_hibp: ["Check for leaks", "The acronym of the service that checks whether your email leaked (4 letters)?", ["Have I Been Pwned."]],
    },
  },
};

CONTENT_EN.crypto = {
  encoding: {
    t: "Encodings: not the same as encryption",
    intro: `
<h3>Encoding ≠ encryption</h3>
<p><b>Encoding</b> (Base64, hex, URL) is reversible without a key — it is NOT protection, just a representation format.</p>
<ul>
  <li><b>Base64</b>: <code>SGVsbG8=</code> → <code>Hello</code></li>
  <li><b>Hex</b>: <code>48656c6c6f</code> → <code>Hello</code></li>
  <li><b>ROT13</b>: shifts letters by 13.</li>
</ul>
<div class="callout">🧪 The sandbox has <code>base64 -d</code> and <code>rot13</code> commands. Solve the quests below right there!</div>
`,
    tasks: {
      enc_read: ["Learn encodings", "Read about encodings."],
      enc_b64: ["🚩 Decode Base64", "Decode the string Q1lCRVJ7YmFzZTY0X2lzX2Vhc3l9 (you can use base64 -d in the sandbox). Enter the result.", ["base64 -d in the sandbox.", "It starts with CYBER{"]],
      enc_reversible: ["The key difference", "Is Base64 encryption or encoding? (1 word)", ["It doesn't need a key."], { answers: ["encoding"] }],
    },
  },
  hashing: {
    t: "Hashing",
    intro: `
<h3>A one-way function</h3>
<p>A <b>hash</b> can't be "decrypted" — only compared. Uses: storing passwords, integrity checks.</p>
<ul>
  <li><b>MD5</b>, <b>SHA-1</b> — obsolete (collisions).</li>
  <li><b>SHA-256</b> — for integrity.</li>
  <li><b>bcrypt</b>, <b>argon2</b> — for passwords (slow, salted).</li>
</ul>
<p>A <b>salt</b> is random data added to a password before hashing, so identical passwords produce different hashes and rainbow tables stop working.</p>
`,
    tasks: {
      hash_read: ["Learn about hashes", "Read about hashing."],
      hash_salt: ["Against rainbow tables", "What is the random data added to a password called? (1 word)", ["Like the one in your kitchen."]],
      hash_pw: ["For passwords", "Name one modern slow password hashing algorithm (e.g. b... or a...).", ["bcrypt / argon2 / scrypt"]],
      hash_len256: ["SHA-256 length", "How many bits are in a SHA-256 output?", ["The hint is in the name."]],
    },
  },
  asymmetric: {
    t: "Symmetric and asymmetric",
    intro: `
<h3>One key or two?</h3>
<ul>
  <li><b>Symmetric</b> (AES) — one key both encrypts and decrypts. Fast, but sharing the key is a problem.</li>
  <li><b>Asymmetric</b> (RSA, ECC) — a key pair: the <b>public</b> key encrypts, the <b>private</b> key decrypts.</li>
</ul>
<p>In practice they're combined: RSA delivers an AES key, then the parties talk over AES (that's how TLS/HTTPS works).</p>
`,
    tasks: {
      asym_read: ["Learn about ciphers", "Read about the types of encryption."],
      asym_aes: ["The symmetric standard", "Name the main symmetric algorithm (acronym, 3 letters).", ["Advanced Encryption Standard."]],
      asym_pub: ["What encrypts in RSA", "Which key is used for ENCRYPTION in an asymmetric scheme? (1 word)", ["You can hand it out to everyone."], { answers: ["public"] }],
    },
  },
};
