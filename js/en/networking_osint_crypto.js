/* EN: Networking, OSINT, Cryptography */
window.CONTENT_EN = window.CONTENT_EN || {};

CONTENT_EN.networking = {
  tcpip: {
    t: "The OSI model, TCP/IP and ports",
    intro: `
<h3>How data even reaches its destination</h3>
<p>When you open a website, your request passes through several "layers": from the letters in the browser to electrical signals in the cable. To avoid drowning in detail, networks are described by <b>layered models</b>. Understanding the layers is a map: knowing which layer an attack or defense works on, you immediately grasp its nature.</p>

<h3>The OSI model (7 layers) and TCP/IP (4)</h3>
<table>
  <thead><tr><th>OSI layer</th><th>Example</th><th>Data unit</th></tr></thead>
  <tbody>
    <tr><td>7 Application</td><td>HTTP, DNS, FTP</td><td>Data</td></tr>
    <tr><td>6 Presentation</td><td>TLS, encryption, encodings</td><td>Data</td></tr>
    <tr><td>5 Session</td><td>Sessions, sockets</td><td>Data</td></tr>
    <tr><td>4 Transport</td><td>TCP, UDP</td><td>Segment</td></tr>
    <tr><td>3 Network</td><td>IP, ICMP, routing</td><td>Packet</td></tr>
    <tr><td>2 Data link</td><td>Ethernet, MAC, ARP</td><td>Frame</td></tr>
    <tr><td>1 Physical</td><td>Cable, Wi-Fi, signal</td><td>Bits</td></tr>
  </tbody>
</table>
<div class="callout">💡 Mnemonic bottom-up: "Please Do Not Throw Sausage Pizza Away". Attacks live on every layer: ARP-spoofing — L2, DDoS — L3/L4, SQLi/XSS — L7.</div>

<h3>IP address and port</h3>
<p>An <b>IP address</b> points to a host (like a building address), while a <b>port</b> points to a specific service inside (like an apartment number). Ports are 0–65535; system ports are 0–1023.</p>

<h3>TCP vs UDP</h3>
<table>
  <thead><tr><th></th><th>TCP</th><th>UDP</th></tr></thead>
  <tbody>
    <tr><td>Connection</td><td>Established (handshake)</td><td>None</td></tr>
    <tr><td>Reliability</td><td>Guarantees delivery and order</td><td>No guarantee</td></tr>
    <tr><td>Speed</td><td>Slower</td><td>Faster</td></tr>
    <tr><td>Where</td><td>Web, mail, files</td><td>DNS, video, games, VoIP</td></tr>
  </tbody>
</table>

<h4>The TCP three-way handshake</h4>
<ul class="tl">
  <li><b>SYN</b> — client: "let's connect".</li>
  <li><b>SYN/ACK</b> — server: "sure, confirmed".</li>
  <li><b>ACK</b> — client: "confirmed, let's go".</li>
</ul>
<p>Port scanning (SYN scan) and the SYN-flood attack (flooding with half-open connections) are built on this mechanism.</p>

<h3>Well-known ports</h3>
<table>
  <thead><tr><th>Port</th><th>Service</th><th>Port</th><th>Service</th></tr></thead>
  <tbody>
    <tr><td>20/21</td><td>FTP</td><td>80</td><td>HTTP</td></tr>
    <tr><td>22</td><td>SSH</td><td>443</td><td>HTTPS</td></tr>
    <tr><td>23</td><td>Telnet (insecure)</td><td>445</td><td>SMB</td></tr>
    <tr><td>25</td><td>SMTP</td><td>3306</td><td>MySQL</td></tr>
    <tr><td>53</td><td>DNS</td><td>3389</td><td>RDP</td></tr>
  </tbody>
</table>
<div class="callout warn">⚠️ Telnet (23), FTP (21) and old SMB send data unencrypted — they're replaced by SSH (22) and HTTPS/SFTP. An open 23 or 3389 facing the internet is a classic risk.</div>
`,
    tasks: {
      tcp_read: ["Study the model and ports", "Read about the OSI model, TCP/UDP and ports."],
      tcp_https: ["HTTPS port", "What port does HTTPS use by default?", ["HTTP=80, HTTPS=..."]],
      tcp_ssh: ["SSH port", "The standard SSH port?", ["Secure remote access."]],
      tcp_handshake: ["The TCP handshake", "Which flag does the client send first in the three-way handshake? (3 letters)", ["SYN → SYN/ACK → ACK"]],
      tcp_udp: ["The fast protocol", "Which transport-layer protocol is connectionless and used for DNS/video? (3 letters)", ["Not TCP.", "User Datagram Protocol."], { answers: ["udp"] }],
      tcp_layer: ["The IP layer", "On which OSI layer does the IP protocol operate? (number)", ["Network layer.", "Between data link (2) and transport (4)."], { answers: ["3", "network"] }],
      tcp_telnet: ["Insecure port", "Which service sends data (including passwords) in clear text and should be closed?", null, { options: ["Telnet (23)", "SSH (22)", "HTTPS (443)", "DNS (53)"] }],
      tcp_match: ["Match the ports", "Connect each port to its standard service.", null, { pairs: [["22", "SSH"], ["443", "HTTPS"], ["53", "DNS"], ["3389", "RDP"]] }],
    },
  },
  nmap: {
    t: "Scanning and recon with Nmap",
    intro: `
<h3>Nmap — the network's cartographer</h3>
<p><b>Nmap</b> (Network Mapper) answers "which hosts are alive, which ports are open, which services and versions run on them". It's the first tool in the recon phase of a pentest and an indispensable helper for inventorying your own network.</p>
<div class="callout danger">🚫 Scanning other people's networks without written permission is a crime in many countries. Practice only on your own machines, training ranges (HackTheBox, TryHackMe) and in this sandbox.</div>

<h3>Port states</h3>
<table>
  <thead><tr><th>State</th><th>Meaning</th></tr></thead>
  <tbody>
    <tr><td><b>open</b></td><td>A service accepts connections</td></tr>
    <tr><td><b>closed</b></td><td>The port is reachable but no service</td></tr>
    <tr><td><b>filtered</b></td><td>A firewall blocks the reply — can't tell</td></tr>
  </tbody>
</table>

<h3>Main scan types</h3>
<table>
  <thead><tr><th>Command</th><th>What it does</th></tr></thead>
  <tbody>
    <tr><td><code>nmap 10.0.0.5</code></td><td>Quick scan of the top-1000 TCP ports</td></tr>
    <tr><td><code>nmap -sS target</code></td><td>SYN scan ("half-open", quieter and faster)</td></tr>
    <tr><td><code>nmap -sU target</code></td><td>Scan UDP ports</td></tr>
    <tr><td><code>nmap -p- target</code></td><td>All 65535 ports</td></tr>
    <tr><td><code>nmap -sV target</code></td><td>Detect service versions</td></tr>
    <tr><td><code>nmap -O target</code></td><td>Detect the operating system</td></tr>
    <tr><td><code>nmap -A target</code></td><td>All at once: versions, OS, scripts, traceroute</td></tr>
  </tbody>
</table>

<h3>Why versions matter so much</h3>
<p>Knowing port 445 is open is half the job. Knowing it runs <code>Samba 3.X (SMBv1)</code> means knowing about EternalBlue. That's why <code>-sV</code> is the key step: whether a service is vulnerable depends on its version.</p>
<div class="deepdive"><b>NSE — the Nmap scripting engine</b>
<p>The <code>--script</code> flag runs mini-checks: <code>nmap --script vuln target</code> looks for known vulnerabilities, <code>--script smb-os-discovery</code> refines the OS via SMB. This turns Nmap from a "port scanner" into a light vulnerability scanner.</p></div>
<div class="callout">🧪 There's a training target in the sandbox. Try <code>nmap 10.10.10.5</code>, then analyze a ready-made report in the lab below.</div>
`,
    tasks: {
      nm_read: ["Study Nmap", "Read about scanning, port states and NSE."],
      nm_version: ["Version detection", "Which Nmap flag detects service versions? (e.g. -X)", ["s + Version"]],
      nm_allports: ["All ports", "Which flag scans all 65535 ports?", ["p and a dash."]],
      nm_syn: ["Quiet scan", "Which flag runs a SYN scan (\"half-open\")? (e.g. -sX)", ["s + SYN"]],
      nm_filtered: ["Firewall in the way", "What word does Nmap use for a port whose reply is blocked by a firewall?", ["Not open and not closed."], { answers: ["filtered"] }],
      nm_os: ["Detect the OS", "Which Nmap flag tries to detect the operating system? (e.g. -X)", ["O as in OS."]],
      nm_flag: ["🚩 Scan the target in the sandbox", "Run nmap on 10.10.10.5 in the sandbox. One port is unusual — enter its number.", ["nmap 10.10.10.5", "Look for a port not in the standard list."]],
      nm_lab: ["Lab: analyzing a port scan", "Mark the risky open ports in the nmap output."],
    },
  },
  net_attacks: {
    t: "Traffic, attacks and network defense",
    intro: `
<h3>What's visible on the network and how it's attacked</h3>
<p>Having understood how data travels, let's look at what an attacker on the same network can do with it — and how to prevent it. This is the junction of offense and defense, important for both pentesters and the blue team.</p>

<h3>Sniffing — listening to traffic</h3>
<p>On one network, traffic can be <b>intercepted</b>. Tools: <b>Wireshark</b> (GUI packet analysis) and <b>tcpdump</b> (console). If data travels in the clear (HTTP, Telnet, FTP), the sniffer sees logins, passwords and content. Over HTTPS/TLS — only metadata (who talks to whom), not content.</p>
<div class="callout warn">⚠️ That's why HTTPS is everywhere: on open Wi-Fi any neighbor could theoretically listen to traffic. Encryption turns interception into a useless pile of bytes.</div>

<h3>Man-in-the-Middle and ARP spoofing</h3>
<p><b>MITM</b> — the attacker stands between you and the server, seeing and altering traffic. The classic method on a local network is <b>ARP spoofing</b>: the attacker sends fake ARP replies convincing your machine that <i>their</i> MAC is the gateway's address. All your traffic starts going through them.</p>
<ul class="tl">
  <li><b>Victim</b> thinks it's talking to the gateway.</li>
  <li><b>Attacker</b> forwards the traffic on, reading it along the way.</li>
  <li><b>Defense:</b> HTTPS/VPN (encryption on top), static ARP, Dynamic ARP Inspection on switches.</li>
</ul>

<h3>Other common network attacks</h3>
<table>
  <thead><tr><th>Attack</th><th>Essence</th><th>Defense</th></tr></thead>
  <tbody>
    <tr><td>DDoS</td><td>Flooding with traffic until failure</td><td>Anti-DDoS, rate limiting, CDN</td></tr>
    <tr><td>DNS spoofing</td><td>Faking the DNS reply → fake site</td><td>DNSSEC, trusted DNS</td></tr>
    <tr><td>Port scanning</td><td>Searching for open services</td><td>Firewall, IDS/IPS</td></tr>
    <tr><td>Rogue AP / Evil Twin</td><td>A fake Wi-Fi access point</td><td>Verify the network, use VPN</td></tr>
  </tbody>
</table>

<h3>Lines of network defense</h3>
<ul>
  <li><b>Firewall</b> — allows only permitted ports/directions.</li>
  <li><b>Segmentation and VLANs</b> — split the network into zones so breaching one doesn't open all.</li>
  <li><b>IDS/IPS</b> — intrusion detection/prevention systems, catch anomalies.</li>
  <li><b>VPN</b> — an encrypted tunnel over an untrusted network.</li>
  <li><b>TLS everywhere</b> — application-traffic encryption.</li>
</ul>
<div class="callout">🛡️ Rule: treat any network you don't control (café, airport) as hostile. VPN + HTTPS make interception pointless.</div>
`,
    tasks: {
      na_read: ["Study attacks and defense", "Read about sniffing, MITM and lines of defense."],
      na_sniffer: ["Packet analyzer", "Name a popular graphical network-traffic analyzer. (one word)", ["Wire + shark"], { answers: ["wireshark"] }],
      na_mitm: ["In the middle", "What is the attack called where the attacker stands between client and server? (acronym, e.g. X-i-t-M)", ["Man In The Middle."], { answers: ["mitm", "man-in-the-middle", "man in the middle"] }],
      na_arp: ["Spoofing on the LAN", "Spoofing which protocol lets you redirect local-network traffic to yourself? (3 letters)", ["Address Resolution Protocol.", "Links IP and MAC."], { answers: ["arp"] }],
      na_dns: ["Name spoofing", "Faking the reply of which service brings a victim to a fake site? (3 letters)", ["Translates a name into an IP."], { answers: ["dns"] }],
      na_https: ["Defense against sniffing", "What protects traffic content from eavesdropping on open Wi-Fi?", null, { options: ["HTTPS/VPN (encryption)", "A longer login", "Disabling cookies", "Incognito mode"] }],
      na_segment: ["Splitting the network", "What is splitting a network into isolated zones (so one breach doesn't open all) called?", null, { options: ["Segmentation", "Defragmentation", "Load balancing", "Caching"] }],
    },
  },
};

