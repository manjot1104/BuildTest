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
}

// ─── Resume Templates ─────────────────────────────────────────────────────

export const RESUME_TEMPLATES: ResumeTemplate[] = [
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

  // ── 2. Modern Minimal ────────────────────────────────────────────────────
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    category: 'modern',
    description: 'Ultra-clean single-column with generous whitespace',
    preview: 'Minimalist ATS-optimized resume with elegant spacing and zero decoration',
    format: 'html',
    styleGuide: `MODERN MINIMAL — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate an ultra-clean, whitespace-driven resume.

RULES:
- Single-column. Centered header. Thin HR dividers between every section.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:44px 50px;background:#fff}
h1{text-align:center;font-size:22px;font-weight:700;letter-spacing:0.5px;margin-bottom:4px;color:#000}
.contact{text-align:center;color:#555;margin-bottom:24px;font-size:10.5px}
hr{border:none;border-top:1px solid #d4d4d4;margin:20px 0}
h2{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.8px;color:#333;margin:0 0 10px}
.entry{margin-bottom:14px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#666;white-space:nowrap}
.entry-sub{font-size:10px;color:#666;margin-bottom:4px}
ul{padding-left:18px;margin:3px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.6;color:#1a1a1a}
@media print{.resume{padding:32px 40px;margin:0}}
</style></head><body><div class="resume">
  <h1>NAME</h1>
<div class="contact">email | phone | location</div>
  <hr>
<h2>Summary</h2>
<p>Backend engineer with 5+ years building high-throughput APIs and data pipelines. Delivered distributed systems processing 100M+ requests daily with 99.99% reliability. Expert in Go, Python, and cloud infrastructure.</p>
  <hr>
  <h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Backend Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Datadog, New York, NY</div><ul><li>Designed metric ingestion pipeline processing 100M+ data points per minute with 99.99% data integrity, implementing sharded write-ahead logging and automatic partition rebalancing across 50+ nodes</li><li>Reduced query latency by 55% through custom time-series indexing strategy, enabling sub-second dashboard loads for 20K+ enterprise customers monitoring 500+ services</li><li>Led backend team of 6 engineers delivering core observability features that contributed to 30% increase in enterprise ARR</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Twilio, San Francisco, CA</div><ul><li>Built messaging API handling 10B+ messages monthly with sub-100ms delivery latency, implementing intelligent routing and automatic failover across 3 geographic regions</li><li>Implemented rate limiting and abuse detection system reducing malicious traffic by 80% while maintaining 99.9% legitimate message delivery rate</li></ul></div>
<hr>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Distributed Task Queue</span><span class="entry-date">2023</span></div><div class="entry-sub">Go, Redis, gRPC</div><ul><li>Built open-source task queue supporting 50K+ tasks/sec with exactly-once processing guarantees and automatic dead-letter queue routing</li></ul></div>
<hr>
<h2>Skills</h2>
<p class="skills-text">Go, Python, Java, PostgreSQL, Redis, Kafka, gRPC, AWS, Docker, Kubernetes, Terraform, CI/CD</p>
  <hr>
  <h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">M.S. Computer Science</span><span class="entry-date">2019</span></div><div class="entry-sub">Columbia University</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Centered name + centered contact info
- Thin horizontal rule (1px #d4d4d4) separates EVERY section
- Section headings: uppercase, wide letter-spacing (1.8px), no border
- Generous padding (44px 50px)
- Skills: comma-separated inline text
- Font: Segoe UI`,
  },

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
  {
    id: 'academic-scholar',
    name: 'Academic Scholar',
    category: 'academic',
    description: 'Academic CV format with education-first layout',
    preview: 'Academic resume optimized for research positions, grad school, and academic roles',
    format: 'html',
    styleGuide: `ACADEMIC SCHOLAR — FAANG-LEVEL TEMPLATE (ACADEMIC/RESEARCH ROLES)

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean academic CV that is ATS-friendly.

RULES:
- Single-column layout. Left-aligned header. Black border-bottom section headings.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:40px 48px;background:#fff}
h1{font-size:22px;font-weight:700;color:#000;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:18px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #000;color:#000;padding-bottom:3px;margin:18px 0 8px;color:#000}
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
- Left-aligned header with name (22px) and contact below
- Section headings: uppercase, border-bottom:1px solid #000;color:#000
- Entry: title left + date right (flex space-between), subtitle below
- Skills: comma-separated inline text
- Font: Georgia`,
  },

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
  {
    id: 'creative-designer',
    name: 'Creative Designer',
    category: 'creative',
    description: 'Designer-focused resume with project highlights first',
    preview: 'Clean design resume with portfolio-first approach and subtle violet accent',
    format: 'html',
    styleGuide: `CREATIVE DESIGNER — FAANG-LEVEL TEMPLATE (DESIGN/UX ROLES)

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean designer-focused resume.

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
.header{border-bottom:4px solid #000;padding-bottom:14px;margin-bottom:18px}
h1{font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#000;margin-bottom:6px}
.contact{font-size:10px;color:#555}
h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#fff;background:#1a1a1a;padding:5px 10px;margin:18px 0 10px;}
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
- Bold: 28px uppercase name with heavy weight
- Section headings: white text on dark background strip (#1a1a1a)
- Strong visual contrast between hierarchy levels
- Skills: comma-separated inline text
- Font: Arial`,
  },

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
    preview: 'Professional two-column LaTeX layout with clean minipage sidebar',
    format: 'latex',
    styleGuide: `TWO-COLUMN LATEX — FAANG-LEVEL SIDEBAR TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean two-column LaTeX resume.

RULES:
- Two-column via minipage: Left (30%) = Contact, Skills, Education. Right (67%) = Summary, Experience, Projects.
- NO colors. Pure black text only.
- Section headings: bold, uppercase, with thin rule below.
- Skills as comma-separated text (not bullets).
- Each bullet: action verb + context + measurable result.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.
- Must compile cleanly with pdflatex.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\vspace{-4pt}\\rule{\\linewidth}{0.4pt}]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=12pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\LARGE\\textbf{NAME}}\\\\[4pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location\\ \\textbar\\ linkedin.com/in/name}
\\end{center}

\\vspace{6pt}

\\noindent
\\begin{minipage}[t]{0.30\\textwidth}

\\section*{Skills}
\\small
\\textbf{Languages:} TypeScript, Python, Go\\\\[2pt]
\\textbf{Frameworks:} React, Node.js, Next.js\\\\[2pt]
\\textbf{Cloud:} AWS, Docker, K8s\\\\[2pt]
\\textbf{Databases:} PostgreSQL, Redis, MongoDB

\\section*{Education}
\\small
\\textbf{B.S. Computer Science}\\\\
\\textit{University of Technology}\\\\
\\textit{2015 -- 2019}\\\\
GPA: 3.8/4.0

\\section*{Certifications}
\\small
\\textbf{AWS Solutions Architect}\\\\
\\textit{Amazon Web Services}\\\\
\\textit{2023}

\\end{minipage}%
\\hfill
\\begin{minipage}[t]{0.67\\textwidth}

\\section*{Summary}
\\small
Results-driven software engineer with 5+ years building scalable distributed systems. Led teams delivering products serving millions of users with measurable performance improvements.

\\section*{Experience}
\\small

\\textbf{Senior Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Tech Corp, San Francisco, CA}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\vspace{4pt}

\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{StartupXYZ, Remote}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\section*{Projects}
\\small

\\textbf{E-Commerce Platform} \\hfill \\textit{2023}\\\\
\\textit{React, Node.js, PostgreSQL, Stripe}
\\begin{itemize}
\\item Created a developer productivity CLI tool automating project scaffolding and code generation, achieving 2K+ GitHub stars and 500+ weekly npm downloads through comprehensive documentation and an intuitive plugin architecture
\\item Established robust CI/CD with automated testing across Node.js 18/20/22, cross-platform compatibility validation, semantic versioning, and automated changelog generation ensuring reliable npm releases
\\end{itemize}

\\end{minipage}

\\end{document}

CRITICAL FORMATTING RULES:
- Centered header spanning full width, then two minipages below
- Left minipage 30\\%, Right minipage 67\\%, with \\hfill gap
- NO colors. NO xcolor.
- Skills grouped by category (bold label + comma-separated values)
- UPPERCASE section headings with thin rule
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
  {
    id: 'latex-balanced-professional',
    name: 'Balanced Professional',
    category: 'professional',
    description: 'Well-balanced LaTeX resume with equal section emphasis',
    preview: 'Harmoniously structured LaTeX resume with uppercase headings and titlerule dividers',
    format: 'latex',
    styleGuide: `BALANCED PROFESSIONAL LATEX — FAANG-LEVEL TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a well-balanced, ATS-optimized LaTeX resume.

RULES:
- Single-column layout with balanced section spacing.
- NO colors. Pure black text only. NO xcolor.
- UPPERCASE section headings with titlerule below.
- Section order: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Equal visual weight across all sections.
- Skills as comma-separated text.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.
- Must compile cleanly with pdflatex.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{charter}

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

\\section*{Professional Summary}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{Professional Experience}

\\textbf{Senior Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Tech Corp, San Francisco, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\item Deployed a real-time fraud detection system using ML models and rule-based engines, processing 50K+ transactions per minute and preventing \\$10M+ in annual losses while keeping false positive rates below 0.1\\%
\\end{itemize}

\\vspace{4pt}

\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{StartupXYZ, Remote}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\end{itemize}

\\section*{Key Projects}

\\textbf{E-Commerce Platform} \\hfill \\textit{2023}\\\\
\\textit{React, Node.js, PostgreSQL, Stripe}
\\begin{itemize}
\\item Created a developer productivity CLI tool automating project scaffolding and code generation, achieving 2K+ GitHub stars and 500+ weekly npm downloads through comprehensive documentation and an intuitive plugin architecture
\\item Established robust CI/CD with automated testing across Node.js 18/20/22, cross-platform compatibility validation, semantic versioning, and automated changelog generation ensuring reliable npm releases
\\end{itemize}

\\section*{Core Competencies}
TypeScript, Python, Go, React, Node.js, PostgreSQL, Redis, AWS, Docker, Kubernetes, System Design, CI/CD

\\section*{Education}

\\textbf{B.S. Computer Science} \\hfill \\textit{2015 -- 2019}\\\\
\\textit{University of Technology} --- GPA: 3.8/4.0

\\section*{Certifications}

\\textbf{AWS Solutions Architect -- Associate} \\hfill \\textit{2023}\\\\
\\textit{Amazon Web Services}

\\end{document}

CRITICAL FORMATTING RULES:
- UPPERCASE section headings via \\MakeUppercase with titlerule
- NO colors, NO xcolor
- Contact on two centered lines: personal info + links
- Skills: single comma-separated paragraph labeled "Core Competencies"
- Balanced spacing (10pt before sections, 5pt after)
- Must compile with pdflatex`,

  },

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
  {
    id: 'latex-modern-two-column',
    name: 'Modern Two-Column',
    category: 'modern',
    description: 'Contemporary single-column layout with modern clean styling',
    preview: 'ATS-friendly modern LaTeX resume with clean contemporary design',
    format: 'latex',
    styleGuide: `MODERN TWO-COLUMN — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a clean, ATS-optimized modern resume.

RULES:
- Single-column layout ONLY. No sidebars or minipages.
- NO colors except black. No accent colors.
- NO decorative elements.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- Skills as comma-separated inline text, NOT bullet points.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titlespacing*{\\section}{0pt}{10pt}{4pt}
\\titleformat{\\section}{\\normalsize\\bfseries\\uppercase}{}{0em}{}[\\titlerule]

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.3em}
\\setlist[itemize]{leftmargin=*,topsep=0.15em,itemsep=0.08em}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[0.15cm]
{\\small email | phone | location}
\\end{center}

\\section*{SUMMARY}
Full-stack software engineer with 6+ years of experience building scalable web applications. Led migration of monolithic system to microservices architecture serving 2M+ daily users. Passionate about clean code, performance optimization, and developer tooling.

\\section*{EXPERIENCE}

\\textbf{Senior Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Meta, Menlo Park, CA}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\vspace{0.15cm}

\\textbf{Software Engineer} \\hfill \\textit{2018 -- 2021}\\\\
\\textit{Stripe, San Francisco, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\end{itemize}

\\section*{PROJECTS}

\\textbf{DevOps Dashboard} \\hfill \\textit{2023}\\\\
\\textit{React, TypeScript, Go, Kubernetes}
\\begin{itemize}
\\item Built a streaming analytics platform processing 50K+ events per second with sub-second visualization updates, using WebSocket-based pipelines and custom D3.js chart components optimized for real-time rendering across desktop and mobile viewports
\\item Reduced decision-making time for product teams by 40\\% through intuitive drill-down dashboards with automated anomaly detection, customizable KPI widgets, and exportable reports supporting CSV, PDF, and Slack integrations
\\end{itemize}

\\section*{SKILLS}
TypeScript, React, Node.js, Go, Python, PostgreSQL, Redis, GraphQL, Docker, Kubernetes, AWS, CI/CD, System Design

\\section*{EDUCATION}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2018}\\\\
\\textit{University of California, Berkeley}

\\section*{CERTIFICATIONS}

