export type ResumeTemplateCategory =
  | 'professional'
  | 'modern'
  | 'creative'
  | 'minimal'
  | 'academic'
  | 'executive'

export interface ResumeTemplate {
  id: string
  name: string
  category: ResumeTemplateCategory
  description: string
  preview: string // Description of the template style
  styleGuide: string // Instructions for AI to generate in this style
  format?: 'latex' | 'html' | 'both' // Template format - defaults to 'both' for backward compatibility
  /** Optional first-page preview URL. Defaults to `/templates/{id}-1.jpg` (JPEG). */
  previewImage?: string
  /** Optional second-page preview URL. Defaults to `/templates/{id}-2.jpg` (JPEG). */
  previewImage2?: string
  /** When set, overrides both pages (e.g. custom paths or WebP). */
  previewImages?: readonly [string, string]
}

// ─── Resume Templates ─────────────────────────────────────────────────────

// Hide near-duplicate templates so users only see structurally unique layouts.
const EXCLUDED_TEMPLATE_IDS = new Set<string>([
  'latex-compact',
  'latex-modern-clean',
  'latex-modern-tech',
  'latex-ats-optimized',
  'html-bold-creative',
  'html-tech-startup',
  'html-modern-card',
  'html-corporate-blue',
  'html-zen-columns',
  'horizon-balance',
  'editorial-sidebar-clone',
])