CONTENT_EN.osint = {
  osint_intro: {
    t: "What is OSINT",
    intro: `
<h3>Open-source intelligence</h3>
<p><b>OSINT</b> (Open Source Intelligence) is the collection and analysis of <b>publicly available</b> information. No hacking: everything you need is already out in the open — social media, registries, metadata, archives. Investigators, investigative journalists, HR, marketers and, of course, attackers in the recon phase all use it.</p>

<h3>The intelligence cycle</h3>
<ul class="tl">
  <li><b>Tasking</b> — what exactly we're looking for and why.</li>
  <li><b>Collection</b> — from open sources.</li>
  <li><b>Processing</b> — filter out noise, structure.</li>
  <li><b>Analysis</b> — connect facts, draw conclusions.</li>
  <li><b>Reporting</b> — write up the result.</li>
</ul>

<h3>Where to look</h3>
<table>
  <thead><tr><th>Source</th><th>What it gives</th></tr></thead>
  <tbody>
    <tr><td>Social media, forums</td><td>Contacts, connections, habits, geotags</td></tr>
    <tr><td>File metadata (EXIF)</td><td>GPS of the shot, camera model, author</td></tr>
    <tr><td>Archives (Wayback Machine)</td><td>Deleted versions of pages</td></tr>
    <tr><td>Registries, WHOIS</td><td>Owners of domains, companies</td></tr>
    <tr><td>Leaks (HIBP)</td><td>Whether an email appeared in known dumps</td></tr>
  </tbody>
</table>
<div class="callout warn">⚠️ OSINT is double-edged. The same technique an investigator uses to find a fraudster is used for stalking and preparing phishing. That's why understanding your own privacy defense matters too.</div>
<div class="callout">🕵️ Ethics: only public data, no hacking or deception to gain access. Respecting privacy is part of the profession.</div>
`,
    tasks: {
      os_read: ["Study OSINT", "Read about the essence of OSINT, the intelligence cycle and sources."],
      os_abbr: ["Decode it", "What is the first word of OSINT?", ["Open Source Intelligence."]],
      os_exif: ["Data inside a photo", "What is the metadata inside photos (GPS, camera) called? (4 letters)", ["Exchangeable Image File Format."]],
      os_archive: ["Deleted pages", "What is the archive where you can view old versions of sites called? (2 words, Wayback ...)", ["Wayback ..."], { answers: ["wayback machine", "wayback", "web archive"] }],
      os_hibp: ["Leak check", "The acronym of the service for checking if your email leaked (4 letters)?", ["Have I Been Pwned."]],
      os_ethics: ["What is NOT OSINT", "Which of these goes beyond OSINT (no longer \"open sources\")?", null, { options: ["Guessing someone's email password", "Reading a public profile", "Viewing EXIF of a posted photo", "Searching in Google"] }],
      osi_lab: ["Lab: geolocation by EXIF", "Determine where a photo was taken from its metadata."],
    },
  },
  search_ops: {
    t: "Search operators (Google Dorking)",
    intro: `
<h3>Searching like a pro</h3>
<p>Ordinary search finds the obvious. <b>Operators</b> (dorks) turn Google into a precise tool — and find things that accidentally ended up public. Defenders use them to find and <i>close</i> their own leaks.</p>

<h3>Core operators</h3>
<table>
  <thead><tr><th>Operator</th><th>What it does</th><th>Example</th></tr></thead>
  <tbody>
    <tr><td><code>site:</code></td><td>Within a domain</td><td><code>site:example.com</code></td></tr>
    <tr><td><code>filetype:</code></td><td>File type</td><td><code>filetype:xlsx</code></td></tr>
    <tr><td><code>intitle:</code></td><td>Word in the title</td><td><code>intitle:"index of"</code></td></tr>
    <tr><td><code>inurl:</code></td><td>Word in the URL</td><td><code>inurl:admin</code></td></tr>
    <tr><td><code>"phrase"</code></td><td>Exact match</td><td><code>"internal document"</code></td></tr>
    <tr><td><code>-word</code></td><td>Exclude</td><td><code>report -ad</code></td></tr>
  </tbody>
</table>
<p>Combine them: <code>site:example.com filetype:pdf "confidential"</code> — finds confidential PDFs on a specific site.</p>

<h3>Beyond Google</h3>
<ul>
  <li><b>Shodan</b> — a "search engine for devices": finds internet-exposed cameras, databases, industrial systems.</li>
  <li><b>Reverse image search</b> (Google Lens, Yandex) — search by picture: where else a photo appears.</li>
  <li><b>crt.sh</b> — finds subdomains via certificate transparency logs.</li>
</ul>
<div class="callout">🛡️ Check your own site: <code>site:yourdomain filetype:xlsx</code> or <code>filetype:env</code> — in case something extra is indexed. Found it — close access.</div>
`,
    tasks: {
      so_read: ["Study operators", "Read about dorks and special search engines."],
      so_site: ["Restrict to a domain", "Which operator restricts a search to a site? (with a colon)", ["site colon."]],
      so_filetype: ["Find a PDF", "Which operator searches by file type? (with a colon)", ["file..."]],
      so_intitle: ["Word in the title", "Which operator searches for a word in the page title (finds open listings)? (with a colon)", ["in + title"], { answers: ["intitle:"] }],
      so_shodan: ["Search engine for devices", "What is the search engine that indexes internet-exposed devices and services called? (one word)", ["Sho..."], { answers: ["shodan"] }],
      so_hibp: ["Leak check", "The acronym of the service for checking if your email leaked (4 letters)?", ["Have I Been Pwned."]],
    },
  },
  osint_people: {
    t: "People search, geolocation and verification",
    intro: `
<h3>How a profile is pieced together</h3>
<p>OSINT on a person isn't one "super source" but the linking of small traces: the same nickname on different sites, a photo with a geotag, writing style, a reused avatar. Understanding this helps you both investigate and protect your own privacy.</p>

<h3>Searching by nickname and accounts</h3>
<ul>
  <li><b>Username enumeration</b> — people love one nickname everywhere. Tools like Sherlock check hundreds of sites at once.</li>
  <li><b>Email → accounts</b> — an address reveals linked profiles and leaks.</li>
  <li><b>Reused avatar</b> — reverse image search links "anonymous" accounts.</li>
</ul>

<h3>Geolocation and chronolocation</h3>
<ul class="tl">
  <li><b>EXIF-GPS</b> — the fastest way, if the metadata isn't stripped.</li>
  <li><b>Geolocation from the frame</b> — signs, plates, architecture, mountains in the background.</li>
  <li><b>Chronolocation</b> — determine the <i>time</i> from shadows, weather, events in frame.</li>
  <li><b>Reverse image search</b> — find the original and primary source of a photo.</li>
</ul>

<h3>Verification: don't trust, verify</h3>
<p>The main OSINT skill is <b>verifying authenticity</b>. A photo may be old, from another place or AI-generated. You check: when it first appeared (reverse search), whether details match, whether there's independent confirmation.</p>
<div class="callout warn">⚠️ A <b>sock puppet</b> is a separate "clean" account for research, not linked to your identity. Investigating from a personal profile exposes you and breaks OPSEC.</div>

<h3>Protecting your own privacy</h3>
<ul>
  <li>Strip EXIF before posting photos (social networks often do it, but not always).</li>
  <li>Different nicknames/avatars for different areas of life.</li>
  <li>Check yourself: google your name and email, see what's public.</li>
  <li>Private profiles, minimal real-time geotags.</li>
</ul>
<div class="callout">🛡️ The best defense against OSINT used on you is to think like an OSINT researcher and regularly "run yourself".</div>
`,
    tasks: {
      op_read: ["Study people search", "Read about nickname search, geolocation and verification."],
      op_username: ["One nick everywhere", "What is searching for the same nickname across many sites called? (2 words)", ["Username ..."], { answers: ["username enumeration", "username search"] }],
      op_reverse: ["Search by picture", "What is the search that finds where an image also appears called? (2 words, reverse ...)", ["Reverse image ..."], { answers: ["reverse image search", "reverse image"] }],
      op_chrono: ["Determine the time", "What is determining the shooting time from shadows/weather/events called? (one word)", ["Chrono = time."], { answers: ["chronolocation"] }],
      op_puppet: ["A clean account", "What is a separate \"puppet\" research account, unlinked from your identity, called? (2 words)", ["Sock ..."], { answers: ["sock puppet", "sockpuppet", "puppet"] }],
      op_privacy: ["Privacy defense", "What reduces the risk of geolocation from your photos?", null, { options: ["Stripping EXIF before posting", "Posting more photos", "Using one nickname everywhere", "Turning on geotags"] }],
      op_line: ["Where OSINT ends", "Which action clearly goes beyond open-source intelligence, even if the data looks public?", ["OSINT is reading what was published, with no technical interaction."], { options: ["Guessing a password for someone else's account", "Reading a public company profile", "Checking WHOIS for a domain", "Searching for files in open indexes"] }],
      op_careful: ["Checking your own leak", "How can you lawfully find out whether your email appeared in a breach?", ["Self-service: your own address is fine, other people's is not."], { answers: ["Check your own address on HIBP"] }],
      op_line_lab: ["Lab: the OSINT boundary", "Mark the actions that stay inside open sources and get a reconnaissance plan."],
    },
  },
};