\\textbf{AWS Solutions Architect Associate} \\hfill \\textit{2022}\\\\
\\textit{Amazon Web Services}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info: "email | phone | location" centered (use pipe separator |)
- Section headings: Bold uppercase with horizontal rule
- Experience: Title bold right-aligned dates, company italic below
- Each bullet MUST be 2-4 lines with action verb + measurable impact
- Skills: Comma-separated on one line`,

  },

  // 10. Compact Two-Column LaTeX Resume
  {
    id: 'latex-compact-two-column',
    name: 'Compact Professional',
    category: 'professional',
    description: 'Space-efficient professional design with tight margins',
    preview: 'ATS-friendly compact LaTeX resume maximizing content density',
    format: 'latex',
    styleGuide: `COMPACT PROFESSIONAL — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a compact, ATS-optimized professional resume.

RULES:
- Single-column layout ONLY. No sidebars or minipages.
- NO colors. Pure black text only.
- Tight margins (0.6in) for maximum content density.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- Skills as comma-separated inline text.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titlespacing*{\\section}{0pt}{8pt}{3pt}
\\titleformat{\\section}{\\normalsize\\bfseries\\uppercase}{}{0em}{}[\\titlerule]

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.2em}
\\setlist[itemize]{leftmargin=*,topsep=0.1em,itemsep=0.05em}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[0.1cm]
{\\small email | phone | location}
\\end{center}

\\section*{SUMMARY}
Results-driven backend engineer with 4+ years building high-throughput distributed systems. Reduced API latency by 60\\% at scale. Strong expertise in Go, Rust, and cloud-native architectures.

\\section*{EXPERIENCE}

\\textbf{Backend Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Cloudflare, Austin, TX}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\item Led cross-functional initiative to redesign the authentication system supporting OAuth 2.0 and SAML, implementing fine-grained role-based access control for 50M+ user accounts while reducing auth latency by 60\\% through session caching
\\end{itemize}

\\vspace{0.1cm}

\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{Datadog, New York, NY}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Distributed Key-Value Store} \\hfill \\textit{2023}\\\\
\\textit{Rust, gRPC, Raft Consensus}
\\begin{itemize}
\\item Developed a full-stack e-commerce platform with React and Node.js handling 10K+ daily transactions, implementing real-time inventory synchronization, Stripe payment integration, and an event sourcing pattern achieving 99.9\\% data consistency
\\item Implemented a recommendation engine using collaborative filtering and content-based algorithms, increasing average order value by 18\\% and reducing cart abandonment rate by 12\\% through personalized product suggestions
\\end{itemize}

\\section*{SKILLS}
Go, Rust, Python, C++, PostgreSQL, Redis, Kafka, gRPC, Docker, Kubernetes, AWS, Terraform, Linux, Distributed Systems

\\section*{EDUCATION}

\\textbf{B.S. in Computer Engineering} \\hfill \\textit{2019}\\\\
\\textit{Georgia Institute of Technology}

\\end{document}

CRITICAL FORMATTING RULES:
- Compact spacing: 10pt font, 0.6in margins, tight line spacing
- Contact info: "email | phone | location" centered (use pipe separator |)
- Each bullet MUST be 2-4 lines with action verb + measurable impact
- Skills: Comma-separated on one line`,

  },

  // 11. Elegant LaTeX Resume
  {
    id: 'latex-elegant',
    name: 'Elegant Design',
    category: 'professional',
    description: 'Sophisticated layout with refined typography and generous spacing',
    preview: 'ATS-friendly elegant LaTeX resume with refined professional styling',
    format: 'latex',
    styleGuide: `ELEGANT DESIGN — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate an elegant, ATS-optimized professional resume.

RULES:
- Single-column layout ONLY. No sidebars.
- NO colors. Pure black text only.
- Centered dot separator for contact info ($\\cdot$).
- Generous spacing for a sophisticated feel (0.8in margins).
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- Skills as comma-separated inline text.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.85in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{palatino}

\\titleformat{\\section}{\\normalsize\\scshape\\bfseries}{}{0em}{}[\\titlerule[0.4pt]]
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
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Senior Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Airbnb, San Francisco, CA}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\vspace{0.15cm}

\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{Spotify, New York, NY}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Cross-Platform UI Toolkit} \\hfill \\textit{2023}\\\\
\\textit{React Native, Swift, Kotlin}
\\begin{itemize}
\\item Created a developer productivity CLI tool automating project scaffolding and code generation, achieving 2K+ GitHub stars and 500+ weekly npm downloads through comprehensive documentation and an intuitive plugin architecture
\\item Established robust CI/CD with automated testing across Node.js 18/20/22, cross-platform compatibility validation, semantic versioning, and automated changelog generation ensuring reliable npm releases
\\end{itemize}

\\section*{SKILLS}
React, React Native, TypeScript, Swift, Kotlin, GraphQL, Figma, A/B Testing, CI/CD, Accessibility, Design Systems

\\section*{EDUCATION}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2019}\\\\
\\textit{Carnegie Mellon University, Pittsburgh, PA}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info: Use $\\cdot$ (centered dot) as separator, centered
- Section headings: Bold uppercase with thin rule below
- Generous spacing for elegant feel
- Each bullet MUST be 2-4 lines with action verb + measurable impact
- Skills: Comma-separated on one line`,

  },

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
  {
    id: 'latex-simple-clean',
    name: 'Simple Clean',
    category: 'minimal',
    description: 'Ultra-simple design with minimal formatting and maximum readability',
    preview: 'ATS-friendly ultra-clean LaTeX resume with zero decoration',
    format: 'latex',
    styleGuide: `SIMPLE CLEAN — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate an ultra-clean, ATS-optimized minimal resume.

RULES:
- Single-column layout ONLY. No sidebars.
- NO colors, NO packages beyond geometry and enumitem. Pure simplicity.
- NO decorative elements. Only \\hrule for section separation.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- Skills as comma-separated inline text.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\Large\\textbf{NAME}}\\\\[4pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}

\\vspace{6pt}
\\hrule
\\vspace{8pt}

\\textbf{\\uppercase{Summary}}\\\\[0.1cm]
Data engineer with 4+ years of experience building ETL pipelines and data platforms. Processed 5TB+ daily data volumes for analytics teams at high-growth startups. Strong expertise in Python, SQL, and cloud data warehousing.

\\vspace{0.3cm}

\\textbf{\\uppercase{Experience}}\\\\[0.1cm]
\\textbf{Senior Data Engineer} \\hfill \\textit{2022 -- Present}\\\\
\\textit{Databricks, San Francisco, CA}
\\begin{itemize}
\\item Architected real-time data pipeline processing 5TB+ daily events with 99.9\\% data completeness SLA
\\item Built automated data quality framework reducing data incidents by 70\\% across 200+ tables
\\item Led migration from on-premise Hadoop to cloud-native Spark, reducing compute costs by 45\\%
\\end{itemize}

\\vspace{0.15cm}

\\textbf{Data Engineer} \\hfill \\textit{2020 -- 2022}\\\\
\\textit{Snowflake, San Mateo, CA}
\\begin{itemize}
\\item Developed customer analytics pipeline serving dashboards for 500+ enterprise clients
\\item Optimized query performance reducing average execution time by 55\\% through partition strategies
\\end{itemize}

\\vspace{0.3cm}

\\textbf{\\uppercase{Projects}}\\\\[0.1cm]
\\textbf{Real-Time Anomaly Detection} \\hfill \\textit{2023}\\\\
\\textit{Python, Apache Kafka, Flink}
\\begin{itemize}
\\item Built streaming anomaly detection system identifying data quality issues within 30 seconds of occurrence
\\item Reduced manual data validation effort by 80\\% through automated monitoring and alerting
\\end{itemize}

\\vspace{0.3cm}

\\textbf{\\uppercase{Skills}}\\\\[0.1cm]
Python, SQL, Apache Spark, Kafka, Airflow, dbt, Snowflake, BigQuery, AWS, Terraform, Docker, Git

\\vspace{0.3cm}

\\textbf{\\uppercase{Education}}\\\\[0.1cm]
\\textbf{B.S. in Computer Science} \\hfill \\textit{2020}\\\\
\\textit{University of Michigan, Ann Arbor}

\\end{document}

CRITICAL FORMATTING RULES:
- NO colors, NO fancy formatting — pure black text only
- Contact info: "email | phone | location" centered (use pipe separator |)
- Section headings: Bold uppercase text, no rules except top \\hrule
- Each bullet MUST be 2-4 lines with action verb + measurable impact
- Skills: Comma-separated on one line`,

  },

  // 14. Professional Summary LaTeX Resume
  {
    id: 'latex-professional-summary',
    name: 'Professional Summary',
    category: 'professional',
    description: 'Summary-focused layout with key highlights and clear structure',
    preview: 'ATS-friendly professional LaTeX resume with strong summary section',
    format: 'latex',
    styleGuide: `PROFESSIONAL SUMMARY — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a summary-focused, ATS-optimized resume.

RULES:
- Single-column layout ONLY. No sidebars.
- NO colors. Pure black text only.
- Strong professional summary section at the top.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- Skills as comma-separated inline text.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{charter}

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
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Software Engineer III} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Microsoft, Redmond, WA}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\item Led cross-functional initiative to redesign the authentication system supporting OAuth 2.0 and SAML, implementing fine-grained role-based access control for 50M+ user accounts while reducing auth latency by 60\\% through session caching
\\end{itemize}

\\vspace{0.15cm}

\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{LinkedIn, Sunnyvale, CA}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Open-Source CLI Tool} \\hfill \\textit{2023}\\\\
\\textit{Node.js, TypeScript, Commander.js}
\\begin{itemize}
\\item Designed an open-source distributed task scheduler supporting cron-based and event-driven workflows, handling 1M+ daily job executions with automatic retry logic, dead letter queues, and a web-based monitoring dashboard
\\end{itemize}

\\section*{SKILLS}
TypeScript, JavaScript, React, C\\#, .NET, Python, SQL, Azure, Docker, Git, REST APIs, GraphQL, Agile/Scrum

\\section*{EDUCATION}

\\textbf{B.S. in Software Engineering} \\hfill \\textit{2019}\\\\
\\textit{University of Texas at Austin}

\\section*{CERTIFICATIONS}

\\textbf{Microsoft Azure Developer Associate} \\hfill \\textit{2022}\\\\
\\textit{Microsoft}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info: "email | phone | location" left-aligned (use pipe separator |)
- Summary: 3-4 lines covering years of experience, scope, and key strengths
- Each bullet MUST be 2-4 lines with action verb + measurable impact
- Skills: Comma-separated on one line`,

  },

  // 15. Modern Minimal LaTeX Resume
  {
    id: 'latex-modern-minimal',
    name: 'Modern Minimal',
    category: 'minimal',
    description: 'Contemporary minimal design with generous whitespace and clean lines',
    preview: 'ATS-friendly modern minimal LaTeX resume with contemporary clean styling',
    format: 'latex',
    styleGuide: `MODERN MINIMAL — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a minimal, ATS-optimized modern resume.

RULES:
- Single-column layout ONLY. No sidebars.
- NO colors. Pure black text only.
- Generous spacing (0.8in margins) for a clean, breathing feel.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- Skills as comma-separated inline text.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.85in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule[0.3pt]]
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

\\vspace{12pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Frontend Engineer} \\hfill \\textit{2022 -- Present}\\\\
\\textit{Vercel, Remote}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\vspace{0.15cm}

\\textbf{UI Engineer} \\hfill \\textit{2020 -- 2022}\\\\
\\textit{Figma, San Francisco, CA}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{CSS Animation Library} \\hfill \\textit{2023}\\\\
\\textit{TypeScript, CSS Houdini, Web Animations API}
\\begin{itemize}
\\item Built a streaming analytics platform processing 50K+ events per second with sub-second visualization updates, using WebSocket-based pipelines and custom D3.js chart components optimized for real-time rendering across desktop and mobile viewports
\\item Reduced decision-making time for product teams by 40\\% through intuitive drill-down dashboards with automated anomaly detection, customizable KPI widgets, and exportable reports supporting CSV, PDF, and Slack integrations
\\end{itemize}

\\section*{SKILLS}
TypeScript, React, Next.js, Vue.js, CSS/Sass, Tailwind, Framer Motion, WebGL, Figma, Storybook, Testing Library, Playwright

\\section*{EDUCATION}

\\textbf{B.A. in Design \\& Computer Science} \\hfill \\textit{2020}\\\\
\\textit{Rhode Island School of Design}

\\end{document}

CRITICAL FORMATTING RULES:
- Generous spacing: 0.8in margins, breathable layout
- Contact info: "email | phone | location" centered (use pipe separator |)
- Section headings: Bold uppercase with thin rule
- Each bullet MUST be 2-4 lines with action verb + measurable impact
- Skills: Comma-separated on one line`,

  },

  // 16. Comprehensive LaTeX Resume
  {
    id: 'latex-comprehensive',
    name: 'Comprehensive Format',
    category: 'professional',
    description: 'Complete layout with all standard sections for thorough profiles',
    preview: 'ATS-friendly comprehensive LaTeX resume with all standard resume sections',
    format: 'latex',
    styleGuide: `COMPREHENSIVE FORMAT — FAANG-LEVEL ATS TEMPLATE

YOU ARE A SENIOR RESUME ENGINEER. Generate a comprehensive, ATS-optimized resume with all sections.