const ALL_RESUME_TEMPLATES = [
  // ── 1. Professional Classic ─────────────────────────────────────────────
  {
    id: 'professional-classic',
    name: 'Professional Classic',
    category: 'professional',
    description: 'Clean single-column layout inspired by top tech company resumes',
    preview: 'ATS-friendly single-column resume with clear hierarchy, used by FAANG candidates',
    format: 'html',
    styleGuide: `PROFESSIONAL CLASSIC — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean, ATS-optimized resume.

RULES:
- Single-column with SPLIT HEADER: Name + title on left, contact info stacked on right.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:40px 48px;background:#fff}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;margin-bottom:16px;border-bottom:2px solid #000}
.header-left h1{font-size:22px;font-weight:700;color:#000;margin-bottom:2px}
.header-left .title{font-size:11px;color:#555;font-weight:400}
.header-right{text-align:right;font-size:10px;color:#555;line-height:1.7}
.header-right a{color:#333;text-decoration:none}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#000;border-bottom:1px solid #000;padding-bottom:3px;margin:16px 0 8px}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.6;color:#1a1a1a}
@media print{.resume{padding:28px 36px;margin:0}}
</style></head><body><div class="resume">
<div class="header">
<div class="header-left"><h1>NAME</h1><div class="title">Senior Software Engineer</div></div>
<div class="header-right">email<br>phone<br>location<br>linkedin.com/in/name</div>
  </div>
<h2>Summary</h2>
<p>Engineering leader with 8+ years building and scaling high-impact platforms. Managed teams of 10+ engineers delivering products serving millions of users. Proven track record of driving 40%+ efficiency improvements at FAANG companies.</p>
    <h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Google, Mountain View, CA</div><ul><li>Architected microservices platform reducing deployment time by 60% across 12 engineering teams, implementing automated canary deployments and distributed tracing that improved incident response time from 4 hours to 15 minutes</li><li>Led monolith-to-microservices migration serving 5M+ DAU with 99.99% uptime, reducing infrastructure costs by 35% through Kafka-based event-driven architecture and gRPC service mesh</li><li>Mentored 8 junior engineers through structured design reviews, resulting in 3 promotions to senior within 18 months and 25% improvement in team velocity</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Stripe, San Francisco, CA</div><ul><li>Built payment processing pipeline handling $2B+ annual transaction volume with idempotent retry mechanisms and distributed coordination achieving 99.99% reliability</li><li>Reduced API response latency by 45% through systematic query optimization, materialized views, and multi-tier caching</li></ul></div>
    <h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Real-Time Analytics Dashboard</span><span class="entry-date">2023</span></div><div class="entry-sub">React, D3.js, WebSocket, PostgreSQL</div><ul><li>Built streaming analytics platform processing 50K+ events/sec with sub-second visualization, reducing product team decision-making time by 40%</li></ul></div>
<h2>Skills</h2>
<p class="skills-text">TypeScript, React, Node.js, Python, Go, PostgreSQL, Redis, AWS, Docker, Kubernetes, Terraform, CI/CD</p>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">M.S. Computer Science</span><span class="entry-date">2016 – 2018</span></div><div class="entry-sub">Stanford University</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Split header: name left, contact right (flex space-between)
- Contact info stacked vertically on right side
- Section headings: uppercase with 1px black border-bottom
- Skills: comma-separated inline text
- Font: Segoe UI`,
  },

  // ── Slate Split Header Sidebar — Screenshot-Matched Split Header + Sidebar ──
  {
    id: 'slate-split-header-sidebar',
    name: 'Slate Split Header Sidebar',
    category: 'professional',
    description: 'Dark split header with name/title on the right; narrow left sidebar and wide right experience timeline',
    preview: 'Rounded card, compact contact strip, left About/Education/Skills/Language and right Experience + References',
    format: 'both',
    styleGuide: `SLATE SPLIT HEADER SIDEBAR — SCREENSHOT-CLONE

RULES:
- Dark header band with name/title on the right (no profile photo).
- Below: light contact strip with 4 items.
- Body uses two columns: narrow left (About, Education, Skills, Language) and wide right (Experience timeline, References).
- Section titles uppercase with thin dividers; tight bullets.
- PDF/print: use the EXACT column CSS from the sample (flex .grid, not CSS grid columns) so Puppeteer/Chromium does not push the whole body to page 2 with a blank first page.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f2f2f2;color:#222;font-family:Arial,Helvetica,sans-serif}
/* min-height only for on-screen preview; fixed full-page min-height breaks Chromium PDF (grid row jumps to page 2, huge blank on page 1) */
.page{width:794px;min-height:1123px;margin:0 auto;background:#fff;border:1px solid #e3e3e3;border-radius:12px;overflow:visible;position:relative}
.header{background:#2c2e31;color:#fff;height:122px;position:relative;display:flex;align-items:center;padding-left:28px;padding-right:28px;z-index:1;break-inside:avoid;page-break-inside:avoid}
.name{font-size:26px;font-weight:800;letter-spacing:2px}
.role{margin-top:6px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#d0d0d0}
.contact{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:12px 26px;border-bottom:1px solid #ececec;position:relative;z-index:1;break-inside:avoid;page-break-inside:avoid}
.c-item{display:flex;align-items:center;gap:8px;font-size:11px;color:#444}
.c-ico{width:18px;height:18px;border-radius:3px;background:#2c2e31}
.content{padding:18px 22px 24px;position:relative;z-index:1;break-inside:auto;page-break-inside:auto}
/* Flex columns fragment across PDF pages; CSS Grid often moves the whole row to the next page in print */
.grid{display:flex;flex-direction:row;align-items:flex-start;gap:20px;break-inside:auto;page-break-inside:auto}
.grid>div:first-child{width:35%;min-width:0;flex-shrink:0;break-inside:auto;page-break-inside:auto}
.grid>div:last-child{width:65%;min-width:0;flex:1;break-inside:auto;page-break-inside:auto}
.section{margin-bottom:16px;break-inside:auto;page-break-inside:auto}
.s-title{font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:800;color:#2c2e31;display:flex;align-items:center;gap:10px;margin-bottom:8px}
.s-title::after{content:"";flex:1;height:1px;background:#2c2e31;opacity:.2}
p{font-size:11px;line-height:1.5;color:#2a2a2a}
small{color:#666}
ul{padding-left:16px;margin-top:4px}
li{font-size:11px;line-height:1.42;margin-bottom:3px}
.exp{position:relative;break-inside:auto;page-break-inside:auto}
.exp::before{content:"";position:absolute;left:7px;top:2px;bottom:2px;width:2px;background:#e2e2e2}
.exp-item{position:relative;padding-left:22px;margin-bottom:14px;break-inside:avoid;page-break-inside:avoid}
.dot{position:absolute;left:0;top:2px;width:12px;height:12px;border-radius:50%;background:#2c2e31}
.e-head{display:flex;justify-content:space-between;gap:8px;align-items:baseline;min-width:0;max-width:100%}
.e-role{font-weight:700;font-size:12px;flex:1 1 0%;min-width:0;overflow-wrap:break-word;word-break:break-word}
.e-date{font-size:10px;color:#666;white-space:nowrap;flex-shrink:0;max-width:42%}
.edu-block{min-width:0;max-width:100%;margin-bottom:10px}
.e-org{font-size:11px;color:#555;margin-top:2px;min-width:0;max-width:100%;overflow-wrap:break-word;word-break:break-word}
.refs{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ref-card{border:1px solid #ededed;padding:8px 10px;border-radius:6px}
.ref-name{font-weight:700;font-size:11.5px}
.ref-role{font-size:10.5px;color:#666}
@media print{
body{background:#fff}
.page{min-height:0!important;height:auto!important;border-radius:0;overflow:visible;border:none;box-shadow:none}
.grid{display:flex}
}
</style></head><body><div class="page">
  <div class="header">
    <div><div class="name">LORNA ALVARADO</div><div class="role">MARKETING MANAGER</div></div>
  </div>
  <div class="contact">
    <div class="c-item"><div class="c-ico"></div><span>+1 (987) 654-3210</span></div>
    <div class="c-item"><div class="c-ico"></div><span>lorna@example.com</span></div>
    <div class="c-item"><div class="c-ico"></div><span>www.lorna.site</span></div>
    <div class="c-item"><div class="c-ico"></div><span>Any City, US</span></div>
  </div>
  <div class="content">
    <div class="grid">
      <div>
        <div class="section"><div class="s-title">About Me</div><p>Detail-focused marketing leader with strong execution and stakeholder communication. Blends creative strategy with data-driven experiments to deliver measurable growth.</p></div>
        <div class="section"><div class="s-title">Education</div>
          <div class="edu-block">
            <div class="e-head"><div class="e-role">B.B.A. in Marketing</div><div class="e-date">2015 — 2019</div></div>
            <div class="e-org">University of Business, Any City</div>
            <small>Concentration: Brand Strategy and Analytics</small>
          </div>
</div>
        <div class="section"><div class="s-title">Skills</div><ul><li>Campaign strategy</li><li>Digital analytics</li><li>Content marketing</li><li>Cross-functional leadership</li></ul></div>
        <div class="section"><div class="s-title">Language</div><ul><li>English</li><li>Spanish</li></ul></div>
      </div>
      <div>
        <div class="section"><div class="s-title">Experience</div>
          <div class="exp">
            <div class="exp-item"><div class="dot"></div>
              <div class="e-head"><div class="e-role">Product Design Manager</div><div class="e-date">2021 — Present</div></div>
              <div class="e-org">Acme Studio — Any City</div>
              <ul><li>Led multi-channel launches improving MQL→SQL by 26%.</li><li>Partnered with design/research to drive higher CTR on paid assets.</li></ul>
            </div>
            <div class="exp-item"><div class="dot"></div>
              <div class="e-head"><div class="e-role">Marketing Manager</div><div class="e-date">2019 — 2021</div></div>
              <div class="e-org">Northwind — Any City</div>
              <ul><li>Built content engine increasing organic traffic by 3.2x.</li></ul>
            </div>
            <div class="exp-item"><div class="dot"></div>
              <div class="e-head"><div class="e-role">Marketing Associate</div><div class="e-date">2016 — 2019</div></div>
              <div class="e-org">Contoso — Any City</div>
              <ul><li>Executed email lifecycle optimizations to lift retention.</li></ul>
            </div>
          </div>
        </div>
        <div class="section"><div class="s-title">References</div>
          <div class="refs">
            <div class="ref-card"><div class="ref-name">Harumi Kobayashi</div><div class="ref-role">Head of Marketing, Northwind</div><small>harumi@example.com · +1 555-0100</small></div>
            <div class="ref-card"><div class="ref-name">Bailey Dupont</div><div class="ref-role">VP Marketing, Contoso</div><small>bailey@example.com · +1 555-0112</small></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div></body></html>

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt,letterpaper]{article}
\\usepackage[top=0.55in,bottom=0.55in,left=0.55in,right=0.55in]{geometry}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{paracol}
\\usepackage{array}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\definecolor{slate}{HTML}{2C2E31}
\\definecolor{rule}{HTML}{E2E2E2}
\\newcommand{\\resumeSection}[1]{\\vspace{6pt}\\textbf{\\MakeUppercase{#1}}\\\\{\\color{slate}\\rule{\\linewidth}{0.6pt}}\\vspace{4pt}}
\\newcommand{\\resumeSubheading}[3]{\\textbf{#1} \\hfill {\\small #2}\\\\{\\small #3}}
\\newcommand{\\resumeItem}[1]{\\item #1}
\\titleformat{\\section}{\\bfseries\\Large\\color{slate}}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{6pt}{4pt}
\\begin{document}
\\colorbox{slate}{\\parbox[c][1.3cm][c]{\\linewidth}{\\hspace*{4.3cm}{\\color{white}\\textbf{\\Large LORNA ALVARADO}}\\\\[-2pt]\\hspace*{4.3cm}{\\color{white}\\small\\bfseries MARKETING MANAGER}}}
\\\\[6pt]
{\\small +1 (987) 654-3210 \\hfill lorna@example.com \\hfill www.lorna.site \\hfill Any City, US}\\\\
{\\color{rule}\\rule{\\linewidth}{0.6pt}}
\\begin{paracol}{2}
\\setlength{\\columnsep}{0.6cm}
\\switchcolumn[0]
\\resumeSection{About Me}
{Detail-focused marketing leader with strong execution and stakeholder communication.}
\\resumeSection{Education}
\\resumeSubheading{B.B.A. in Marketing}{2015 -- 2019}{University of Business, Any City}
{Concentration: Brand Strategy and Analytics}
\\resumeSection{Skills}
\\begin{itemize}[leftmargin=12pt,itemsep=2pt,topsep=2pt]
  \\resumeItem{Campaign strategy}
  \\resumeItem{Digital analytics}
  \\resumeItem{Content marketing}
  \\resumeItem{Cross-functional leadership}
\\end{itemize}
\\resumeSection{Language}
\\begin{itemize}[leftmargin=12pt,itemsep=2pt,topsep=2pt]
  \\resumeItem{English}
  \\resumeItem{Spanish}
\\end{itemize}
\\switchcolumn
\\resumeSection{Experience}
\\textbf{Product Design Manager}\\hfill{\\small 2021 -- Present}\\\\
{\\small Acme Studio --- Any City}
\\begin{itemize}[leftmargin=14pt,itemsep=2pt,topsep=2pt]
  \\resumeItem{Led multi-channel launches improving MQL→SQL by 26\\%.}
  \\resumeItem{Partnered with design/research to drive higher CTR on paid assets.}
\\end{itemize}
\\textbf{Marketing Manager}\\hfill{\\small 2019 -- 2021}\\\\
{\\small Northwind --- Any City}
\\begin{itemize}[leftmargin=14pt,itemsep=2pt,topsep=2pt]
  \\resumeItem{Built content engine increasing organic traffic by 3.2x.}
\\end{itemize}
\\textbf{Marketing Associate}\\hfill{\\small 2016 -- 2019}\\\\
{\\small Contoso --- Any City}
\\begin{itemize}[leftmargin=14pt,itemsep=2pt,topsep=2pt]
  \\resumeItem{Executed email lifecycle optimizations to lift retention.}
\\end{itemize}
\\resumeSection{References}
\\begin{tabular}{p{0.47\\linewidth} p{0.47\\linewidth}}
\\textbf{Harumi Kobayashi}\\\\{\\small Head of Marketing, Northwind}\\\\{\\small harumi@example.com ~·~ +1 555-0100}
&
\\textbf{Bailey Dupont}\\\\{\\small VP Marketing, Contoso}\\\\{\\small bailey@example.com ~·~ +1 555-0112}
\\\\
\\end{tabular}
\\end{paracol}
\\end{document}

CRITICAL FORMATTING RULES:
- Exact split header feel with photo gutter and name block.
- Sidebar vs main column proportions; thin dividers; compact bullets.
- Keep HTML and LaTeX section order identical.`,
  },

  // ── 2. Modern Minimal ────────────────────────────────────────────────────

  // ── 3. Creative Portfolio ────────────────────────────────────────────────
  {
    id: 'creative-portfolio',
    name: 'Creative Portfolio',
    category: 'creative',
    description: 'Clean creative resume with subtle accent color',
    preview: 'Professional creative resume with a single accent color and project-first layout',
    format: 'html',
    styleGuide: `CREATIVE PORTFOLIO — FAANG-LEVEL TEMPLATE (CREATIVE ROLES)

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean creative resume that is still ATS-friendly.

RULES:
- TWO-COLUMN sidebar layout. Left sidebar for Skills, Education, Certifications. Right main for Summary, Experience, Projects.
- Header spans full width above both columns.
- Uses CSS Grid with <aside> and <main> HTML5 elements.
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;background:#fff;display:grid;grid-template-columns:220px 1fr;grid-template-rows:auto 1fr}
header{grid-column:1/-1;padding:30px 40px 18px;border-bottom:2px solid #7c3aed}
h1{font-size:22px;font-weight:700;color:#7c3aed;margin-bottom:3px}
.contact{font-size:10px;color:#555}
aside{background:#f8f4ff;padding:20px 22px;border-right:1px solid #e8dff5}
aside h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7c3aed;margin:16px 0 6px}
aside h2:first-child{margin-top:0}
aside ul{list-style:none;padding:0}
aside li{font-size:10px;color:#2a2a2a;padding:2px 0;line-height:1.4}
aside .entry{margin-bottom:10px}
aside .entry-title{font-size:10px;font-weight:600;color:#2a2a2a}
aside .entry-sub{font-size:9.5px;color:#666}
main{padding:20px 30px}
main h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7c3aed;border-bottom:1px solid #e8dff5;padding-bottom:3px;margin:16px 0 8px}
main h2:first-child{margin-top:0}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:16px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
.skills-text{font-size:10px;color:#2a2a2a;line-height:1.5}
@media print{.resume{margin:0;box-shadow:none}aside{background:#f8f4ff !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="resume">
<header>
    <h1>NAME</h1>
<div class="contact">email | phone | location</div>
</header>
<aside>
    <h2>Skills</h2>
<p class="skills-text">JavaScript, TypeScript, React, Node.js, Python, Go, PostgreSQL, Redis, AWS, Docker, Kubernetes, CI/CD</p>
<h2>Education</h2>
<div class="entry"><div class="entry-title">B.S. Computer Science</div><div class="entry-sub">Stanford University, 2015 – 2019</div></div>
<h2>Certifications</h2>
<div class="entry"><div class="entry-title">AWS Solutions Architect (2023)</div></div>
</aside>
<main>
<h2>Summary</h2>
<p>Full-stack engineer with 6+ years building scalable distributed systems serving millions of users. Led cross-functional teams at Google delivering platform improvements that reduced deployment time by 60% and infrastructure costs by 35%.</p>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Google, Mountain View, CA</div><ul><li>Architected microservices platform reducing deployment time by 60% across 12 teams, implementing automated canary deployments and distributed tracing that improved incident response from 4 hours to 15 minutes</li><li>Led monolith-to-microservices migration serving 5M+ DAU with 99.99% uptime and 35% infrastructure cost reduction using Kafka and gRPC event-driven patterns</li><li>Mentored 8 junior engineers through weekly design reviews, resulting in 3 promotions to senior within 18 months</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Stripe, San Francisco, CA</div><ul><li>Built payment processing pipeline handling $2B+ annual volume with idempotent retry mechanisms achieving 99.99% reliability</li><li>Reduced API response latency by 45% through query optimization and intelligent caching strategies</li></ul></div>
    <h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Real-Time Analytics Dashboard</span><span class="entry-date">2023</span></div><div class="entry-sub">React, D3.js, WebSocket, PostgreSQL</div><ul><li>Built streaming platform processing 50K+ events/sec with sub-second visualization, reducing product team decision-making time by 40%</li></ul></div>
</main>
</div></body></html>

CRITICAL FORMATTING RULES:
- CSS Grid: 220px sidebar + 1fr main
- Sidebar: #f8f4ff background, contains Skills + Education + Certifications
- Main: white background, contains Summary + Experience + Projects
- Header spans full width
- Skills displayed as list items in sidebar
- Font: Segoe UI`,
  },

  // ── 4. Executive Summary ────────────────────────────────────────────────
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    category: 'executive',
    description: 'Senior-level resume emphasizing leadership and impact',
    preview: 'Executive ATS-friendly resume with summary-first layout for senior/leadership roles',
    format: 'html',
    styleGuide: `EXECUTIVE SUMMARY — FAANG-LEVEL TEMPLATE (SENIOR/LEADERSHIP ROLES)

YOU ARE A SENIOR RESUME ENGINEER. Generate a leadership-focused, ATS-optimized resume.

RULES:
- HEADER BAND layout: Colored header area with white text, white body below.
- Print-safe header background (no gradients).
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;background:#fff}
.header{background:#1a2744;padding:30px 45px 24px;}
.header h1{font-size:24px;font-weight:700;color:#fff;margin-bottom:4px}
.header .contact{font-size:10.5px;color:rgba(255,255,255,0.75)}
.header .contact a{color:rgba(255,255,255,0.9);text-decoration:none}
.body{padding:24px 45px 40px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#1a2744;border-bottom:2px solid #1a2744;padding-bottom:3px;padding-bottom:3px;margin:18px 0 8px}
h2:first-child{margin-top:0}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
@media print{.header{background:#1a2744 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.resume{margin:0}}
</style></head><body><div class="resume">
<div class="header">
  <h1>NAME</h1>
<div class="contact">email | phone | location</div>
  </div>
<div class="body">
<h2>Summary</h2>
<p>DevOps and platform engineer with 6+ years automating CI/CD pipelines and managing cloud infrastructure at scale. Reduced deployment failures by 90% and infrastructure costs by 40%. Expert in Kubernetes, Terraform, and AWS.</p>
  <h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Platform Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Netflix, Los Gatos, CA</div><ul><li>Managed Kubernetes clusters serving 230M+ subscribers with 99.99% uptime SLA, implementing automated scaling policies and chaos engineering practices that reduced production incidents by 75%</li><li>Built GitOps deployment pipeline enabling 200+ developers to self-serve infrastructure provisioning, reducing lead time from 2 weeks to 30 minutes with automated compliance checks</li><li>Designed infrastructure-as-code framework managing 2000+ microservices across 3 AWS regions with Terraform modules achieving 100% drift detection</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">DevOps Engineer</span><span class="entry-date">2018 – 2021</span></div><div class="entry-sub">Shopify, Ottawa, ON</div><ul><li>Automated CI/CD pipelines reducing build-to-deploy time from 45 minutes to 8 minutes through parallelized testing, artifact caching, and incremental builds</li><li>Implemented container orchestration supporting 1M+ merchants during Black Friday peak traffic with zero-downtime deployments and automatic rollback</li></ul></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">GitOps Platform</span><span class="entry-date">2023</span></div><div class="entry-sub">ArgoCD, Terraform, Go</div><ul><li>Built internal GitOps platform with declarative infrastructure management, automated PR-based environment provisioning, and real-time deployment status dashboards</li></ul></div>
<h2>Skills</h2>
<p class="skills-text">Kubernetes, Docker, Terraform, AWS, GCP, Jenkins, ArgoCD, Prometheus, Grafana, Python, Go, Bash, Linux, Networking</p>
  <h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.S. Computer Engineering</span><span class="entry-date">2014 – 2018</span></div><div class="entry-sub">University of Toronto</div></div>
<h2>Certifications</h2>
<div class="entry"><div class="entry-title">CKA – Certified Kubernetes Administrator (2021)</div></div>
</div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Dark/colored header band (#1a2744) with white text
- White body below with standard section layout
- Header contains name + contact
- Print-safe: solid background, no gradients
- Font: Georgia`,
  },

  // ── 5. Academic Scholar ────────────────────────────────────────────────

  // ── 6. Tech Professional ───────────────────────────────────────────────
  {
    id: 'tech-professional',
    name: 'Tech Professional',
    category: 'professional',
    description: 'Tech-focused resume with skills-first layout for SWE roles',
    preview: 'Clean tech resume with prominent skills section, GitHub links, and project highlights',
    format: 'html',
    styleGuide: `TECH PROFESSIONAL — FAANG-LEVEL TEMPLATE (SOFTWARE ENGINEER ROLES)

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean, technical resume for software engineering roles.

RULES:
- Single-column with TIMELINE layout for experience entries.
- Experience entries have vertical timeline line on left with dot markers.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:40px 48px;background:#fff}
h1{font-size:22px;font-weight:700;color:#000;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:20px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#000;border-bottom:1.5px solid #374151;color:#000;padding-bottom:3px;margin:20px 0 10px}
.timeline{border-left:2px solid #374151;margin-left:6px;padding-left:18px}
.entry{margin-bottom:16px;position:relative}
.entry::before{content:'';position:absolute;left:-23px;top:6px;width:8px;height:8px;background:#374151;border-radius:50%;border:2px solid #fff}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.6;color:#1a1a1a}
.projects .entry{margin-bottom:12px}
.projects .entry::before{display:none}
@media print{.resume{padding:28px 36px;margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="resume">
    <h1>NAME</h1>
<div class="contact">email | phone | location</div>
<h2>Summary</h2>
<p>Mobile and frontend engineer with 5+ years building cross-platform applications reaching millions of users. Expert in React Native, Swift, and modern JavaScript. Passionate about performance optimization and pixel-perfect UI implementation.</p>
<h2>Experience</h2>
<div class="timeline">
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Mobile Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Airbnb, San Francisco, CA</div><ul><li>Led mobile team of 6 rebuilding guest experience app used by 150M+ users globally, implementing offline-first architecture that reduced user-reported errors by 65% and increased session duration by 25%</li><li>Improved app launch time by 40% through lazy module loading, image optimization pipeline, and tree-shaking, achieving sub-2-second cold start on 90th percentile devices</li><li>Implemented A/B testing framework enabling product teams to run 50+ concurrent experiments with real-time metric dashboards</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Mobile Developer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Spotify, Stockholm, Sweden</div><ul><li>Built audio streaming features handling 100M+ daily playback sessions, implementing gapless playback and crossfade with sub-10ms latency transitions</li><li>Reduced crash rate from 2.5% to 0.3% through systematic crash analysis, memory leak detection, and automated regression testing across 200+ device configurations</li></ul></div>
  </div>
  <h2>Projects</h2>
<div class="projects">
<div class="entry"><div class="entry-header"><span class="entry-title">Cross-Platform UI Kit</span><span class="entry-date">2023</span></div><div class="entry-sub">React Native, TypeScript</div><ul><li>Created open-source component library with 2K+ GitHub stars, 100+ weekly npm downloads, and comprehensive Storybook documentation</li></ul></div>
</div>
<h2>Skills</h2>
<p class="skills-text">React Native, Swift, Kotlin, TypeScript, iOS, Android, Firebase, GraphQL, CI/CD, App Store Optimization</p>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.S. Computer Science</span><span class="entry-date">2015 – 2019</span></div><div class="entry-sub">University of Michigan</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Timeline: 2px vertical line on left of experience entries
- Dot markers (8px circles) at start of each entry
- Section headings: uppercase with dark-gray rule
- Skills: comma-separated inline text
- Font: Segoe UI`,
  },

  // ── 7. Creative Designer ────────────────────────────────────────────────

  // ── 8. Minimal Clean ────────────────────────────────────────────────────
  {
    id: 'minimal-clean',
    name: 'Minimal Clean',
    category: 'minimal',
    description: 'Zero-decoration resume with pure content focus',
    preview: 'Ultra-minimal black-on-white resume with no borders, no colors, no decoration',
    format: 'html',
    styleGuide: `MINIMAL CLEAN — FAANG-LEVEL ZERO-DECORATION TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate the cleanest possible resume.

RULES:
- SPACIOUS MODERN single-column layout. Generous whitespace for easy scanning.
- Large section gaps (28px+). Ample padding. Modern, airy feel.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:11px;line-height:1.65}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:48px 52px;background:#fff}
h1{font-size:26px;font-weight:700;color:#1a1a1a;margin-bottom:6px;}
.contact{font-size:11px;color:#666;margin-bottom:28px;}
h2{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#1a1a1a;margin:28px 0 12px;margin:28px 0 12px}
h2:first-of-type{margin-top:0}
.entry{margin-bottom:18px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px}
.entry-title{font-weight:600;font-size:11px;color:#000}
.entry-date{font-size:10.5px;color:#666;white-space:nowrap}
.entry-sub{font-size:10.5px;color:#666;margin-bottom:6px}
ul{padding-left:18px;margin:6px 0 0}li{margin-bottom:4px;font-size:11px;line-height:1.6;color:#2a2a2a}
.skills-text{font-size:11px;color:#2a2a2a;line-height:1.7}
p{font-size:11px;line-height:1.65;color:#2a2a2a}
@media print{.resume{padding:36px 44px;margin:0}}
</style></head><body><div class="resume">
<h1>NAME</h1>
<div class="contact">email | phone | location</div>
<h2>Summary</h2>
<p>Product-minded engineer with 6+ years building user-facing applications at scale. Passionate about clean code, accessibility, and creating delightful user experiences. Led frontend team delivering features used by 10M+ monthly active users.</p>
      <h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Frontend Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Figma, San Francisco, CA</div><ul><li>Led redesign of core editor experience used by 5M+ designers, implementing virtualized canvas rendering that improved frame rate from 30fps to 60fps on complex documents with 1000+ layers</li><li>Built collaborative editing features using CRDTs enabling real-time co-design sessions with sub-50ms cursor synchronization across 100+ concurrent users</li><li>Established frontend performance monitoring dashboard reducing p95 page load from 3.2s to 1.1s through systematic bundle analysis and lazy loading</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Frontend Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Vercel, Remote</div><ul><li>Developed Next.js deployment dashboard serving 200K+ developers, implementing real-time log streaming and build analytics that reduced debugging time by 50%</li><li>Built accessible component library achieving WCAG 2.1 AA compliance, used across 15 internal applications serving 500K+ monthly users</li></ul></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Design System Framework</span><span class="entry-date">2023</span></div><div class="entry-sub">React, TypeScript, Storybook</div><ul><li>Created open-source design system with 3K+ GitHub stars, 50+ components, and automated visual regression testing via Chromatic CI pipeline</li></ul></div>
<h2>Skills</h2>
<p class="skills-text">React, TypeScript, Next.js, Vue.js, CSS/SCSS, WebGL, Node.js, GraphQL, Figma, Accessibility, Performance Optimization</p>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.A. Computer Science</span><span class="entry-date">2015 – 2019</span></div><div class="entry-sub">University of California, Berkeley</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Spacious: generous padding (48px 52px), 28px+ section gaps
- Large name (26px), comfortable reading font size
- Section headings: uppercase, spacing-only separation
- Breathing room between every element
- Skills: comma-separated inline text
- Font: Segoe UI`,
  },
  
  // ── LaTeX Templates ────────────────────────────────────────────────────────
  
  // 1. Classic Professional LaTeX Resume
  {
    id: 'latex-classic-professional',
    name: 'Classic Professional',
    category: 'professional',
    description: 'Clean single-column LaTeX resume used by FAANG candidates',
    preview: 'ATS-friendly single-column LaTeX resume with horizontal rules and clear hierarchy',
    format: 'latex',
    styleGuide: `CLASSIC PROFESSIONAL LATEX — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean, ATS-optimized LaTeX resume.

RULES:
- Single-column layout ONLY. No sidebars, no two-column.
- NO colors. Pure black text only. NO xcolor package.
- NO decorative elements. Clean horizontal rules under section headings.
- Section order: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- Bullet points: 2-4 lines each, concise and impactful.
- Skills as comma-separated inline text, NOT bullet points.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.
- Must compile cleanly with pdflatex.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\LARGE\\textbf{NAME}}\\\\[4pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location\\ \\textbar\\ linkedin.com/in/name}
\\end{center}

\\vspace{6pt}

\\section*{Summary}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{Experience}

\\textbf{Senior Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Tech Corp, San Francisco, CA}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\item Established a structured mentorship program for junior engineers, conducting weekly technical design reviews and pair programming sessions that resulted in 3 promotions to senior within 18 months and a 25\\% improvement in team velocity
\\end{itemize}

\\vspace{4pt}

\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{StartupXYZ, Remote}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\section*{Projects}

\\textbf{E-Commerce Platform} \\hfill \\textit{2023}\\\\
\\textit{React, Node.js, PostgreSQL, Stripe}
\\begin{itemize}
\\item Built a streaming analytics platform processing 50K+ events per second with sub-second visualization updates, using WebSocket-based pipelines and custom D3.js chart components optimized for real-time rendering across desktop and mobile viewports
\\item Reduced decision-making time for product teams by 40\\% through intuitive drill-down dashboards with automated anomaly detection, customizable KPI widgets, and exportable reports supporting CSV, PDF, and Slack integrations
\\end{itemize}

\\section*{Skills}
React, TypeScript, Node.js, Python, PostgreSQL, Redis, AWS, Docker, Kubernetes, CI/CD, Git

\\section*{Education}

\\textbf{B.S. Computer Science} \\hfill \\textit{2015 -- 2019}\\\\
\\textit{University of Technology} --- GPA: 3.8/4.0

\\end{document}

CRITICAL FORMATTING RULES:
- NO colors. NO xcolor. Pure black text.
- titlesec for section formatting with \\titlerule
- Contact on ONE centered line with \\textbar separators
- Experience: Title + \\hfill + Date, Company italic below
- Skills: comma-separated, single paragraph
- Must compile with pdflatex without errors
- Escape \\% for percentages`,

  },

  // 2. Compact LaTeX Resume
  {
    id: 'latex-compact',
    name: 'Compact Layout',
    category: 'professional',
    description: 'Dense single-column LaTeX resume — fits maximum content on one page',
    preview: 'Space-efficient ATS-friendly LaTeX resume with tight spacing and uppercase headings',
    format: 'latex',
    styleGuide: `COMPACT LATEX — FAANG-LEVEL DENSE TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a dense, content-rich, ATS-optimized LaTeX resume.

RULES:
- Single-column, tight margins (0.5in), small font (9pt body).
- NO colors. Pure black text only.
- UPPERCASE bold section headings with thin rule below.
- Section order: Header → Summary → Experience → Projects → Skills → Education
- Maximize content density while maintaining readability.
- Skills as comma-separated text.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.
- Must compile cleanly with pdflatex.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[9pt]{article}
\\usepackage[margin=0.5in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\vspace{-4pt}\\rule{\\textwidth}{0.4pt}]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlength{\\tabcolsep}{0pt}
\\setlist[itemize]{leftmargin=12pt,itemsep=0pt,topsep=1pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\large\\textbf{NAME}}\\hfill{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}

\\vspace{6pt}

\\section*{Summary}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{Experience}

\\textbf{Senior Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Tech Corp, San Francisco, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\item Deployed a real-time fraud detection system using ML models and rule-based engines, processing 50K+ transactions per minute and preventing \\$10M+ in annual losses while keeping false positive rates below 0.1\\%
\\end{itemize}

\\vspace{2pt}

\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{StartupXYZ, Remote}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\end{itemize}

\\section*{Projects}

\\textbf{E-Commerce Platform} \\hfill \\textit{2023}\\\\
\\textit{React, Node.js, PostgreSQL, Stripe}
\\begin{itemize}
\\item Developed a full-stack e-commerce platform with React and Node.js handling 10K+ daily transactions, implementing real-time inventory synchronization, Stripe payment integration, and an event sourcing pattern achieving 99.9\\% data consistency
\\item Implemented a recommendation engine using collaborative filtering and content-based algorithms, increasing average order value by 18\\% and reducing cart abandonment rate by 12\\% through personalized product suggestions
\\end{itemize}

\\section*{Skills}
TypeScript, Python, Go, React, Node.js, PostgreSQL, Redis, AWS, Docker, Kubernetes, Terraform, CI/CD

\\section*{Education}

\\textbf{B.S. Computer Science} \\hfill \\textit{2015 -- 2019}\\\\
\\textit{University of Technology} --- GPA: 3.8/4.0

\\end{document}

CRITICAL FORMATTING RULES:
- 9pt font, 0.5in margins for maximum density
- Name left-aligned, contact right-aligned on same line
- UPPERCASE section headings with thin rule below
- NO colors, NO decorative elements
- Tight itemsep (0pt) and topsep (1pt)
- Must compile with pdflatex`,

  },

  // 3. Two-Column LaTeX Resume
  {
    id: 'latex-two-column',
    name: 'Two-Column Layout',
    category: 'professional',
    description: 'Two-column LaTeX resume with sidebar for skills and education',
    preview: 'Professional two-column LaTeX layout with paracol sidebar — page-break safe',
    format: 'latex',
    styleGuide: `TWO-COLUMN LATEX — FAANG-LEVEL SIDEBAR TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean two-column LaTeX resume.

RULES:
- Two-column via paracol package: Left column (30%) = Skills, Education, Certifications. Right column (68%) = Summary, Experience, Projects.
- Use \\setcolumnwidth{0.30\\textwidth} and \\begin{paracol}{2} ... \\switchcolumn ... \\end{paracol}.
- paracol allows columns to break across pages — DO NOT use minipage for main content.
- NO colors. Pure black text only.
- Section headings: bold, uppercase, with thin rule below.
- Skills as comma-separated text (not bullets).
- Each bullet: action verb + context + measurable result (2-4 lines).
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.
- Must compile cleanly with pdflatex.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.55in,top=0.5in,bottom=0.5in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{paracol}
\\usepackage{mdframed}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\vspace{-4pt}\\rule{\\linewidth}{0.4pt}]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=12pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}
\\columnratio{0.30}
\\setlength{\\columnsep}{14pt}
\\setlength{\\columnseprule}{0.4pt}

\\begin{document}

\\begin{center}
{\\LARGE\\textbf{NAME}}\\\\[4pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location\\ \\textbar\\ linkedin.com/in/name}
\\end{center}

\\vspace{4pt}

\\begin{paracol}{2}

\\section*{Skills}
TypeScript, Python, Go, React, Node.js, Next.js, AWS, Docker, Kubernetes, PostgreSQL, Redis, MongoDB

\\section*{Education}
\\textbf{B.S. Computer Science}\\\\
\\textit{University of Technology, 2015 -- 2019}

\\section*{Certifications}
\\textbf{AWS Solutions Architect}\\\\
\\textit{Amazon Web Services, 2023}

\\switchcolumn

\\section*{Summary}
Results-driven software engineer with 5+ years building scalable distributed systems. Led teams delivering products serving millions of users with measurable performance improvements.

\\section*{Experience}

\\textbf{Senior Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Tech Corp, San Francisco, CA}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events, leveraging streaming data pipelines that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\%
\\end{itemize}

\\vspace{4pt}

\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{StartupXYZ, Remote}
\\begin{itemize}
\\item Built self-service developer platform enabling 50+ teams to provision infrastructure through a unified CLI, reducing onboarding from 2 weeks to 1 day
\\item Implemented progressive delivery with feature flags and canary releases, reducing deployment failures by 90\\% and increasing release cadence to multiple daily deploys
\\end{itemize}

\\section*{Projects}

\\textbf{E-Commerce Platform} \\hfill \\textit{2023}\\\\
\\textit{React, Node.js, PostgreSQL, Stripe}
\\begin{itemize}
\\item Architected and launched full-stack e-commerce platform with real-time inventory, Stripe payments, and admin dashboard, achieving 2K+ GitHub stars and 500+ weekly npm downloads
\\end{itemize}

\\end{paracol}

\\end{document}

CRITICAL FORMATTING RULES:
- Centered header spanning full width above paracol block
- \\columnratio{0.30} sets left column to 30%, right to 68%
- \\setlength{\\columnseprule}{0.4pt} adds a thin vertical divider line
- Left column: Skills (comma-separated), Education, Certifications
- Right column: Summary, Experience (with \\textbf + \\hfill date), Projects
- \\switchcolumn separates the two columns
- paracol allows page breaks — DO NOT use minipage for this template
- NO colors. NO xcolor.
- Must compile with pdflatex`,

  },

  // 4. Minimal ATS-Friendly LaTeX Resume
  {
    id: 'latex-minimal-ats',
    name: 'Minimal ATS-Friendly',
    category: 'minimal',
    description: 'Ultra-minimal LaTeX resume — maximum ATS compatibility',
    preview: 'Zero-decoration LaTeX resume using only basic commands for 100% ATS parsing',
    format: 'latex',
    styleGuide: `MINIMAL ATS — FAANG-LEVEL PURE ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate the simplest possible ATS-optimized LaTeX resume.

RULES:
- ZERO decoration. NO colors, NO titlesec, NO xcolor, NO tikz.
- Only packages: geometry, enumitem. Nothing else.
- Section headings: bold uppercase with \\textbf{}, followed by \\hrule.
- Section order: Header → Summary → Experience → Projects → Skills → Education
- Maximum ATS parsing compatibility.
- Skills as comma-separated text.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.
- Must compile cleanly with pdflatex.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{enumitem}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\newcommand{\\resumeSection}[1]{\\vspace{8pt}\\noindent\\textbf{\\large #1}\\\\[-6pt]\\rule{\\textwidth}{0.4pt}\\vspace{4pt}}

\\begin{document}

\\noindent{\\LARGE\\textbf{NAME}}\\\\[3pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}

\\vspace{6pt}

\\resumeSection{SUMMARY}
Results-driven software engineer with 5+ years building scalable distributed systems. Proven track record of delivering high-impact products and mentoring engineering teams.

\\resumeSection{EXPERIENCE}

\\noindent\\textbf{Senior Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
Tech Corp, San Francisco, CA
\\begin{itemize}
\\item Built an automated feature engineering tool using Python and Scikit-learn that reduced model development time from weeks to hours, supporting automated feature selection, hyperparameter tuning, and cross-validation across 20+ ML algorithms
\\end{itemize}

\\vspace{4pt}

\\noindent\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
StartupXYZ, Remote
\\begin{itemize}
\\item Designed an open-source distributed task scheduler supporting cron-based and event-driven workflows, handling 1M+ daily job executions with automatic retry logic, dead letter queues, and a web-based monitoring dashboard
\\end{itemize}

\\resumeSection{PROJECTS}

\\noindent\\textbf{E-Commerce Platform} \\hfill \\textit{2023}\\\\
React, Node.js, PostgreSQL, Stripe
\\begin{itemize}
\\item Built a streaming analytics platform processing 50K+ events per second with sub-second visualization updates, using WebSocket-based pipelines and custom D3.js chart components optimized for real-time rendering across desktop and mobile viewports
\\item Reduced decision-making time for product teams by 40\\% through intuitive drill-down dashboards with automated anomaly detection, customizable KPI widgets, and exportable reports supporting CSV, PDF, and Slack integrations
\\end{itemize}

\\resumeSection{SKILLS}
TypeScript, Python, Go, React, Node.js, PostgreSQL, Redis, AWS, Docker, Kubernetes, CI/CD, Git

\\resumeSection{EDUCATION}

\\noindent\\textbf{B.S. Computer Science} \\hfill \\textit{2015 -- 2019}\\\\
University of Technology --- GPA: 3.8/4.0

\\end{document}

CRITICAL FORMATTING RULES:
- ONLY geometry + enumitem packages. NO others.
- Custom \\resumeSection macro for consistent headings
- NO colors, NO fancy packages
- Company name NOT italic (plain text for ATS)
- Experience: Title bold + date right-aligned, company on next line
- Skills: single comma-separated paragraph
- Must compile with basic pdflatex`,

  },

  // 5. Modern Clean LaTeX Resume
  {
    id: 'latex-modern-clean',
    name: 'Modern Clean',
    category: 'modern',
    description: 'Contemporary LaTeX resume with centered dot separators',
    preview: 'Modern LaTeX resume with elegant spacing and dot-separated contact info',
    format: 'latex',
    styleGuide: `MODERN CLEAN LATEX — FAANG-LEVEL CONTEMPORARY TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a modern, well-spaced LaTeX resume.

RULES:
- Single-column layout with generous, balanced spacing.
- NO colors. Pure black text only. NO xcolor.
- Centered dot ($\\cdot$) separators for contact info.
- Section headings: bold with \\titlerule below.
- Skills grouped by category (bold label: comma-separated values).
- Section order: Header → Summary → Skills → Experience → Projects → Education
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.
- Must compile cleanly with pdflatex.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[4pt]
{\\small email $\\cdot$ phone $\\cdot$ location}
\\end{center}

\\vspace{6pt}

\\section*{Summary}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{Technical Skills}
\\textbf{Languages:} TypeScript, Python, Go, Java, SQL\\\\
\\textbf{Frameworks:} React, Next.js, Node.js, Express, FastAPI\\\\
\\textbf{Infrastructure:} AWS (EC2, S3, Lambda), Docker, Kubernetes, Terraform\\\\
\\textbf{Databases:} PostgreSQL, Redis, MongoDB, DynamoDB

\\section*{Experience}

\\textbf{Senior Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Tech Corp, San Francisco, CA}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\item Established a structured mentorship program for junior engineers, conducting weekly technical design reviews and pair programming sessions that resulted in 3 promotions to senior within 18 months and a 25\\% improvement in team velocity
\\end{itemize}

\\vspace{4pt}

\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{StartupXYZ, Remote}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\section*{Projects}

\\textbf{E-Commerce Platform} \\hfill \\textit{2023}\\\\
\\textit{React, Node.js, PostgreSQL, Stripe}
\\begin{itemize}
\\item Developed a full-stack e-commerce platform with React and Node.js handling 10K+ daily transactions, implementing real-time inventory synchronization, Stripe payment integration, and an event sourcing pattern achieving 99.9\\% data consistency
\\item Implemented a recommendation engine using collaborative filtering and content-based algorithms, increasing average order value by 18\\% and reducing cart abandonment rate by 12\\% through personalized product suggestions
\\end{itemize}

\\section*{Education}

\\textbf{B.S. Computer Science} \\hfill \\textit{2015 -- 2019}\\\\
\\textit{University of Technology} --- GPA: 3.8/4.0

\\end{document}

CRITICAL FORMATTING RULES:
- Centered dot ($\\cdot$) separators in contact line
- Skills: grouped by category, NOT bullets — use bold label: values format
- NO colors, NO xcolor
- Generous spacing (12pt before sections)
- titlesec with \\titlerule for clean section dividers
- Must compile with pdflatex`,

  },

  // 6. Balanced Professional LaTeX Resume

  // ── Additional LaTeX Templates (7-16) ────────────────────────────────────────

  // 7. Academic LaTeX Resume
  {
    id: 'latex-academic',
    name: 'Academic Format',
    category: 'academic',
    description: 'Clean academic resume optimized for research positions and publications',
    preview: 'ATS-friendly academic LaTeX resume with research focus and clean typography',
    format: 'latex',
    styleGuide: `ACADEMIC FORMAT — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean, ATS-optimized academic resume.

RULES:
- Single-column layout ONLY. No sidebars.
- NO colors except black and dark gray. No blue, no accents.
- NO decorative elements. Clean academic formatting.
- Sections: Header → Summary → Education → Experience → Projects → Skills → Publications → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- Skills as comma-separated inline text, NOT bullet points.
- If a section has no data, OMIT it entirely (no empty headings).
- Render ALL user-provided data without truncation.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.8in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{palatino}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[4pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{8pt}

\\section*{SUMMARY}
Research-focused engineer with expertise in distributed systems, machine learning, and computational methods. Published in peer-reviewed venues with a focus on scalable computing and efficient algorithms. Combines academic rigor with practical engineering experience.

\\section*{EDUCATION}

\\textbf{Ph.D. in Computer Science} \\hfill \\textit{2016 -- 2020}\\\\
\\textit{Stanford University, Stanford, CA}\\\\
Dissertation: "Scalable Distributed Training for Deep Neural Networks"\\\\
GPA: 3.95/4.0

\\vspace{0.15cm}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2012 -- 2016}\\\\
\\textit{MIT, Cambridge, MA}\\\\
Summa Cum Laude, GPA: 3.92/4.0

\\section*{EXPERIENCE}

\\textbf{Senior Research Engineer} \\hfill \\textit{2020 -- Present}\\\\
\\textit{Google Research, Mountain View, CA}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Neural Architecture Search Platform} \\hfill \\textit{2023}\\\\
\\textit{Python, PyTorch, Kubernetes}
\\begin{itemize}
\\item Built an automated feature engineering tool using Python and Scikit-learn that reduced model development time from weeks to hours, supporting automated feature selection, hyperparameter tuning, and cross-validation across 20+ ML algorithms
\\end{itemize}

\\section*{SKILLS}
Python, PyTorch, TensorFlow, C++, CUDA, Kubernetes, Docker, GCP, Distributed Systems, Machine Learning, NLP, Computer Vision

\\section*{PUBLICATIONS}
\\begin{itemize}
\\item Author, A., \\& Author, B. (2023). "Efficient Distributed Training at Scale." \\textit{NeurIPS}, pp. 1234--1245.
\\item Author, A., et al. (2022). "Scalable Neural Architecture Search." \\textit{ICML}, pp. 567--578.
\\end{itemize}

\\section*{CERTIFICATIONS}

\\textbf{Google Cloud Professional ML Engineer} \\hfill \\textit{2022}\\\\
\\textit{Google Cloud}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info: "email | phone | location" centered (use pipe separator |)
- Section headings: Bold uppercase with horizontal rule below
- Education: Degree bold with dates right-aligned, institution italic below
- Experience: Title bold with dates right-aligned, company italic below
- Publications: Standard academic citation format
- Skills: Comma-separated single line
- Each bullet MUST be 2-4 lines with action verb + measurable impact`,

  },

  // 8. Executive LaTeX Resume
  {
    id: 'latex-executive',
    name: 'Executive Format',
    category: 'executive',
    description: 'Senior-level resume emphasizing leadership and strategic impact',
    preview: 'ATS-friendly executive LaTeX resume for C-level and senior leadership positions',
    format: 'latex',
    styleGuide: `EXECUTIVE FORMAT — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean, ATS-optimized executive resume.

RULES:
- Single-column layout ONLY. No sidebars.
- NO colors except black and dark gray.
- NO decorative elements.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- Skills as comma-separated inline text, NOT bullet points.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.85in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{mathptmx}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{6pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[6pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{10pt}

\\section*{SUMMARY}
Seasoned technology executive with 15+ years leading engineering organizations of 200+ engineers across multiple geographies. Track record of delivering platform transformations, building high-performance teams, and driving technical strategy aligned with business objectives.

\\section*{EXPERIENCE}

\\textbf{VP of Engineering} \\hfill \\textit{2020 -- Present}\\\\
\\textit{Tech Corp, San Francisco, CA}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\vspace{0.15cm}

\\textbf{Senior Director of Engineering} \\hfill \\textit{2017 -- 2020}\\\\
\\textit{Enterprise Solutions Inc., Seattle, WA}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Platform Modernization Initiative} \\hfill \\textit{2022}
\\begin{itemize}
\\item Designed an open-source distributed task scheduler supporting cron-based and event-driven workflows, handling 1M+ daily job executions with automatic retry logic, dead letter queues, and a web-based monitoring dashboard
\\end{itemize}

\\section*{SKILLS}
Strategic Planning, Team Leadership, P\\&L Management, Cloud Architecture, Agile/Scrum, Stakeholder Management, System Design, AWS, GCP, Kubernetes

\\section*{EDUCATION}

\\textbf{MBA} \\hfill \\textit{2015}\\\\
\\textit{Harvard Business School, Boston, MA}

\\vspace{0.15cm}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2008}\\\\
\\textit{MIT, Cambridge, MA}

\\section*{CERTIFICATIONS}

\\textbf{AWS Solutions Architect Professional} \\hfill \\textit{2021}\\\\
\\textit{Amazon Web Services}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info: "email | phone | location" (use pipe separator |)
- Summary: 3-4 lines highlighting leadership scope, revenue impact, team size
- Experience: Focus on leadership scope, business outcomes, and measurable impact
- Each bullet MUST be 2-4 lines with action verb + quantified results
- Skills: Comma-separated on one line`,

  },

  // 9. Modern Two-Column LaTeX Resume

  // 10. Compact Two-Column LaTeX Resume

  // 11. Elegant LaTeX Resume

  // 12. Technical LaTeX Resume
  {
    id: 'latex-technical',
    name: 'Technical Focus',
    category: 'professional',
    description: 'Tech-focused layout emphasizing technical skills and engineering depth',
    preview: 'ATS-friendly technical LaTeX resume highlighting engineering expertise',
    format: 'latex',
    styleGuide: `TECHNICAL FOCUS — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a tech-focused, ATS-optimized resume.

RULES:
- Single-column layout ONLY. No sidebars.
- NO colors. Pure black text only.
- Skills grouped by category using bold labels.
- Sections: Header → Summary → Skills → Experience → Projects → Education → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.65in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=12pt,itemsep=0pt,topsep=1pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\large\\textbf{NAME}}\\\\[3pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location\\ \\textbar\\ github.com/username}

\\vspace{6pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{TECHNICAL SKILLS}
\\textbf{Languages:} C++, Rust, Go, Python, Java\\\\
\\textbf{Frameworks:} gRPC, Tokio, Spring Boot, FastAPI\\\\
\\textbf{Infrastructure:} Kubernetes, Docker, Terraform, AWS, GCP\\\\
\\textbf{Databases:} PostgreSQL, Redis, Cassandra, DynamoDB

\\section*{EXPERIENCE}

\\textbf{Staff Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Netflix, Los Gatos, CA}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\vspace{0.15cm}

\\textbf{Senior Software Engineer} \\hfill \\textit{2018 -- 2021}\\\\
\\textit{Uber, San Francisco, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Open-Source Database Engine} \\hfill \\textit{2023}\\\\
\\textit{Rust, B+ Trees, WAL, MVCC}
\\begin{itemize}
\\item Built an automated feature engineering tool using Python and Scikit-learn that reduced model development time from weeks to hours, supporting automated feature selection, hyperparameter tuning, and cross-validation across 20+ ML algorithms
\\end{itemize}

\\section*{EDUCATION}

\\textbf{M.S. in Computer Science} \\hfill \\textit{2018}\\\\
\\textit{University of Washington, Seattle, WA}

\\section*{CERTIFICATIONS}

\\textbf{Certified Kubernetes Administrator (CKA)} \\hfill \\textit{2022}\\\\
\\textit{Cloud Native Computing Foundation}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info: "email | phone | location | github" (use pipe separator |), left-aligned
- Skills: Grouped by category with bold labels, comma-separated values
- Each bullet MUST be 2-4 lines with action verb + measurable impact
- Technical depth in descriptions — mention specific technologies and metrics`,

  },

  // 13. Simple Clean LaTeX Resume

  // 14. Professional Summary LaTeX Resume

  // 15. Modern Minimal LaTeX Resume

  // 16. Comprehensive LaTeX Resume

  // ── Additional HTML Templates (9-18) ────────────────────────────────────────

  // 9. Elegant Professional HTML Resume
  {
    id: 'html-elegant-professional',
    name: 'Elegant Professional',
    category: 'professional',
    description: 'Sophisticated serif layout with refined typography',
    preview: 'ATS-friendly elegant HTML resume with refined professional styling',
    format: 'html',
    styleGuide: `ELEGANT PROFESSIONAL — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean, ATS-optimized elegant professional resume.

RULES:
- TWO-COLUMN sidebar layout. Left sidebar for Skills, Education, Certifications. Right main for Summary, Experience, Projects.
- Header spans full width above both columns.
- Uses CSS Grid with <aside> and <main> HTML5 elements.
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;background:#fff;display:grid;grid-template-columns:210px 1fr;grid-template-rows:auto 1fr}
header{grid-column:1/-1;padding:28px 36px 16px;border-bottom:1px solid #c0bdb5}
h1{font-size:22px;font-weight:700;color:#2a2a20;margin-bottom:3px}
.contact{font-size:10px;color:#666}
aside{background:#f5f5f0;padding:20px 20px;border-right:1px solid #e0ddd5}
aside h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#4a4a3a;margin:16px 0 6px}
aside h2:first-child{margin-top:0}
aside ul{list-style:none;padding:0}
aside li{font-size:10px;color:#333;padding:2px 0;line-height:1.4}
aside .entry{margin-bottom:10px}
aside .entry-title{font-size:10px;font-weight:600;color:#333}
aside .entry-sub{font-size:9.5px;color:#777}
main{padding:20px 28px}
main h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#2a2a20;border-bottom:1px solid #c0bdb5;padding-bottom:3px;margin:16px 0 8px}
main h2:first-child{margin-top:0}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:16px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
.skills-text{font-size:10px;color:#333;line-height:1.5}
@media print{.resume{margin:0;box-shadow:none}aside{background:#f5f5f0 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="resume">
<header>
    <h1>NAME</h1>
    <div class="contact">email | phone | location</div>
</header>
<aside>
    <h2>Skills</h2>
<p class="skills-text">JavaScript, TypeScript, React, Node.js, Python, Go, PostgreSQL, Redis, AWS, Docker, Kubernetes, CI/CD</p>
    <h2>Education</h2>
<div class="entry"><div class="entry-title">B.S. Computer Science</div><div class="entry-sub">Stanford University, 2015 – 2019</div></div>
<h2>Certifications</h2>
<div class="entry"><div class="entry-title">AWS Solutions Architect (2023)</div></div>
</aside>
<main>
<h2>Summary</h2>
<p>Full-stack engineer with 6+ years building scalable distributed systems serving millions of users. Led cross-functional teams at Google delivering platform improvements that reduced deployment time by 60% and infrastructure costs by 35%.</p>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Google, Mountain View, CA</div><ul><li>Architected microservices platform reducing deployment time by 60% across 12 teams, implementing automated canary deployments and distributed tracing that improved incident response from 4 hours to 15 minutes</li><li>Led monolith-to-microservices migration serving 5M+ DAU with 99.99% uptime and 35% infrastructure cost reduction using Kafka and gRPC event-driven patterns</li><li>Mentored 8 junior engineers through weekly design reviews, resulting in 3 promotions to senior within 18 months</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Stripe, San Francisco, CA</div><ul><li>Built payment processing pipeline handling $2B+ annual volume with idempotent retry mechanisms achieving 99.99% reliability</li><li>Reduced API response latency by 45% through query optimization and intelligent caching strategies</li></ul></div>
    <h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Real-Time Analytics Dashboard</span><span class="entry-date">2023</span></div><div class="entry-sub">React, D3.js, WebSocket, PostgreSQL</div><ul><li>Built streaming platform processing 50K+ events/sec with sub-second visualization, reducing product team decision-making time by 40%</li></ul></div>
</main>
</div></body></html>

CRITICAL FORMATTING RULES:
- CSS Grid: 210px sidebar + 1fr main
- Sidebar: #f5f5f0 background, contains Skills + Education + Certifications
- Main: white background, contains Summary + Experience + Projects
- Header spans full width
- Skills displayed as list items in sidebar
- Font: Georgia`,

  },

  // 10. Modern Gradient HTML Resume

  // 11. Bold Creative HTML Resume
  {
    id: 'html-bold-creative',
    name: 'Bold Professional',
    category: 'creative',
    description: 'Bold typography with strong visual hierarchy',
    preview: 'ATS-friendly bold HTML resume with strong professional typography',
    format: 'html',
    styleGuide: `BOLD PROFESSIONAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- BOLD TYPOGRAPHY layout: Heavy visual hierarchy through font weight and size.
- Large uppercase name. Section headings as dark background strips.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,'Helvetica Neue',sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:38px 44px;background:#fff}
.header{border-bottom:3px solid #000;padding-bottom:12px;margin-bottom:16px}
h1{font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#000;margin-bottom:6px}
.contact{font-size:10px;color:#555}
h2{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#fff;background:#222;padding:5px 12px;margin:18px 0 10px;border-radius:2px}
.entry{margin-bottom:14px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:700;font-size:11px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
@media print{.resume{padding:28px 36px;margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="resume">
<div class="header"><h1>NAME</h1><div class="contact">email | phone | location | portfolio.dev</div></div>
<h2>Summary</h2>
<p>Creative technologist with 5+ years designing and building innovative digital experiences. Combines deep engineering expertise with design thinking to deliver products that delight users and drive business growth.</p>
    <h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Lead Creative Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Apple, Cupertino, CA</div><ul><li>Designed and built interactive product showcase experiences for apple.com receiving 50M+ monthly visits, implementing WebGL animations and scroll-driven storytelling that increased product page engagement by 35%</li><li>Led cross-functional team of 4 engineers and 3 designers delivering spatial computing prototypes for visionOS, from concept to App Store launch in 6 months</li><li>Established creative engineering guild hosting monthly tech talks and workshops, growing community from 10 to 60+ members across 4 offices</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Frontend Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Spotify, New York, NY</div><ul><li>Built Spotify Wrapped 2020 experience reaching 90M+ users in first week, implementing dynamic animation system and personalized data visualization pipeline</li><li>Developed canvas-based playlist cover generator used to create 10M+ custom covers, integrating with Spotify's design system and API</li></ul></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Generative Art Engine</span><span class="entry-date">2023</span></div><div class="entry-sub">WebGL, GLSL, Three.js</div><ul><li>Created algorithmic art platform generating unique compositions from audio input, exhibited at 3 digital art galleries with 5K+ generated pieces</li></ul></div>
    <h2>Skills</h2>
<p class="skills-text">React, TypeScript, Three.js, WebGL, GLSL, Canvas API, Figma, After Effects, Swift, SwiftUI, Node.js, Python</p>
    <h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.F.A. Design & Technology</span><span class="entry-date">2015 – 2019</span></div><div class="entry-sub">Parsons School of Design</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Bold: 26px uppercase name with heavy weight
- Section headings: white text on dark background strip (#222)
- Strong visual contrast between hierarchy levels
- Skills: comma-separated inline text
- Font: Arial`,

  },

  // 12. Corporate Executive HTML Resume

  // 13. Tech Startup HTML Resume
  {
    id: 'html-tech-startup',
    name: 'Tech Startup',
    category: 'modern',
    description: 'Tech-focused layout emphasizing technical skills and GitHub profile',
    preview: 'ATS-friendly tech-focused HTML resume for startup and engineering roles',
    format: 'html',
    styleGuide: `TECH STARTUP — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column with TIMELINE layout for experience entries.
- Experience entries have vertical timeline line on left with dot markers.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:38px 44px;background:#fff}
h1{font-size:22px;font-weight:700;color:#111;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:20px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#111;border-bottom:2px solid #111;color:#111;padding-bottom:3px;margin:20px 0 10px}
.timeline{border-left:2px solid #0ea5e9;margin-left:6px;padding-left:18px}
.entry{margin-bottom:16px;position:relative}
.entry::before{content:'';position:absolute;left:-23px;top:6px;width:8px;height:8px;background:#0ea5e9;border-radius:50%;border:2px solid #fff}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.6;color:#1a1a1a}
.projects .entry{margin-bottom:12px}
.projects .entry::before{display:none}
@media print{.resume{padding:28px 36px;margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="resume">
    <h1>NAME</h1>
<div class="contact">email | phone | location</div>
<h2>Summary</h2>
<p>Mobile and frontend engineer with 5+ years building cross-platform applications reaching millions of users. Expert in React Native, Swift, and modern JavaScript. Passionate about performance optimization and pixel-perfect UI implementation.</p>
    <h2>Experience</h2>
<div class="timeline">
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Mobile Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Airbnb, San Francisco, CA</div><ul><li>Led mobile team of 6 rebuilding guest experience app used by 150M+ users globally, implementing offline-first architecture that reduced user-reported errors by 65% and increased session duration by 25%</li><li>Improved app launch time by 40% through lazy module loading, image optimization pipeline, and tree-shaking, achieving sub-2-second cold start on 90th percentile devices</li><li>Implemented A/B testing framework enabling product teams to run 50+ concurrent experiments with real-time metric dashboards</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Mobile Developer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Spotify, Stockholm, Sweden</div><ul><li>Built audio streaming features handling 100M+ daily playback sessions, implementing gapless playback and crossfade with sub-10ms latency transitions</li><li>Reduced crash rate from 2.5% to 0.3% through systematic crash analysis, memory leak detection, and automated regression testing across 200+ device configurations</li></ul></div>
</div>
    <h2>Projects</h2>
<div class="projects">
<div class="entry"><div class="entry-header"><span class="entry-title">Cross-Platform UI Kit</span><span class="entry-date">2023</span></div><div class="entry-sub">React Native, TypeScript</div><ul><li>Created open-source component library with 2K+ GitHub stars, 100+ weekly npm downloads, and comprehensive Storybook documentation</li></ul></div>
  </div>
<h2>Skills</h2>
<p class="skills-text">React Native, Swift, Kotlin, TypeScript, iOS, Android, Firebase, GraphQL, CI/CD, App Store Optimization</p>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.S. Computer Science</span><span class="entry-date">2015 – 2019</span></div><div class="entry-sub">University of Michigan</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Timeline: 2px vertical line on left of experience entries
- Dot markers (8px circles) at start of each entry
- Section headings: uppercase with thick dark rule
- Skills: comma-separated inline text
- Font: System UI`,

  },

  // 14. Clean Minimal HTML Resume

  // 15. Professional Blue HTML Resume

  // 16. Modern Card HTML Resume
  {
    id: 'html-modern-card',
    name: 'Modern Sectioned',
    category: 'modern',
    description: 'Clean sectioned layout with clear visual separation between areas',
    preview: 'ATS-friendly modern HTML resume with clean section separation',
    format: 'html',
    styleGuide: `MODERN SECTIONED — FAANG-LEVEL ATS TEMPLATE

RULES:
- BOXED SECTIONS layout: Each section in a subtle bordered box.
- Section headings inside shaded header strips within boxes.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:36px 40px;background:#fff}
h1{font-size:22px;font-weight:700;color:#111;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:18px}
h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#333;background:#f9fafb;border:1px solid #e5e5e5;border-radius:4px;padding:7px 14px;margin:16px 0 10px}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
@media print{.resume{padding:28px 36px;margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="resume">
    <h1>NAME</h1>
    <div class="contact">email | phone | location</div>
<h2>Summary</h2>
<p>Data engineer with 5+ years building large-scale data pipelines and analytics platforms. Expert in Spark, Airflow, and cloud data warehouses. Delivered infrastructure processing 10TB+ daily across 500+ data sources.</p>
    <h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Data Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Uber, San Francisco, CA</div><ul><li>Designed real-time data pipeline processing 10TB+ daily from 500+ data sources using Spark Streaming and Kafka, enabling sub-minute data freshness for pricing and surge algorithms serving 130M+ monthly riders</li><li>Built data quality framework with automated anomaly detection catching 95% of data issues before downstream consumption, reducing data incident tickets by 70%</li><li>Led migration from on-premise Hadoop to cloud-native architecture on GCP, reducing data processing costs by 45% and improving job completion rates from 92% to 99.5%</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Data Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Airbnb, San Francisco, CA</div><ul><li>Built ETL pipelines processing booking and pricing data for 7M+ listings, implementing incremental processing that reduced daily pipeline runtime from 8 hours to 45 minutes</li><li>Developed self-serve analytics platform enabling 200+ analysts to query data warehouse without SQL knowledge, reducing ad-hoc request backlog by 60%</li></ul></div>
    <h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Real-Time Feature Store</span><span class="entry-date">2023</span></div><div class="entry-sub">Python, Redis, Kafka, Kubernetes</div><ul><li>Built feature serving platform with sub-10ms p99 latency supporting 50+ ML models in production with automated feature freshness monitoring</li></ul></div>
<h2>Skills</h2>
<p class="skills-text">Python, Scala, SQL, Spark, Airflow, Kafka, Flink, BigQuery, Snowflake, dbt, AWS, GCP, Docker, Kubernetes, Terraform</p>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">M.S. Data Science</span><span class="entry-date">2017 – 2019</span></div><div class="entry-sub">Carnegie Mellon University</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Section headings styled as bordered/shaded pill strips (background #f9fafb, border #e5e5e5, rounded)
- Visual boxed-section feel via CSS only — NO wrapper divs around sections
- Clean separation between sections via heading strips
- Skills: comma-separated inline text
- Font: System UI`,

  },

  // 17. Academic Research HTML Resume
  {
    id: 'html-academic-research',
    name: 'Academic Research',
    category: 'academic',
    description: 'Academic CV format for research and faculty positions',
    preview: 'ATS-friendly academic HTML resume optimized for research and faculty positions',
    format: 'html',
    styleGuide: `ACADEMIC RESEARCH — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column layout. Left-aligned header. Black border-bottom section headings.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:42px 48px;background:#fff}
h1{font-size:20px;font-weight:700;color:#000;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:18px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #555;color:#000;padding-bottom:3px;margin:18px 0 8px;color:#000}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.6;color:#1a1a1a}
@media print{.resume{padding:28px 36px;margin:0}}
</style></head><body><div class="resume">
    <h1>NAME</h1>
    <div class="contact">email | phone | location</div>
<h2>Summary</h2>
<p>Full-stack engineer with 6+ years building scalable distributed systems. Led platform migration serving 5M+ daily active users. Expert in React, Node.js, and cloud-native architecture with proven track record of reducing latency by 40%.</p>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Google, Mountain View, CA</div><ul><li>Architected microservices platform reducing deployment time by 60% across 12 engineering teams, implementing automated canary deployments and distributed tracing that improved incident response from 4 hours to 15 minutes</li><li>Led monolith-to-microservices migration serving 5M+ DAU with 99.99% uptime, reducing infrastructure costs by 35% through event-driven architecture using Kafka and gRPC</li><li>Mentored 8 junior engineers through structured design reviews and pair programming, resulting in 3 promotions to senior within 18 months and 25% improvement in team velocity</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Stripe, San Francisco, CA</div><ul><li>Built payment processing pipeline handling $2B+ annual transaction volume with idempotent retry mechanisms achieving 99.99% reliability and zero data loss during peak traffic periods</li><li>Reduced API response latency by 45% through systematic query optimization, materialized views, and intelligent caching that improved throughput capacity by 3x</li></ul></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Real-Time Analytics Dashboard</span><span class="entry-date">2023</span></div><div class="entry-sub">React, D3.js, WebSocket, PostgreSQL</div><ul><li>Built streaming analytics platform processing 50K+ events/sec with sub-second visualization, reducing product team decision-making time by 40%</li><li>Implemented role-based access control and exportable reports supporting CSV, PDF, and Slack integrations for 500+ enterprise users</li></ul></div>
<h2>Skills</h2>
<p class="skills-text">JavaScript, TypeScript, React, Node.js, Python, Go, PostgreSQL, Redis, AWS, Docker, Kubernetes, CI/CD</p>
  <h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.S. Computer Science</span><span class="entry-date">2015 – 2019</span></div><div class="entry-sub">Stanford University</div></div>
<h2>Certifications</h2>
<div class="entry"><div class="entry-title">AWS Solutions Architect Professional (2023)</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Left-aligned header with name (20px) and contact below
- Section headings: uppercase, border-bottom:1px solid #555;color:#000
- Entry: title left + date right (flex space-between), subtitle below
- Skills: comma-separated inline text
- Font: Georgia`,

  },

  // 18. Contemporary Design HTML Resume
  {
    id: 'html-contemporary-design',
    name: 'Contemporary Design',
    category: 'modern',
    description: 'Contemporary layout with accent line section markers',
    preview: 'ATS-friendly contemporary HTML resume with accent line headings',
    format: 'html',
    styleGuide: `CONTEMPORARY DESIGN — FAANG-LEVEL ATS TEMPLATE

RULES:
- SPACIOUS MODERN single-column layout. Generous whitespace for easy scanning.
- Large section gaps (28px+). Ample padding. Modern, airy feel.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1a1a1a;font-size:11px;line-height:1.65}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:50px 54px;background:#fff}
h1{font-size:28px;font-weight:600;color:#111;margin-bottom:6px;}
.contact{font-size:11px;color:#666;margin-bottom:28px;}
h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#333;border-bottom:1px solid #ddd;padding-bottom:6px;margin:28px 0 12px}
h2:first-of-type{margin-top:0}
.entry{margin-bottom:18px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px}
.entry-title{font-weight:600;font-size:11px;color:#000}
.entry-date{font-size:10.5px;color:#666;white-space:nowrap}
.entry-sub{font-size:10.5px;color:#666;margin-bottom:6px}
ul{padding-left:18px;margin:6px 0 0}li{margin-bottom:4px;font-size:11px;line-height:1.6;color:#2a2a2a}
.skills-text{font-size:11px;color:#2a2a2a;line-height:1.7}
p{font-size:11px;line-height:1.65;color:#2a2a2a}
@media print{.resume{padding:36px 44px;margin:0}}
</style></head><body><div class="resume">
    <h1>NAME</h1>
    <div class="contact">email | phone | location</div>
<h2>Summary</h2>
<p>Product-minded engineer with 6+ years building user-facing applications at scale. Passionate about clean code, accessibility, and creating delightful user experiences. Led frontend team delivering features used by 10M+ monthly active users.</p>
    <h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Frontend Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Figma, San Francisco, CA</div><ul><li>Led redesign of core editor experience used by 5M+ designers, implementing virtualized canvas rendering that improved frame rate from 30fps to 60fps on complex documents with 1000+ layers</li><li>Built collaborative editing features using CRDTs enabling real-time co-design sessions with sub-50ms cursor synchronization across 100+ concurrent users</li><li>Established frontend performance monitoring dashboard reducing p95 page load from 3.2s to 1.1s through systematic bundle analysis and lazy loading</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Frontend Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Vercel, Remote</div><ul><li>Developed Next.js deployment dashboard serving 200K+ developers, implementing real-time log streaming and build analytics that reduced debugging time by 50%</li><li>Built accessible component library achieving WCAG 2.1 AA compliance, used across 15 internal applications serving 500K+ monthly users</li></ul></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Design System Framework</span><span class="entry-date">2023</span></div><div class="entry-sub">React, TypeScript, Storybook</div><ul><li>Created open-source design system with 3K+ GitHub stars, 50+ components, and automated visual regression testing via Chromatic CI pipeline</li></ul></div>
<h2>Skills</h2>
<p class="skills-text">React, TypeScript, Next.js, Vue.js, CSS/SCSS, WebGL, Node.js, GraphQL, Figma, Accessibility, Performance Optimization</p>
    <h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.A. Computer Science</span><span class="entry-date">2015 – 2019</span></div><div class="entry-sub">University of California, Berkeley</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Spacious: generous padding (50px 54px), 28px+ section gaps
- Large name (28px), comfortable reading font size
- Section headings: uppercase with light border, generous spacing
- Breathing room between every element
- Skills: comma-separated inline text
- Font: System UI`,

  },

  // ── Additional HTML Templates (19-25) ────────────────────────────────────────

  // 19. Corporate Formal HTML Resume
  {
    id: 'html-corporate-blue',
    name: 'Corporate Formal',
    category: 'professional',
    description: 'Formal corporate layout with dark navy accent on headings',
    preview: 'ATS-friendly formal corporate HTML resume with navy heading accents',
    format: 'html',
    styleGuide: `CORPORATE FORMAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- TWO-COLUMN sidebar layout. Left sidebar for Skills, Education, Certifications. Right main for Summary, Experience, Projects.
- Header spans full width above both columns.
- Uses CSS Grid with <aside> and <main> HTML5 elements.
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;background:#fff;display:grid;grid-template-columns:225px 1fr;grid-template-rows:auto 1fr}
header{grid-column:1/-1;padding:28px 38px 16px;border-bottom:2px solid #1e3a5f}
h1{font-size:22px;font-weight:700;color:#1e3a5f;margin-bottom:3px}
.contact{font-size:10px;color:#555}
aside{background:#eef2f7;padding:20px 22px;border-right:1px solid #d0daea}
aside h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1e3a5f;margin:16px 0 6px}
aside h2:first-child{margin-top:0}
aside ul{list-style:none;padding:0}
aside li{font-size:10px;color:#1a1a1a;padding:2px 0;line-height:1.4}
aside .entry{margin-bottom:10px}
aside .entry-title{font-size:10px;font-weight:600;color:#1a1a1a}
aside .entry-sub{font-size:9.5px;color:#555}
main{padding:20px 30px}
main h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1e3a5f;border-bottom:1px solid #d0daea;padding-bottom:3px;margin:16px 0 8px}
main h2:first-child{margin-top:0}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:16px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
.skills-text{font-size:10px;color:#1a1a1a;line-height:1.5}
@media print{.resume{margin:0;box-shadow:none}aside{background:#eef2f7 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="resume">
<header>
    <h1>NAME</h1>
    <div class="contact">email | phone | location</div>
</header>
<aside>
    <h2>Skills</h2>
<p class="skills-text">JavaScript, TypeScript, React, Node.js, Python, Go, PostgreSQL, Redis, AWS, Docker, Kubernetes, CI/CD</p>
<h2>Education</h2>
<div class="entry"><div class="entry-title">B.S. Computer Science</div><div class="entry-sub">Stanford University, 2015 – 2019</div></div>
<h2>Certifications</h2>
<div class="entry"><div class="entry-title">AWS Solutions Architect (2023)</div></div>
</aside>
<main>
<h2>Summary</h2>
<p>Full-stack engineer with 6+ years building scalable distributed systems serving millions of users. Led cross-functional teams at Google delivering platform improvements that reduced deployment time by 60% and infrastructure costs by 35%.</p>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Google, Mountain View, CA</div><ul><li>Architected microservices platform reducing deployment time by 60% across 12 teams, implementing automated canary deployments and distributed tracing that improved incident response from 4 hours to 15 minutes</li><li>Led monolith-to-microservices migration serving 5M+ DAU with 99.99% uptime and 35% infrastructure cost reduction using Kafka and gRPC event-driven patterns</li><li>Mentored 8 junior engineers through weekly design reviews, resulting in 3 promotions to senior within 18 months</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Stripe, San Francisco, CA</div><ul><li>Built payment processing pipeline handling $2B+ annual volume with idempotent retry mechanisms achieving 99.99% reliability</li><li>Reduced API response latency by 45% through query optimization and intelligent caching strategies</li></ul></div>
    <h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Real-Time Analytics Dashboard</span><span class="entry-date">2023</span></div><div class="entry-sub">React, D3.js, WebSocket, PostgreSQL</div><ul><li>Built streaming platform processing 50K+ events/sec with sub-second visualization, reducing product team decision-making time by 40%</li></ul></div>
</main>
</div></body></html>

CRITICAL FORMATTING RULES:
- CSS Grid: 225px sidebar + 1fr main
- Sidebar: #eef2f7 background, contains Skills + Education + Certifications
- Main: white background, contains Summary + Experience + Projects
- Header spans full width
- Skills displayed as list items in sidebar
- Font: Segoe UI`,

  },

  // 20. Modern Executive HTML Resume

  // 21. Tech Startup V2 HTML Resume

  // 22. Minimalist Professional HTML Resume

  // 23. Structured Professional HTML Resume

  // 24. Academic CV V2 HTML Resume

  // 25. Professional Accent HTML Resume

  // ── Additional LaTeX Templates (17-25) ────────────────────────────────────────

  // 17. Executive Summary LaTeX Resume

  // 18. Modern Tech LaTeX Resume
  {
    id: 'latex-modern-tech',
    name: 'Modern Tech',
    category: 'modern',
    description: 'Tech-focused LaTeX resume with categorized skills and GitHub link',
    preview: 'ATS-friendly tech-focused LaTeX resume for engineering roles',
    format: 'latex',
    styleGuide: `MODERN TECH — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Left-aligned header with GitHub. Skills categorized.
- Sections: Header → Summary → Technical Skills → Experience → Projects → Education
- Each bullet: action verb + technical detail + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=12pt,itemsep=0pt,topsep=1pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\large\\textbf{NAME}}\\\\[3pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location\\ \\textbar\\ github.com/username}

\\vspace{8pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{TECHNICAL SKILLS}
\\textbf{Languages:} C++, Rust, Go, Python, Java\\\\
\\textbf{Infrastructure:} Kubernetes, Docker, Terraform, AWS, GCP\\\\
\\textbf{Databases:} PostgreSQL, Redis, Cassandra, DynamoDB

\\section*{EXPERIENCE}

\\textbf{Staff Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Netflix, Los Gatos, CA}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Senior Software Engineer} \\hfill \\textit{2018 -- 2021}\\\\
\\textit{Uber, San Francisco, CA}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Open-Source Database Engine} \\hfill \\textit{2023}\\\\
\\textit{Rust, B+ Trees, WAL, MVCC}
\\begin{itemize}
\\item Built an automated feature engineering tool using Python and Scikit-learn that reduced model development time from weeks to hours, supporting automated feature selection, hyperparameter tuning, and cross-validation across 20+ ML algorithms
\\end{itemize}

\\section*{EDUCATION}

\\textbf{M.S. in Computer Science} \\hfill \\textit{2018}\\\\
\\textit{University of Washington, Seattle, WA}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location | github" left-aligned (pipe separator)
- Skills grouped by category with bold labels
- Each bullet: 2-4 lines, action verb + technical detail + measurable impact`,

  },

  // 19. Compact Professional LaTeX Resume

  // 20. Academic Scholar LaTeX Resume

  // 21. Balanced Layout LaTeX Resume (converted to single-column)

  // 22. Modern Minimalist LaTeX Resume

  // 23. Professional Blue LaTeX Resume

  // 24. Creative Professional LaTeX Resume

  // 25. ATS-Optimized LaTeX Resume
  {
    id: 'latex-ats-optimized',
    name: 'ATS-Optimized',
    category: 'professional',
    description: 'Maximum ATS compatibility with standard section names and clean formatting',
    preview: 'Maximum ATS-compatible LaTeX resume with standard structure',
    format: 'latex',
    styleGuide: `ATS-OPTIMIZED — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. NO colors. Standard section names. Maximum ATS compatibility.
- Sections: Header → Summary → Skills → Experience → Projects → Education → Certifications
- Standard ATS-friendly section headings. No fancy formatting.
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.65in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=12pt,itemsep=0pt,topsep=1pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\large\\textbf{NAME}}\\\\[3pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}

\\vspace{6pt}

\\section*{PROFESSIONAL SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{TECHNICAL SKILLS}
\\textbf{Languages:} Java, Go, Python, TypeScript\\\\
\\textbf{Frameworks:} Spring Boot, gRPC, GraphQL, React\\\\
\\textbf{Infrastructure:} AWS, Azure, Kubernetes, Terraform, Kafka\\\\
\\textbf{Practices:} System Design, Event Sourcing, CQRS, DDD, CI/CD

\\section*{PROFESSIONAL EXPERIENCE}

\\textbf{Principal Solutions Architect} \\hfill \\textit{2020 -- Present}\\\\
\\textit{Microsoft, Redmond, WA}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\item Established a structured mentorship program for junior engineers, conducting weekly technical design reviews and pair programming sessions that resulted in 3 promotions to senior within 18 months and a 25\\% improvement in team velocity
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Senior Solutions Architect} \\hfill \\textit{2017 -- 2020}\\\\
\\textit{Confluent, Mountain View, CA}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Event-Driven Microservices Framework} \\hfill \\textit{2023}\\\\
\\textit{Java, Spring Boot, Kafka, Kubernetes}
\\begin{itemize}
\\item Designed an open-source distributed task scheduler supporting cron-based and event-driven workflows, handling 1M+ daily job executions with automatic retry logic, dead letter queues, and a web-based monitoring dashboard
\\end{itemize}

\\section*{EDUCATION}

\\textbf{M.S. in Software Engineering} \\hfill \\textit{2015}\\\\
\\textit{University of Southern California, Los Angeles, CA}

\\section*{CERTIFICATIONS}

\\textbf{Azure Solutions Architect Expert} \\hfill \\textit{2021}

\\textbf{AWS Solutions Architect Professional} \\hfill \\textit{2020}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" first line, "linkedin | portfolio" second line (pipe separator)
- NO colors -- pure black text for maximum ATS compatibility
- Standard section names: Professional Summary, Technical Skills, Professional Experience, Education
- Skills grouped by category with bold labels
- Each bullet: 2-4 lines, action verb + measurable impact`,

  },

  // 26. Blue-Magenta Financial Advisor LaTeX Resume
  {
    id: 'latex-blue-magenta-financial',
    name: 'Blue Magenta Financial',
    category: 'professional',
    description: 'Color-accented financial advisor layout with icon-based contact and bottom ribbon',
    preview: 'Executive-style LaTeX resume with blue/magenta accents, dated experience rail, and split footer sections',
    format: 'latex',
    styleGuide: `BLUE MAGENTA FINANCIAL — SCREENSHOT-MATCHED TEMPLATE

RULES:
- Keep the visual hierarchy: large colored name, icon contact block, magenta section titles, blue employer/role lines.
- Experience uses two mini-columns: left dates and right role/company with bullets.
- Bottom split row: Education (left) and Skills (right), then decorative ribbon.
- Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{xcolor}
\\usepackage{enumitem}

\\geometry{top=0.78in,bottom=0.78in,left=0.78in,right=0.78in}
\\definecolor{bluepurple}{RGB}{102,102,255}
\\definecolor{magenta}{RGB}{204,51,153}
\\definecolor{darkgray}{RGB}{85,85,85}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=0.95em,itemsep=0.12em,topsep=0.08em,parsep=0pt,partopsep=0pt}

\\newcommand{\\resumeSection}[1]{%
  {\\color{magenta}\\fontsize{13}{15}\\selectfont\\bfseries \\MakeUppercase{#1}}\\\\[-1pt]%
  {\\color{magenta}\\rule{0.12\\textwidth}{1.2pt}}\\\\[4pt]
}
\\newcommand{\\resumeSubheading}[3]{\\textbf{\\color{bluepurple}#1}\\hfill{\\small #2}\\\\{\\small #3}}
\\newcommand{\\resumeItem}[1]{\\item #1}

\\begin{document}
{\\color{bluepurple}\\fontsize{23}{26}\\selectfont\\bfseries NAME}\\\\[4pt]
{\\small\\color{darkgray} TITLE}\\\\[4pt]
Phone: PHONE\\quad
Email: EMAIL\\quad
Location: LOCATION\\quad
LinkedIn: LINKEDIN

\\vspace{0.55em}

\\resumeSection{Summary}
SUMMARY

\\vspace{0.45em}
\\resumeSection{Experience}
\\resumeSubheading{Role at Company}{2021 -- Present}{City}
\\begin{itemize}
  \\resumeItem{Impact bullet with measurable result.}
  \\resumeItem{Additional contribution and outcome.}
\\end{itemize}

\\vspace{0.45em}
\\resumeSection{Projects}
\\resumeSubheading{Project Name}{2024}{Tech Stack}
\\begin{itemize}
  \\resumeItem{Project impact and implementation detail.}
\\end{itemize}

\\vspace{0.45em}
\\resumeSection{Education}
\\resumeSubheading{Degree Name}{2018 -- 2022}{Institution}

\\vspace{0.45em}
\\resumeSection{Skills}
\\begin{itemize}
  \\resumeItem{Skill one}
  \\resumeItem{Skill two}
  \\resumeItem{Skill three}
\\end{itemize}
\\end{document}

CRITICAL FORMATTING RULES:
- Keep section titles magenta uppercase and company/role lines blue.
- Maintain date-left / details-right experience alignment.
- Keep bottom ribbon decoration using blue bar + magenta triangle.`,
  },

  // 28. Dwight Modern Sidebar LaTeX Resume
  {
    id: 'latex-dwight-modern-engineer',
    name: 'Dwight Modern Engineer',
    category: 'modern',
    description: 'Modern software engineer layout with icon sections, tabular header, and bold colored section bars',
    preview: 'FiraSans-based LaTeX resume with two-column header contacts and ATS-friendly section structure',
    format: 'latex',
    styleGuide: `DWIGHT MODERN ENGINEER — CLEAN STRUCTURED LATEX

RULES:
- Keep a modern technical look with strong typography and clean section hierarchy.
- Use robust compile-safe packages only.
- Ensure section structure is renderer-friendly so user input replaces sample content in generated output.
- Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.72in]{geometry}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage{tabularx}
\\usepackage{titlesec}
\\usepackage{lmodern}

\\definecolor{ink}{HTML}{0F172A}
\\definecolor{muted}{HTML}{475569}
\\definecolor{accent}{HTML}{1D4ED8}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\pagestyle{empty}
\\setlist[itemize]{leftmargin=12pt,itemsep=2pt,topsep=2pt}
\\titlespacing*{\\section}{0pt}{8pt}{4pt}
\\titleformat{\\section}{\\large\\bfseries\\color{accent}}{}{0pt}{}[\\vspace{-2pt}\\color{accent}\\titlerule]

\\begin{document}

{\\fontsize{26}{30}\\selectfont\\bfseries\\color{ink} NAME}\\\\[3pt]
{\\small\\color{muted} TITLE}\\\\[6pt]
{\\small EMAIL \\textbar\\ PHONE \\textbar\\ LOCATION \\textbar\\ LINKEDIN}\\\\
{\\small GITHUB \\textbar\\ PORTFOLIO}

\\vspace{8pt}

\\section*{Summary}
SUMMARY

\\section*{Experience}
\\textbf{Senior Software Engineer} \\hfill {\\small 2021 -- Present}\\\\
{\\small \\textit{Company, City}}
\\begin{itemize}
  \\item Built and scaled production systems with measurable impact on performance and reliability.
  \\item Led cross-functional execution and improved team delivery quality through strong engineering practices.
\\end{itemize}

\\section*{Projects}
\\textbf{Project Name} \\hfill {\\small 2023}\\\\
{\\small \\textit{Tech Stack}}
\\begin{itemize}
  \\item Delivered project outcomes with clear business or product impact.
\\end{itemize}

\\section*{Skills}
\\textbf{Languages:} JavaScript, TypeScript, Python\\\\
\\textbf{Frameworks:} React, Node.js, Next.js\\\\
\\textbf{Tools:} Git, Docker, PostgreSQL, AWS

\\section*{Education}
\\textbf{B.Tech in Computer Science} \\hfill {\\small 2018 -- 2022}\\\\
{\\small University Name}

\\section*{Certifications}
\\begin{itemize}
  \\item AWS Certified Developer Associate
\\end{itemize}

\\section*{Achievements}
\\begin{itemize}
  \\item Hackathon Winner, 2023
\\end{itemize}

\\end{document}

CRITICAL FORMATTING RULES:
- Name: 24-28pt bold; section headings: 14-16pt; body: 11-12pt equivalent.
- Keep compact yet readable spacing, no overlapping sections.
- Generated output must use user data; preview uses dummy data only.`,
  },

  // 32. Dwight Classic Iconbars LaTeX Resume
  {
    id: 'latex-dwight-classic-iconbars',
    name: 'Dwight Classic Iconbars',
    category: 'modern',
    description: 'Leslie Cheng style software engineer resume with icon section bars and dense two-column header',
    preview: 'Classic iconbar LaTeX resume with compact entries, role/date alignment, and bullet-led impact points',
    format: 'latex',
    styleGuide: `DWIGHT CLASSIC ICONBARS — LATEX TEMPLATE

RULES:
- Keep icon-led section bars and compact engineering resume rhythm.
- Preserve two-column header with social/contact links.
- Use renderer-compatible section headings and placeholders.
- Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[letterpaper,12pt]{article}

\\usepackage[empty]{fullpage}
\\usepackage{enumitem}
\\usepackage{ifxetex}
\\ifxetex
  \\usepackage{fontspec}
  \\usepackage[xetex]{hyperref}
\\else
  \\usepackage[utf8]{inputenc}
  \\usepackage[T1]{fontenc}
  \\usepackage[pdftex]{hyperref}
\\fi
\\usepackage{fontawesome}
\\usepackage[sfdefault,light]{FiraSans}
\\usepackage{anyfontsize}
\\usepackage{xcolor}
\\usepackage{tabularx}

% Header settings
\\def \\fullname {NAME}
\\def \\subtitle {TITLE}

\\def \\linkedinicon {\\faLinkedin}
\\def \\linkedinlink {https://LINKEDIN}
\\def \\linkedintext {LINKEDIN}

\\def \\phoneicon {\\faPhone}
\\def \\phonetext {PHONE}

\\def \\emailicon {\\faEnvelope}
\\def \\emaillink {mailto:EMAIL}
\\def \\emailtext {EMAIL}

\\def \\githubicon {\\faGithub}
\\def \\githublink {https://GITHUB}
\\def \\githubtext {GITHUB}

\\def \\websiteicon {\\faGlobe}
\\def \\websitelink {https://PORTFOLIO}
\\def \\websitetext {PORTFOLIO}

\\def \\headertype {\\doublecol}
\\def \\entryspacing {-0pt}
\\def \\bulletstyle {\\faAngleRight}

\\definecolor{primary}{HTML}{000000}
\\definecolor{secondary}{HTML}{0D47A1}
\\definecolor{accent}{HTML}{263238}
\\definecolor{links}{HTML}{1565C0}

% Defines to make listing easier
\\def \\linkedin {\\linkedinicon \\hspace{3pt}\\href{\\linkedinlink}{\\linkedintext}}
\\def \\phone {\\phoneicon \\hspace{3pt}{ \\phonetext}}
\\def \\email {\\emailicon \\hspace{3pt}\\href{\\emaillink}{\\emailtext}}
\\def \\github {\\githubicon \\hspace{3pt}\\href{\\githublink}{\\githubtext}}
\\def \\website {\\websiteicon \\hspace{3pt}\\href{\\websitelink}{\\websitetext}}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.55in}
\\addtolength{\\evensidemargin}{-0.55in}
\\addtolength{\\textwidth}{1.1in}
\\addtolength{\\topmargin}{-0.6in}
\\addtolength{\\textheight}{1.1in}

% Define link colours
\\hypersetup{
    colorlinks=true,
    urlcolor=links,
}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections
\\renewcommand{\\section}[2]{\\vspace{5pt}
  \\par\\vspace{5pt}\\noindent
  \\colorbox{secondary}{\\color{white}\\raggedbottom\\normalsize\\textbf{{#1}{\\hspace{7pt}#2}}}\\\\[-1pt]
  \\noindent\\vspace{2pt}\\par
}

% Entry start and end, for spacing
\\newcommand{\\resumeEntryStart}{\\begin{itemize}[leftmargin=2.5mm]}
\\newcommand{\\resumeEntryEnd}{\\end{itemize}\\vspace{\\entryspacing}}

% Itemized list for bullet points
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=4.5mm]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}}

% Resume item
\\renewcommand{\\labelitemii}{\\bulletstyle}
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

% Entry with title, subheading, date(s), and location
\\newcommand{\\resumeEntryTSDL}[4]{
  \\vspace{-1pt}\\item[]
    \\begin{tabularx}{0.97\\textwidth}{X@{\\hspace{60pt}}r}
      \\textbf{\\color{primary}#1} & {\\firabook\\color{accent}\\small#2} \\\\
      \\textit{\\color{accent}\\small#3} & \\textit{\\color{accent}\\small#4} \\\\
    \\end{tabularx}\\vspace{-6pt}
}

% Entry with title and date(s)
\\newcommand{\\resumeEntryTD}[2]{
  \\vspace{-1pt}\\item[]
    \\begin{tabularx}{0.97\\textwidth}{X@{\\hspace{60pt}}r}
      \\textbf{\\color{primary}#1} & {\\firabook\\color{accent}\\small#2} \\\\
    \\end{tabularx}\\vspace{-6pt}
}

% Entry for skills
\\newcommand{\\resumeEntryS}[2]{
  \\item[]\\small{
    \\textbf{\\color{primary}#1 }{ #2 \\vspace{-6pt}}
  }
}

% Double column header
\\newcommand{\\doublecol}[6]{
  \\begin{tabularx}{\\textwidth}{Xr}
    {
      \\begin{tabular}[c]{l}
        \\fontsize{35}{45}\\selectfont{\\color{primary}{{\\textbf{\\fullname}}}} \\\\
        {\\textit{\\subtitle}}
      \\end{tabular}
    } & {
      \\begin{tabular}[c]{l@{\\hspace{1.5em}}l}
        {\\small#4} & {\\small#1} \\\\
        {\\small#5} & {\\small#2} \\\\
        {\\small#6} & {\\small#3}
      \\end{tabular}
    }
  \\end{tabularx}
}

\\begin{document}
% Header
\\headertype{\\linkedin}{\\github}{\\website}{\\phone}{\\email}{}
\\vspace{-10pt}

% Summary
\\section{\\faUser}{Summary}
\\resumeEntryStart
  \\resumeEntryTD{SUMMARY}{}
\\resumeEntryEnd

% Education
\\section{\\faGraduationCap}{Education}
\\resumeEntryStart
  \\resumeEntryTSDL
    {Scranton University}{1998 -- 1992}
    {BA Business Administration}{Scranton, PA}
\\resumeEntryEnd

% Experience
\\section{\\faPieChart}{Experience}
\\resumeEntryStart
  \\resumeEntryTSDL
    {Dunder Mifflin}{May 2013 -- Present}
    {Regional Manager}{Scranton, PA}
  \\resumeItemListStart
    \\resumeItem {Maintained the highest sales average with resilient execution in volatile conditions.}
    \\resumeItem {Managed branch operations, cross-team collaboration, and customer satisfaction outcomes.}
    \\resumeItem {Led initiatives that improved measurable business performance and team productivity.}
  \\resumeItemListEnd
\\resumeEntryEnd

\\resumeEntryStart
  \\resumeEntryTSDL
    {Dunder Mifflin}{Mar. 2008 -- Mar. 2013}
    {Assistant (to the) Regional Manager}{Scranton, PA}
  \\resumeItemListStart
    \\resumeItem {Closed high-value sales and consistently exceeded branch targets.}
    \\resumeItem {Enforced process standards and improved team consistency across operations.}
    \\resumeItem {Introduced incentive systems that improved morale and engagement.}
  \\resumeItemListEnd
\\resumeEntryEnd

% Projects
\\section{\\faFlask}{Projects}
\\resumeEntryStart
  \\resumeEntryTD
    {Project Name}{}
  \\resumeItemListStart
    \\resumeItem {Project impact statement with clear business or engineering outcome.}
  \\resumeItemListEnd
\\resumeEntryEnd

% Skills
\\section{\\faGears}{Skills}
\\resumeEntryStart
  \\resumeEntryS{Traits } {Hardworking, Leadership, Strategic Thinking, Execution}
  \\resumeEntryS{Technical } {JavaScript, TypeScript, React, Node.js, SQL, AWS}
\\resumeEntryEnd

\\end{document}

CRITICAL FORMATTING RULES:
- Preserve icon-first section bars and compact two-column header.
- Keep role/date/location alignment via tabularx blocks.
- Preview uses dummy data; generated must use user input only.`,
  },

  // 33. Orange Rail Financial LaTeX Resume
  // ── Additional HTML Templates ───────────────────────────────────────────────

  // ── Additional LaTeX Templates ──────────────────────────────────────────────

  // ── New HTML Templates Batch (15) — FAANG-Level ATS Upgrades ──────────────
  {
    id: 'html-zen-columns',
    name: 'Zen Minimal',
    category: 'minimal',
    description: 'Ultra-minimal single-column resume with generous whitespace and zen aesthetics',
    preview: 'ATS-friendly ultra-minimal resume with clean spacing',
    format: 'html',
    styleGuide: `ZEN MINIMAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- SPACIOUS MODERN single-column layout. Generous whitespace for easy scanning.
- Large section gaps (28px+). Ample padding. Modern, airy feel.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:11px;line-height:1.65}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:50px 50px;background:#fff}
h1{font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:6px;text-align:center}
.contact{font-size:11px;color:#666;margin-bottom:28px;text-align:center}
h2{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#1a1a1a;;margin:28px 0 12px}
h2:first-of-type{margin-top:0}
.entry{margin-bottom:18px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px}
.entry-title{font-weight:600;font-size:11px;color:#000}
.entry-date{font-size:10.5px;color:#666;white-space:nowrap}
.entry-sub{font-size:10.5px;color:#666;margin-bottom:6px}
ul{padding-left:18px;margin:6px 0 0}li{margin-bottom:4px;font-size:11px;line-height:1.6;color:#2a2a2a}
.skills-text{font-size:11px;color:#2a2a2a;line-height:1.7}
p{font-size:11px;line-height:1.65;color:#2a2a2a}
@media print{.resume{padding:36px 44px;margin:0}}
</style></head><body><div class="resume">
<h1>NAME</h1>
<div class="contact">email | phone | location</div>
<h2>Summary</h2>
<p>Product-minded engineer with 6+ years building user-facing applications at scale. Passionate about clean code, accessibility, and creating delightful user experiences. Led frontend team delivering features used by 10M+ monthly active users.</p>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Frontend Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Figma, San Francisco, CA</div><ul><li>Led redesign of core editor experience used by 5M+ designers, implementing virtualized canvas rendering that improved frame rate from 30fps to 60fps on complex documents with 1000+ layers</li><li>Built collaborative editing features using CRDTs enabling real-time co-design sessions with sub-50ms cursor synchronization across 100+ concurrent users</li><li>Established frontend performance monitoring dashboard reducing p95 page load from 3.2s to 1.1s through systematic bundle analysis and lazy loading</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Frontend Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Vercel, Remote</div><ul><li>Developed Next.js deployment dashboard serving 200K+ developers, implementing real-time log streaming and build analytics that reduced debugging time by 50%</li><li>Built accessible component library achieving WCAG 2.1 AA compliance, used across 15 internal applications serving 500K+ monthly users</li></ul></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Design System Framework</span><span class="entry-date">2023</span></div><div class="entry-sub">React, TypeScript, Storybook</div><ul><li>Created open-source design system with 3K+ GitHub stars, 50+ components, and automated visual regression testing via Chromatic CI pipeline</li></ul></div>
<h2>Skills</h2>
<p class="skills-text">React, TypeScript, Next.js, Vue.js, CSS/SCSS, WebGL, Node.js, GraphQL, Figma, Accessibility, Performance Optimization</p>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.A. Computer Science</span><span class="entry-date">2015 – 2019</span></div><div class="entry-sub">University of California, Berkeley</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Spacious: generous padding (50px 50px), 28px+ section gaps
- Large name (22px), comfortable reading font size
- Section headings: centered header, zen-like section spacing
- Breathing room between every element
- Skills: comma-separated inline text
- Font: Segoe UI`
  },
  {
    id: 'html-metro-skill-ribbon',
    name: 'Metro Skill Ribbon',
    category: 'modern',
    description: 'Modern single-column resume with skills ribbon strip below header',
    preview: 'ATS-friendly modern resume with inline skills ribbon',
    format: 'html',
    styleGuide: `METRO SKILL RIBBON — FAANG-LEVEL ATS TEMPLATE

RULES:
- COMPACT DENSE single-column layout. Tight spacing for maximum content density.
- Base font: 9.5px. Reduced padding and margins throughout.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1a1a1a;font-size:9.5px;line-height:1.4}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:24px 30px;background:#fff}
h1{font-size:19px;font-weight:700;color:#000;margin-bottom:2px}
.contact{font-size:9px;color:#555;margin-bottom:10px}
h2{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#000;border-top:1px solid #000;padding-top:4px;padding-bottom:0;margin:10px 0 4px}
.entry{margin-bottom:8px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px}
.entry-title{font-weight:600;font-size:9.5px;color:#000}
.entry-date{font-size:9px;color:#555;white-space:nowrap}
.entry-sub{font-size:9px;color:#555;margin-bottom:2px}
ul{padding-left:14px;margin:2px 0 0}li{margin-bottom:1px;font-size:9.5px;line-height:1.4;color:#1a1a1a}
.skills-text{font-size:9.5px;color:#1a1a1a;line-height:1.5}
p{font-size:9.5px;line-height:1.45;color:#1a1a1a}
@media print{.resume{padding:20px 28px;margin:0}}
</style></head><body><div class="resume">
<h1>NAME</h1>
<div class="contact">email | phone | location | linkedin.com/in/name | github.com/username</div>
<h2>Summary</h2>
<p>Systems engineer with 7+ years building high-throughput distributed systems. Expert in Go, Rust, and cloud-native architectures. Led teams delivering platforms processing 10B+ requests daily.</p>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Staff Systems Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Cloudflare, Austin, TX</div><ul><li>Designed edge caching layer processing 10B+ requests/day with p99 latency under 5ms, implementing consistent hashing and automatic cache invalidation across 300+ global PoPs</li><li>Optimized DNS resolution pipeline reducing lookup times by 40% for 25M+ domains through parallel query processing and intelligent prefetching</li><li>Led on-call rotation for Tier-1 services, achieving 99.999% uptime over 12 months and reducing mean-time-to-resolution by 60%</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Datadog, New York, NY</div><ul><li>Built metric ingestion pipeline handling 2M+ data points/second with zero data loss using write-ahead logging and partition-level replication</li><li>Implemented automated alerting system with ML-based anomaly detection, reducing false positives by 35% and improving alert accuracy to 95%</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2017 – 2019</span></div><div class="entry-sub">MongoDB, New York, NY</div><ul><li>Developed query optimizer improvements for aggregation pipeline, reducing complex query execution time by 50% across 100K+ production clusters</li></ul></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Distributed Key-Value Store</span><span class="entry-date">2023</span></div><div class="entry-sub">Rust, gRPC, Raft Consensus</div><ul><li>Built fault-tolerant KV store supporting 100K+ ops/second with linearizable consistency and automatic leader election</li></ul></div>
<h2>Skills</h2>
<p class="skills-text">Go, Rust, C++, Python, PostgreSQL, Redis, Kafka, gRPC, Protobuf, Docker, Kubernetes, AWS, Terraform, Linux, Networking</p>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.S. Computer Engineering</span><span class="entry-date">2017</span></div><div class="entry-sub">Georgia Institute of Technology — GPA: 3.9/4.0</div></div>
<h2>Certifications</h2>
<div class="entry"><div class="entry-title">CKA – Certified Kubernetes Administrator (2022)</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Compact: 9.5px base font, tight padding (24px 30px)
- Section headings: compact uppercase with top rule
- Minimal gaps between entries (8px)
- Skills: comma-separated inline text, compact
- Designed to fit maximum content on one page
- Font: System UI`
  },
  {
    id: 'html-inked-journal-layout',
    name: 'Inked Journal',
    category: 'academic',
    description: 'Journal-style academic resume with publication emphasis and clean typography',
    preview: 'ATS-friendly academic resume with journal-style formatting',
    format: 'html',
    styleGuide: `INKED JOURNAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- BOLD TYPOGRAPHY layout: Heavy visual hierarchy through font weight and size.
- Large uppercase name. Section headings as dark background strips.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:40px 46px;background:#fff}
.header{border-bottom:2px solid #000;padding-bottom:14px;margin-bottom:18px}
h1{font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:#1a1a1a;margin-bottom:6px}
.contact{font-size:10px;color:#555}
h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#fff;background:#2a2a2a;padding:6px 12px;margin:18px 0 10px;}
.entry{margin-bottom:14px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:700;font-size:11px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
@media print{.resume{padding:28px 36px;margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="resume">
<div class="header"><h1>NAME</h1><div class="contact">email | phone | location | portfolio.dev</div></div>
<h2>Summary</h2>
<p>Creative technologist with 5+ years designing and building innovative digital experiences. Combines deep engineering expertise with design thinking to deliver products that delight users and drive business growth.</p>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Lead Creative Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Apple, Cupertino, CA</div><ul><li>Designed and built interactive product showcase experiences for apple.com receiving 50M+ monthly visits, implementing WebGL animations and scroll-driven storytelling that increased product page engagement by 35%</li><li>Led cross-functional team of 4 engineers and 3 designers delivering spatial computing prototypes for visionOS, from concept to App Store launch in 6 months</li><li>Established creative engineering guild hosting monthly tech talks and workshops, growing community from 10 to 60+ members across 4 offices</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Frontend Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Spotify, New York, NY</div><ul><li>Built Spotify Wrapped 2020 experience reaching 90M+ users in first week, implementing dynamic animation system and personalized data visualization pipeline</li><li>Developed canvas-based playlist cover generator used to create 10M+ custom covers, integrating with Spotify's design system and API</li></ul></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Generative Art Engine</span><span class="entry-date">2023</span></div><div class="entry-sub">WebGL, GLSL, Three.js</div><ul><li>Created algorithmic art platform generating unique compositions from audio input, exhibited at 3 digital art galleries with 5K+ generated pieces</li></ul></div>
<h2>Skills</h2>
<p class="skills-text">React, TypeScript, Three.js, WebGL, GLSL, Canvas API, Figma, After Effects, Swift, SwiftUI, Node.js, Python</p>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.F.A. Design & Technology</span><span class="entry-date">2015 – 2019</span></div><div class="entry-sub">Parsons School of Design</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Bold: 26px uppercase name with heavy weight
- Section headings: white text on dark background strip (#2a2a2a)
- Strong visual contrast between hierarchy levels
- Skills: comma-separated inline text
- Font: Georgia`
  },
  {
    id: 'html-horizon-balance',
    name: 'Horizon Balance',
    category: 'modern',
    description: 'Balanced modern resume with teal section accents and clean rhythm',
    preview: 'ATS-friendly modern balanced resume with teal accents',
    format: 'html',
    styleGuide: `HORIZON BALANCE — FAANG-LEVEL ATS TEMPLATE

RULES:
- SPACIOUS MODERN single-column layout. Generous whitespace for easy scanning.
- Large section gaps (28px+). Ample padding. Modern, airy feel.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1a1a1a;font-size:11px;line-height:1.65}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:48px 52px;background:#fff}
h1{font-size:26px;font-weight:600;color:#1a1a1a;margin-bottom:6px;}
.contact{font-size:11px;color:#666;margin-bottom:28px;}
h2{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#555;border-left:3px solid #555;padding-left:10px;margin:28px 0 12px}
h2:first-of-type{margin-top:0}
.entry{margin-bottom:18px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px}
.entry-title{font-weight:600;font-size:11px;color:#000}
.entry-date{font-size:10.5px;color:#666;white-space:nowrap}
.entry-sub{font-size:10.5px;color:#666;margin-bottom:6px}
ul{padding-left:18px;margin:6px 0 0}li{margin-bottom:4px;font-size:11px;line-height:1.6;color:#2a2a2a}
.skills-text{font-size:11px;color:#2a2a2a;line-height:1.7}
p{font-size:11px;line-height:1.65;color:#2a2a2a}
@media print{.resume{padding:36px 44px;margin:0}}
</style></head><body><div class="resume">
<h1>NAME</h1>
<div class="contact">email | phone | location</div>
<h2>Summary</h2>
<p>Product-minded engineer with 6+ years building user-facing applications at scale. Passionate about clean code, accessibility, and creating delightful user experiences. Led frontend team delivering features used by 10M+ monthly active users.</p>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Frontend Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Figma, San Francisco, CA</div><ul><li>Led redesign of core editor experience used by 5M+ designers, implementing virtualized canvas rendering that improved frame rate from 30fps to 60fps on complex documents with 1000+ layers</li><li>Built collaborative editing features using CRDTs enabling real-time co-design sessions with sub-50ms cursor synchronization across 100+ concurrent users</li><li>Established frontend performance monitoring dashboard reducing p95 page load from 3.2s to 1.1s through systematic bundle analysis and lazy loading</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Frontend Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Vercel, Remote</div><ul><li>Developed Next.js deployment dashboard serving 200K+ developers, implementing real-time log streaming and build analytics that reduced debugging time by 50%</li><li>Built accessible component library achieving WCAG 2.1 AA compliance, used across 15 internal applications serving 500K+ monthly users</li></ul></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Design System Framework</span><span class="entry-date">2023</span></div><div class="entry-sub">React, TypeScript, Storybook</div><ul><li>Created open-source design system with 3K+ GitHub stars, 50+ components, and automated visual regression testing via Chromatic CI pipeline</li></ul></div>
<h2>Skills</h2>
<p class="skills-text">React, TypeScript, Next.js, Vue.js, CSS/SCSS, WebGL, Node.js, GraphQL, Figma, Accessibility, Performance Optimization</p>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.A. Computer Science</span><span class="entry-date">2015 – 2019</span></div><div class="entry-sub">University of California, Berkeley</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Spacious: generous padding (48px 52px), 28px+ section gaps
- Large name (26px), comfortable reading font size
- Section headings: left-bordered headings with spacious layout
- Breathing room between every element
- Skills: comma-separated inline text
- Font: System UI`
  },

  // ── ATS Pure — Minimal Single-Column (HTML + LaTeX) ──────────────────────
  {
    id: 'ats-pure',
    name: 'ATS Pure',
    category: 'professional',
    description: 'Ultra-minimal single-column, zero decoration — maximum ATS pass rate',
    preview: 'Pure black-and-white single-column resume. Most ATS-friendly, content-first design.',
    format: 'both',
    styleGuide: `ATS PURE — MAXIMUM ATS COMPATIBILITY TEMPLATE

YOU ARE A RESUME ENGINEER. Build the most ATS-friendly, content-focused resume possible.

RULES:
- Single column, zero color, zero icons, zero graphics
- Font: Georgia serif for print-quality readability
- Header: Name (large bold) → Title → contact line (email | phone | LinkedIn | GitHub | location)
- Sections in order: Summary → Experience → Projects → Skills → Education → Certifications
- Skills: GROUPED format — Languages: ..., Frameworks: ..., Tools: ...
- Each bullet: action verb + what was done + measurable impact (2–4 lines each)
- Omit any section that has no data

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,'Times New Roman',Times,serif;background:#fff;color:#111;font-size:10.5px;line-height:1.55}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:42px 50px;background:#fff}
.name{font-size:24px;font-weight:700;letter-spacing:0.3px;color:#000;margin-bottom:3px}
.title{font-size:11px;color:#444;margin-bottom:5px;font-style:italic}
.contact{font-size:10px;color:#444;margin-bottom:22px;border-bottom:1.5px solid #000;padding-bottom:10px}
.contact a{color:#222;text-decoration:none}
h2{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;color:#000;border-bottom:1px solid #555;padding-bottom:2px;margin:18px 0 8px}
.entry{margin-bottom:11px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px}
.entry-title{font-weight:700;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap;font-style:italic}
.entry-sub{font-size:10px;color:#555;margin-bottom:3px}
ul{padding-left:16px;margin:3px 0 0}
li{margin-bottom:3px;font-size:10.5px;line-height:1.55;color:#111;list-style-type:disc}
.skills-group{margin-bottom:4px;font-size:10.5px;line-height:1.55}
.skills-group strong{color:#000;font-weight:700}
.summary{font-size:10.5px;line-height:1.6;color:#111}
@media print{.resume{padding:30px 40px;margin:0}}
</style></head><body><div class="resume">
<div class="name">NAME</div>
<div class="title">TITLE</div>
<div class="contact">EMAIL | PHONE | LINKEDIN | GITHUB | LOCATION</div>
<h2>Summary</h2>
<p class="summary">Results-driven software engineer with 6+ years of experience designing and delivering scalable distributed systems. Proven ability to lead cross-functional teams, reduce system latency by 40%+, and ship high-impact features used by millions of users at FAANG-level companies.</p>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">Jan 2021 – Present</span></div><div class="entry-sub">Google, Mountain View, CA</div><ul><li>Designed and deployed a microservices orchestration layer serving 8M+ daily active users, reducing p99 latency from 320ms to 85ms through async processing, connection pooling, and intelligent request batching across 14 services</li><li>Led backend migration of monolithic payments module to event-driven architecture using Kafka, achieving zero-downtime cutover for $1.2B annual transaction volume and reducing processing errors by 92%</li><li>Mentored 6 engineers through weekly code reviews and architecture sessions, resulting in 2 promotions and a 30% increase in team sprint velocity over 12 months</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer II</span><span class="entry-date">Jun 2018 – Dec 2020</span></div><div class="entry-sub">Amazon Web Services, Seattle, WA</div><ul><li>Built auto-scaling orchestration service managing 50K+ EC2 instances, cutting customer provisioning time from 8 minutes to under 90 seconds while maintaining 99.95% SLA compliance</li><li>Implemented distributed rate-limiting system handling 2M+ API calls per minute using token-bucket algorithm with Redis Cluster, reducing abuse incidents by 78% without impacting legitimate traffic</li></ul></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Open-Source Query Optimizer</span><span class="entry-date">2023</span></div><div class="entry-sub">Go, PostgreSQL, gRPC</div><ul><li>Built adaptive query plan optimizer that analyzes real-time table statistics to rewrite suboptimal SQL, reducing average query execution time by 55% across 200+ benchmark queries; adopted by 3 internal teams at Google</li></ul></div>
<h2>Skills</h2>
<div class="skills-group"><strong>Languages:</strong> Go, Python, Java, TypeScript, SQL</div>
<div class="skills-group"><strong>Frameworks:</strong> gRPC, Kafka, React, Node.js, Spring Boot</div>
<div class="skills-group"><strong>Tools:</strong> AWS, GCP, Kubernetes, Docker, Terraform, PostgreSQL, Redis, Git</div>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">B.S. Computer Science</span><span class="entry-date">2014 – 2018</span></div><div class="entry-sub">University of Illinois Urbana-Champaign</div></div>
</div></body></html>

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt,letterpaper]{article}
\\usepackage[top=0.55in,bottom=0.55in,left=0.65in,right=0.65in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{hyperref}
\\usepackage{mathptmx}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\titleformat{\\section}{\\normalsize\\bfseries\\uppercase}{}{0pt}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}
\\setlist[itemize]{noitemsep,topsep=2pt,parsep=0pt,partopsep=0pt,leftmargin=14pt,label=\\textbullet}

\\newcommand{\\resumeSection}[1]{\\section*{#1}}
\\newcommand{\\resumeSubheading}[3]{
  \\textbf{#1} \\hfill {\\small\\itshape #2}\\\\
  {\\small #3}\\vspace{1pt}
}
\\newcommand{\\resumeItem}[1]{\\item #1}

\\begin{document}

{\\LARGE\\textbf{NAME}}\\\\[3pt]
{\\small TITLE}\\\\[2pt]
{\\small EMAIL~|~PHONE~|~LINKEDIN~|~GITHUB~|~LOCATION}
\\vspace{4pt}\\hrule\\vspace{10pt}

\\resumeSection{Summary}
Results-driven software engineer with 6+ years of experience designing and delivering scalable distributed systems. Proven ability to lead cross-functional teams, reduce system latency by 40\\%+, and ship high-impact features used by millions of users at FAANG-level companies.

\\resumeSection{Experience}

\\resumeSubheading{Senior Software Engineer}{Jan 2021 -- Present}{Google, Mountain View, CA}
\\begin{itemize}
  \\resumeItem{Designed and deployed a microservices orchestration layer serving 8M+ daily active users, reducing p99 latency from 320ms to 85ms through async processing, connection pooling, and intelligent request batching across 14 services}
  \\resumeItem{Led backend migration of monolithic payments module to event-driven architecture using Kafka, achieving zero-downtime cutover for \\$1.2B annual transaction volume and reducing processing errors by 92\\%}
  \\resumeItem{Mentored 6 engineers through weekly code reviews and architecture sessions, resulting in 2 promotions and a 30\\% increase in team sprint velocity over 12 months}
\\end{itemize}
\\vspace{4pt}

\\resumeSubheading{Software Engineer II}{Jun 2018 -- Dec 2020}{Amazon Web Services, Seattle, WA}
\\begin{itemize}
  \\resumeItem{Built auto-scaling orchestration service managing 50K+ EC2 instances, cutting customer provisioning time from 8 minutes to under 90 seconds while maintaining 99.95\\% SLA compliance}
  \\resumeItem{Implemented distributed rate-limiting system handling 2M+ API calls per minute using token-bucket algorithm with Redis Cluster, reducing abuse incidents by 78\\% without impacting legitimate traffic}
\\end{itemize}
\\vspace{6pt}

\\resumeSection{Projects}

\\resumeSubheading{Open-Source Query Optimizer}{2023}{Go, PostgreSQL, gRPC}
\\begin{itemize}
  \\resumeItem{Built adaptive query plan optimizer that analyzes real-time table statistics to rewrite suboptimal SQL, reducing average query execution time by 55\\% across 200+ benchmark queries; adopted by 3 internal teams at Google}
\\end{itemize}
\\vspace{6pt}

\\resumeSection{Skills}

\\textbf{Languages:} Go, Python, Java, TypeScript, SQL\\\\
\\textbf{Frameworks:} gRPC, Kafka, React, Node.js, Spring Boot\\\\
\\textbf{Tools:} AWS, GCP, Kubernetes, Docker, Terraform, PostgreSQL, Redis, Git

\\resumeSection{Education}

\\resumeSubheading{B.S. Computer Science}{2014 -- 2018}{University of Illinois Urbana-Champaign}

\\end{document}

CRITICAL FORMATTING RULES:
- Georgia serif font for HTML (professional, print-quality)
- mathptmx Times font for LaTeX (ATS-safe, fast compile)
- Header: Name → Title → contact bar (all separated clearly)
- Section headings: uppercase, small, thin rule underneath
- Skills: grouped by category (Languages / Frameworks / Tools)
- Bullet style: disc for HTML, textbullet for LaTeX
- Absolutely zero color, zero icons, zero decoration
- Single column throughout — most ATS-compatible layout possible
- Dynamic sections: if data is absent, omit heading + content entirely`,
  },

  // ── Editorial Sidebar Clone — Screenshot-Matched Split Layout ─────────────
  {
    id: 'editorial-sidebar-clone',
    name: 'Warm Grid Clinical',
    category: 'creative',
    description: 'Screenshot-matched warm clinical grid with split header and three info cards',
    preview: 'Rust-accent resume with left-aligned name block, circular photo, and compact section grid',
    format: 'both',
    styleGuide: `WARM GRID CLINICAL — SCREENSHOT-MATCHED TEMPLATE

RULES:
- Recreate the screenshot: warm paper background, rust separators, compact typography.
- Header is split: left has large uppercase name + role, right has circular photo.
- First horizontal strip: Contact heading + two compact contact columns.
- Next strip: three equal columns (Education | Communication | Leadership).
- Then full-width Experience entries with right-aligned dates and compact lines.
- Bottom short final section for Certifications/References.
- Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#252525}
.resume{width:794px;min-height:1123px;margin:0 auto;padding:16px 24px;background:#f7f4ec}
.head{display:flex;justify-content:flex-start;align-items:flex-start;margin-bottom:8px}
.name{font-size:50px;line-height:.84;letter-spacing:2px;font-weight:700;text-transform:uppercase;color:#8f4a2e}
.title{font-size:18px;letter-spacing:2px;text-transform:uppercase;color:#8f4a2e;margin-top:6px}
.hr{height:2px;background:#c46f45;margin:6px 0}
.strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.strip .col{font-size:10.2px;line-height:1.32;color:#2d2d2d}
h2{font-size:22px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8f4a2e;margin:0 0 5px}
.label{font-size:10.8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8f4a2e;margin-bottom:5px}
.small{font-size:10px;line-height:1.3}
.summary{font-size:10.2px;line-height:1.4}
.entry{margin-bottom:6px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline}
.entry-title{font-weight:700;font-size:10.8px;color:#282828}
.entry-date{font-size:10px;color:#4f4f4f;white-space:nowrap}
.entry-sub{font-size:10px;color:#4b4b4b}
ul{margin:1px 0 0;padding-left:13px}
li{font-size:10px;line-height:1.34;margin-bottom:2px}
.refs{font-size:10px;line-height:1.32;color:#2e2e2e}
@media print{.resume{padding:12px 18px}}
</style></head><body><div class="resume">
<div class="head"><div><div class="name">NAME</div><div class="title">TITLE</div></div></div>
<div class="hr"></div>
<div class="strip">
  <div class="col"><div class="label">Contact</div><div class="small">EMAIL<br>PHONE</div></div>
  <div class="col"><div class="label">&nbsp;</div><div class="small">LOCATION<br>LINKEDIN</div></div>
  <div class="col"><div class="label">&nbsp;</div><div class="small">GITHUB<br>PORTFOLIO</div></div>
</div>
<div class="hr"></div>
<div class="strip">
  <div class="col"><h2>Education</h2><div class="small">B.S. Computer Science, Stanford University, 2016 – 2020.</div></div>
  <div class="col"><h2>Summary</h2><p class="summary">Focused engineer with strong communication and execution skills, translating complex requirements into clear outcomes while maintaining quality under pressure.</p></div>
  <div class="col"><h2>Leadership</h2><p class="summary">Led cross-functional initiatives, mentored peers, and improved delivery standards through ownership, planning rigor, and stakeholder alignment.</p></div>
</div>
<div class="hr"></div>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">2022 – Present</span></div><div class="entry-sub">Google, Mountain View, CA</div><ul><li>Led migration of a critical analytics service to event-driven architecture, reducing p95 latency by 46% and improving platform uptime to 99.98% during peak traffic windows.</li><li>Built staged deployment safeguards and rollback automation that lowered production incidents by 62%, while increasing release cadence from weekly to daily without stability regressions.</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2020 – 2022</span></div><div class="entry-sub">Amazon, Seattle, WA</div><ul><li>Implemented distributed rate-limiting controls processing 2M+ calls per minute, reducing abuse traffic by 78% while preserving legitimate throughput.</li></ul></div>
<div class="hr"></div>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Patient Safety Analytics Toolkit</span><span class="entry-date">2024</span></div><div class="entry-sub">React, Node.js, PostgreSQL</div><ul><li>Built real-time dashboards and alert workflows that surfaced high-risk patterns and shortened triage decision cycles by 34% for clinical operations teams.</li></ul></div>
<div class="hr"></div>
<h2>Skills</h2>
<p class="summary"><strong>Languages:</strong> JavaScript, Python, SQL<br><strong>Frameworks:</strong> React, Node.js, Express<br><strong>Tools:</strong> Git, Docker, AWS, PostgreSQL</p>
<div class="hr"></div>
<h2>Certifications</h2>
<p class="refs">AWS Certified Solutions Architect • Google Professional Cloud Developer</p>
</div></body></html>

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt,letterpaper]{article}
\\usepackage[top=0.50in,bottom=0.50in,left=0.56in,right=0.56in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{mathptmx}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\titleformat{\\section}{\\large\\bfseries\\uppercase\\color[HTML]{8F4A2E}}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{6pt}{3pt}
\\setlist[itemize]{noitemsep,topsep=1pt,leftmargin=12pt,label=\\textbullet}
\\newcommand{\\accentline}{\\vspace{2pt}{\\color[HTML]{C46F45}\\rule{\\linewidth}{0.8pt}}\\vspace{5pt}}

\\newcommand{\\resumeSection}[1]{\\section*{#1}}
\\newcommand{\\resumeSubheading}[3]{\\textbf{#1} \\hfill {\\small #2}\\\\{\\small #3}\\\\}
\\newcommand{\\resumeItem}[1]{\\item #1}

\\begin{document}
{\\fontsize{30}{30}\\selectfont\\bfseries\\color[HTML]{8F4A2E} NAME}\\\\[3pt]
{\\large\\bfseries\\color[HTML]{8F4A2E} TITLE}\\\\
\\accentline

\\begin{minipage}[t]{0.32\\linewidth}
\\textbf{\\color[HTML]{8F4A2E} CONTACT}\\\\[-1pt]
{\\small EMAIL\\\\PHONE}
\\end{minipage}
\\begin{minipage}[t]{0.32\\linewidth}
\\textbf{\\color[HTML]{8F4A2E} }\\\\[-1pt]
{\\small LOCATION\\\\LINKEDIN}
\\end{minipage}
\\begin{minipage}[t]{0.32\\linewidth}
\\textbf{\\color[HTML]{8F4A2E} }\\\\[-1pt]
{\\small GITHUB\\\\PORTFOLIO}
\\end{minipage}

\\accentline
\\begin{minipage}[t]{0.32\\linewidth}
\\resumeSection{Education}
{\\small B.S. Computer Science, Stanford University, 2016 -- 2020.}
\\end{minipage}
\\begin{minipage}[t]{0.32\\linewidth}
\\resumeSection{Summary}
{\\small Focused engineer with strong communication and execution skills, translating complex requirements into clear outcomes while maintaining quality under pressure.}
\\end{minipage}
\\begin{minipage}[t]{0.32\\linewidth}
\\resumeSection{Leadership}
{\\small Led cross-functional initiatives, mentored peers, and improved delivery standards through ownership, planning rigor, and stakeholder alignment.}
\\end{minipage}

\\accentline
\\resumeSection{Experience}
\\resumeSubheading{Senior Software Engineer}{2022 -- Present}{Google, Mountain View, CA}
\\begin{itemize}
  \\resumeItem{Led migration of a critical analytics service to an event-driven architecture, reducing p95 API latency by 46\\% and improving uptime to 99.98\\% across global traffic peaks}
  \\resumeItem{Built deployment safety checks and progressive rollout automation that cut production incidents by 62\\% while accelerating release frequency from weekly to daily}
\\end{itemize}
\\resumeSubheading{Software Engineer}{2020 -- 2022}{Amazon, Seattle, WA}
\\begin{itemize}
  \\resumeItem{Implemented distributed rate-limiting controls processing 2M+ calls per minute, reducing abuse traffic by 78\\% while preserving legitimate throughput}
\\end{itemize}

\\accentline
\\resumeSection{Projects}
\\resumeSubheading{Patient Safety Analytics Toolkit}{2024}{React, Node.js, PostgreSQL}
\\begin{itemize}
  \\resumeItem{Built real-time dashboards and alert workflows that surfaced high-risk patterns and shortened triage decision cycles by 34\\% for clinical operations teams}
\\end{itemize}

\\accentline
\\resumeSection{Skills}
{\\small \\textbf{Languages:} JavaScript, Python, SQL\\\\\\textbf{Frameworks:} React, Node.js, Express\\\\\\textbf{Tools:} Git, Docker, AWS, PostgreSQL}

\\accentline
\\resumeSection{Certifications}
{\\small AWS Certified Solutions Architect \\textbullet\\ Google Professional Cloud Developer}
\\end{document}

CRITICAL FORMATTING RULES:
- Warm off-white background with rust heading/divider accents.
- Split top header: name/title block + circular photo placeholder.
- Three-column contact strip and three-column education/summary/leadership strip.
- Experience entries use right-aligned dates and compact bullet text.
- Maintain compact clinical-style spacing and uppercase section labels.`,
  },

  // ── Teal Split Blocks — Screenshot-Matched Dual Column ────────────────────
  {
    id: 'teal-split-blocks',
    name: 'Teal Split Blocks',
    category: 'creative',
    description: 'Exact dual-column block layout with dark header panels and teal section strips',
    preview: 'Two-column ATS-ready layout with profile/experience on left and contact/skills/education on right',
    format: 'both',
    styleGuide: `TEAL SPLIT BLOCKS — SCREENSHOT CLONE TEMPLATE

RULES:
- Two equal columns with independent content stacks.
- Top row uses two dark blocks: left for NAME, right for TITLE.
- Every section has a horizontal colored title strip.
- Left column order: Profile, Experience, Projects (optional).
- Right column order: Contact, Skills, Education, Certifications (optional).
- Keep compact fonts and tight spacing. Omit empty sections.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1f1f1f}
.resume{width:794px;min-height:1123px;margin:0 auto;background:#fff}
.grid{display:grid;grid-template-columns:1fr 1fr}
.panel{padding:26px 24px 20px}
.top-left{background:#2f3034;color:#fff}
.top-right{background:#007b96;color:#fff}
.name{font-size:44px;line-height:.84;font-weight:700;letter-spacing:1px;text-transform:uppercase}
.role{font-size:20px;font-weight:700;line-height:1.15}
.role-sub{font-size:17px;font-weight:600;opacity:.95}
.role-sub-2{font-size:15px;font-weight:600;opacity:.9}
.section{padding:0 24px 18px}
.bar{background:#007b96;color:#fff;padding:6px 12px;font-size:21px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px}
.bar.dark{background:#3b3d40}
p{font-size:11.2px;line-height:1.45}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
.entry-title{font-size:17px;font-weight:700;color:#222}
.entry-date{font-size:10.6px;color:#666;white-space:nowrap}
.entry-sub{font-size:11px;color:#555;margin-bottom:3px}
ul{padding-left:17px;margin-top:3px}
li{font-size:11.2px;line-height:1.42;margin-bottom:3px}
.contact-line{font-size:14px;line-height:1.5;margin-bottom:3px;color:#2e2e2e}
.skills li{color:#0e7e92;font-weight:700}
@media print{.resume{margin:0}}
</style></head><body><div class="resume">
  <div class="grid">
    <div class="panel top-left"><div class="name">NAME</div></div>
    <div class="panel top-right"><div class="role">TITLE</div><div class="role-sub">Senior Role</div><div class="role-sub-2">Specialization</div></div>
  </div>
  <div class="grid">
    <div>
      <div class="section"><div class="bar">Profile</div><p>Results-driven engineer with strong ownership mindset and communication skills, recognized for converting ambiguous needs into production-ready systems with measurable outcomes.</p></div>
      <div class="section"><div class="bar">Experience</div>
        <div class="entry"><div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">2022 – Present</span></div><div class="entry-sub">Google, Mountain View</div><ul><li>Designed and shipped event-driven backend services that reduced p95 latency by 46% and improved uptime to 99.98% across high-traffic workloads.</li><li>Led reliability initiatives and release guardrails that reduced production incidents by 62% while increasing deployment frequency by 3x.</li></ul></div>
        <div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2020 – 2022</span></div><div class="entry-sub">Amazon, Seattle</div><ul><li>Implemented distributed traffic controls handling 2M+ requests per minute, reducing abuse by 78% without impacting normal usage patterns.</li></ul></div>
      </div>
      <div class="section"><div class="bar">Projects</div><div class="entry"><div class="entry-header"><span class="entry-title">Operational Insight Toolkit</span><span class="entry-date">2024</span></div><div class="entry-sub">React, Node.js, PostgreSQL</div><ul><li>Built real-time monitoring and triage dashboard that cut incident investigation time by 34% through anomaly detection and workflow automation.</li></ul></div></div>
    </div>
    <div>
      <div class="section"><div class="bar dark">Contact</div><p class="contact-line">EMAIL</p><p class="contact-line">PHONE</p><p class="contact-line">LINKEDIN</p><p class="contact-line">GITHUB</p><p class="contact-line">LOCATION</p></div>
      <div class="section"><div class="bar dark">Skills</div><ul class="skills"><li>Languages</li><li>Frameworks</li><li>Cloud Design</li><li>System Design</li><li>CI/CD</li><li>Project Management</li><li>Communication</li></ul></div>
      <div class="section"><div class="bar dark">Education</div><div class="entry"><div class="entry-header"><span class="entry-title">B.S. Computer Science</span><span class="entry-date">2016 – 2020</span></div><div class="entry-sub">Stanford University</div></div></div>
      <div class="section"><div class="bar dark">Certifications</div><p>AWS Certified Solutions Architect<br>Google Professional Cloud Developer</p></div>
    </div>
  </div>
</div></body></html>

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt,letterpaper]{article}
\\usepackage[top=0.55in,bottom=0.55in,left=0.55in,right=0.55in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{paracol}
\\usepackage{mathptmx}
\\usepackage{titlesec}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlist[itemize]{noitemsep,topsep=2pt,leftmargin=12pt,label=\\textbullet}
\\columnsep=0.7cm
\\definecolor{tealbar}{HTML}{007B96}
\\definecolor{darkbar}{HTML}{3B3D40}
\\definecolor{darktop}{HTML}{2F3034}

\\newcommand{\\resumeSection}[1]{\\textcolor{white}{\\rule{0pt}{10pt}}\\\\[-17pt]\\colorbox{tealbar}{\\parbox{\\linewidth}{\\textcolor{white}{\\textbf{\\uppercase{#1}}}}}\\\\[6pt]}
\\newcommand{\\resumeSubheading}[3]{\\textbf{#1} \\hfill {\\small #2}\\\\{\\small #3}\\\\}
\\newcommand{\\resumeItem}[1]{\\item #1}
\\newcommand{\\resumeSectionDark}[1]{\\textcolor{white}{\\rule{0pt}{10pt}}\\\\[-17pt]\\colorbox{darkbar}{\\parbox{\\linewidth}{\\textcolor{white}{\\textbf{\\uppercase{#1}}}}}\\\\[6pt]}

\\begin{document}
\\begin{paracol}{2}
\\switchcolumn[0]
\\colorbox{darktop}{\\parbox{\\linewidth}{\\vspace{8pt}\\textcolor{white}{\\fontsize{20}{20}\\selectfont\\textbf{NAME}}\\vspace{8pt}}}\\\\[8pt]
\\resumeSection{Profile}
{\\small Results-driven engineer with strong ownership mindset and communication skills, recognized for converting ambiguous needs into production-ready systems with measurable outcomes.}
\\resumeSection{Experience}
\\resumeSubheading{Senior Software Engineer}{2022 -- Present}{Google, Mountain View}
\\begin{itemize}
  \\resumeItem{Designed and shipped event-driven backend services that reduced p95 latency by 46\\% and improved uptime to 99.98\\% across high-traffic workloads.}
  \\resumeItem{Led reliability initiatives and release guardrails that reduced production incidents by 62\\% while increasing deployment frequency by 3x.}
\\end{itemize}
\\resumeSubheading{Software Engineer}{2020 -- 2022}{Amazon, Seattle}
\\begin{itemize}
  \\resumeItem{Implemented distributed traffic controls handling 2M+ requests per minute, reducing abuse by 78\\% without impacting normal usage patterns.}
\\end{itemize}
\\resumeSection{Projects}
\\resumeSubheading{Operational Insight Toolkit}{2024}{React, Node.js, PostgreSQL}
\\begin{itemize}
  \\resumeItem{Built real-time monitoring and triage dashboard that cut incident investigation time by 34\\% through anomaly detection and workflow automation.}
\\end{itemize}

\\switchcolumn
\\colorbox{tealbar}{\\parbox{\\linewidth}{\\vspace{8pt}\\textcolor{white}{\\textbf{TITLE}}\\\\\\textcolor{white}{\\small Senior Role}\\\\\\textcolor{white}{\\small Specialization}\\vspace{8pt}}}\\\\[8pt]
\\resumeSectionDark{Contact}
{\\small EMAIL\\\\PHONE\\\\LINKEDIN\\\\GITHUB\\\\LOCATION}
\\resumeSectionDark{Skills}
\\begin{itemize}
  \\resumeItem{Languages}
  \\resumeItem{Frameworks}
  \\resumeItem{Cloud Design}
  \\resumeItem{System Design}
  \\resumeItem{CI/CD}
  \\resumeItem{Project Management}
  \\resumeItem{Communication}
\\end{itemize}
\\resumeSectionDark{Education}
\\resumeSubheading{B.S. Computer Science}{2016 -- 2020}{Stanford University}
\\resumeSectionDark{Certifications}
{\\small AWS Certified Solutions Architect\\\\Google Professional Cloud Developer}
\\end{paracol}
\\end{document}

CRITICAL FORMATTING RULES:
- Fixed two-column split with independent section stacks.
- Left bars are teal; right bars are dark gray.
- Experience lives in left column; skills/education in right column.
- Compact typography and spacing to match screenshot proportions.
- Keep section labels uppercase and bar-style.`,
  },

  // ── Cocoa Card Grid — Screenshot-Matched Fashion Resume ───────────────────
  {
    id: 'cocoa-card-grid',
    name: 'Cocoa Card Grid',
    category: 'creative',
    description: 'Rounded cocoa background card with centered identity header and white two-column content board',
    preview: 'Fashion-style compact resume with soft brown palette and stacked section tiles',
    format: 'both',
    styleGuide: `COCOA CARD GRID — SCREENSHOT CLONE TEMPLATE

RULES:
- Rounded full-page cocoa card with dark charcoal footer band.
- Centered top identity: NAME on first line, TITLE below.
- White inner board containing compact two-column section blocks.
- Section order by rows: Summary+Experience, Achievements+Education, Contact+Skills.
- Dense typography with tiny bullets and tight vertical rhythm.
- Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#262626}
.resume{width:794px;min-height:1123px;margin:0 auto;padding:10px;display:flex;flex-direction:column}
.shell{border-radius:22px;background:#bea18f;position:relative;padding:18px 20px 18px;display:flex;flex-direction:column;flex:1}
.footer-band{position:absolute;left:0;right:0;bottom:0;height:40px;background:#343434;border-bottom-left-radius:22px;border-bottom-right-radius:22px}
.name{text-align:center;font-size:36px;font-weight:700;color:#fff;margin-bottom:2px}
.title{text-align:center;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#efe9e4;margin-bottom:10px}
.board{background:#fff;padding:14px 14px 10px;flex:1;display:flex;flex-direction:column}
/* Flexible two-column flow: no rigid equal-height rows */
.grid{
  display:flex;
  flex-wrap:wrap;
  align-items:flex-start;
  gap:14px 16px;
  flex:1;
}
.grid .tile{
  flex:1 1 calc(50% - 16px);
  display:block;
}
/* Optional auto single-column fallback if space is wide open (print/smaller data) */
@media print {
  .grid .tile{ flex:1 1 100% }
}
.tile h2{font-size:19px;font-weight:700;color:#c19a86;margin-bottom:6px}
.tile p{font-size:10px;line-height:1.38;color:#2f2f2f}
.entry{margin-bottom:6px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.entry-title{font-size:10.8px;font-weight:700}
.entry-date{font-size:9.2px;color:#666;white-space:nowrap}
.entry-sub{font-size:9.2px;color:#666;margin-bottom:1px}
ul{padding-left:13px;margin-top:1px}
li{font-size:9.4px;line-height:1.32;margin-bottom:1px}
.contact p{margin-bottom:4px}
@media print{.resume{padding:6px}.shell{border-radius:0;padding:14px 16px 28px}}
</style></head><body><div class="resume"><div class="shell">
  <div class="name">NAME</div>
  <div class="title">TITLE</div>
  <div class="board">
    <div class="grid">
      <div class="tile"><h2>Summary</h2><p>Creative and detail-oriented professional with strong communication, product thinking, and execution discipline. Delivers polished outcomes while balancing design sensitivity and measurable business impact.</p></div>
      <div class="tile"><h2>Experience</h2>
        <div class="entry"><div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">2022 – Present</span></div><div class="entry-sub">Google, Mountain View</div><ul><li>Architected event-driven services that reduced p95 latency by 46% and improved reliability to 99.98% under production load.</li><li>Led release quality gates and observability initiatives that reduced incidents by 62% and improved deployment confidence.</li></ul></div>
      </div>
      <div class="tile"><h2>Achievements</h2><ul><li>Promoted twice in four years for technical ownership and cross-functional leadership.</li><li>Recognized with organization-level award for reliability impact.</li></ul></div>
      <div class="tile"><h2>Education</h2><div class="entry"><div class="entry-header"><span class="entry-title">B.S. Computer Science</span><span class="entry-date">2016 – 2020</span></div><div class="entry-sub">Stanford University</div><ul><li>Coursework: Algorithms, Distributed Systems, Databases.</li></ul></div></div>
      <div class="tile contact"><h2>Get In Touch</h2><p>PHONE</p><p>EMAIL</p><p>LOCATION</p><p>LINKEDIN | GITHUB</p></div>
      <div class="tile"><h2>Core Skills</h2><ul><li>System Design</li><li>API Engineering</li><li>Cloud Architecture</li><li>Performance Optimization</li><li>CI/CD</li><li>Stakeholder Communication</li></ul></div>
    </div>
  </div>
  <div class="footer-band"></div>
</div></div></body></html>

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt,letterpaper]{article}
\\usepackage[top=0.55in,bottom=0.55in,left=0.55in,right=0.55in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{paracol}
\\usepackage{mathptmx}
\\usepackage{titlesec}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlist[itemize]{noitemsep,topsep=2pt,leftmargin=12pt,label=\\textbullet}
\\definecolor{cocoa}{HTML}{BEA18F}
\\definecolor{cocoatitle}{HTML}{C19A86}
\\titleformat{\\section}{\\normalsize\\bfseries\\color{cocoatitle}}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{4pt}{3pt}
\\columnsep=0.8cm

\\newcommand{\\resumeSection}[1]{\\section*{#1}}
\\newcommand{\\resumeSubheading}[3]{\\textbf{#1} \\hfill {\\small #2}\\\\{\\small #3}\\\\}
\\newcommand{\\resumeItem}[1]{\\item #1}

\\begin{document}
\\colorbox{cocoa}{\\parbox{\\linewidth}{
\\centering {\\Large\\textbf{NAME}}\\\\[-1pt]
{\\small\\textsc{TITLE}}\\\\[10pt]
\\raggedright
\\colorbox{white}{\\parbox{0.95\\linewidth}{
\\vspace{8pt}
\\begin{paracol}{2}
\\switchcolumn[0]
\\resumeSection{Summary}
{\\small Creative and detail-oriented professional with strong communication, product thinking, and execution discipline. Delivers polished outcomes while balancing design sensitivity and measurable business impact.}
\\resumeSection{Achievements}
\\begin{itemize}
  \\resumeItem{Promoted twice in four years for technical ownership and cross-functional leadership.}
  \\resumeItem{Recognized with organization-level award for reliability impact.}
\\end{itemize}
\\resumeSection{Get In Touch}
{\\small PHONE\\\\EMAIL\\\\LOCATION\\\\LINKEDIN | GITHUB}

\\switchcolumn
\\resumeSection{Experience}
\\resumeSubheading{Senior Software Engineer}{2022 -- Present}{Google, Mountain View}
\\begin{itemize}
  \\resumeItem{Architected event-driven services that reduced p95 latency by 46\\% and improved reliability to 99.98\\% under production load.}
  \\resumeItem{Led release quality gates and observability initiatives that reduced incidents by 62\\% and improved deployment confidence.}
\\end{itemize}
\\resumeSection{Education}
\\resumeSubheading{B.S. Computer Science}{2016 -- 2020}{Stanford University}
\\begin{itemize}
  \\resumeItem{Coursework: Algorithms, Distributed Systems, Databases.}
\\end{itemize}
\\resumeSection{Core Skills}
\\begin{itemize}
  \\resumeItem{System Design}
  \\resumeItem{API Engineering}
  \\resumeItem{Cloud Architecture}
  \\resumeItem{Performance Optimization}
  \\resumeItem{CI/CD}
  \\resumeItem{Stakeholder Communication}
\\end{itemize}
\\end{paracol}
\\vspace{8pt}
}}
}}
\\end{document}

CRITICAL FORMATTING RULES:
- Keep rounded cocoa-card aesthetic and compact white content board.
- Use row-based two-column tiles with short headings and dense body text.
- Preserve section hierarchy: Summary, Experience, Achievements, Education, Contact, Skills.
- Use tiny bullets and tight spacing to match screenshot density.`,
  },

  // ── Ivory Centerline Serif — Screenshot-Matched Classic Single Column ─────
  {
    id: 'ivory-centerline-serif',
    name: 'Ivory Centerline Serif',
    category: 'professional',
    description: 'Centered serif identity header with ivory contact strip and minimalist ruled sections',
    preview: 'Classic accountant-style single-column resume with refined spacing and clean typography',
    format: 'both',
    styleGuide: `IVORY CENTERLINE SERIF — SCREENSHOT CLONE TEMPLATE

RULES:
- Single-column layout with centered name and subtitle.
- Contact info sits in a light ivory horizontal strip with thin vertical dividers.
- Section headings are uppercase with wide letter spacing and thin gray top rule.
- Experience entries use role/company on left and date range right-aligned.
- Compact bullet list under each experience.
- Keep styling minimal black/gray on white.
- Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#161616}
.resume{width:794px;min-height:1123px;margin:0 auto;padding:40px 52px;background:#fff}
.name{text-align:center;font-size:26px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#111;line-height:1.05}
.title{text-align:center;font-size:12.5px;letter-spacing:2.6px;text-transform:uppercase;color:#303030;margin-top:6px}
.contact{margin:20px auto 14px;background:#ede6dc;border:1px solid #dfd5c8;padding:8px 12px;display:flex;justify-content:center;gap:0;max-width:100%}
.contact span{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#333;padding:0 16px;border-right:1px solid #a59d94;line-height:1}
.contact span:last-child{border-right:none}
h2{margin-top:14px;padding-top:6px;border-top:1px solid #b8b8b8;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#222}
p{font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#242424;margin-top:7px}
.entry{margin-top:10px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.entry-title{font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#191919}
.entry-date{font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#222;white-space:nowrap}
.entry-sub{font-family:Arial,Helvetica,sans-serif;font-size:11.5px;font-style:italic;color:#2c2c2c}
ul{margin:6px 0 0;padding-left:16px}
li{font-family:Arial,Helvetica,sans-serif;font-size:11.8px;line-height:1.55;margin-bottom:4px}
.skills-text{font-family:Arial,Helvetica,sans-serif;font-size:11.8px;line-height:1.5}
@media print{.resume{padding:30px 40px}}
</style></head><body><div class="resume">
  <div class="name">NAME</div>
  <div class="title">TITLE</div>
  <div class="contact"><span>PHONE</span><span>EMAIL</span><span>LOCATION</span></div>

  <h2>Summary</h2>
  <p>Detail-oriented professional known for delivering consistent quality in fast-paced environments. Combines analytical thinking, stakeholder communication, and execution rigor to produce reliable outcomes with measurable business value.</p>

  <h2>Experience</h2>
  <div class="entry">
    <div class="entry-header"><span class="entry-title">Senior Software Engineer</span><span class="entry-date">2020–2023</span></div>
    <div class="entry-sub">Google, Mountain View</div>
    <ul>
      <li>Led architecture improvements for core backend services, reducing p95 response latency by 46% while improving uptime to 99.98% through targeted observability and reliability engineering.</li>
      <li>Implemented staged deployment checks and incident prevention controls that lowered production failures by 62% and enabled faster, safer release cycles across teams.</li>
      <li>Mentored engineers through design reviews and implementation planning, improving delivery quality and reducing rework across critical initiatives.</li>
    </ul>
  </div>
  <div class="entry">
    <div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2015–2020</span></div>
    <div class="entry-sub">Amazon, Seattle</div>
    <ul>
      <li>Built distributed traffic-control services processing 2M+ requests per minute, reducing abuse traffic by 78% while preserving normal customer behavior and throughput.</li>
      <li>Optimized API workflows and data access paths to improve system responsiveness and reduce infrastructure inefficiencies at scale.</li>
      <li>Collaborated with product and operations stakeholders to ship reliable features aligned with customer and compliance requirements.</li>
    </ul>
  </div>

  <h2>Skills</h2>
  <p class="skills-text"><strong>Languages:</strong> JavaScript, Python, SQL &nbsp; • &nbsp; <strong>Frameworks:</strong> React, Node.js, Express &nbsp; • &nbsp; <strong>Tools:</strong> AWS, Docker, PostgreSQL, Git</p>

  <h2>Education</h2>
  <div class="entry"><div class="entry-header"><span class="entry-title">B.S. Computer Science</span><span class="entry-date">2011–2015</span></div><div class="entry-sub">University of Illinois Urbana-Champaign</div></div>

  <h2>Certifications</h2>
  <p>AWS Certified Solutions Architect · Google Professional Cloud Developer</p>
</div></body></html>

MANDATORY STRUCTURE (LaTeX):
\\documentclass[12pt,letterpaper]{article}
\\usepackage[top=0.58in,bottom=0.58in,left=0.62in,right=0.62in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{mathptmx}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlist[itemize]{noitemsep,topsep=2pt,leftmargin=14pt,label=\\textbullet}
\\definecolor{ivorybar}{HTML}{EDE6DC}
\\definecolor{rulegray}{HTML}{B8B8B8}
\\titleformat{\\section}{\\Large\\bfseries\\uppercase}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\newcommand{\\resumeSection}[1]{\\section*{#1}}
\\newcommand{\\resumeSubheading}[3]{\\textbf{#1} \\hfill {#2}\\\\{\\itshape #3}\\\\}
\\newcommand{\\resumeItem}[1]{\\item #1}

\\begin{document}
\\begin{center}
{\\fontsize{22}{22}\\selectfont\\textbf{NAME}}\\\\[4pt]
{\\large\\textbf{TITLE}}
\\end{center}

\\vspace{10pt}
\\colorbox{ivorybar}{\\parbox{\\linewidth}{\\centering \\large PHONE\\hspace{1em}|\\hspace{1em}EMAIL\\hspace{1em}|\\hspace{1em}LOCATION}}
\\vspace{8pt}

{\\color{rulegray}\\rule{\\linewidth}{1pt}}
\\resumeSection{Summary}
Detail-oriented professional known for delivering consistent quality in fast-paced environments. Combines analytical thinking, stakeholder communication, and execution rigor to produce reliable outcomes with measurable business value.

{\\color{rulegray}\\rule{\\linewidth}{1pt}}
\\resumeSection{Experience}
\\resumeSubheading{Senior Software Engineer}{2020--2023}{Google, Mountain View}
\\begin{itemize}
  \\resumeItem{Led architecture improvements for core backend services, reducing p95 response latency by 46\\% while improving uptime to 99.98\\% through targeted observability and reliability engineering.}
  \\resumeItem{Implemented staged deployment checks and incident prevention controls that lowered production failures by 62\\% and enabled faster, safer release cycles across teams.}
  \\resumeItem{Mentored engineers through design reviews and implementation planning, improving delivery quality and reducing rework across critical initiatives.}
\\end{itemize}
\\resumeSubheading{Software Engineer}{2015--2020}{Amazon, Seattle}
\\begin{itemize}
  \\resumeItem{Built distributed traffic-control services processing 2M+ requests per minute, reducing abuse traffic by 78\\% while preserving normal customer behavior and throughput.}
  \\resumeItem{Optimized API workflows and data access paths to improve system responsiveness and reduce infrastructure inefficiencies at scale.}
  \\resumeItem{Collaborated with product and operations stakeholders to ship reliable features aligned with customer and compliance requirements.}
\\end{itemize}

{\\color{rulegray}\\rule{\\linewidth}{1pt}}
\\resumeSection{Skills}
\\textbf{Languages:} JavaScript, Python, SQL \\hspace{0.5em} \\textbullet \\hspace{0.5em}
\\textbf{Frameworks:} React, Node.js, Express \\hspace{0.5em} \\textbullet \\hspace{0.5em}
\\textbf{Tools:} AWS, Docker, PostgreSQL, Git

{\\color{rulegray}\\rule{\\linewidth}{1pt}}
\\resumeSection{Education}
\\resumeSubheading{B.S. Computer Science}{2011--2015}{University of Illinois Urbana-Champaign}

{\\color{rulegray}\\rule{\\linewidth}{1pt}}
\\resumeSection{Certifications}
AWS Certified Solutions Architect \\textbullet\\ Google Professional Cloud Developer
\\end{document}

CRITICAL FORMATTING RULES:
- Centered serif identity header with uppercase name and spaced subtitle.
- Ivory horizontal contact strip with vertical separators.
- Single-column structure with thin top rules before section headings.
- Experience headings left + dates right, bullets below.
- Clean monochrome/neutral palette and conservative spacing.`,
  },

  // ── Warm Bordered Twin Columns — Screenshot-Matched Clean Two-Column ──────
  {
    id: 'warm-bordered-twin-columns',
    name: 'Warm Bordered Twin Columns',
    category: 'professional',
    description: 'Centered header, thin corner accents, and two-column body with left Contact/Education/Skills and right Experience/Achievements',
    preview: 'ATS-clean twin columns with slim rules and compact bullets; dates right-aligned in experience',
    format: 'both',
    styleGuide: `WARM BORDERED TWIN COLUMNS — SCREENSHOT-CLONE

RULES:
- Centered name + small uppercase subtitle.
- Small warm accent bars near top corners.
- Full-width Profile paragraph below header rule.
- Two columns: left (Contact, Education, Skills); right (Experience, Achievements).
- Section headers uppercase with thin accent divider line; dates right-aligned.
- Tight, compact bullets; hide empty sections automatically.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f1f1f1;color:#222;font-family:Arial,Helvetica,sans-serif;line-height:1.4}
.page{width:794px;margin:0 auto;background:#fffefb;border:1px solid #e5ded2;border-radius:10px;padding:18px 22px 20px;position:relative}
.accent-top{position:absolute;height:3px;background:#c86f3f;top:12px}
.accent-left{left:18px;width:90px}
.accent-right{right:18px;width:90px}
.name{text-align:center;font-size:26px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#1e1e1e}
.subtitle{text-align:center;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#666;margin-top:4px}
.rule{height:1px;background:#d1cdc6;margin:10px 0}
.two-col{display:grid;grid-template-columns:0.35fr 0.65fr;gap:18px}
.section{margin-bottom:13px}
.section-title{font-size:15px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7d3e28;display:flex;align-items:center;gap:10px;margin-bottom:6px}
.section-title::after{content:\"\";flex:1;height:1px;background:#c86f3f;opacity:.7}
p{font-size:11.5px;line-height:1.42;color:#2c2c2c}
ul{margin-top:4px;padding-left:14px}
li{font-size:11px;line-height:1.38;margin-bottom:4px}
.kv{font-size:11.2px;line-height:1.42;color:#2f2f2f}
.muted{color:#555}
.entry{margin-bottom:9px}
.entry-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.role{font-weight:700;font-size:13px;color:#222}
.org{font-size:11px;color:#555;margin-top:2px;line-height:1.35}
.date{font-size:11px;color:#666;white-space:nowrap}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.entry-title{font-weight:700;font-size:13px;color:#222}
.entry-date{font-size:11px;color:#666;white-space:nowrap}
.entry-sub{font-size:11px;color:#555;margin-top:2px;line-height:1.35}
.skills-text{font-size:11.2px;line-height:1.42;color:#2f2f2f}
.skills-text>div{margin-bottom:3px}
.small-list li{margin-bottom:2px}
.hide:empty{display:none}.hide ul:empty{display:none}.hide li:empty{display:none}
@media print{body{background:#fff}.page{border-radius:0;border-color:#e5ded2}}
</style></head><body><div class="page">
  <div class="accent-top accent-left"></div>
  <div class="accent-top accent-right"></div>
  <div class="name">NAME</div>
  <div class="subtitle">TITLE</div>
  <div class="rule"></div>
  <div class="section hide" id="profile"><div class="section-title">Profile</div><p>SUMMARY</p></div>
  <div class="two-col">
    <div>
      <div class="section hide" id="contact"><div class="section-title">Contact</div><p class="kv">PHONE<br>EMAIL<br>LOCATION<br>LINKEDIN<br>GITHUB<br>PORTFOLIO</p></div>
      <div class="section hide" id="education"><div class="section-title">Education</div><div class="entry"><div class="entry-head"><div class="role">DEGREE</div><div class="date">DATES</div></div><div class="org">SCHOOL</div><ul class="small-list"><li>DETAIL 1</li><li>DETAIL 2</li></ul></div></div>
      <div class="section hide" id="skills"><div class="section-title">Skills</div><ul class="small-list"><li>Skill Group — items</li><li>Another Group — items</li></ul></div>
    </div>
    <div>
      <div class="section hide" id="experience"><div class="section-title">Experience</div>
        <div class="entry"><div class="entry-head"><div class="role">ROLE</div><div class="date">DATES</div></div><div class="org">COMPANY — <span class="muted">LOCATION</span></div><ul><li>Bullet</li><li>Bullet</li><li>Bullet</li></ul></div>
      </div>
      <div class="section hide" id="projects"><div class="section-title">Projects</div>
        <div class="entry"><div class="entry-head"><div class="role">PROJECT NAME</div></div><div class="org">TECH STACK</div><ul><li>Bullet</li><li>Bullet</li></ul></div>
      </div>
      <div class="section hide" id="achievements"><div class="section-title">Achievements</div><ul><li>Achievement</li><li>Achievement</li></ul></div>
      <div class="section hide" id="certifications"><div class="section-title">Certifications</div><ul><li>Certification</li></ul></div>
    </div>
  </div>
</div></body></html>

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt,letterpaper]{article}
\\usepackage[top=0.55in,bottom=0.55in,left=0.6in,right=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{array}
\\usepackage{parskip}
\\setlength{\\parindent}{0pt}
\\pagestyle{empty}
\\definecolor{accent}{HTML}{C86F3F}
\\definecolor{rulegray}{HTML}{D1CDC6}
\\definecolor{text}{HTML}{222222}
\\newcommand{\\resumeSection}[1]{\\vspace{4pt}\\textbf{\\large\\textcolor{accent}{\\MakeUppercase{#1}}}\\\\{\\color{accent}\\rule{\\linewidth}{0.5pt}}\\vspace{3pt}}
\\newcommand{\\resumeSubheading}[3]{\\textbf{#1} \\hfill {\\small #2}\\\\{\\small #3}}
\\newcommand{\\resumeItem}[1]{\\item #1}
\\setlength{\\parskip}{2pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=2pt,topsep=2pt,parsep=0pt,partopsep=0pt}
\\begin{document}\\color{text}
{\\centering {\\LARGE\\bfseries NAME}\\\\[2pt]{\\small\\bfseries TITLE}\\\\{\\color{rulegray}\\rule{\\linewidth}{0.6pt}}\\\\}
\\resumeSection{Profile}
SUMMARY
\\begin{tabular}{p{0.33\\linewidth} p{0.03\\linewidth} p{0.64\\linewidth}}
\\begin{minipage}[t]{\\linewidth}
  \\resumeSection{Contact}
  {\\small PHONE\\\\EMAIL\\\\LOCATION\\\\LINKEDIN\\\\GITHUB\\\\PORTFOLIO}
  \\resumeSection{Education}
  \\resumeSubheading{DEGREE}{DATES}{SCHOOL}
\\begin{itemize}
    \\resumeItem{DETAIL 1}
    \\resumeItem{DETAIL 2}
\\end{itemize}
  \\resumeSection{Skills}
  \\begin{itemize}
    \\resumeItem{Skill Group — items}
    \\resumeItem{Another Group — items}
  \\end{itemize}
\\end{minipage}
&
&
\\begin{minipage}[t]{\\linewidth}
  \\resumeSection{Experience}
  \\textbf{ROLE}\\hfill{\\small DATES}\\\\
  {\\small COMPANY --- LOCATION}
  \\begin{itemize}
    \\resumeItem{Bullet}
    \\resumeItem{Bullet}
    \\resumeItem{Bullet}
  \\end{itemize}
  \\resumeSection{Projects}
  \\textbf{PROJECT NAME}\\\\
  {\\small TECH STACK}
  \\begin{itemize}
    \\resumeItem{Bullet}
    \\resumeItem{Bullet}
  \\end{itemize}
  \\resumeSection{Achievements}
  \\begin{itemize}
    \\resumeItem{Achievement}
    \\resumeItem{Achievement}
  \\end{itemize}
  \\resumeSection{Certifications}
  \\begin{itemize}
    \\resumeItem{Certification}
  \\end{itemize}
\\end{minipage}
\\\\
\\end{tabular}
\\end{document}

CRITICAL FORMATTING RULES:
- Header center-aligned; thin accent lines; compact bullets.
- Two columns at ~35/65 split; right-aligned dates in experience.
- Keep HTML and LaTeX section order identical and omit empty blocks.`,
  },

  // ── New LaTeX Templates Batch (15) — FAANG-Level ATS Upgrades ─────────────

] satisfies ResumeTemplate[]

export const RESUME_TEMPLATES = ALL_RESUME_TEMPLATES.filter(
  (template) => !EXCLUDED_TEMPLATE_IDS.has(template.id),
)
