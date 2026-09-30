/* EN: Cybersecurity Fundamentals */
(window.CONTENT_EN = window.CONTENT_EN || {}).fundamentals = {
  cia: {
    t: "The CIA triad and threat modeling",
    intro: `
<h3>What does information security protect?</h3>
<p>The whole field rests on the <b>CIA triad</b> — three properties we aim to preserve:</p>
<ul>
  <li><b>Confidentiality</b> — data is seen only by those who are allowed to.</li>
  <li><b>Integrity</b> — data is not changed silently or without permission.</li>
  <li><b>Availability</b> — systems and data are accessible when needed.</li>
</ul>
<p>An attack almost always hits one of these properties. For example, a <i>database leak</i> breaks confidentiality, a <i>tampered payment order</i> breaks integrity, and <i>DDoS</i> breaks availability.</p>
<div class="callout">💡 Complementary properties: <b>Authenticity</b> (the source is genuine) and <b>Non-repudiation</b> (an action cannot be denied).</div>
`,
    tasks: {
      cia_read: ["Read the material", "Get familiar with the CIA triad above."],
      cia_ddos: ["Which property does DDoS break?", "One word: confidentiality, integrity or availability.", ["DDoS takes a service down.", "Users can't reach the site."], { answers: ["availability"] }],
      cia_leak: ["A password leak breaks…", "Which property of the triad does a leak of private data violate?", ["The data was seen by people who shouldn't see it."], { answers: ["confidentiality"] }],
      cia_abbr: ["Decode the acronym", "What does the letter I in CIA stand for (one word)?", ["It means data stays unmodified."]],
      cia_choice: ["Odd one out", "Which is NOT part of the CIA triad?", null, { options: ["Confidentiality", "Integrity", "Scalability", "Availability"] }],
    },
  },
  passwords: {
    t: "Passwords and authentication",
    intro: `
<h3>Why passwords get cracked</h3>
<p>Weak passwords are the #1 cause of account takeovers. Attacks include:</p>
<ul>
  <li><b>Brute-force</b> — trying every combination.</li>
  <li><b>Dictionary</b> — trying a list of popular passwords.</li>
  <li><b>Credential stuffing</b> — reusing leaked login/password pairs on other sites.</li>
</ul>
<p>Defense: long passphrases, a unique password per site, a password manager and <b>2FA</b> (two-factor authentication).</p>
<div class="callout">🔐 The password <code>P@ssw0rd</code> falls in seconds. The phrase <code>purple-elephant-runs-2043</code> is practically impossible to brute-force.</div>
<h3>Entropy</h3>
<p>Password strength is measured in bits of entropy. The longer the password and the larger the character set, the higher the entropy and the longer a brute-force takes.</p>
`,
    tasks: {
      pw_read: ["Study password theory", "Read the material about passwords."],
      pw_2fa: ["Second factor", "What is the acronym for two-factor authentication? (3 characters)", ["Two-Factor Authentication.", "A digit plus two letters."]],
      pw_attack: ["Attack using leaked databases", "What is the attack called where leaked login/password pairs are tried on other sites? (2 words)", ["Credential ...", "Starts with 'credential'."]],
      pw_best: ["Best practice", "What do you use to store a unique password for every site? (2 words)", ["A dedicated vault app."], { answers: ["password manager"] }],
      pw_lab: ["Lab: a strong password", "Build an «Excellent»-level password in the interactive meter below."],
    },
  },
  phishing: {
    t: "Phishing and social engineering",
    intro: `
<h3>People are the weakest link</h3>
<p><b>Social engineering</b> is manipulating people to gain access or data. Its most common form is <b>phishing</b>: fake emails and websites.</p>
<h3>Signs of phishing</h3>
<ul>
  <li>Urgency and threats ("your account will be deleted in 24 hours!").</li>
  <li>A suspicious domain: <code>paypa1.com</code> instead of <code>paypal.com</code>.</li>
  <li>A request to enter a password or code via a link in the email.</li>
  <li>Attachments with <code>.exe</code>, <code>.scr</code> extensions, macros in documents.</li>
</ul>
<div class="callout">🎣 Always check the domain in the address bar and never enter 2FA codes on third-party sites.</div>
`,
    tasks: {
      ph_read: ["Learn the signs of phishing", "Read the material."],
      ph_domain: ["Spot the fake", "Which domain is fake: paypal.com or paypa1.com? Enter the fake one in full.", ["Look closely at letters and digits.", "A digit one instead of the letter L."]],
      ph_term: ["The umbrella term", "What is manipulating people to gain access called? (2 words)", ["Social ..."], { answers: ["social engineering"] }],
      ph_vishing: ["Phishing by phone", "What is voice phishing over the phone called? (one word)", ["Voice + phishing."]],
    },
  },
};