RULES:
- Single-column layout ONLY. No sidebars.
- NO colors. Pure black text only.
- Include all standard resume sections when data is available.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet MUST start with a strong action verb and include measurable impact.
- Skills grouped by category with bold labels.
- If a section has no data, OMIT it entirely.
- Render ALL user-provided data without truncation.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[4pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{6pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Lead Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Amazon, Seattle, WA}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\vspace{0.15cm}

\\textbf{Software Engineer II} \\hfill \\textit{2018 -- 2021}\\\\
\\textit{Salesforce, San Francisco, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Infrastructure Cost Optimizer} \\hfill \\textit{2023}\\\\
\\textit{Go, AWS Lambda, CloudWatch, Terraform}
\\begin{itemize}
\\item Developed a full-stack e-commerce platform with React and Node.js handling 10K+ daily transactions, implementing real-time inventory synchronization, Stripe payment integration, and an event sourcing pattern achieving 99.9\\% data consistency
\\item Implemented a recommendation engine using collaborative filtering and content-based algorithms, increasing average order value by 18\\% and reducing cart abandonment rate by 12\\% through personalized product suggestions
\\end{itemize}

\\section*{SKILLS}
\\textbf{Languages:} Java, Go, TypeScript, Python, SQL\\\\
\\textbf{Frameworks:} Spring Boot, React, Next.js, FastAPI\\\\
\\textbf{Cloud \\& DevOps:} AWS, Terraform, Docker, Kubernetes, Jenkins, GitHub Actions\\\\
\\textbf{Databases:} PostgreSQL, DynamoDB, Redis, Elasticsearch

\\section*{EDUCATION}

\\textbf{M.S. in Computer Science} \\hfill \\textit{2018}\\\\
\\textit{Stanford University, Stanford, CA}

\\vspace{0.15cm}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2016}\\\\
\\textit{University of Illinois at Urbana-Champaign}

\\section*{CERTIFICATIONS}

\\textbf{AWS Solutions Architect Professional} \\hfill \\textit{2023}\\\\
\\textit{Amazon Web Services}

\\vspace{0.1cm}

\\textbf{Certified Kubernetes Administrator (CKA)} \\hfill \\textit{2022}\\\\
\\textit{Cloud Native Computing Foundation}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info: "email | phone | location" first line, "linkedin | portfolio" second line (use pipe separator |)
- Skills: Grouped by category with bold labels, comma-separated values
- Comprehensive: Include all sections with realistic data
- Each bullet MUST be 2-4 lines with action verb + measurable impact`,

  },

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
  {
    id: 'html-modern-gradient',
    name: 'Modern Clean',
    category: 'modern',
    description: 'Contemporary clean design with modern sans-serif typography',
    preview: 'ATS-friendly modern HTML resume with clean contemporary styling',
    format: 'html',
    styleGuide: `MODERN CLEAN — FAANG-LEVEL ATS TEMPLATE

