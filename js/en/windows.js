/* EN: Windows for Security */
(window.CONTENT_EN = window.CONTENT_EN || {}).windows = {
  cmd_basics: {
    t: "The Windows command line (cmd)",
    intro: `
<h3>The Windows console is your tool</h3>
<p>To open it: <kbd>Win+R</kbd> → type <code>cmd</code> → Enter. Basic commands:</p>
<ul>
  <li><code>dir</code> — list files and folders in the current directory.</li>
  <li><code>cd path</code> — change directory; <code>cd ..</code> — go one level up.</li>
  <li><code>type file.txt</code> — print a file's contents.</li>
  <li><code>whoami</code> — which user I am working as.</li>
  <li><code>cls</code> — clear the screen; <code>ver</code> — Windows version.</li>
</ul>
<div class="callout">🧪 Try the commands live in the terminal below or in the <b>Sandbox</b> tab. Type <code>help</code>.</div>
`,
    tasks: {
      cmd_read: ["Learn cmd commands", "Read the list of basic commands."],
      cmd_dir: ["List files", "Which cmd command shows the contents of the current directory?", ["Not 'ls' — a short 3-letter word."]],
      cmd_clear: ["Clear the screen", "Which command clears the screen in cmd? (3 letters)", ["Clear Screen."]],
      cmd_flag: ["🚩 Find the flag in the sandbox", "There is a secret.txt file in the sandbox home folder. Read it with the type command and enter the flag (format CYBER{...}).", ["First dir, then type secret.txt", "type secret.txt"]],
    },
  },
  powershell: {
    t: "PowerShell basics",
    intro: `
<h3>PowerShell is more powerful than cmd</h3>
<p>To open it: Start menu → type <code>PowerShell</code>. Commands follow the <b>Verb-Noun</b> pattern:</p>
<ul>
  <li><code>Get-Content file.txt</code> — read a file (aliases <code>gc</code>, <code>cat</code>).</li>
  <li><code>Get-Process</code> — list processes (alias <code>ps</code>).</li>
  <li><code>Get-Service</code> — Windows services.</li>
  <li><code>Get-Help command</code> — help for a cmdlet.</li>
  <li><code>Get-ChildItem</code> — list files (aliases <code>ls</code>, <code>dir</code>).</li>
</ul>
<div class="callout">💡 Almost every read cmdlet starts with the verb <code>Get-</code>.</div>
`,
    tasks: {
      ps_read: ["Learn PowerShell", "Read about the structure of cmdlets."],
      ps_verb: ["The read verb", "Which verb do data-retrieval cmdlets start with? (e.g. Set/New/...)", ["Get-Content, Get-Process..."]],
      ps_read_file: ["Read a file", "Which cmdlet reads a file's contents? (Verb-Noun)", ["Get-...", "Get-Content"]],
      ps_proc: ["List processes", "Which cmdlet shows running processes? (Verb-Noun)", ["Get-Process"]],
    },
  },
  win_users: {
    t: "User accounts and NTFS permissions",
    intro: `
<h3>Users, groups and UAC</h3>
<p>Windows separates regular users from administrators. The essentials:</p>
<ul>
  <li><code>net user</code> — list accounts; <code>net user name</code> — details.</li>
  <li><code>net localgroup administrators</code> — who is in the admins group.</li>
  <li><b>UAC</b> (User Account Control) — a confirmation prompt for actions that need admin rights.</li>
</ul>
<h3>File permissions (NTFS)</h3>
<ul>
  <li><code>icacls file</code> — show access permissions for a file/folder.</li>
  <li>Rights: (F) full, (M) modify, (RX) read+execute, (R) read, (W) write.</li>
</ul>
<div class="callout">🛡️ Principle of least privilege: work as a regular user, use admin only when needed.</div>
`,
    tasks: {
      wu_read: ["Learn Windows permissions", "Get familiar with accounts and NTFS."],
      wu_netuser: ["List accounts", "Which command (2 words) lists local users?", ["net ...", "net user"]],
      wu_uac: ["Admin rights prompt", "What is the mechanism that asks to confirm admin rights called? (acronym, 3 letters)", ["User Account Control."]],
      wu_icacls: ["File permissions", "Which command shows NTFS permissions on a file? (one word)", ["i + cacls"]],
    },
  },
  win_recon: {
    t: "Windows system reconnaissance",
    intro: `
<h3>Situational awareness</h3>
<p>During an authorized audit (or on your own machine) you start by gathering information:</p>
<ul>
  <li><code>whoami /priv</code> — my privileges; <code>whoami /groups</code> — groups.</li>
  <li><code>systeminfo</code> — full system and patch information.</li>
  <li><code>tasklist</code> — running processes.</li>
  <li><code>ipconfig /all</code> — network configuration.</li>
  <li><code>netstat -ano</code> — open ports and connections with PIDs.</li>
</ul>
<div class="callout">🔎 All of these are legitimate steps in an authorized pentest or when auditing your own machine.</div>
`,
    tasks: {
      wr_read: ["Learn reconnaissance", "Read about information gathering."],
      wr_systeminfo: ["System info", "Which command prints full system information and installed patches? (one word)", ["system + info"]],
      wr_tasklist: ["Processes in cmd", "Which cmd command lists running processes? (one word)", ["task + list"]],
      wr_netstat: ["Open ports", "Which command shows network connections and ports? (one word)", ["net + stat"]],
    },
  },
};
