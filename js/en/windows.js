/* EN: Windows for Security */
(window.CONTENT_EN = window.CONTENT_EN || {}).windows = {
  cmd_basics: {
    t: "The Windows command line (cmd)",
    intro: `
<h3>Why a security person needs the console</h3>
<p>The GUI is convenient but slow and "mute": it isn't logged, can't be automated and can't be run over SSH. Any incident, audit or response on Windows eventually comes down to the <b>command line</b>. It's the language both admins and attackers speak to the system in — so everyone must understand it.</p>
<p>Open cmd: <kbd>Win+R</kbd> → <code>cmd</code> → Enter. For administrator rights: <kbd>Win</kbd>, type "cmd", <kbd>Ctrl+Shift+Enter</kbd>.</p>

<h3>Navigating the file system</h3>
<table>
  <thead><tr><th>Command</th><th>What it does</th></tr></thead>
  <tbody>
    <tr><td><code>dir</code></td><td>List files and folders in the current directory</td></tr>
    <tr><td><code>cd path</code></td><td>Change directory; <code>cd ..</code> — up a level; <code>cd \\</code> — to root</td></tr>
    <tr><td><code>type file.txt</code></td><td>Print the contents of a text file</td></tr>
    <tr><td><code>tree</code></td><td>Show the directory tree</td></tr>
    <tr><td><code>copy</code> / <code>move</code> / <code>del</code></td><td>Copy / move / delete a file</td></tr>
  </tbody>
</table>

<h3>Who am I and where am I</h3>
<ul>
  <li><code>whoami</code> — which user I'm running as.</li>
  <li><code>hostname</code> — the computer's name.</li>
  <li><code>cls</code> — clear the screen; <code>ver</code> — Windows version; <code>exit</code> — quit.</li>
</ul>

<h3>Useful tricks</h3>
<ul>
  <li><b>Search inside files:</b> <code>findstr "password" *.txt</code> — find a string in all txt files. The grep of Windows.</li>
  <li><b>Output to a file:</b> <code>systeminfo > info.txt</code> — redirection <code>&gt;</code> saves the result.</li>
  <li><b>Pipe:</b> <code>tasklist | findstr chrome</code> — feed one command's output into another.</li>
  <li><b>History:</b> ↑↓ arrows scroll past commands; <kbd>Tab</kbd> autocompletes names.</li>
</ul>
<div class="callout warn">⚠️ cmd isn't like Linux: here it's <code>dir</code>, not <code>ls</code>; <code>type</code>, not <code>cat</code>; <code>cls</code>, not <code>clear</code>; the path separator is a backslash <code>\\</code>.</div>
<div class="callout">🧪 Open the <b>Sandbox</b> tab and try the commands live. Type <code>help</code>, then <code>dir</code>.</div>
`,
    tasks: {
      cmd_read: ["Study cmd commands", "Read the material on the command line."],
      cmd_dir: ["List files", "Which cmd command shows the contents of the current directory?", ["Not 'ls', a short 3-letter word."]],
      cmd_type: ["Read a file", "Which command prints the contents of a text file in cmd? (one word)", ["Not 'cat'.", "4 letters."], { answers: ["type"] }],
      cmd_clear: ["Clear the screen", "Which command clears the screen in cmd? (3 letters)", ["Clear Screen."]],
      cmd_findstr: ["Search in files", "Which cmd command searches for a string inside files (grep equivalent)? (one word)", ["find + str"], { answers: ["findstr"] }],
      cmd_redirect: ["Save the output", "Which character redirects a command's output to a file (overwrite)? (1 character)", ["Arrow pointing right."], { answers: [">"] }],
      cmd_choice: ["Linux vs Windows", "Which command does NOT work in standard cmd?", null, { options: ["ls", "dir", "type", "cls"] }],
      cmd_flag: ["🚩 Find the flag in the sandbox", "In the sandbox there is a secret.txt file in the home folder. Read it with type and enter the flag (format CYBER{...})."],
    },
  },
  powershell: {
    t: "PowerShell basics",
    intro: `
<h3>PowerShell — not "cmd on steroids" but a different beast</h3>
<p>cmd works with <b>text</b>. PowerShell works with <b>objects</b>: every command returns not strings but structured data with properties. That makes it incredibly powerful for automation — and that's exactly why attackers love it (fileless attacks, <code>-enc</code> execution). Both admins and the blue team must understand it.</p>
<p>Open: Start → <code>PowerShell</code>. For admin rights — right click → "Run as administrator".</p>

<h3>Verb-Noun: predictable names</h3>
<p>Cmdlets are named <b>Verb-Noun</b>, so they're easy to guess:</p>
<table>
  <thead><tr><th>Cmdlet</th><th>What it does</th><th>Aliases</th></tr></thead>
  <tbody>
    <tr><td><code>Get-Content</code></td><td>Read a file</td><td><code>gc</code>, <code>cat</code>, <code>type</code></td></tr>
    <tr><td><code>Get-ChildItem</code></td><td>List files/folders</td><td><code>ls</code>, <code>dir</code>, <code>gci</code></td></tr>
    <tr><td><code>Get-Process</code></td><td>Running processes</td><td><code>ps</code>, <code>gps</code></td></tr>
    <tr><td><code>Get-Service</code></td><td>Windows services</td><td><code>gsv</code></td></tr>
    <tr><td><code>Get-Help</code></td><td>Help for a cmdlet</td><td><code>help</code>, <code>man</code></td></tr>
  </tbody>
</table>
<div class="callout">💡 Almost everything that <b>reads</b> data starts with <code>Get-</code>. Change — <code>Set-</code>, create — <code>New-</code>, delete — <code>Remove-</code>.</div>

<h3>The object pipeline</h3>
<p>PowerShell's power is the <b>pipeline</b> <code>|</code>: one cmdlet's output passes to the next as objects, not text.</p>
<pre><code>Get-Process | Where-Object { $_.CPU -gt 100 } | Sort-Object CPU -Descending | Select-Object -First 5</code></pre>
<p>Here we took processes, filtered by CPU load, sorted and took the top 5 — in one line, with no text parsing.</p>

<h3>Why PowerShell matters for security</h3>
<ul class="tl">
  <li><b>For defense:</b> inventory collection, hardening automation, log analysis (<code>Get-WinEvent</code>).</li>
  <li><b>For attack:</b> in-memory execution with no file on disk, obfuscation, <code>powershell -enc &lt;base64&gt;</code>.</li>
  <li><b>For the blue team:</b> that's exactly why <b>Script Block Logging</b> is enabled and event 4104 is watched.</li>
</ul>
<div class="callout danger">🚨 A command like <code>powershell -w hidden -enc SQBFAFgA...</code> in the logs almost always means an attack: hidden window + encoded command. Remember this pattern — you'll meet it in the forensics and SOC labs.</div>
`,
    tasks: {
      ps_read: ["Study PowerShell", "Read about cmdlets, the pipeline and security."],
      ps_verb: ["The read verb", "Which verb do data-retrieval cmdlets start with?", ["Get-Content, Get-Process..."]],
      ps_read_file: ["Read a file", "Which cmdlet reads the contents of a file? (Verb-Noun)", ["Get-...", "Get-Content"], { answers: ["get-content", "gc"] }],
      ps_proc: ["List of processes", "Which cmdlet shows running processes? (Verb-Noun)", ["Get-Process"], { answers: ["get-process", "ps"] }],
      ps_pipe: ["The pipeline", "Which character joins cmdlets into a pipeline (passing objects along)? (1 character)", ["Vertical bar."], { answers: ["|"] }],
      ps_verb_new: ["The create verb", "Which verb do object-creation cmdlets start with? (e.g. ...-Item)", ["New-Item, New-LocalUser..."]],
      ps_enc: ["Sign of an attack", "What in PowerShell logs most strongly hints at malicious activity?", null, { options: ["powershell -w hidden -enc <base64>", "Get-Help Get-Process", "Get-Content report.txt", "Get-Service"] }],
      ps_log: ["Blue-team defense", "What is the logging of executed PowerShell script content called? (2 words, Script ...)", ["Script Block ...", "Event 4104."], { answers: ["script block logging", "script block", "scriptblock logging"] }],
    },
  },
  win_users: {
    t: "Accounts, NTFS permissions and privileges",
    intro: `
<h3>The Windows access model</h3>
<p>Windows security rests on <b>who</b> does something (the account), <b>which group</b> they're in (a set of rights) and <b>what they're allowed</b> to do with a specific object (NTFS permissions). Understanding this trio is the basis for hardening, investigation and analyzing privilege escalation.</p>

<h3>Users and groups</h3>
<table>
  <thead><tr><th>Command</th><th>What it shows</th></tr></thead>
  <tbody>
    <tr><td><code>net user</code></td><td>List of local accounts</td></tr>
    <tr><td><code>net user name</code></td><td>Account details: groups, last logon, password expiry</td></tr>
    <tr><td><code>net localgroup administrators</code></td><td>Who's in the admins group</td></tr>
    <tr><td><code>whoami /groups</code></td><td>Which groups I belong to</td></tr>
  </tbody>
</table>
<p>Key built-in accounts: <b>Administrator</b> (full control), <b>SYSTEM</b> (even higher — the OS itself), <b>Guest</b> (usually disabled).</p>

<h3>UAC — the barrier on the way to admin rights</h3>
<p><b>User Account Control</b> forces confirmation of actions that require administrator rights, even if you're an admin. It's not an "annoying popup" but an important barrier: without it, any running program would silently get full access.</p>

<h3>NTFS permissions</h3>
<p>The NTFS file system keeps a permission list (ACL) for each file/folder. View it with <code>icacls file</code>:</p>
<table>
  <thead><tr><th>Notation</th><th>Right</th></tr></thead>
  <tbody>
    <tr><td>(F)</td><td>Full — full access</td></tr>
    <tr><td>(M)</td><td>Modify</td></tr>
    <tr><td>(RX)</td><td>Read and execute</td></tr>
    <tr><td>(R)</td><td>Read only</td></tr>
    <tr><td>(W)</td><td>Write only</td></tr>
  </tbody>
</table>
<div class="callout warn">⚠️ Wrong NTFS permissions are a common cause of privilege escalation: if an ordinary user can <b>write</b> to a file of a service running as SYSTEM, they effectively get SYSTEM.</div>

<h3>The principle of least privilege</h3>
<p>The golden rule: each account and process gets <b>exactly as many rights as the task needs, and not a drop more</b>. Everyday work — under an ordinary user; admin rights — only for a specific action. This sharply reduces the damage when any account is compromised.</p>
<div class="callout">🛡️ A separate admin account for admin tasks and an ordinary one for mail and the browser: even if the "ordinary" one is phished, the attacker doesn't immediately reach admin rights.</div>
`,
    tasks: {
      wu_read: ["Study Windows rights", "Get familiar with accounts, UAC, NTFS and least privilege."],
      wu_netuser: ["List of accounts", "Which command (2 words) shows the list of local users?", ["net ...", "net user"], { answers: ["net user"] }],
      wu_uac: ["Admin rights prompt", "What is the mechanism that prompts for admin-rights confirmation called? (acronym, 3 letters)", ["User Account Control."]],
      wu_icacls: ["File permissions", "Which command shows NTFS permissions on a file? (one word)", ["i + cacls"], { answers: ["icacls"] }],
      wu_system: ["The most powerful account", "Which built-in account has MORE rights than Administrator (it's the OS itself)? (one word)", ["Written in capitals.", "NT AUTHORITY\\\\SYSTEM"], { answers: ["system", "nt authority\\\\system"] }],
      wu_priv: ["The main principle", "What is the principle of \"exactly as many rights as needed\" called? (2 words)", ["Least privilege."], { answers: ["least privilege", "principle of least privilege"] }],
      wu_choice: ["Privilege escalation", "Why is WRITE access to a file of a service running as SYSTEM dangerous?", null, { options: ["The user can replace it and get SYSTEM", "The file gets bigger", "The service runs faster", "Nothing dangerous"] }],
    },
  },
  win_recon: {
    t: "Windows recon and triage",
    intro: `
<h3>Situational awareness</h3>
<p>The first thing an auditor, an incident responder and (alas) an attacker do after gaining access is <b>look around</b>. Who am I, what is this machine, what's running on it, where does it talk on the network. You use the same commands on your own machine to understand its state.</p>
<div class="callout">🔎 Everything below is a legitimate step in an authorized pentest or an audit of your own machine. On someone else's systems without permission — no.</div>

<h3>Who am I and what rights do I have</h3>
<ul>
  <li><code>whoami /priv</code> — my privileges (look for "interesting" ones: SeImpersonate, SeBackup…).</li>
  <li><code>whoami /groups</code> — group membership.</li>
  <li><code>net user %username%</code> — details of my account.</li>
</ul>

<h3>What system is this</h3>
<ul>
  <li><code>systeminfo</code> — OS version, patches (hotfixes), hardware, domain. Missing recent patches = potential vulnerabilities.</li>
  <li><code>hostname</code> — the machine's name.</li>
</ul>

<h3>What's running and where it talks</h3>
<table>
  <thead><tr><th>Command</th><th>What it shows</th><th>What to look for</th></tr></thead>
  <tbody>
    <tr><td><code>tasklist</code></td><td>Running processes</td><td>Odd names, processes from Temp</td></tr>
    <tr><td><code>netstat -ano</code></td><td>Ports and connections + PID</td><td>Links to external IPs, backdoor ports</td></tr>
    <tr><td><code>ipconfig /all</code></td><td>Network configuration</td><td>IP, gateway, DNS, domain</td></tr>
    <tr><td><code>schtasks</code></td><td>Scheduled tasks</td><td>Malware persistence tasks</td></tr>
  </tbody>
</table>
<div class="deepdive"><b>A triage combo</b>
<p>Found a suspicious connection in <code>netstat -ano</code> → note the PID → <code>tasklist | findstr &lt;PID&gt;</code> shows which process opened it. That's how you go from a "strange port" to a specific malicious process. You'll practice this logic in the Task Manager lab below.</p></div>
<div class="callout warn">⚠️ Attackers use the same commands for recon after a breach. So a mass run of them from one account is itself a signal for the SOC.</div>
`,
    tasks: {
      wr_read: ["Study recon", "Read about information gathering and triage."],
      wr_systeminfo: ["System info", "Which command outputs full system info and installed patches? (one word)", ["system + info"]],
      wr_tasklist: ["Processes in cmd", "Which cmd command shows the list of running processes? (one word)", ["task + list"]],
      wr_netstat: ["Open ports", "Which command shows network connections and ports? (one word)", ["net + stat"]],
      wr_priv: ["My privileges", "Which flag of the whoami command shows the list of privileges? (with a slash)", ["whoami /...", "/priv"], { answers: ["/priv"] }],
      wr_schtasks: ["Scheduled tasks", "Which command shows scheduled tasks (a common persistence spot)? (one word)", ["sch + tasks"], { answers: ["schtasks"] }],
      wr_lab: ["Lab: Task Manager", "Find and end the malicious process in Task Manager."],
    },
  },
};