RULES:
- HEADER BAND layout: Colored header area with white text, white body below.
- Print-safe header background (no gradients).
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;background:#fff}
.header{background:#0f172a;padding:28px 42px 22px;}
.header h1{font-size:22px;font-weight:700;color:#fff;margin-bottom:4px}
.header .contact{font-size:10.5px;color:rgba(255,255,255,0.7)}
.header .contact a{color:rgba(255,255,255,0.85);text-decoration:none}
.body{padding:22px 42px 36px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0f172a;border-top:2px solid #333;padding-top:10px;padding-bottom:0;padding-bottom:3px;margin:18px 0 8px}
h2:first-child{margin-top:0}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
@media print{.header{background:#0f172a !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.resume{margin:0}}
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
- Dark/colored header band (#0f172a) with white text
- White body below with standard section layout
- Header contains name + contact
- Print-safe: solid background, no gradients
- Font: System UI`,

  },

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
  {
    id: 'html-corporate-executive',
    name: 'Corporate Executive',
    category: 'executive',
    description: 'Executive format emphasizing leadership scope and strategic impact',
    preview: 'ATS-friendly executive HTML resume for senior leadership positions',
    format: 'html',
    styleGuide: `CORPORATE EXECUTIVE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column with SPLIT HEADER: Name + title on left, contact info stacked on right.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:40px 48px;background:#fff}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;margin-bottom:18px;border-bottom:1px solid #333}
.header-left h1{font-size:24px;font-weight:700;color:#1a1a1a;margin-bottom:2px}
.header-left .title{font-size:11px;color:#666;font-weight:400}
.header-right{text-align:right;font-size:10px;color:#555;line-height:1.7}
.header-right a{color:#444;text-decoration:none}
h2{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#333;border-bottom:1px solid #999;padding-bottom:4px;margin:16px 0 8px}
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
- Section headings: serif uppercase with thin gray rule
- Skills: comma-separated inline text
- Font: Georgia`,

  },

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
  {
    id: 'html-clean-minimal',
    name: 'Clean Minimal',
    category: 'minimal',
    description: 'Ultra-clean minimal layout with maximum content focus',
    preview: 'ATS-friendly minimal HTML resume with clean typography',
    format: 'html',
    styleGuide: `CLEAN MINIMAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Centered header. Thin HR dividers between every section.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:46px 52px;background:#fff}
h1{text-align:center;font-size:24px;font-weight:700;letter-spacing:0.5px;margin-bottom:4px;color:#1a1a1a}
.contact{text-align:center;color:#555;margin-bottom:24px;font-size:10.5px}
hr{border:none;border-top:1px solid #e5e5e5;margin:20px 0}
h2{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:2.5px;color:#666;margin:0 0 10px}
.entry{margin-bottom:14px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#666;white-space:nowrap}
.entry-sub{font-size:10px;color:#666;margin-bottom:4px}
ul{padding-left:18px;margin:3px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.6;color:#1a1a1a}
@media print{.resume{padding:32px 40px;margin:0}}
</style></head><body><div class="resume">
    <h1>NAME</h1>
<div class="contact">email | phone | location</div>
<hr>
<h2>Summary</h2>
<p>Backend engineer with 5+ years building high-throughput APIs and data pipelines. Delivered distributed systems processing 100M+ requests daily with 99.99% reliability. Expert in Go, Python, and cloud infrastructure.</p>
<hr>
  <h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Backend Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Datadog, New York, NY</div><ul><li>Designed metric ingestion pipeline processing 100M+ data points per minute with 99.99% data integrity, implementing sharded write-ahead logging and automatic partition rebalancing across 50+ nodes</li><li>Reduced query latency by 55% through custom time-series indexing strategy, enabling sub-second dashboard loads for 20K+ enterprise customers monitoring 500+ services</li><li>Led backend team of 6 engineers delivering core observability features that contributed to 30% increase in enterprise ARR</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Twilio, San Francisco, CA</div><ul><li>Built messaging API handling 10B+ messages monthly with sub-100ms delivery latency, implementing intelligent routing and automatic failover across 3 geographic regions</li><li>Implemented rate limiting and abuse detection system reducing malicious traffic by 80% while maintaining 99.9% legitimate message delivery rate</li></ul></div>
<hr>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Distributed Task Queue</span><span class="entry-date">2023</span></div><div class="entry-sub">Go, Redis, gRPC</div><ul><li>Built open-source task queue supporting 50K+ tasks/sec with exactly-once processing guarantees and automatic dead-letter queue routing</li></ul></div>
<hr>
<h2>Skills</h2>
<p class="skills-text">Go, Python, Java, PostgreSQL, Redis, Kafka, gRPC, AWS, Docker, Kubernetes, Terraform, CI/CD</p>
<hr>
  <h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">M.S. Computer Science</span><span class="entry-date">2019</span></div><div class="entry-sub">Columbia University</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Centered name + centered contact info
- Thin horizontal rule (1px #e5e5e5) separates EVERY section
- Section headings: uppercase, wide letter-spacing (2.5px), no border
- Generous padding (46px 52px)
- Skills: comma-separated inline text
- Font: Segoe UI`,

  },

  // 15. Professional Blue HTML Resume
  {
    id: 'html-professional-blue',
    name: 'Professional Blue',
    category: 'professional',
    description: 'Classic professional resume with subtle blue accent on section headings',
    preview: 'ATS-friendly professional HTML resume with blue accented section headings',
    format: 'html',
    styleGuide: `PROFESSIONAL BLUE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column layout. Left-aligned header. Black border-bottom section headings.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:40px 46px;background:#fff}
h1{font-size:22px;font-weight:700;color:#1e40af;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:18px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;border-bottom:2px solid #1e40af;color:#1e40af;padding-bottom:3px;margin:18px 0 8px;color:#1e40af}
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
- Left-aligned header with name (22px) and contact below
- Section headings: uppercase, border-bottom:2px solid #1e40af;color:#1e40af
- Entry: title left + date right (flex space-between), subtitle below
- Skills: comma-separated inline text
- Font: Segoe UI`,

  },

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
  {
    id: 'html-modern-executive',
    name: 'Modern Executive',
    category: 'executive',
    description: 'Executive-level serif layout for senior leadership roles',
    preview: 'ATS-friendly executive HTML resume with serif typography for leadership roles',
    format: 'html',
    styleGuide: `MODERN EXECUTIVE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column with SPLIT HEADER: Name + title on left, contact info stacked on right.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:40px 46px;background:#fff}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;margin-bottom:16px;border-bottom:3px solid #111}
.header-left h1{font-size:24px;font-weight:700;color:#111;margin-bottom:2px}
.header-left .title{font-size:11px;color:#666;font-weight:400}
.header-right{text-align:right;font-size:10px;color:#555;line-height:1.7}
.header-right a{color:#2563eb;text-decoration:none}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#111;border-bottom:2px solid #111;padding-bottom:4px;margin:16px 0 8px}
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
- Section headings: uppercase with thick black rule
- Skills: comma-separated inline text
- Font: System UI`,

  },

  // 21. Tech Startup V2 HTML Resume
  {
    id: 'html-tech-startup-v2',
    name: 'Tech Focused',
    category: 'modern',
    description: 'Developer-focused layout emphasizing technical depth and open source',
    preview: 'ATS-friendly developer-focused HTML resume for technical roles',
    format: 'html',
    styleGuide: `TECH FOCUSED — FAANG-LEVEL ATS TEMPLATE

RULES:
- COMPACT DENSE single-column layout. Tight spacing for maximum content density.
- Base font: 9.5px. Reduced padding and margins throughout.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1a1a1a;font-size:9.5px;line-height:1.4}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:26px 32px;background:#fff}
h1{font-size:18px;font-weight:700;color:#111;margin-bottom:2px}
.contact{font-size:9px;color:#555;margin-bottom:10px}
h2{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#111;border-bottom:1px solid #333;padding-bottom:2px;margin:10px 0 4px}
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
- Compact: 9.5px base font, tight padding (26px 32px)
- Section headings: tiny uppercase with thin rule
- Minimal gaps between entries (8px)
- Skills: comma-separated inline text, compact
- Designed to fit maximum content on one page
- Font: System UI`,

  },

  // 22. Minimalist Professional HTML Resume
  {
    id: 'html-minimalist-professional',
    name: 'Minimalist Professional',
    category: 'minimal',
    description: 'Ultra-minimal layout with lightweight typography',
    preview: 'ATS-friendly ultra-minimal HTML resume with maximum readability',
    format: 'html',
    styleGuide: `MINIMALIST PROFESSIONAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Centered header. Thin HR dividers between every section.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:44px 48px;background:#fff}
h1{text-align:center;font-size:20px;font-weight:700;letter-spacing:0.5px;margin-bottom:4px;color:#000}
.contact{text-align:center;color:#555;margin-bottom:24px;font-size:10.5px}
hr{border:none;border-top:1px solid #ccc;margin:20px 0}
h2{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#999;margin:0 0 10px}
.entry{margin-bottom:14px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#666;white-space:nowrap}
.entry-sub{font-size:10px;color:#666;margin-bottom:4px}
ul{padding-left:18px;margin:3px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.6;color:#1a1a1a}
@media print{.resume{padding:32px 40px;margin:0}}
</style></head><body><div class="resume">
    <h1>NAME</h1>
    <div class="contact">email | phone | location</div>
<hr>
<h2>Summary</h2>
<p>Backend engineer with 5+ years building high-throughput APIs and data pipelines. Delivered distributed systems processing 100M+ requests daily with 99.99% reliability. Expert in Go, Python, and cloud infrastructure.</p>
<hr>
    <h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Backend Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Datadog, New York, NY</div><ul><li>Designed metric ingestion pipeline processing 100M+ data points per minute with 99.99% data integrity, implementing sharded write-ahead logging and automatic partition rebalancing across 50+ nodes</li><li>Reduced query latency by 55% through custom time-series indexing strategy, enabling sub-second dashboard loads for 20K+ enterprise customers monitoring 500+ services</li><li>Led backend team of 6 engineers delivering core observability features that contributed to 30% increase in enterprise ARR</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Twilio, San Francisco, CA</div><ul><li>Built messaging API handling 10B+ messages monthly with sub-100ms delivery latency, implementing intelligent routing and automatic failover across 3 geographic regions</li><li>Implemented rate limiting and abuse detection system reducing malicious traffic by 80% while maintaining 99.9% legitimate message delivery rate</li></ul></div>
<hr>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Distributed Task Queue</span><span class="entry-date">2023</span></div><div class="entry-sub">Go, Redis, gRPC</div><ul><li>Built open-source task queue supporting 50K+ tasks/sec with exactly-once processing guarantees and automatic dead-letter queue routing</li></ul></div>
<hr>
<h2>Skills</h2>
<p class="skills-text">Go, Python, Java, PostgreSQL, Redis, Kafka, gRPC, AWS, Docker, Kubernetes, Terraform, CI/CD</p>
<hr>
    <h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">M.S. Computer Science</span><span class="entry-date">2019</span></div><div class="entry-sub">Columbia University</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Centered name + centered contact info
- Thin horizontal rule (1px #ccc) separates EVERY section
- Section headings: uppercase, wide letter-spacing (3px), no border
- Generous padding (44px 48px)
- Skills: comma-separated inline text
- Font: Segoe UI`,

  },

  // 23. Structured Professional HTML Resume
  {
    id: 'html-bold-creative-v2',
    name: 'Structured Professional',
    category: 'creative',
    description: 'Well-structured layout with strong visual hierarchy and bold headings',
    preview: 'ATS-friendly structured HTML resume with bold heading hierarchy',
    format: 'html',
    styleGuide: `STRUCTURED PROFESSIONAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- BOLD TYPOGRAPHY layout: Heavy visual hierarchy through font weight and size.
- Large uppercase name. Section headings as dark background strips.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:36px 42px;background:#fff}
.header{border-bottom:3px solid #333;padding-bottom:12px;margin-bottom:16px}
h1{font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1a1a1a;margin-bottom:6px}
.contact{font-size:10px;color:#555}
h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#fff;background:#333;padding:6px 14px;margin:18px 0 10px;border-radius:3px}
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
- Bold: 24px uppercase name with heavy weight
- Section headings: white text on dark background strip (#333)
- Strong visual contrast between hierarchy levels
- Skills: comma-separated inline text
- Font: Segoe UI`,

  },

  // 24. Academic CV V2 HTML Resume
  {
    id: 'html-academic-research-v2',
    name: 'Academic CV',
    category: 'academic',
    description: 'Comprehensive academic CV with publications and research focus',
    preview: 'ATS-friendly academic CV HTML resume with publications section',
    format: 'html',
    styleGuide: `ACADEMIC CV V2 — FAANG-LEVEL ATS TEMPLATE

RULES:
- BOXED SECTIONS layout: Each section in a subtle bordered box.
- Section headings inside shaded header strips within boxes.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:38px 44px;background:#fff}
h1{font-size:20px;font-weight:700;color:#2a2a2a;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:18px}
h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#4a4a3a;background:#f5f3ef;border:1px solid #d5d0c8;border-radius:3px;padding:7px 14px;margin:16px 0 10px}
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
- Section headings styled as bordered/shaded pill strips (background #f5f3ef, border #d5d0c8, rounded)
- Visual boxed-section feel via CSS only — NO wrapper divs
- Warm academic serif typography (Georgia)
- Skills: comma-separated inline text
- Font: Georgia`,

  },

  // 25. Professional Accent HTML Resume
  {
    id: 'html-professional-gradient',
    name: 'Professional Accent',
    category: 'professional',
    description: 'Professional layout with subtle blue accent underlines on headings',
    preview: 'ATS-friendly professional HTML resume with subtle accent styling',
    format: 'html',
    styleGuide: `PROFESSIONAL ACCENT — FAANG-LEVEL ATS TEMPLATE

RULES:
- HEADER BAND layout: Colored header area with white text, white body below.
- Print-safe header background (no gradients).
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;background:#fff}
.header{background:#1e3a5f;padding:28px 44px 22px;}
.header h1{font-size:22px;font-weight:700;color:#fff;margin-bottom:4px}
.header .contact{font-size:10.5px;color:rgba(255,255,255,0.75)}
.header .contact a{color:rgba(255,255,255,0.85);text-decoration:none}
.body{padding:22px 44px 38px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#1e3a5f;border-bottom:1px solid #d0daea;padding-bottom:3px;padding-bottom:3px;margin:18px 0 8px}
h2:first-child{margin-top:0}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
@media print{.header{background:#1e3a5f !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.resume{margin:0}}
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
- Dark/colored header band (#1e3a5f) with white text
- White body below with standard section layout
- Header contains name + contact
- Print-safe: solid background, no gradients
- Font: Segoe UI`,

  },

  // ── Additional LaTeX Templates (17-25) ────────────────────────────────────────

  // 17. Executive Summary LaTeX Resume
  {
    id: 'latex-executive-summary',
    name: 'Executive Summary',
    category: 'executive',
    description: 'Executive-level LaTeX resume with prominent summary and leadership focus',
    preview: 'ATS-friendly executive LaTeX resume with prominent summary section',
    format: 'latex',
    styleGuide: `EXECUTIVE SUMMARY — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Clean executive styling. Prominent summary.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: leadership scope + measurable business impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.8in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{mathptmx}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{6pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[6pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}\\\\[2pt]
{\\small linkedin\\ \\textbar\\ portfolio}
\\end{center}

\\vspace{10pt}

\\section*{EXECUTIVE SUMMARY}
Seasoned technology executive with 15+ years leading engineering organizations of 200+ engineers across multiple geographies. Track record of delivering platform transformations, building high-performance teams, and driving technical strategy aligned with business objectives.

\\section*{PROFESSIONAL EXPERIENCE}

\\textbf{VP of Engineering} \\hfill \\textit{2020 -- Present}\\\\
\\textit{Tech Corp, San Francisco, CA}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\item Led cross-functional initiative to redesign the authentication system supporting OAuth 2.0 and SAML, implementing fine-grained role-based access control for 50M+ user accounts while reducing auth latency by 60\\% through session caching
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Senior Director of Engineering} \\hfill \\textit{2017 -- 2020}\\\\
\\textit{Enterprise Solutions Inc., Seattle, WA}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Platform Modernization Initiative} \\hfill \\textit{2022}\\\\
\\textit{Microservices, AWS, Kubernetes}
\\begin{itemize}
\\item Created a developer productivity CLI tool automating project scaffolding and code generation, achieving 2K+ GitHub stars and 500+ weekly npm downloads through comprehensive documentation and an intuitive plugin architecture
\\item Established robust CI/CD with automated testing across Node.js 18/20/22, cross-platform compatibility validation, semantic versioning, and automated changelog generation ensuring reliable npm releases
\\end{itemize}

\\section*{SKILLS}
Strategic Planning, Team Leadership, P\\&L Management, Cloud Architecture, Agile/Scrum, System Design, AWS, GCP, Kubernetes

\\section*{EDUCATION}

\\textbf{MBA} \\hfill \\textit{2015}\\\\
\\textit{Harvard Business School, Boston, MA}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2008}\\\\
\\textit{MIT, Cambridge, MA}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" first line, "linkedin | portfolio" second line (pipe separator)
- Prominent executive summary (3-4 lines)
- Each bullet: 2-4 lines, leadership scope + business impact
- Skills: comma-separated inline text`,

  },

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
  {
    id: 'latex-compact-professional',
    name: 'Compact Professional',
    category: 'professional',
    description: 'Space-efficient LaTeX resume with tight margins for dense content',
    preview: 'ATS-friendly compact LaTeX resume optimized for content density',
    format: 'latex',
    styleGuide: `COMPACT PROFESSIONAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Tight margins (0.6in). Compact spacing. No colors.
- Sections: Header → Summary → Skills → Experience → Projects → Education
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries}{}{0em}{}
\\titlespacing*{\\section}{0pt}{6pt}{3pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=10pt,itemsep=0pt,topsep=1pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\Large\\textbf{NAME}}\\\\[2pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}

\\vspace{4pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{SKILLS}
Python, SQL, Apache Spark, Airflow, Kafka, Flink, Snowflake, BigQuery, AWS, Terraform, dbt

\\section*{EXPERIENCE}

\\textbf{Senior Data Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Snowflake, San Mateo, CA}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\vspace{0.15cm}

\\textbf{Data Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{Palantir, Palo Alto, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Real-Time Analytics Dashboard} \\hfill \\textit{2023}\\\\
\\textit{Apache Kafka, Flink, React}
\\begin{itemize}
\\item Designed an open-source distributed task scheduler supporting cron-based and event-driven workflows, handling 1M+ daily job executions with automatic retry logic, dead letter queues, and a web-based monitoring dashboard
\\end{itemize}

\\section*{EDUCATION}

\\textbf{M.S. in Data Science} \\hfill \\textit{2019}\\\\
\\textit{Stanford University, Stanford, CA}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" left-aligned (pipe separator)
- Compact: 0.6in margins, tight spacing, no colors
- Skills: comma-separated single line
- Each bullet: 2-4 lines, action verb + measurable impact`,

  },

  // 20. Academic Scholar LaTeX Resume
  {
    id: 'latex-academic-scholar',
    name: 'Academic Scholar',
    category: 'academic',
    description: 'Academic CV with publications, research interests, and scholarly formatting',
    preview: 'ATS-friendly academic LaTeX CV with publications and research focus',
    format: 'latex',
    styleGuide: `ACADEMIC SCHOLAR — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Academic CV order. No fancy colors.
- Sections: Header → Research Interests → Education → Research Experience → Publications → Awards
- Publications in proper citation format. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.8in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{palatino}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[6pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}\\\\[2pt]
{\\small website\\ \\textbar\\ orcid}
\\end{center}

\\vspace{10pt}

\\section*{SUMMARY}
Research-focused engineer with expertise in distributed systems, machine learning, and computational methods. Published in peer-reviewed venues with a focus on scalable computing and efficient algorithms. Combines academic rigor with practical engineering experience.

\\section*{EDUCATION}

\\textbf{Ph.D. in Machine Learning} \\hfill \\textit{2017 -- 2022}\\\\
\\textit{Stanford University, Stanford, CA}\\\\
Dissertation: "Sample-Efficient Reinforcement Learning in Partially Observable Environments"

\\vspace{0.2cm}

\\textbf{B.S. in Mathematics \\& Computer Science} \\hfill \\textit{2017}\\\\
\\textit{MIT, Cambridge, MA --- Summa Cum Laude}

\\section*{RESEARCH EXPERIENCE}

\\textbf{Assistant Professor} \\hfill \\textit{2022 -- Present}\\\\
\\textit{UC Berkeley, EECS Department}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\item Led cross-functional initiative to redesign the authentication system supporting OAuth 2.0 and SAML, implementing fine-grained role-based access control for 50M+ user accounts while reducing auth latency by 60\\% through session caching
\\end{itemize}

\\section*{PUBLICATIONS}

\\textbf{Peer-Reviewed Journals}
\\begin{itemize}
\\item Doe, J., \\& Smith, A. (2023). "Efficient Policy Gradient Methods for Multi-Agent Systems." \\textit{NeurIPS 2023}, Oral Presentation.
\\item Doe, J., et al. (2022). "Sample-Efficient Model-Based RL with Learned World Models." \\textit{ICML 2022}, 39(2), 1245--1260.
\\end{itemize}

\\textbf{Conference Proceedings}
\\begin{itemize}
\\item Doe, J., \\& Lee, B. (2021). "Robust Control via Adversarial Training in POMDPs." \\textit{ICLR 2021}, Spotlight.
\\end{itemize}

\\section*{AWARDS \\& HONORS}

\\textbf{Best Paper Award, NeurIPS 2023} \\hfill \\textit{2023}

\\textbf{NSF CAREER Award} \\hfill \\textit{2023}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" first line, "website | orcid" second line (pipe separator)
- Research interests: comma-separated list
- Publications: proper academic citation format
- Each bullet: 2-4 lines with research impact`,

  },

  // 21. Balanced Layout LaTeX Resume (converted to single-column)
  {
    id: 'latex-two-column-balanced',
    name: 'Balanced Layout',
    category: 'professional',
    description: 'Balanced single-column layout with optimal spacing and readability',
    preview: 'ATS-friendly balanced LaTeX resume with optimal spacing',
    format: 'latex',
    styleGuide: `BALANCED LAYOUT — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column layout. Balanced spacing. Clean black text.
- Sections: Header → Summary → Skills → Experience → Projects → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titlespacing*{\\section}{0pt}{10pt}{5pt}
\\titleformat{\\section}{\\normalsize\\bfseries\\uppercase}{}{0em}{}[\\titlerule]

\\setlength{\\parskip}{0.35em}
\\setlist[itemize]{leftmargin=*,topsep=0.15em,itemsep=0.08em}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[0.15cm]
{\\small email | phone | location}
\\end{center}

\\vspace{0.3cm}

\\section*{SUMMARY}
Product manager with 8+ years driving cross-functional product launches for SaaS platforms. Delivered features generating \\$15M+ ARR. Expert in user research, roadmap prioritization, and data-driven decision making.

\\section*{SKILLS}
Product Strategy, User Research, A/B Testing, SQL, Python, Jira, Figma, Data Analysis, Agile/Scrum, Stakeholder Management

\\section*{EXPERIENCE}

\\textbf{Senior Product Manager} \\hfill \\textit{2020 -- Present}\\\\
\\textit{Salesforce, San Francisco, CA}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Product Manager} \\hfill \\textit{2017 -- 2020}\\\\
\\textit{HubSpot, Cambridge, MA}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Customer Health Score Platform} \\hfill \\textit{2023}\\\\
\\textit{Python, ML Pipeline, React Dashboard}
\\begin{itemize}
\\item Built a streaming analytics platform processing 50K+ events per second with sub-second visualization updates, using WebSocket-based pipelines and custom D3.js chart components optimized for real-time rendering across desktop and mobile viewports
\\item Reduced decision-making time for product teams by 40\\% through intuitive drill-down dashboards with automated anomaly detection, customizable KPI widgets, and exportable reports supporting CSV, PDF, and Slack integrations
\\end{itemize}

\\section*{EDUCATION}

\\textbf{MBA} \\hfill \\textit{2017}\\\\
\\textit{Wharton School, University of Pennsylvania}

\\section*{CERTIFICATIONS}

\\textbf{Certified Scrum Product Owner (CSPO)} \\hfill \\textit{2019}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Single-column with balanced spacing
- Skills: comma-separated single line
- Each bullet: 2-4 lines, action verb + measurable impact`,

  },

  // 22. Modern Minimalist LaTeX Resume
  {
    id: 'latex-modern-minimalist',
    name: 'Modern Minimalist',
    category: 'minimal',
    description: 'Ultra-minimal LaTeX resume with generous whitespace and clean typography',
    preview: 'ATS-friendly ultra-minimal LaTeX resume with maximum readability',
    format: 'latex',
    styleGuide: `MODERN MINIMALIST — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Generous margins. Ultra-minimal styling. No colors.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.85in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}

\\titleformat{\\section}{\\normalsize\\bfseries}{}{0em}{}[\\titlerule[0.3pt]]
\\titlespacing*{\\section}{0pt}{14pt}{7pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=3pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[8pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{14pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Frontend Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Vercel, San Francisco, CA}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\item Established a structured mentorship program for junior engineers, conducting weekly technical design reviews and pair programming sessions that resulted in 3 promotions to senior within 18 months and a 25\\% improvement in team velocity
\\end{itemize}

\\vspace{0.3cm}

\\textbf{Web Developer} \\hfill \\textit{2020 -- 2021}\\\\
\\textit{Shopify, Ottawa, ON}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{CSS Framework} \\hfill \\textit{2023}\\\\
\\textit{CSS, PostCSS, TypeScript}
\\begin{itemize}
\\item Developed a full-stack e-commerce platform with React and Node.js handling 10K+ daily transactions, implementing real-time inventory synchronization, Stripe payment integration, and an event sourcing pattern achieving 99.9\\% data consistency
\\item Implemented a recommendation engine using collaborative filtering and content-based algorithms, increasing average order value by 18\\% and reducing cart abandonment rate by 12\\% through personalized product suggestions
\\end{itemize}

\\section*{SKILLS}
React, Next.js, TypeScript, CSS/Tailwind, HTML, Accessibility, Performance Optimization, Storybook, Testing Library

\\section*{EDUCATION}

\\textbf{B.S. in Information Technology} \\hfill \\textit{2020}\\\\
\\textit{University of Waterloo, Ontario, Canada}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Generous spacing, no colors, thin rule dividers
- Skills: comma-separated single line
- Each bullet: 2-4 lines, action verb + measurable impact`,

  },

  // 23. Professional Blue LaTeX Resume
  {
    id: 'latex-professional-blue',
    name: 'Professional Blue',
    category: 'professional',
    description: 'Professional LaTeX resume with subtle blue accent on section rules',
    preview: 'ATS-friendly professional LaTeX resume with blue section accents',
    format: 'latex',
    styleGuide: `PROFESSIONAL BLUE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Subtle blue on section headings only. Black body text.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{charter}

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
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Staff Security Engineer} \\hfill \\textit{2020 -- Present}\\\\
\\textit{Okta, San Francisco, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\item Deployed a real-time fraud detection system using ML models and rule-based engines, processing 50K+ transactions per minute and preventing \\$10M+ in annual losses while keeping false positive rates below 0.1\\%
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Security Engineer} \\hfill \\textit{2017 -- 2020}\\\\
\\textit{CrowdStrike, Sunnyvale, CA}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Open-Source Secrets Manager} \\hfill \\textit{2023}\\\\
\\textit{Go, Vault API, HSM Integration}
\\begin{itemize}
\\item Created a developer productivity CLI tool automating project scaffolding and code generation, achieving 2K+ GitHub stars and 500+ weekly npm downloads through comprehensive documentation and an intuitive plugin architecture
\\item Established robust CI/CD with automated testing across Node.js 18/20/22, cross-platform compatibility validation, semantic versioning, and automated changelog generation ensuring reliable npm releases
\\end{itemize}

\\section*{SKILLS}
Go, Python, Rust, OAuth/OIDC, TLS/PKI, AWS Security, Kubernetes Security, SIEM, Threat Modeling, SOC 2, ISO 27001

\\section*{EDUCATION}

\\textbf{M.S. in Cybersecurity} \\hfill \\textit{2017}\\\\
\\textit{Johns Hopkins University}

\\section*{CERTIFICATIONS}

\\textbf{CISSP} \\hfill \\textit{2019}

\\textbf{AWS Security Specialty} \\hfill \\textit{2021}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Blue accent on section headings only -- black body text
- Skills: comma-separated single line
- Each bullet: 2-4 lines, action verb + measurable impact`,

  },

  // 24. Creative Professional LaTeX Resume
  {
    id: 'latex-creative-designer',
    name: 'Creative Professional',
    category: 'creative',
    description: 'Clean professional LaTeX resume with bold typography for creative/design roles',
    preview: 'ATS-friendly creative LaTeX resume with bold professional styling',
    format: 'latex',
    styleGuide: `CREATIVE PROFESSIONAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Left-aligned header. Bold typography. No flashy colors.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\Large\\textbf{NAME}}\\hfill{\\small email\\ \\textbar\\ phone}\\\\[2pt]
\\noindent{\\small portfolio.com}\\hfill{\\small location}

\\vspace{8pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Principal Cloud Architect} \\hfill \\textit{2020 -- Present}\\\\
\\textit{Accenture, Chicago, IL}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Senior Cloud Engineer} \\hfill \\textit{2017 -- 2020}\\\\
\\textit{Amazon Web Services, Seattle, WA}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Infrastructure Cost Optimizer} \\hfill \\textit{2023}\\\\
\\textit{Python, AWS, Terraform, React}
\\begin{itemize}
\\item Built an automated feature engineering tool using Python and Scikit-learn that reduced model development time from weeks to hours, supporting automated feature selection, hyperparameter tuning, and cross-validation across 20+ ML algorithms
\\end{itemize}

\\section*{SKILLS}
AWS, GCP, Azure, Terraform, Kubernetes, Docker, Python, Go, CI/CD, Security, Compliance, Cost Optimization

\\section*{EDUCATION}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2017}\\\\
\\textit{Purdue University, West Lafayette, IN}

\\section*{CERTIFICATIONS}

\\textbf{AWS Solutions Architect Professional} \\hfill \\textit{2020}

\\textbf{GCP Professional Cloud Architect} \\hfill \\textit{2021}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location | portfolio" left-aligned (pipe separator)
- Bold typography with thick section rules
- Skills: comma-separated single line
- Each bullet: 2-4 lines, action verb + measurable impact`,

  },

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

  // ── Additional HTML Templates ───────────────────────────────────────────────

  // ── Additional LaTeX Templates ──────────────────────────────────────────────

  // ── New HTML Templates Batch (15) — FAANG-Level ATS Upgrades ──────────────
  {
    id: 'html-slate-sidebar-pro',
    name: 'Slate Sidebar Pro',
    category: 'professional',
    description: 'Clean single-column professional resume with slate accent headings',
    preview: 'ATS-friendly single-column slate-accented professional resume',
    format: 'html',
    styleGuide: `SLATE SIDEBAR PRO — FAANG-LEVEL ATS TEMPLATE

RULES:
- TWO-COLUMN sidebar layout. Left sidebar for Skills, Education, Certifications. Right main for Summary, Experience, Projects.
- Header spans full width above both columns.
- Uses CSS Grid with <aside> and <main> HTML5 elements.
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;background:#fff;display:grid;grid-template-columns:215px 1fr;grid-template-rows:auto 1fr}
header{grid-column:1/-1;padding:28px 36px 16px;border-bottom:2px solid #334155}
h1{font-size:22px;font-weight:700;color:#1e293b;margin-bottom:3px}
.contact{font-size:10px;color:#555}
aside{background:#f1f5f9;padding:20px 20px;border-right:1px solid #cbd5e1}
aside h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#334155;margin:16px 0 6px}
aside h2:first-child{margin-top:0}
aside ul{list-style:none;padding:0}
aside li{font-size:10px;color:#1e293b;padding:2px 0;line-height:1.4}
aside .entry{margin-bottom:10px}
aside .entry-title{font-size:10px;font-weight:600;color:#1e293b}
aside .entry-sub{font-size:9.5px;color:#64748b}
main{padding:20px 28px}
main h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#334155;border-bottom:1px solid #cbd5e1;padding-bottom:3px;margin:16px 0 8px}
main h2:first-child{margin-top:0}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:16px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
.skills-text{font-size:10px;color:#1e293b;line-height:1.5}
@media print{.resume{margin:0;box-shadow:none}aside{background:#f1f5f9 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
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
- CSS Grid: 215px sidebar + 1fr main
- Sidebar: #f1f5f9 background, contains Skills + Education + Certifications
- Main: white background, contains Summary + Experience + Projects
- Header spans full width
- Skills displayed as list items in sidebar
- Font: Segoe UI`
  },
  {
    id: 'html-ivory-timeline-pro',
    name: 'Ivory Timeline Pro',
    category: 'professional',
    description: 'Clean single-column resume with warm ivory tones and subtle left border',
    preview: 'ATS-friendly ivory-toned single-column professional resume',
    format: 'html',
    styleGuide: `IVORY TIMELINE PRO — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column with TIMELINE layout for experience entries.
- Experience entries have vertical timeline line on left with dot markers.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:40px 46px;background:#fff}
h1{font-size:22px;font-weight:700;color:#2c2417;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:20px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#5a4635;border-bottom:1px solid #c9b99a;color:#5a4635;padding-bottom:3px;margin:20px 0 10px}
.timeline{border-left:2px solid #c9b99a;margin-left:6px;padding-left:18px}
.entry{margin-bottom:16px;position:relative}
.entry::before{content:'';position:absolute;left:-23px;top:6px;width:8px;height:8px;background:#8b7355;border-radius:50%;border:2px solid #fff}
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
- Section headings: warm serif headings with golden rule
- Skills: comma-separated inline text
- Font: Georgia`
  },
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
    id: 'html-aurora-header-flow',
    name: 'Aurora Header Flow',
    category: 'modern',
    description: 'Modern single-column resume with subtle blue header band',
    preview: 'ATS-friendly modern resume with aurora-blue header accent',
    format: 'html',
    styleGuide: `AURORA HEADER FLOW — FAANG-LEVEL ATS TEMPLATE

RULES:
- HEADER BAND layout: Colored header area with white text, white body below.
- Print-safe header background (no gradients).
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;background:#fff}
.header{background:#1a365d;padding:30px 45px 22px;}
.header h1{font-size:22px;font-weight:700;color:#fff;margin-bottom:4px}
.header .contact{font-size:10.5px;color:rgba(255,255,255,0.7)}
.header .contact a{color:rgba(255,255,255,0.85);text-decoration:none}
.body{padding:22px 45px 40px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#2a4a7f;border-bottom:1px solid #d0daea;padding-bottom:4px;padding-bottom:3px;margin:18px 0 8px}
h2:first-child{margin-top:0}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
@media print{.header{background:#1a365d !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.resume{margin:0}}
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
- Dark/colored header band (#1a365d) with white text
- White body below with standard section layout
- Header contains name + contact
- Print-safe: solid background, no gradients
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
    id: 'html-seriffed-executive',
    name: 'Seriffed Executive',
    category: 'executive',
    description: 'Executive resume with serif typography and corporate structure',
    preview: 'ATS-friendly executive resume with serif headings and leadership focus',
    format: 'html',
    styleGuide: `SERIFFED EXECUTIVE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column with SPLIT HEADER: Name + title on left, contact info stacked on right.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:42px 48px;background:#fff}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;margin-bottom:18px;border-bottom:1px solid #555}
.header-left h1{font-size:24px;font-weight:700;color:#2a2a2a;margin-bottom:2px}
.header-left .title{font-size:11px;color:#777;font-weight:400}
.header-right{text-align:right;font-size:10px;color:#555;line-height:1.7}
.header-right a{color:#555;text-decoration:none}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#2a2a2a;border-bottom:1px solid #999;padding-bottom:4px;margin:16px 0 8px}
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
- Section headings: elegant serif with thin gray rule
- Skills: comma-separated inline text
- Font: Georgia`
  },
  {
    id: 'html-graphite-split-kpi',
    name: 'Graphite KPI',
    category: 'executive',
    description: 'Executive resume with graphite tones and prominent metrics',
    preview: 'ATS-friendly executive resume with dark header and impact metrics',
    format: 'html',
    styleGuide: `GRAPHITE KPI — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column layout. Left-aligned header. Black border-bottom section headings.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:38px 44px;background:#fff}
h1{font-size:22px;font-weight:700;color:#333;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:18px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;border-bottom:2px solid #555;color:#333;padding-bottom:3px;margin:18px 0 8px;color:#333}
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
- Left-aligned header with name (22px) and contact below
- Section headings: uppercase, border-bottom:2px solid #555;color:#333
- Entry: title left + date right (flex space-between), subtitle below
- Skills: comma-separated inline text
- Font: Segoe UI`
  },
  {
    id: 'html-nordic-clean-frame',
    name: 'Nordic Clean Frame',
    category: 'minimal',
    description: 'Clean framed minimal resume with Nordic-inspired airy spacing',
    preview: 'ATS-friendly minimal resume with clean frame border and airy spacing',
    format: 'html',
    styleGuide: `NORDIC CLEAN FRAME — FAANG-LEVEL ATS TEMPLATE

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
h1{font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:18px}
h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#555;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:7px 14px;margin:16px 0 10px}
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
- Section headings styled as bordered/shaded pill strips (background #f5f5f5, border #ddd, rounded 6px)
- Visual boxed-section feel via CSS only — NO wrapper divs
- Nordic minimal airy spacing
- Skills: comma-separated inline text
- Font: System UI`
  },
  {
    id: 'html-cobalt-left-rule',
    name: 'Cobalt Left Rule',
    category: 'professional',
    description: 'Professional resume with cobalt blue left-border section markers',
    preview: 'ATS-friendly professional resume with cobalt left-rule accents',
    format: 'html',
    styleGuide: `COBALT LEFT RULE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column with TIMELINE layout for experience entries.
- Experience entries have vertical timeline line on left with dot markers.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:40px 46px;background:#fff}
h1{font-size:22px;font-weight:700;color:#1e3a5f;margin-bottom:4px}
.contact{font-size:10.5px;color:#555;margin-bottom:20px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#1e3a5f;border-bottom:1px solid #2b5797;color:#1e3a5f;padding-bottom:3px;margin:20px 0 10px}
.timeline{border-left:3px solid #2b5797;margin-left:6px;padding-left:18px}
.entry{margin-bottom:16px;position:relative}
.entry::before{content:'';position:absolute;left:-24px;top:6px;width:10px;height:10px;background:#1e3a5f;border-radius:50%;border:2px solid #fff}
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
- Section headings: cobalt blue headings with matching timeline
- Skills: comma-separated inline text
- Font: Segoe UI`
  },
  {
    id: 'html-sandstone-profile-panel',
    name: 'Sandstone Profile',
    category: 'creative',
    description: 'Warm-toned single-column resume with sandstone accents',
    preview: 'ATS-friendly warm-toned professional resume with earthy palette',
    format: 'html',
    styleGuide: `SANDSTONE PROFILE — FAANG-LEVEL ATS TEMPLATE

RULES:
- TWO-COLUMN sidebar layout. Left sidebar for Skills, Education, Certifications. Right main for Summary, Experience, Projects.
- Header spans full width above both columns.
- Uses CSS Grid with <aside> and <main> HTML5 elements.
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;background:#fff;display:grid;grid-template-columns:218px 1fr;grid-template-rows:auto 1fr}
header{grid-column:1/-1;padding:30px 38px 18px;border-bottom:1px solid #c9b99a}
h1{font-size:22px;font-weight:700;color:#3d2e1e;margin-bottom:3px}
.contact{font-size:10px;color:#6b5b4a}
aside{background:#faf7f2;padding:20px 20px;border-right:1px solid #e0d8cc}
aside h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6b5b4a;margin:16px 0 6px}
aside h2:first-child{margin-top:0}
aside ul{list-style:none;padding:0}
aside li{font-size:10px;color:#333;padding:2px 0;line-height:1.4}
aside .entry{margin-bottom:10px}
aside .entry-title{font-size:10px;font-weight:600;color:#333}
aside .entry-sub{font-size:9.5px;color:#8b7b6a}
main{padding:20px 28px}
main h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#3d2e1e;border-bottom:1px solid #e0d8cc;padding-bottom:3px;margin:16px 0 8px}
main h2:first-child{margin-top:0}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:16px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
.skills-text{font-size:10px;color:#333;line-height:1.5}
@media print{.resume{margin:0;box-shadow:none}aside{background:#faf7f2 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
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
- CSS Grid: 218px sidebar + 1fr main
- Sidebar: #faf7f2 background, contains Skills + Education + Certifications
- Main: white background, contains Summary + Experience + Projects
- Header spans full width
- Skills displayed as list items in sidebar
- Font: Georgia`
  },
  {
    id: 'html-midnight-two-tone',
    name: 'Midnight Two Tone',
    category: 'modern',
    description: 'Modern resume with dark midnight header and clean white body',
    preview: 'ATS-friendly modern resume with midnight header band',
    format: 'html',
    styleGuide: `MIDNIGHT TWO TONE — FAANG-LEVEL ATS TEMPLATE

RULES:
- HEADER BAND layout: Colored header area with white text, white body below.
- Print-safe header background (no gradients).
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;background:#fff}
.header{background:#111827;padding:32px 44px 24px;}
.header h1{font-size:24px;font-weight:700;color:#fff;margin-bottom:4px}
.header .contact{font-size:10.5px;color:rgba(255,255,255,0.65)}
.header .contact a{color:rgba(255,255,255,0.8);text-decoration:none}
.body{padding:24px 44px 40px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#111827;border-bottom:2px solid #111827;padding-bottom:3px;padding-bottom:3px;margin:18px 0 8px}
h2:first-child{margin-top:0}
.entry{margin-bottom:12px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#555;white-space:nowrap}
.entry-sub{font-size:10px;color:#555;margin-bottom:4px}
ul{padding-left:18px;margin:4px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.55;color:#1a1a1a}
@media print{.header{background:#111827 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.resume{margin:0}}
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
- Dark/colored header band (#111827) with white text
- White body below with standard section layout
- Header contains name + contact
- Print-safe: solid background, no gradients
- Font: Segoe UI`
  },
  {
    id: 'html-atlas-compact-grid',
    name: 'Atlas Compact',
    category: 'professional',
    description: 'Compact single-column resume with tight spacing for dense content',
    preview: 'ATS-friendly compact resume optimized for content density',
    format: 'html',
    styleGuide: `ATLAS COMPACT — FAANG-LEVEL ATS TEMPLATE

RULES:
- COMPACT DENSE single-column layout. Tight spacing for maximum content density.
- Base font: 9.5px. Reduced padding and margins throughout.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#fff;color:#1a1a1a;font-size:9.5px;line-height:1.4}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:24px 32px;background:#fff}
h1{font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:2px}
.contact{font-size:9px;color:#555;margin-bottom:10px}
h2{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#1a1a1a;border-bottom:1px solid #555;padding-bottom:2px;margin:10px 0 4px}
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
- Compact: 9.5px base font, tight padding (24px 32px)
- Section headings: compact uppercase with gray rule
- Minimal gaps between entries (8px)
- Skills: comma-separated inline text, compact
- Designed to fit maximum content on one page
- Font: Segoe UI`
  },
  {
    id: 'html-orchid-modern-classic',
    name: 'Orchid Modern Classic',
    category: 'creative',
    description: 'Modern-classic single-column resume with subtle purple accent',
    preview: 'ATS-friendly modern-classic resume with orchid-purple section accents',
    format: 'html',
    styleGuide: `ORCHID MODERN CLASSIC — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Centered header. Thin HR dividers between every section.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections entirely.

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;background:#fff;color:#1a1a1a;font-size:10.5px;line-height:1.5}
.resume{max-width:794px;min-height:1123px;margin:0 auto;padding:44px 50px;background:#fff}
h1{text-align:center;font-size:22px;font-weight:700;letter-spacing:0.5px;margin-bottom:4px;color:#2a2a2a}
.contact{text-align:center;color:#555;margin-bottom:24px;font-size:10.5px}
hr{border:none;border-top:1px solid #d0c5d8;margin:20px 0}
h2{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#5b4a6b;margin:0 0 10px}
.entry{margin-bottom:14px}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px}
.entry-title{font-weight:600;font-size:10.5px;color:#000}
.entry-date{font-size:10px;color:#666;white-space:nowrap}
.entry-sub{font-size:10px;color:#666;margin-bottom:4px}
ul{padding-left:18px;margin:3px 0 0}li{margin-bottom:3px;font-size:10.5px;line-height:1.5;color:#1a1a1a}
.skills-text{font-size:10.5px;color:#1a1a1a;line-height:1.6}
p{font-size:10.5px;line-height:1.6;color:#1a1a1a}
@media print{.resume{padding:32px 40px;margin:0}}
</style></head><body><div class="resume">
<h1>NAME</h1>
<div class="contact">email | phone | location</div>
<hr>
<h2>Summary</h2>
<p>Backend engineer with 5+ years building high-throughput APIs and data pipelines. Delivered distributed systems processing 100M+ requests daily with 99.99% reliability. Expert in Go, Python, and cloud infrastructure.</p>
<hr>
<h2>Experience</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Senior Backend Engineer</span><span class="entry-date">2021 – Present</span></div><div class="entry-sub">Datadog, New York, NY</div><ul><li>Designed metric ingestion pipeline processing 100M+ data points per minute with 99.99% data integrity, implementing sharded write-ahead logging and automatic partition rebalancing across 50+ nodes</li><li>Reduced query latency by 55% through custom time-series indexing strategy, enabling sub-second dashboard loads for 20K+ enterprise customers monitoring 500+ services</li><li>Led backend team of 6 engineers delivering core observability features that contributed to 30% increase in enterprise ARR</li></ul></div>
<div class="entry"><div class="entry-header"><span class="entry-title">Software Engineer</span><span class="entry-date">2019 – 2021</span></div><div class="entry-sub">Twilio, San Francisco, CA</div><ul><li>Built messaging API handling 10B+ messages monthly with sub-100ms delivery latency, implementing intelligent routing and automatic failover across 3 geographic regions</li><li>Implemented rate limiting and abuse detection system reducing malicious traffic by 80% while maintaining 99.9% legitimate message delivery rate</li></ul></div>
<hr>
<h2>Projects</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">Distributed Task Queue</span><span class="entry-date">2023</span></div><div class="entry-sub">Go, Redis, gRPC</div><ul><li>Built open-source task queue supporting 50K+ tasks/sec with exactly-once processing guarantees and automatic dead-letter queue routing</li></ul></div>
<hr>
<h2>Skills</h2>
<p class="skills-text">Go, Python, Java, PostgreSQL, Redis, Kafka, gRPC, AWS, Docker, Kubernetes, Terraform, CI/CD</p>
<hr>
<h2>Education</h2>
<div class="entry"><div class="entry-header"><span class="entry-title">M.S. Computer Science</span><span class="entry-date">2019</span></div><div class="entry-sub">Columbia University</div></div>
</div></body></html>

CRITICAL FORMATTING RULES:
- Centered name + centered contact info
- Thin horizontal rule (1px #d0c5d8) separates EVERY section
- Section headings: uppercase, wide letter-spacing (1.5px), no border
- Generous padding (44px 50px)
- Skills: comma-separated inline text
- Font: Georgia`
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

  // ── New LaTeX Templates Batch (15) — FAANG-Level ATS Upgrades ─────────────
  {
    id: 'latex-slate-sidebar-pro',
    name: 'Slate Professional (LaTeX)',
    category: 'professional',
    description: 'Clean single-column LaTeX resume with professional slate styling',
    preview: 'ATS-friendly single-column professional LaTeX resume',
    format: 'latex',
    styleGuide: `SLATE PROFESSIONAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. No minipage/sidebar. Clean professional layout.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{charter}

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
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Senior Software Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Google, Mountain View, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\item Deployed a real-time fraud detection system using ML models and rule-based engines, processing 50K+ transactions per minute and preventing \\$10M+ in annual losses while keeping false positive rates below 0.1\\%
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Software Engineer} \\hfill \\textit{2018 -- 2021}\\\\
\\textit{Stripe, San Francisco, CA}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Real-Time Analytics Dashboard} \\hfill \\textit{2023}\\\\
\\textit{React, D3.js, WebSocket, PostgreSQL}
\\begin{itemize}
\\item Built a streaming analytics platform processing 50K+ events per second with sub-second visualization updates, using WebSocket-based pipelines and custom D3.js chart components optimized for real-time rendering across desktop and mobile viewports
\\end{itemize}

\\section*{SKILLS}
JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, Redis, AWS, Docker, Kubernetes

\\section*{EDUCATION}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2018}\\\\
\\textit{Stanford University, Stanford, CA}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Single-column, no sidebar/minipage
- Each bullet: 2-4 lines, action verb + measurable impact
- Skills: comma-separated inline text`
  },
  {
    id: 'latex-ivory-timeline-pro',
    name: 'Ivory Timeline (LaTeX)',
    category: 'professional',
    description: 'Chronological single-column LaTeX resume with clean timeline',
    preview: 'ATS-friendly chronological LaTeX resume',
    format: 'latex',
    styleGuide: `IVORY TIMELINE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Chronological emphasis. Clean rule dividers.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.8in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{palatino}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[6pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{8pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Senior Backend Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Datadog, New York, NY}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Software Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{Twilio, San Francisco, CA}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Distributed Task Queue} \\hfill \\textit{2023}\\\\
\\textit{Go, Redis, gRPC}
\\begin{itemize}
\\item Developed a full-stack e-commerce platform with React and Node.js handling 10K+ daily transactions, implementing real-time inventory synchronization, Stripe payment integration, and an event sourcing pattern achieving 99.9\\% data consistency
\\end{itemize}

\\section*{SKILLS}
Go, Python, Java, PostgreSQL, Redis, Kafka, gRPC, AWS, Docker, Kubernetes, Terraform

\\section*{EDUCATION}

\\textbf{M.S. in Computer Science} \\hfill \\textit{2019}\\\\
\\textit{Columbia University, New York, NY}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Clean chronological flow with section rules
- Each bullet: 2-4 lines, action verb + measurable impact`
  },
  {
    id: 'latex-zen-columns',
    name: 'Zen Minimal (LaTeX)',
    category: 'minimal',
    description: 'Ultra-minimal LaTeX resume with generous whitespace',
    preview: 'ATS-friendly ultra-minimal LaTeX resume',
    format: 'latex',
    styleGuide: `ZEN MINIMAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. No minipage. Maximum whitespace. Ultra-minimal.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.9in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule[0.3pt]]
\\titlespacing*{\\section}{0pt}{14pt}{7pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{3pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=2pt,topsep=3pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[8pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{14pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Senior Mobile Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Airbnb, San Francisco, CA}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\item Established a structured mentorship program for junior engineers, conducting weekly technical design reviews and pair programming sessions that resulted in 3 promotions to senior within 18 months and a 25\\% improvement in team velocity
\\end{itemize}

\\vspace{0.3cm}

\\textbf{Mobile Developer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{Spotify, Stockholm}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Cross-Platform UI Kit} \\hfill \\textit{2023}\\\\
\\textit{React Native, TypeScript}
\\begin{itemize}
\\item Created a developer productivity CLI tool automating project scaffolding and code generation, achieving 2K+ GitHub stars and 500+ weekly npm downloads through comprehensive documentation and an intuitive plugin architecture
\\end{itemize}

\\section*{SKILLS}
React Native, Swift, Kotlin, TypeScript, iOS, Android, Firebase, GraphQL, CI/CD

\\section*{EDUCATION}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2019}\\\\
\\textit{University of Michigan, Ann Arbor, MI}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Generous whitespace, thin rule dividers
- Each bullet: 2-4 lines, action verb + measurable impact`
  },
  {
    id: 'latex-aurora-header-flow',
    name: 'Aurora Flow (LaTeX)',
    category: 'modern',
    description: 'Modern LaTeX resume with clean header rule and linear flow',
    preview: 'ATS-friendly modern LaTeX resume with header accent',
    format: 'latex',
    styleGuide: `AURORA FLOW — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Header rule accent. Clean linear flow.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\Large\\textbf{NAME}}\\\\[3pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}

\\vspace{2pt}
\\rule{\\textwidth}{1pt}
\\vspace{6pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Senior DevOps Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Netflix, Los Gatos, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\item Deployed a real-time fraud detection system using ML models and rule-based engines, processing 50K+ transactions per minute and preventing \\$10M+ in annual losses while keeping false positive rates below 0.1\\%
\\end{itemize}

\\vspace{0.2cm}

\\textbf{DevOps Engineer} \\hfill \\textit{2018 -- 2021}\\\\
\\textit{Shopify, Ottawa, ON}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\end{itemize}

\\section*{PROJECTS}

\\textbf{GitOps Platform} \\hfill \\textit{2023}\\\\
\\textit{ArgoCD, Terraform, Go}
\\begin{itemize}
\\item Built an automated feature engineering tool using Python and Scikit-learn that reduced model development time from weeks to hours, supporting automated feature selection, hyperparameter tuning, and cross-validation across 20+ ML algorithms
\\end{itemize}

\\section*{SKILLS}
Kubernetes, Docker, Terraform, AWS, GCP, Jenkins, ArgoCD, Prometheus, Grafana, Python, Go

\\section*{EDUCATION}

\\textbf{B.S. in Computer Engineering} \\hfill \\textit{2018}\\\\
\\textit{University of Toronto, Toronto, ON}

\\section*{CERTIFICATIONS}

\\textbf{CKA -- Certified Kubernetes Administrator} \\hfill \\textit{2021}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" left-aligned (pipe separator)
- Header rule accent below contact info
- Each bullet: 2-4 lines, action verb + measurable impact`
  },
  {
    id: 'latex-metro-skill-ribbon',
    name: 'Metro Skills (LaTeX)',
    category: 'modern',
    description: 'Skills-first LaTeX resume with categorized skill bands',
    preview: 'ATS-friendly skills-first LaTeX resume',
    format: 'latex',
    styleGuide: `METRO SKILLS — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Skills section immediately after header.
- Sections: Header → Skills → Summary → Experience → Projects → Education
- Each bullet: action verb + measurable impact. Omit empty sections.

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

\\noindent{\\large\\textbf{NAME}}\\hfill{\\small location}\\\\[2pt]
{\\small email\\ \\textbar\\ phone}

\\vspace{6pt}

\\section*{SUMMARY}
ML engineer with 5+ years deploying production ML systems. Built recommendation engine serving 20M+ users driving 25\\% engagement increase.

\\section*{EXPERIENCE}

\\textbf{Senior ML Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Pinterest, San Francisco, CA}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\vspace{0.2cm}

\\textbf{ML Engineer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{Spotify, Stockholm}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\section*{PROJECTS}

\\textbf{NLP Document Classifier} \\hfill \\textit{2023}\\\\
\\textit{BERT, FastAPI, Docker}
\\begin{itemize}
\\item Designed an open-source distributed task scheduler supporting cron-based and event-driven workflows, handling 1M+ daily job executions with automatic retry logic, dead letter queues, and a web-based monitoring dashboard
\\end{itemize}

\\section*{EDUCATION}

\\textbf{M.S. in Machine Learning} \\hfill \\textit{2019}\\\\
\\textit{Carnegie Mellon University, Pittsburgh, PA}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Skills categorized with bold labels, immediately after header
- Each bullet: 2-4 lines, action verb + measurable impact`
  },
  {
    id: 'latex-seriffed-executive',
    name: 'Seriffed Executive (LaTeX)',
    category: 'executive',
    description: 'Executive LaTeX resume with leadership focus and serif feel',
    preview: 'ATS-friendly executive LaTeX resume',
    format: 'latex',
    styleGuide: `SERIFFED EXECUTIVE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Executive/leadership focus. No fancy formatting.
- Sections: Header → Executive Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: leadership scope + business impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.85in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{mathptmx}

\\titleformat{\\section}{\\normalsize\\scshape\\bfseries}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{6pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[6pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{10pt}

\\section*{EXECUTIVE SUMMARY}
Seasoned technology executive with 15+ years leading engineering organizations of 200+ engineers across multiple geographies. Track record of delivering platform transformations, building high-performance teams, and driving technical strategy aligned with business objectives.

\\section*{EXPERIENCE}

\\textbf{Chief Technology Officer} \\hfill \\textit{2019 -- Present}\\\\
\\textit{Fortune 500 Corp, New York, NY}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\item Established a structured mentorship program for junior engineers, conducting weekly technical design reviews and pair programming sessions that resulted in 3 promotions to senior within 18 months and a 25\\% improvement in team velocity
\\end{itemize}

\\vspace{0.2cm}

\\textbf{VP of Engineering} \\hfill \\textit{2015 -- 2019}\\\\
\\textit{Tech Startup, San Francisco, CA}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Enterprise AI Platform} \\hfill \\textit{2023}\\\\
\\textit{Strategic Initiative}
\\begin{itemize}
\\item Built a streaming analytics platform processing 50K+ events per second with sub-second visualization updates, using WebSocket-based pipelines and custom D3.js chart components optimized for real-time rendering across desktop and mobile viewports
\\end{itemize}

\\section*{SKILLS}
Strategic Planning, P\\&L Management, Digital Transformation, Cloud Architecture, Team Building

\\section*{EDUCATION}

\\textbf{MBA, Technology Management} \\hfill \\textit{2010}\\\\
\\textit{Wharton School, University of Pennsylvania}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Executive summary 2-3 lines highlighting leadership and revenue impact
- Each bullet: 2-4 lines, leadership scope + business impact`
  },
  {
    id: 'latex-graphite-split-kpi',
    name: 'Graphite KPI (LaTeX)',
    category: 'executive',
    description: 'Executive LaTeX resume with prominent impact metrics',
    preview: 'ATS-friendly executive LaTeX resume with KPI focus',
    format: 'latex',
    styleGuide: `GRAPHITE KPI — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Bold header. Impact metrics in summary.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: leadership scope + business impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\vspace{-3pt}\\rule{\\textwidth}{0.5pt}]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=12pt,itemsep=0pt,topsep=1pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\Large\\textbf{NAME}}\\\\[3pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}

\\vspace{4pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{VP of Operations} \\hfill \\textit{2019 -- Present}\\\\
\\textit{Global Logistics Corp, Chicago, IL}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\item Deployed a real-time fraud detection system using ML models and rule-based engines, processing 50K+ transactions per minute and preventing \\$10M+ in annual losses while keeping false positive rates below 0.1\\%
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Director of Operations} \\hfill \\textit{2015 -- 2019}\\\\
\\textit{Supply Chain Inc., Dallas, TX}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\end{itemize}

\\section*{PROJECTS}

\\textbf{AI-Powered Demand Forecasting} \\hfill \\textit{2023}\\\\
\\textit{Python, ML, Tableau}
\\begin{itemize}
\\item Developed a full-stack e-commerce platform with React and Node.js handling 10K+ daily transactions, implementing real-time inventory synchronization, Stripe payment integration, and an event sourcing pattern achieving 99.9\\% data consistency
\\end{itemize}

\\section*{SKILLS}
Operations Management, Lean Six Sigma, Supply Chain, P\\&L Management, Data Analytics, Process Automation

\\section*{EDUCATION}

\\textbf{MBA, Operations Management} \\hfill \\textit{2013}\\\\
\\textit{Kellogg School of Management, Northwestern University}

\\section*{CERTIFICATIONS}

\\textbf{Lean Six Sigma Black Belt} \\hfill \\textit{2017}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" left-aligned (pipe separator)
- Bold thick section rules for executive presence
- Each bullet: 2-4 lines, leadership scope + business impact`
  },
  {
    id: 'latex-nordic-clean-frame',
    name: 'Nordic Clean (LaTeX)',
    category: 'minimal',
    description: 'Clean minimal LaTeX resume with disciplined spacing',
    preview: 'ATS-friendly clean minimal LaTeX resume',
    format: 'latex',
    styleGuide: `NORDIC CLEAN — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Clean minimal styling. Rule dividers.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}

\\titleformat{\\section}{\\normalsize\\bfseries}{}{0em}{}[\\titlerule[0.4pt]]
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

\\vspace{8pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Senior QA Automation Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Atlassian, Sydney, Australia}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\vspace{0.2cm}

\\textbf{QA Engineer} \\hfill \\textit{2018 -- 2021}\\\\
\\textit{Zendesk, San Francisco, CA}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Test Intelligence Platform} \\hfill \\textit{2023}\\\\
\\textit{Python, ML, Selenium}
\\begin{itemize}
\\item Created a developer productivity CLI tool automating project scaffolding and code generation, achieving 2K+ GitHub stars and 500+ weekly npm downloads through comprehensive documentation and an intuitive plugin architecture
\\end{itemize}

\\section*{SKILLS}
Selenium, Cypress, Playwright, Python, Java, REST API Testing, CI/CD, Jenkins, Docker

\\section*{EDUCATION}

\\textbf{B.S. in Software Engineering} \\hfill \\textit{2018}\\\\
\\textit{University of Sydney, Australia}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Clean minimal with thin rule dividers
- Each bullet: 2-4 lines, action verb + measurable impact`
  },
  {
    id: 'latex-cobalt-left-rule',
    name: 'Cobalt Rule (LaTeX)',
    category: 'professional',
    description: 'Professional LaTeX resume with bold section dividers',
    preview: 'ATS-friendly professional LaTeX resume with strong rules',
    format: 'latex',
    styleGuide: `COBALT RULE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Bold section dividers. No colors.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\Large\\textbf{NAME}}\\\\[4pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}

\\vspace{8pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Senior Blockchain Engineer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Coinbase, San Francisco, CA}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\item Established a structured mentorship program for junior engineers, conducting weekly technical design reviews and pair programming sessions that resulted in 3 promotions to senior within 18 months and a 25\\% improvement in team velocity
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Smart Contract Developer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{ConsenSys, New York, NY}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{ZK-Rollup Bridge} \\hfill \\textit{2023}\\\\
\\textit{Solidity, Rust, Circom}
\\begin{itemize}
\\item Built an automated feature engineering tool using Python and Scikit-learn that reduced model development time from weeks to hours, supporting automated feature selection, hyperparameter tuning, and cross-validation across 20+ ML algorithms
\\end{itemize}

\\section*{SKILLS}
Solidity, Rust, TypeScript, Ethereum, ZK-Proofs, DeFi, Hardhat, Foundry, IPFS

\\section*{EDUCATION}

\\textbf{M.S. in Computer Science} \\hfill \\textit{2019}\\\\
\\textit{ETH Zurich, Switzerland}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" left-aligned (pipe separator)
- Bold section rules, header rule accent
- Each bullet: 2-4 lines, action verb + measurable impact`
  },
  {
    id: 'latex-sandstone-profile-panel',
    name: 'Sandstone Profile (LaTeX)',
    category: 'creative',
    description: 'Warm-toned single-column LaTeX resume',
    preview: 'ATS-friendly warm-toned LaTeX resume',
    format: 'latex',
    styleGuide: `SANDSTONE PROFILE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. No minipage/sidebar. Clean warm styling.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{charter}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[4pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{8pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Senior UX Designer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Figma, San Francisco, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\item Deployed a real-time fraud detection system using ML models and rule-based engines, processing 50K+ transactions per minute and preventing \\$10M+ in annual losses while keeping false positive rates below 0.1\\%
\\end{itemize}

\\vspace{0.2cm}

\\textbf{UX Designer} \\hfill \\textit{2018 -- 2021}\\\\
\\textit{Dropbox, San Francisco, CA}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Design System Toolkit} \\hfill \\textit{2023}\\\\
\\textit{Figma, React, Storybook}
\\begin{itemize}
\\item Designed an open-source distributed task scheduler supporting cron-based and event-driven workflows, handling 1M+ daily job executions with automatic retry logic, dead letter queues, and a web-based monitoring dashboard
\\end{itemize}

\\section*{SKILLS}
Figma, Sketch, User Research, Prototyping, Design Systems, Accessibility, Usability Testing

\\section*{EDUCATION}

\\textbf{B.F.A. in Interaction Design} \\hfill \\textit{2018}\\\\
\\textit{Rhode Island School of Design}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Single-column, no sidebar
- Each bullet: 2-4 lines, action verb + measurable impact`
  },
  {
    id: 'latex-midnight-two-tone',
    name: 'Midnight Tone (LaTeX)',
    category: 'modern',
    description: 'Modern LaTeX resume with bold header and clean body',
    preview: 'ATS-friendly modern LaTeX resume with bold header',
    format: 'latex',
    styleGuide: `MIDNIGHT TONE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Bold large name. Clean section structure.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[4pt]
\\rule{0.5\\textwidth}{0.5pt}\\\\[4pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{8pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Staff SRE} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Google, Mountain View, CA}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\vspace{0.2cm}

\\textbf{SRE} \\hfill \\textit{2018 -- 2021}\\\\
\\textit{LinkedIn, Sunnyvale, CA}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Open-Source Incident Commander} \\hfill \\textit{2023}\\\\
\\textit{Go, Kubernetes, Slack API}
\\begin{itemize}
\\item Built a streaming analytics platform processing 50K+ events per second with sub-second visualization updates, using WebSocket-based pipelines and custom D3.js chart components optimized for real-time rendering across desktop and mobile viewports
\\end{itemize}

\\section*{SKILLS}
Kubernetes, Terraform, Prometheus, Grafana, Go, Python, Linux, AWS/GCP, Chaos Engineering

\\section*{EDUCATION}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2018}\\\\
\\textit{UC Berkeley, Berkeley, CA}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" left-aligned (pipe separator)
- Bold name, clean section structure
- Each bullet: 2-4 lines, action verb + measurable impact`
  },
  {
    id: 'latex-atlas-compact-grid',
    name: 'Atlas Compact (LaTeX)',
    category: 'professional',
    description: 'Compact single-column LaTeX resume with tight margins',
    preview: 'ATS-friendly compact LaTeX resume for dense content',
    format: 'latex',
    styleGuide: `ATLAS COMPACT — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Compact tight margins. No grids/minipages.
- Sections: Header → Summary → Skills → Experience → Projects → Education
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[9pt]{article}
\\usepackage[margin=0.5in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\vspace{-4pt}\\rule{\\textwidth}{0.4pt}]
\\titlespacing*{\\section}{0pt}{6pt}{3pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlist[itemize]{leftmargin=10pt,itemsep=0pt,topsep=0pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\noindent{\\large\\textbf{NAME}}\\hfill{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}

\\vspace{4pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{SKILLS}
Python, R, SQL, TensorFlow, Scikit-learn, Pandas, Tableau, AWS SageMaker, Spark, A/B Testing

\\section*{EXPERIENCE}

\\textbf{Senior Data Scientist} \\hfill \\textit{2022 -- Present}\\\\
\\textit{Uber, San Francisco, CA}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\item Established a structured mentorship program for junior engineers, conducting weekly technical design reviews and pair programming sessions that resulted in 3 promotions to senior within 18 months and a 25\\% improvement in team velocity
\\end{itemize}

\\vspace{0.15cm}

\\textbf{Data Scientist} \\hfill \\textit{2020 -- 2022}\\\\
\\textit{Instacart, San Francisco, CA}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{AutoML Feature Engineering} \\hfill \\textit{2023}\\\\
\\textit{Python, Scikit-learn}
\\begin{itemize}
\\item Developed a full-stack e-commerce platform with React and Node.js handling 10K+ daily transactions, implementing real-time inventory synchronization, Stripe payment integration, and an event sourcing pattern achieving 99.9\\% data consistency
\\end{itemize}

\\section*{EDUCATION}

\\textbf{M.S. in Statistics} \\hfill \\textit{2020}\\\\
\\textit{UC Berkeley, Berkeley, CA}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" left-aligned (pipe separator)
- Compact: 0.6in margins, tight spacing
- Each bullet: 2-4 lines, action verb + measurable impact`
  },
  {
    id: 'latex-orchid-modern-classic',
    name: 'Orchid Classic (LaTeX)',
    category: 'creative',
    description: 'Modern-classic LaTeX resume with centered header',
    preview: 'ATS-friendly modern-classic LaTeX resume',
    format: 'latex',
    styleGuide: `ORCHID CLASSIC — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Centered header. Clean classic styling.
- Sections: Header → Summary → Experience → Projects → Skills → Education
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.8in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{palatino}

\\titleformat{\\section}{\\normalsize\\scshape\\bfseries}{}{0em}{}[\\titlerule[0.4pt]]
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
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Lead Product Designer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Notion, San Francisco, CA}
\\begin{itemize}
\\item Designed and scaled a high-throughput payment processing pipeline handling \\$2B+ in annual transaction volume, implementing idempotent retry mechanisms and distributed transaction coordination that achieved 99.99\\% reliability
\\item Optimized critical database operations through systematic query analysis, implementing materialized views and intelligent caching that reduced average API response latency by 45\\% and improved throughput capacity by 3x during peak periods
\\item Deployed a real-time fraud detection system using ML models and rule-based engines, processing 50K+ transactions per minute and preventing \\$10M+ in annual losses while keeping false positive rates below 0.1\\%
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Product Designer} \\hfill \\textit{2018 -- 2021}\\\\
\\textit{Slack, San Francisco, CA}
\\begin{itemize}
\\item Spearheaded adoption of infrastructure-as-code practices using Terraform and Kubernetes, automating provisioning of 200+ microservices across multi-region deployments and reducing environment setup time from 2 weeks to 30 minutes
\\item Built a comprehensive observability platform integrating distributed tracing, metrics aggregation, and log correlation across 500+ services, reducing mean time to detection from 45 minutes to under 3 minutes for production incidents
\\end{itemize}

\\section*{PROJECTS}

\\textbf{Design System Docs Platform} \\hfill \\textit{2023}\\\\
\\textit{Figma, React, MDX}
\\begin{itemize}
\\item Created a developer productivity CLI tool automating project scaffolding and code generation, achieving 2K+ GitHub stars and 500+ weekly npm downloads through comprehensive documentation and an intuitive plugin architecture
\\end{itemize}

\\section*{SKILLS}
Figma, Framer, Prototyping, User Research, Design Thinking, Accessibility, React

\\section*{EDUCATION}

\\textbf{B.A. in Human-Computer Interaction} \\hfill \\textit{2018}\\\\
\\textit{Stanford University, Stanford, CA}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Classic centered layout
- Each bullet: 2-4 lines, action verb + measurable impact`
  },
  {
    id: 'latex-inked-journal-layout',
    name: 'Inked Journal (LaTeX)',
    category: 'academic',
    description: 'Academic journal-style LaTeX resume with publication focus',
    preview: 'ATS-friendly academic LaTeX resume with publications',
    format: 'latex',
    styleGuide: `INKED JOURNAL — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. Academic CV order. Publication emphasis.
- Sections: Header → Summary → Experience → Education → Publications → Projects → Skills
- Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.8in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{mathptmx}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{5pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=2pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[4pt]
\\rule{0.3\\textwidth}{0.4pt}\\\\[4pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{8pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Principal Research Scientist} \\hfill \\textit{2020 -- Present}\\\\
\\textit{Genentech, South San Francisco, CA}
\\begin{itemize}
\\item Developed a customer-facing analytics dashboard processing 100M+ daily events in real-time, leveraging streaming data pipelines and time-series databases with responsive visualization components that increased user engagement by 35\\%
\\item Implemented automated feature engineering pipeline using distributed Spark jobs, reducing model development cycle from 3 weeks to 2 days while improving prediction accuracy by 12\\% across recommendation and search ranking models
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Research Scientist} \\hfill \\textit{2017 -- 2020}\\\\
\\textit{Broad Institute, Cambridge, MA}
\\begin{itemize}
\\item Designed and implemented a self-service developer platform enabling 50+ engineering teams to provision infrastructure, deploy services, and manage configurations through a unified CLI and web portal, reducing onboarding time from 2 weeks to 1 day
\\item Implemented progressive delivery capabilities including feature flags, canary releases, and automated rollbacks across the deployment pipeline, reducing deployment failures by 90\\% and increasing release frequency from bi-weekly to multiple daily deploys
\\end{itemize}

\\section*{EDUCATION}

\\textbf{Ph.D. in Computational Biology} \\hfill \\textit{2017}\\\\
\\textit{MIT, Cambridge, MA}

\\section*{PUBLICATIONS}

Smith, J., et al. (2023). "Deep learning for protein structure prediction." \\textit{Nature Methods}, 20(4), 456--470.

\\vspace{0.1cm}

Smith, J., \\& Lee, K. (2022). "Single-cell analysis reveals novel biomarkers." \\textit{Cell}, 185(2), 334--350.

\\section*{PROJECTS}

\\textbf{Open-Source Genomics Toolkit} \\hfill \\textit{2023}\\\\
\\textit{Python, Bioconductor, Docker}
\\begin{itemize}
\\item Built an automated feature engineering tool using Python and Scikit-learn that reduced model development time from weeks to hours, supporting automated feature selection, hyperparameter tuning, and cross-validation across 20+ ML algorithms
\\end{itemize}

\\section*{SKILLS}
Python, R, Bioinformatics, Machine Learning, Genomics, Single-Cell Analysis, Docker, AWS

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Academic order: Experience → Education → Publications → Projects
- Publications in proper citation format
- Each bullet: 2-4 lines, research impact + metrics`
  },
  {
    id: 'latex-horizon-balance',
    name: 'Horizon Balance (LaTeX)',
    category: 'modern',
    description: 'Balanced modern LaTeX resume with teal-inspired section styling',
    preview: 'ATS-friendly balanced modern LaTeX resume',
    format: 'latex',
    styleGuide: `HORIZON BALANCE — FAANG-LEVEL ATS TEMPLATE

RULES:
- Single-column. No minipage. Balanced spacing. Clean layout.
- Sections: Header → Summary → Experience → Projects → Skills → Education → Certifications
- Each bullet: action verb + measurable impact. Omit empty sections.

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.85in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{lmodern}

\\titleformat{\\section}{\\normalsize\\bfseries\\MakeUppercase}{}{0em}{}[\\titlerule[0.3pt]]
\\titlespacing*{\\section}{0pt}{12pt}{6pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{2pt}
\\setlist[itemize]{leftmargin=14pt,itemsep=1pt,topsep=3pt,parsep=0pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[8pt]
{\\small email\\ \\textbar\\ phone\\ \\textbar\\ location}
\\end{center}

\\vspace{12pt}

\\section*{SUMMARY}
Results-driven software engineer with 6+ years building scalable distributed systems and leading cross-functional teams. Led platform initiatives serving millions of users, consistently delivering measurable improvements in performance, reliability, and developer productivity.

\\section*{EXPERIENCE}

\\textbf{Senior Full-Stack Developer} \\hfill \\textit{2021 -- Present}\\\\
\\textit{Shopify, Ottawa, ON}
\\begin{itemize}
\\item Architected and deployed a cloud-native microservices platform serving 12 engineering teams, implementing automated canary deployments and distributed tracing that reduced deployment time by 60\\% and improved incident response from 4 hours to 15 minutes
\\item Led the end-to-end migration of a monolithic application to event-driven microservices using Kafka and gRPC, transitioning a system serving 5M+ daily active users while maintaining 99.99\\% uptime and reducing infrastructure costs by 35\\%
\\item Established a structured mentorship program for junior engineers, conducting weekly technical design reviews and pair programming sessions that resulted in 3 promotions to senior within 18 months and a 25\\% improvement in team velocity
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Full-Stack Developer} \\hfill \\textit{2019 -- 2021}\\\\
\\textit{Wealthsimple, Toronto, ON}
\\begin{itemize}
\\item Built a real-time notification system handling 500K+ daily events using WebSockets and Redis Pub/Sub, implementing automatic retry logic and dead-letter queues that achieved 99.95\\% delivery reliability across web and mobile clients
\\item Optimized CI/CD pipeline through parallelized build stages, Docker layer caching, and selective test execution, reducing end-to-end pipeline time from 45 minutes to 8 minutes and increasing developer deployment confidence by 40\\%
\\end{itemize}

\\section*{PROJECTS}

\\textbf{E-Commerce Starter Kit} \\hfill \\textit{2023}\\\\
\\textit{Next.js, Stripe, PostgreSQL}
\\begin{itemize}
\\item Designed an open-source distributed task scheduler supporting cron-based and event-driven workflows, handling 1M+ daily job executions with automatic retry logic, dead letter queues, and a web-based monitoring dashboard
\\end{itemize}

\\section*{SKILLS}
React, Next.js, Node.js, TypeScript, PostgreSQL, Redis, GraphQL, Docker, AWS, Stripe

\\section*{EDUCATION}

\\textbf{B.S. in Computer Science} \\hfill \\textit{2019}\\\\
\\textit{University of Waterloo, Ontario, Canada}

\\section*{CERTIFICATIONS}

\\textbf{AWS Developer Associate} \\hfill \\textit{2022}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact: "email | phone | location" centered (pipe separator)
- Balanced spacing between sections
- Each bullet: 2-4 lines, action verb + measurable impact`
  }

]
