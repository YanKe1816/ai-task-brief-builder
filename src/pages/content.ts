export const homeHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AI Task Brief Builder</title>
    <style>
      :root { color-scheme: light; --ink: #202124; --muted: #5f6368; --line: #d8d6cf; --paper: #fbfaf7; --band: #f0eee7; --accent: #145c52; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: var(--ink); background: var(--paper); }
      header { border-bottom: 1px solid var(--line); background: #ffffff; }
      nav { max-width: 960px; margin: 0 auto; padding: 16px 20px; display: flex; gap: 18px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
      nav strong { color: var(--accent); }
      nav a { color: var(--ink); text-decoration: none; font-weight: 600; }
      nav a:hover { text-decoration: underline; }
      main { max-width: 960px; margin: 0 auto; padding: 40px 20px 64px; }
      h1 { font-size: 2.4rem; line-height: 1.15; margin: 0 0 14px; }
      h2 { font-size: 1.25rem; margin: 30px 0 10px; }
      p, li { line-height: 1.65; }
      .lead { color: var(--muted); font-size: 1.1rem; max-width: 760px; }
      .panel { background: var(--band); border: 1px solid var(--line); border-radius: 6px; padding: 18px; margin-top: 20px; }
      code { background: #e6e2d8; border-radius: 4px; padding: 2px 6px; }
    </style>
  </head>
  <body>
    <header>
      <nav aria-label="Main navigation">
        <strong>AI Task Brief Builder</strong>
        <span>
          <a href="/">Home</a> |
          <a href="/privacy">Privacy</a> |
          <a href="/terms">Terms</a> |
          <a href="/support">Support</a>
        </span>
      </nav>
    </header>
    <main>
      <h1>AI Task Brief Builder</h1>
      <p class="lead">A read-only MCP service that turns supplied software-development material into evidence-backed task goals, test requirements, and implementation briefs.</p>
      <section class="panel">
        <h2>What This App Does</h2>
        <p>AI Task Brief Builder organizes user-provided development notes into structured planning artifacts with explicit evidence mapping and clearly marked missing or unconfirmed information.</p>
      </section>
      <h2>User Purpose</h2>
      <p>Use this app when software requirements are unclear and need to be converted into a scoped engineering brief that can be reviewed, tested, and handed to implementers without expanding the request.</p>
      <h2>Accepted Input</h2>
      <p>The app accepts plain-text software-development material supplied in the current request, plus optional bounded context and confirmed items where supported by the selected tool.</p>
      <h2>Returned Output</h2>
      <p>Outputs include confirmed task goals, test requirements, implementation brief sections, missing fields, limitations, structured errors, and evidence records that map conclusions back to supplied text.</p>
      <h2>Available Tools</h2>
      <ul>
        <li><code>extract_task_goal</code>: extracts confirmed software task goals from supplied material.</li>
        <li><code>build_test_requirements</code>: builds evidence-backed test objectives and test cases.</li>
        <li><code>generate_task_brief</code>: generates an evidence-backed implementation brief with scope, constraints, acceptance criteria, tests, and delivery requirements.</li>
      </ul>
      <h2>MCP Endpoint</h2>
      <p><code>POST /mcp</code></p>
      <h2>What This App Does Not Do</h2>
      <p>The app does not access repositories, accounts, databases, or external APIs. It does not implement code, run tests, deploy applications, approve changes, merge pull requests, publish content, or perform destructive actions.</p>
      <h2>Data Handling</h2>
      <p>The service is stateless and read-only. It processes only the text supplied in the request and returns structured analysis without storing user material or sharing it with external services.</p>
      <h2>Support</h2>
      <p>For support, contact <a href="mailto:sidcraigau@gmail.com">sidcraigau@gmail.com</a>.</p>
    </main>
  </body>
</html>`;

export const privacyHtml = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Privacy | AI Task Brief Builder</title><style>:root{--ink:#202124;--muted:#5f6368;--line:#d8d6cf;--paper:#fbfaf7;--accent:#145c52}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:var(--paper)}header{border-bottom:1px solid var(--line);background:#fff}nav,main{max-width:960px;margin:0 auto}nav{padding:16px 20px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}nav strong{color:var(--accent)}nav a{color:var(--ink);text-decoration:none;font-weight:600}main{padding:40px 20px 64px}h1{font-size:2rem;margin:0 0 12px}h2{font-size:1.15rem;margin:28px 0 8px}p,li{line-height:1.65}.muted{color:var(--muted)}</style></head>
  <body><header><nav aria-label="Main navigation"><strong>AI Task Brief Builder</strong><span><a href="/">Home</a> | <a href="/privacy">Privacy</a> | <a href="/terms">Terms</a> | <a href="/support">Support</a></span></nav></header>
    <main><h1>Privacy</h1><p class="muted">Last updated: August 4, 2026</p><h2>Data Collected</h2><p>AI Task Brief Builder receives the text, context, and confirmed items that a user provides in a tool request. It does not ask for account credentials, repository access, database access, or personal profile information.</p><h2>How Input Is Used</h2><p>Input is used only to produce structured task goals, test requirements, implementation briefs, missing-field notices, limitations, errors, and evidence mappings.</p><h2>How Output Is Generated</h2><p>Output is generated from the supplied material only. The app marks missing or unconfirmed information instead of inventing requirements or claiming unsupported facts.</p><h2>Retention</h2><p>The service is stateless and does not intentionally store user input or generated output after the request is handled.</p><h2>External Sharing</h2><p>The app does not share request content with external systems, services, or APIs.</p><h2>External API Policy</h2><p>AI Task Brief Builder does not call external APIs, repositories, accounts, issue trackers, databases, or deployment systems.</p><h2>Account / Login Policy</h2><p>The app does not provide login, OAuth, account linking, or user profile management.</p><h2>User Controls</h2><p>Users control what information is supplied by choosing the text and context included in each request. Do not include secrets or sensitive information unless it is necessary for the brief.</p><h2>Read-Only Boundary</h2><p>The app is read-only. It analyzes supplied text and does not modify files, run tests, deploy services, publish content, approve changes, or perform destructive actions.</p><h2>Contact</h2><p>Privacy questions can be sent to <a href="mailto:sidcraigau@gmail.com">sidcraigau@gmail.com</a>.</p></main>
  </body>
</html>`;

export const termsHtml = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Terms | AI Task Brief Builder</title><style>:root{--ink:#202124;--muted:#5f6368;--line:#d8d6cf;--paper:#fbfaf7;--accent:#145c52}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:var(--paper)}header{border-bottom:1px solid var(--line);background:#fff}nav,main{max-width:960px;margin:0 auto}nav{padding:16px 20px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}nav strong{color:var(--accent)}nav a{color:var(--ink);text-decoration:none;font-weight:600}main{padding:40px 20px 64px}h1{font-size:2rem;margin:0 0 12px}h2{font-size:1.15rem;margin:28px 0 8px}p,li{line-height:1.65}.muted{color:var(--muted)}</style></head>
  <body><header><nav aria-label="Main navigation"><strong>AI Task Brief Builder</strong><span><a href="/">Home</a> | <a href="/privacy">Privacy</a> | <a href="/terms">Terms</a> | <a href="/support">Support</a></span></nav></header>
    <main><h1>Terms</h1><p class="muted">Last updated: August 4, 2026</p><h2>Service Description</h2><p>AI Task Brief Builder is a read-only MCP service that converts supplied software-development material into structured task goals, test requirements, and implementation briefs.</p><h2>Allowed Use</h2><p>Use the app to organize software requirements, separate confirmed and unconfirmed information, and map conclusions to evidence in the supplied text.</p><h2>User Responsibility</h2><p>Users are responsible for the accuracy and appropriateness of the material they provide and for reviewing output before using it in a project workflow.</p><h2>Limitations</h2><p>The app may identify missing information and may return partial results when supplied evidence is incomplete. It does not guarantee that a task brief is complete for every engineering process.</p><h2>No External Execution</h2><p>The app does not open repositories, change code, run tests, deploy applications, publish releases, or report that external work has been completed.</p><h2>No Professional Advice Unless Explicitly Scoped</h2><p>Outputs are software planning aids and are not legal, financial, medical, security, or compliance advice.</p><h2>No Destructive Actions</h2><p>The app is read-only and does not perform writes, approvals, merges, refunds, removals, revocations, or other destructive actions.</p><h2>No Guarantees</h2><p>The service is provided for structured analysis of supplied text. Users should verify all output against their own requirements and acceptance process.</p><h2>Prohibited Use</h2><p>Do not use the app to process secrets unnecessarily, bypass review workflows, claim work was completed without evidence, or request actions outside its read-only boundary.</p><h2>Changes to Service</h2><p>The service may be updated to improve reliability, clarity, and compatibility while preserving its read-only purpose.</p><h2>Contact</h2><p>Questions about these terms can be sent to <a href="mailto:sidcraigau@gmail.com">sidcraigau@gmail.com</a>.</p></main>
  </body>
</html>`;

export const supportHtml = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Support | AI Task Brief Builder</title><style>:root{--ink:#202124;--muted:#5f6368;--line:#d8d6cf;--paper:#fbfaf7;--accent:#145c52}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:var(--paper)}header{border-bottom:1px solid var(--line);background:#fff}nav,main{max-width:960px;margin:0 auto}nav{padding:16px 20px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}nav strong{color:var(--accent)}nav a{color:var(--ink);text-decoration:none;font-weight:600}main{padding:40px 20px 64px}h1{font-size:2rem;margin:0 0 12px}h2{font-size:1.15rem;margin:28px 0 8px}p,li{line-height:1.65}.muted{color:var(--muted)}</style></head>
  <body><header><nav aria-label="Main navigation"><strong>AI Task Brief Builder</strong><span><a href="/">Home</a> | <a href="/privacy">Privacy</a> | <a href="/terms">Terms</a> | <a href="/support">Support</a></span></nav></header>
    <main><h1>Support</h1><p class="muted">Support for AI Task Brief Builder</p><h2>Support Email</h2><p><a href="mailto:sidcraigau@gmail.com">sidcraigau@gmail.com</a></p><h2>What to Include When Contacting Support</h2><ul><li>The route or tool involved, such as <code>POST /mcp</code> or one of the three available tools.</li><li>A concise description of the issue.</li><li>Non-sensitive sample input and the unexpected output, if available.</li><li>The approximate time the issue occurred.</li></ul><h2>Support Scope</h2><p>Support covers accessibility of the Review Shell pages, MCP endpoint availability, structured output format, evidence mapping behavior, and questions about the read-only boundary.</p><h2>Non-Support Scope</h2><p>Support does not include implementing code, accessing repositories, running project tests, deploying user applications, approving changes, or providing unrelated professional advice.</p><h2>Data / Privacy Questions</h2><p>Questions about data handling, privacy, or retention can be sent to the same support email.</p><h2>App Boundary Reminder</h2><p>AI Task Brief Builder analyzes supplied software-development text. It does not access external systems, use external APIs, store request content, or perform write actions.</p></main>
  </body>
</html>`;