CONTENT_EN.crypto = {
  encoding: {
    t: "Encodings: don't confuse with encryption",
    intro: `
<h3>Three similar but different concepts</h3>
<table>
  <thead><tr><th>Concept</th><th>Needs a key?</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td><b>Encoding</b> (Base64, hex, URL)</td><td>No</td><td>Represent data in another format</td></tr>
    <tr><td><b>Hashing</b> (SHA-256)</td><td>No (irreversible)</td><td>A fingerprint for comparison/integrity</td></tr>
    <tr><td><b>Encryption</b> (AES, RSA)</td><td>Yes</td><td>Hide content from outsiders</td></tr>
  </tbody>
</table>
<div class="callout danger">🚫 Base64 is NOT protection. Anyone decodes it in a second. If a "secret" is merely encoded — it's open.</div>

<h3>Common encodings</h3>
<ul>
  <li><b>Base64</b>: binary data → ASCII. <code>SGVsbG8=</code> → <code>Hello</code>. Tell-tale: A–Z a–z 0–9 + / and a trailing <code>=</code>.</li>
  <li><b>Hex</b> (hexadecimal): <code>48656c6c6f</code> → <code>Hello</code>. Each byte = 2 chars 0–9 a–f.</li>
  <li><b>URL-encoding</b>: space → <code>%20</code>, symbols → <code>%XX</code>.</li>
  <li><b>ROT13</b>: shift letters by 13 — a joke, not a cipher (it's its own inverse).</li>
</ul>
<div class="callout">🧪 The sandbox has <code>base64 -d</code> and <code>rot13</code>, and the Tools section has a full Decoder. Practice on the quest and lab below.</div>
`,
    tasks: {
      enc_read: ["Study encodings", "Read about encoding, hashing and encryption."],
      enc_b64: ["🚩 Decode the Base64", "Decode the string Q1lCRVJ7YmFzZTY0X2lzX2Vhc3l9 (you can use base64 -d in the sandbox). Enter the result."],
      enc_reversible: ["The key difference", "Is Base64 encryption or encoding? (one word)", ["Needs no key."], { answers: ["encoding"] }],
      enc_hex: ["Two chars per byte", "What is the encoding where each byte is 2 chars 0–9 a–f called? (one word)", ["Hexadecimal."], { answers: ["hex", "hexadecimal"] }],
      enc_sign: ["A Base64 tell", "Which character often ends a Base64 string (padding)? (1 character)", ["Equals sign."], { answers: ["="] }],
      enc_choice: ["Which of these is protection?", "Which of these actually hides content from outsiders?", null, { options: ["Encryption (AES)", "Base64", "Hex", "URL-encoding"] }],
      enc_lab: ["Lab: the Caesar cipher", "Find the shift and decrypt the intercepted message."],
    },
  },
  hashing: {
    t: "Hashing",
    intro: `
<h3>A one-way function</h3>
<p>A <b>hash</b> is a fixed-length "fingerprint" of data. It can't be "decrypted" back — only recomputed and <b>compared</b>. Integrity checks and proper password storage are built on this.</p>

<h3>Properties of a good hash function</h3>
<ul>
  <li><b>Deterministic</b> — same input → same hash.</li>
  <li><b>Irreversible</b> — you can't recover the input from the hash.</li>
  <li><b>Avalanche effect</b> — change 1 bit of input → the hash changes completely.</li>
  <li><b>Collision resistance</b> — it's hard to find two inputs with the same hash.</li>
</ul>

<h3>Algorithms: what's alive, what's dead</h3>
<table>
  <thead><tr><th>Algorithm</th><th>Status</th><th>Used for</th></tr></thead>
  <tbody>
    <tr><td><b>MD5</b></td><td>☠️ broken (collisions)</td><td>Checksums only, not security</td></tr>
    <tr><td><b>SHA-1</b></td><td>☠️ broken</td><td>Deprecated, being retired</td></tr>
    <tr><td><b>SHA-256</b></td><td>✅ solid</td><td>Integrity, signatures, blockchain</td></tr>
    <tr><td><b>bcrypt / argon2 / scrypt</b></td><td>✅ for passwords</td><td>Deliberately slow, with salt</td></tr>
  </tbody>
</table>

<h3>How passwords are stored correctly</h3>
<ul class="tl">
  <li><b>Salt</b> — a random addition per user. Same passwords → different hashes, breaks rainbow tables.</li>
  <li><b>Slow algorithm</b> (bcrypt/argon2) — makes brute-force expensive even on a GPU.</li>
  <li><b>Pepper</b> — a secret shared by all, stored separately from the database (an extra layer).</li>
</ul>
<div class="callout warn">⚠️ <b>HMAC</b> is not just a hash but a hash with a secret key. It confirms both integrity and authenticity (used by API signatures, JWT).</div>
<div class="callout danger">🚫 Storing passwords as plain SHA-256 without salt is bad: a fast algorithm + rainbow tables crack them en masse. Passwords → only bcrypt/argon2 with salt.</div>
`,
    tasks: {
      hash_read: ["Study hashes", "Read about hash properties and password storage."],
      hash_salt: ["Against rainbow tables", "What is the random data added to a password called? (one word)", ["Salt."], { answers: ["salt"] }],
      hash_pw: ["For passwords", "Name one modern slow algorithm for passwords (e.g. b... or a...).", ["bcrypt / argon2 / scrypt"]],
      hash_len256: ["SHA-256 length", "How many bits are in the SHA-256 output?", ["The hint is in the name."]],
      hash_collision: ["Two inputs — one hash", "What is it called when two different inputs produce the same hash? (one word)", ["Collision."], { answers: ["collision"] }],
      hash_hmac: ["A keyed hash", "What is a hash with a secret key for integrity AND authenticity called? (acronym, 4 letters)", ["Hash-based Message Authentication Code."]],
      hash_broken: ["What's obsolete", "Which algorithm is considered broken and unfit for security?", null, { options: ["MD5", "SHA-256", "argon2", "bcrypt"] }],
    },
  },
  asymmetric: {
    t: "Symmetric and asymmetric encryption",
    intro: `
<h3>One key or two?</h3>
<table>
  <thead><tr><th></th><th>Symmetric</th><th>Asymmetric</th></tr></thead>
  <tbody>
    <tr><td>Keys</td><td>One shared</td><td>A pair: public + private</td></tr>
    <tr><td>Speed</td><td>Fast</td><td>Slow</td></tr>
    <tr><td>Problem</td><td>How to share the key safely?</td><td>Solves key exchange</td></tr>
    <tr><td>Examples</td><td>AES, ChaCha20</td><td>RSA, ECC</td></tr>
  </tbody>
</table>

<h3>How asymmetry works</h3>
<ul>
  <li>The <b>public key</b> can be handed to everyone. What's encrypted with it is decrypted only by the private-key owner.</li>
  <li>The <b>private key</b> is kept secret. It's also used to <i>sign</i> (more on that in the next room).</li>
</ul>
<div class="callout">💡 Direction rule: <b>encrypt with the public, decrypt with the private</b>. For a signature it's the reverse: sign with the private, verify with the public.</div>

<h3>The hybrid scheme — how HTTPS really works</h3>
<p>Asymmetry is secure but slow; symmetry is fast but needs a shared key. They're <b>combined</b>:</p>
<ul class="tl">
  <li>Client and server use <b>asymmetry</b> (RSA/ECDH) to safely agree on a session key.</li>
  <li>Then all traffic is encrypted with fast <b>AES</b> using that session key.</li>
</ul>
<p>So you get both secure key exchange and speed. This is exactly what happens every time you open an HTTPS site.</p>
<div class="callout warn">⚠️ Key length is decisive: AES-256 and RSA-2048+ are the modern minimum. Short keys (DES, RSA-512) are breakable.</div>
`,
    tasks: {
      asym_read: ["Study ciphers", "Read about symmetric, asymmetric and the hybrid scheme."],
      asym_aes: ["The symmetric standard", "Name the main symmetric algorithm (acronym, 3 letters).", ["Advanced Encryption Standard."]],
      asym_pub: ["What encrypts in RSA", "Which key is used to ENCRYPT in an asymmetric scheme? (one word)", ["It can be handed to everyone."], { answers: ["public"] }],
      asym_priv: ["What decrypts", "Which key decrypts the message in an asymmetric scheme? (one word)", ["It's kept secret."], { answers: ["private"] }],
      asym_rsa: ["An asymmetric algorithm", "Name a classic asymmetric algorithm (acronym, 3 letters).", ["Rivest–Shamir–Adleman."]],
      asym_hybrid: ["How HTTPS works", "Why does HTTPS use both asymmetry and symmetry?", null, { options: ["Asymmetry exchanges the key, symmetry quickly encrypts traffic", "For beauty", "To have two passwords", "Asymmetry encrypts all traffic whole"] }],
    },
  },
  crypto_tls: {
    t: "Signatures, certificates and TLS",
    intro: `
<h3>How to prove a message is genuine</h3>
<p>Encryption hides content. But how do you confirm a message is <i>really</i> from the right person and unchanged? For that — a <b>digital signature</b>.</p>
<ul class="tl">
  <li>The author computes the message <b>hash</b> and encrypts it with their <b>private</b> key — that's the signature.</li>
  <li>Anyone verifies it with the author's <b>public</b> key and compares hashes.</li>
  <li>Match → the message is <b>authentic</b> and <b>unchanged</b>, and the author <b>can't deny</b> it (non-repudiation).</li>
</ul>
<div class="callout">💡 A signature is the reverse direction of encryption: sign with the <b>private</b>, verify with the <b>public</b>.</div>

<h3>Certificates and PKI</h3>
<p>The problem: how do you know a site's public key <i>really</i> belongs to it and not an attacker? The answer — a <b>certificate</b>: a public key + owner details, <i>signed</i> by a trusted <b>Certificate Authority (CA)</b>.</p>
<ul>
  <li><b>PKI</b> (Public Key Infrastructure) — the whole system of CAs, certificates and trust.</li>
  <li>The browser trusts a list of root CAs; they vouch for sites.</li>
  <li>Revoking compromised certificates — via CRL/OCSP.</li>
</ul>

<h3>The TLS handshake (simplified)</h3>
<ul class="tl">
  <li>The server sends a <b>certificate</b> — the browser verifies the CA signature.</li>
  <li>The parties agree on a <b>session key</b> (asymmetry/ECDHE).</li>
  <li>Then — fast symmetric <b>AES</b>. The padlock in the address bar = TLS is active.</li>
</ul>
<div class="callout warn">⚠️ A browser warning "certificate invalid" isn't a formality: it can mean a MITM attack or a fake site. Don't click "proceed anyway" on important resources.</div>
`,
    tasks: {
      ct_read: ["Study signatures and TLS", "Read about digital signatures, certificates and TLS."],
      ct_sign: ["What signs", "Which key creates a digital signature? (one word)", ["Reverse of encryption."], { answers: ["private"] }],
      ct_verify: ["What verifies the signature", "Which key verifies a digital signature? (one word)", ["Available to everyone."], { answers: ["public"] }],
      ct_ca: ["Who vouches for a site", "What is the trusted center that signs certificates called? (acronym, 2 letters)", ["Certificate Authority."]],
      ct_pki: ["The whole trust system", "What is the public-key infrastructure called? (acronym, 3 letters)", ["Public Key Infrastructure."]],
      ct_tls: ["The protocol protecting HTTPS", "Which protocol encrypts the HTTPS connection (replaced SSL)? (acronym, 3 letters)", ["Transport Layer Security."]],
      ct_warn: ["A certificate error", "The browser says \"certificate invalid\" on a bank site. What could it mean?", null, { options: ["Possible MITM or a fake site — don't proceed", "Just a bug, log in boldly", "The site got faster", "It's an ad"] }],
    },
  },
};
