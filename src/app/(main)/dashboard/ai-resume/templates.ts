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
    description: 'Traditional two-column layout with clean typography',
    preview: 'Classic professional resume with left sidebar for contact/skills and right column for experience',
    format: 'html',
    styleGuide: `PROFESSIONAL CLASSIC TEMPLATE STYLE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}

\\begin{document}
\\vspace*{-1cm}
\\setlength{\\parskip}{0pt}
\\setlength{\\itemsep}{0pt}

\\begin{minipage}[t]{0.35\\textwidth}
{\\Huge\\textbf{\\textcolor{blue!90!black}{NAME}}}
\\textcolor{blue!70!black}{email | phone}
\\vspace{0.4cm}
\\section*{\\textcolor{blue!75!black}{\\large Skills}}
\\textcolor{blue!75!black}{\\rule{0.9\\textwidth}{0.5pt}}
\\vspace{0.15cm}
\\begin{itemize}[leftmargin=*,itemsep=0.03cm,topsep=0.05cm]
\\item React
\\item TypeScript
\\item Node.js
\\item PostgreSQL
\\item AWS
\\end{itemize}
\\vspace{0.25cm}
\\section*{\\textcolor{blue!75!black}{\\large Education}}
\\textcolor{blue!75!black}{\\rule{0.9\\textwidth}{0.5pt}}
\\vspace{0.15cm}
\\textbf{\\textcolor{blue!60!black}{Bachelor of Science in Computer Science}}
\\textit{\\textcolor{blue!50!black}{University of Technology | 2015 - 2019}}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.62\\textwidth}
\\section*{\\textcolor{blue!75!black}{\\large Experience}}
\\textcolor{blue!75!black}{\\rule{0.95\\textwidth}{0.5pt}}
\\vspace{0.15cm}
\\textbf{\\textcolor{blue!60!black}{Senior Software Engineer}}
\\textit{\\textcolor{blue!50!black}{Tech Corp | 2021 - Present}}
\\begin{itemize}[leftmargin=*,itemsep=0.08cm,topsep=0.08cm]
\\item Led development of microservices architecture serving 2M+ users
\\item Improved application performance by 40% through optimization
\\end{itemize}
\\vspace{0.25cm}
\\section*{\\textcolor{blue!75!black}{\\large Projects}}
\\textcolor{blue!75!black}{\\rule{0.95\\textwidth}{0.5pt}}
\\vspace{0.15cm}
\\textbf{\\textcolor{blue!60!black}{E-Commerce Platform | 2023}}
\\begin{itemize}[leftmargin=*,itemsep=0.08cm,topsep=0.08cm]
\\item Full-stack application with React frontend and Node.js backend
\\end{itemize}
\\end{minipage}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info MUST be on ONE line: "email | phone" (use pipe separator |)
- Skills MUST be simple bullet points: \\item SkillName
- DO NOT add categories like "Programming:", "Frontend Development:", etc.
- DO NOT group skills by category
- DO NOT use bold text for skill categories
- Just list skills as simple items: \\item React, \\item TypeScript, etc.
- Maximum 5-7 skills in the list
- Optimize spacing to prevent blank first page (use \\vspace*{-1cm} and tight itemsep)

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body { margin: 0; padding: 0; }
.resume { display: flex; gap: 30px; max-width: 900px; margin: 0 auto; padding: 15px; }
.left-column { width: 35%; border-right: 2px solid #3b82f6; padding-right: 20px; }
.right-column { width: 65%; }
h1 { color: #1e40af; font-size: 28px; margin-bottom: 8px; margin-top: 0; }
.contact { color: #3b82f6; font-size: 14px; margin-bottom: 20px; line-height: 1.4; }
h2 { color: #1e40af; font-size: 18px; margin-top: 15px; margin-bottom: 8px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
ul { margin-top: 8px; margin-bottom: 15px; padding-left: 20px; line-height: 1.5; }
li { margin-bottom: 4px; }
.section-content { margin-top: 8px; margin-bottom: 15px; line-height: 1.5; }
@media print {
  body { margin: 0; padding: 0; }
  .resume { padding: 8px; }
  h2 { margin-top: 12px; margin-bottom: 6px; }
  ul { margin-top: 6px; margin-bottom: 12px; }
}
</style>
</head>
<body>
<div class="resume">
  <div class="left-column">
    <h1>NAME</h1>
    <div class="contact">email | phone</div>
    <h2>Skills</h2>
    <ul>
      <li>React</li>
      <li>TypeScript</li>
      <li>Node.js</li>
      <li>PostgreSQL</li>
      <li>AWS</li>
    </ul>
    <h2>Education</h2>
    <div class="section-content"><strong style="color: #2563eb;">Bachelor of Science in Computer Science</strong><br><em style="color: #60a5fa;">University of Technology | 2015 - 2019</em></div>
  </div>
  <div class="right-column">
    <h2>Experience</h2>
    <div class="section-content"><strong style="color: #2563eb;">Senior Software Engineer</strong><br><em style="color: #60a5fa;">Tech Corp | 2021 - Present</em></div>
    <ul>
      <li>Led development of microservices architecture serving 2M+ users</li>
      <li>Improved application performance by 40% through optimization</li>
    </ul>
    <h2>Projects</h2>
    <div class="section-content"><strong style="color: #2563eb;">E-Commerce Platform | 2023</strong></div>
    <ul>
      <li>Full-stack application with React frontend and Node.js backend</li>
    </ul>
  </div>
</div>
</body>
</html>

CRITICAL FORMATTING RULES:
- Contact info MUST be on ONE line: "email | phone" (use pipe separator |)
- Skills MUST be simple bullet points: <li>SkillName</li>
- DO NOT add categories like "Programming:", "Frontend Development:", etc.
- DO NOT group skills by category
- DO NOT use bold text for skill categories
- Just list skills as simple items: <li>React</li>, <li>TypeScript</li>, etc.
- Maximum 5-7 skills in the list
- Optimize spacing to prevent blank pages and content overflow

CRITICAL: Use EXACTLY this two-column structure with left sidebar (35%) and right content column (65%). DO NOT use multicol - use minipage for LaTeX.`,
  },

  // ── 2. Modern Minimal ────────────────────────────────────────────────────
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    category: 'modern',
    description: 'Clean single-column design with generous whitespace',
    preview: 'Minimalist single-column layout with focus on content and readability',
    format: 'html',
    styleGuide: `MODERN MINIMAL TEMPLATE STYLE - YOU MUST USE THIS EXACT LAYOUT:

MANDATORY STRUCTURE (LaTeX):
\\usepackage[margin=1in]{geometry}
\\begin{center}
{\\Huge\\textbf{NAME}}
\\vspace{0.2cm}
email | phone
\\end{center}
\\vspace{0.4cm}
\\hrule
\\vspace{0.4cm}
\\section*{Skills}
Content here
\\vspace{0.3cm}
\\hrule
\\vspace{0.3cm}
\\section*{Experience}
\\textbf{Job Title} \\hfill \\textit{Dates}
Company
\\begin{itemize}[leftmargin=*]
\\item Description
\\end{itemize}
\\vspace{0.3cm}
\\hrule
\\vspace{0.3cm}
\\section*{Education}
\\textbf{Degree}
Institution

MANDATORY STRUCTURE (HTML):
<div class="resume" style="max-width: 700px; margin: 0 auto;">
  <h1 style="text-align: center; font-size: 36px; font-weight: 300;">NAME</h1>
  <div style="text-align: center; color: #718096; margin-bottom: 40px;">email | phone</div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
  <h2 style="font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Skills</h2>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
  <h2 style="font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Experience</h2>
</div>

CRITICAL: Use EXACTLY this single-column centered layout with generous whitespace and simple dividers.`,
  },

  // ── 3. Creative Portfolio ────────────────────────────────────────────────
  {
    id: 'creative-portfolio',
    name: 'Creative Portfolio',
    category: 'creative',
    description: 'Bold design with visual elements and creative layout',
    preview: 'Creative resume with unique layout, color accents, and visual interest',
    format: 'html',
    styleGuide: `CREATIVE PORTFOLIO TEMPLATE STYLE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{tikz}

\\definecolor{accent}{RGB}{139, 69, 19}
\\definecolor{primary}{RGB}{30, 64, 175}

\\begin{document}

\\begin{tikzpicture}[remember picture,overlay]
\\fill[accent!20] (current page.north west) rectangle ([yshift=-3cm]current page.north east);
\\end{tikzpicture}

\\vspace{-2.5cm}
{\\Huge\\textbf{\\textcolor{primary}{NAME}}}
\\textcolor{accent}{email | phone}

\\vspace{0.5cm}
\\section*{\\textcolor{primary}{\\Large Experience}}
\\textbf{\\textcolor{accent}{Job Title}} \\hfill \\textit{Dates}
\\textbf{Company}
\\begin{itemize}[leftmargin=*]
\\item Description
\\end{itemize}

\\section*{\\textcolor{primary}{\\Large Skills}}
\\textbf{Skills list}

\\section*{\\textcolor{primary}{\\Large Projects}}
\\textbf{\\textcolor{accent}{Project Name | Year}}
\\begin{itemize}[leftmargin=*]
\\item Description
\\end{itemize}

\\end{document}

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
.resume { max-width: 850px; margin: 0 auto; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
.header { background: linear-gradient(135deg, #8b4513 0%, #d2691e 100%); padding: 40px; color: white; }
.content { padding: 40px; }
h1 { font-size: 42px; margin-bottom: 10px; font-weight: 700; }
h2 { color: #8b4513; font-size: 24px; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #8b4513; padding-left: 15px; }
</style>
</head>
<body>
<div class="resume">
  <div class="header">
    <h1>NAME</h1>
    <div style="font-size: 16px; opacity: 0.9;">email | phone</div>
  </div>
  <div class="content">
    <h2>Experience</h2>
    <div style="font-weight: bold; color: #8b4513; margin-top: 20px; font-size: 18px;">Job Title</div>
    <div style="color: #a0522d; font-style: italic;">Company | Dates</div>
    <ul><li>Description</li></ul>
    <h2>Skills</h2>
    <p>Skills list</p>
    <h2>Projects</h2>
    <div style="font-weight: bold; color: #8b4513; font-size: 18px;">Project Name | Year</div>
    <ul><li>Description</li></ul>
  </div>
</div>
</body>
</html>

CRITICAL: Use EXACTLY this layout with colored header section. MUST have gradient header background.`,
  },

  // ── 4. Executive Summary ────────────────────────────────────────────────
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    category: 'executive',
    description: 'Senior-level format with emphasis on achievements',
    preview: 'Executive resume format highlighting leadership and strategic achievements',
    format: 'html',
    styleGuide: `EXECUTIVE SUMMARY TEMPLATE STYLE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}

\\begin{document}

{\\Huge\\textbf{\\textcolor{blue!90!black}{NAME}}}
\\textcolor{blue!70!black}{email | phone}

\\vspace{0.3cm}
\\hrule
\\vspace{0.3cm}

\\section*{\\textcolor{blue!75!black}{\\large Executive Summary}}
Results-driven technology leader with 8+ years of experience driving innovation and delivering scalable solutions. Proven track record of leading cross-functional teams and delivering projects that serve millions of users.

\\section*{\\textcolor{blue!75!black}{\\large Key Achievements}}
\\begin{itemize}[leftmargin=*]
\\item Led platform migration serving 2M+ users, resulting in 40% performance improvement
\\item Mentored team of 5 junior developers, improving team productivity by 35%
\\item Reduced deployment time by 50% through CI/CD automation
\\end{itemize}

\\section*{\\textcolor{blue!75!black}{\\large Experience}}
\\textbf{\\textcolor{blue!60!black}{Job Title}} \\hfill \\textit{Dates}
\\textit{\\textcolor{blue!50!black}{Company}}
\\begin{itemize}[leftmargin=*]
\\item Description
\\end{itemize}

\\end{document}

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
.resume { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
h1 { color: #1e40af; font-size: 32px; margin-bottom: 10px; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
.contact { color: #3b82f6; margin-bottom: 25px; }
.summary { background: #f0f4ff; padding: 20px; border-left: 4px solid #1e40af; margin: 25px 0; font-style: italic; }
.achievements { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
.achievement { background: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; }
h2 { color: #1e40af; font-size: 20px; margin-top: 25px; margin-bottom: 15px; }
</style>
</head>
<body>
<div class="resume">
  <h1>NAME</h1>
  <div class="contact">email | phone</div>
  <div class="summary">Results-driven technology leader with 8+ years of experience driving innovation and delivering scalable solutions. Proven track record of leading cross-functional teams.</div>
  <h2>Key Achievements</h2>
  <div class="achievements">
    <div class="achievement">Led platform migration serving 2M+ users</div>
    <div class="achievement">Improved performance by 40%</div>
    <div class="achievement">Mentored team of 5 developers</div>
    <div class="achievement">Reduced deployment time by 50%</div>
  </div>
  <h2>Experience</h2>
  <div style="font-weight: bold; color: #2563eb; margin-top: 15px;">Job Title</div>
  <div style="color: #60a5fa; font-style: italic;">Company | Dates</div>
  <ul><li>Description</li></ul>
</div>
</body>
</html>

CRITICAL: Summary section MUST be at top after name/contact, followed by Key Achievements grid (2 columns).`,
  },

  // ── 5. Academic Scholar ────────────────────────────────────────────────
  {
    id: 'academic-scholar',
    name: 'Academic Scholar',
    category: 'academic',
    description: 'Academic format with publications and research focus',
    preview: 'Academic resume format with emphasis on education, publications, and research',
    format: 'html',
    styleGuide: `ACADEMIC SCHOLAR TEMPLATE STYLE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}

\\begin{document}
\\vspace*{-0.5cm}

\\begin{center}
{\\Huge\\textbf{NAME}}
\\vspace{0.2cm}
email | phone
\\end{center}

\\vspace{0.3cm}
\\hrule
\\vspace{0.3cm}

\\section*{Education}
\\hrule
\\vspace{0.2cm}
\\textbf{Bachelor of Science in Computer Science}\\\\
University of Technology | 2015 - 2019\\\\
\\textit{Graduated Magna Cum Laude • Relevant coursework: Data Structures, Algorithms, Database Systems}

\\vspace{0.3cm}
\\section*{Research Experience}
\\hrule
\\vspace{0.2cm}
\\textbf{Research Assistant} \\hfill \\textit{2018 - 2019}\\\\
University of Technology
\\begin{itemize}[leftmargin=*]
\\item Conducted research on distributed systems and published findings
\\item Collaborated with faculty on peer-reviewed publications
\\end{itemize}

\\vspace{0.3cm}
\\section*{Publications}
\\hrule
\\vspace{0.2cm}
\\begin{itemize}[leftmargin=*]
\\item "Scalable Architecture Patterns" - Journal of Computer Science, 2023
\\item "Microservices Best Practices" - Conference on Software Engineering, 2022
\\end{itemize}

\\vspace{0.3cm}
\\section*{Technical Skills}
\\hrule
\\vspace{0.2cm}
C++, JavaScript, Python, Data Structures, Algorithms, Object-Oriented Programming

\\end{document}

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body { margin: 0; padding: 0; }
.resume { max-width: 750px; margin: 0 auto; padding: 20px; }
h1 { text-align: center; font-size: 28px; margin-bottom: 10px; margin-top: 0; }
.contact { text-align: center; color: #4a5568; margin-bottom: 30px; font-size: 14px; }
hr { border: none; border-top: 1px solid #cbd5e0; margin: 20px 0; }
h2 { font-size: 18px; margin-top: 25px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e0; padding-bottom: 5px; }
.publication { margin: 10px 0; padding-left: 20px; }
ul { margin-top: 10px; margin-bottom: 20px; padding-left: 20px; }
@media print {
  body { margin: 0; padding: 0; }
  .resume { padding: 10px; }
}
</style>
</head>
<body>
<div class="resume">
  <h1>NAME</h1>
  <div class="contact">email | phone</div>
  <hr>
  <h2>Education</h2>
  <div style="font-weight: bold; margin-top: 15px;">Bachelor of Science in Computer Science</div>
  <div style="color: #718096; font-size: 14px;">University of Technology | 2015 - 2019</div>
  <p style="margin-top: 8px; font-style: italic;">Graduated Magna Cum Laude • Relevant coursework: Data Structures, Algorithms, Database Systems</p>
  <h2>Research Experience</h2>
  <div style="font-weight: bold; margin-top: 15px;">Research Assistant</div>
  <div style="color: #718096; font-size: 14px;">University of Technology | 2018 - 2019</div>
  <ul>
    <li>Conducted research on distributed systems and published findings</li>
    <li>Collaborated with faculty on peer-reviewed publications</li>
  </ul>
  <h2>Publications</h2>
  <ul>
    <li>"Scalable Architecture Patterns" - Journal of Computer Science, 2023</li>
    <li>"Microservices Best Practices" - Conference on Software Engineering, 2022</li>
  </ul>
  <h2>Technical Skills</h2>
  <p>C++, JavaScript, Python, Data Structures, Algorithms, Object-Oriented Programming</p>
</div>
</body>
</html>

CRITICAL FORMATTING RULES:
- Name MUST be centered at top
- Horizontal line (hr) MUST be after contact info
- Each section heading MUST have border-bottom line
- Education MUST come first, then Research Experience, then Publications, then Technical Skills
- Section order is MANDATORY: Education → Research Experience → Publications → Technical Skills
- DO NOT add "Work Experience" or "Professional Experience" sections - this is academic format
- Publications should be bullet points with format: "Title" - Journal/Conference, Year`,
  },

  // ── 6. Tech Professional ───────────────────────────────────────────────
  {
    id: 'tech-professional',
    name: 'Tech Professional',
    category: 'professional',
    description: 'Tech-focused layout highlighting technical skills',
    preview: 'Technology-focused resume with prominent skills section and technical achievements',
    format: 'html',
    styleGuide: `TECH PROFESSIONAL TEMPLATE STYLE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{multicol}
\\usepackage{tikz}

\\definecolor{terminalgreen}{RGB}{0, 255, 0}
\\definecolor{terminalbg}{RGB}{26, 26, 26}

\\pagecolor{terminalbg}
\\color{terminalgreen}

\\begin{document}
\\vspace*{-0.5cm}

\\begin{minipage}[t]{0.6\\textwidth}
{\\Huge\\textbf{\\textcolor{terminalgreen}{NAME}}}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.35\\textwidth}
\\raggedleft
\\textcolor{terminalgreen!70!black}{email - phone}
\\end{minipage}

\\textcolor{terminalgreen!70!black}{github.com/username}

\\vspace{0.3cm}
\\textcolor{terminalgreen}{\\rule{\\textwidth}{0.5pt}}
\\vspace{0.3cm}

\\section*{\\textcolor{terminalgreen}{\\large Technical Skills}}
\\textcolor{terminalgreen}{\\rule{\\textwidth}{0.5pt}}
\\vspace{0.2cm}
\\begin{multicols}{3}
\\begin{itemize}[leftmargin=*]
\\item React
\\item TypeScript
\\item Node.js
\\item PostgreSQL
\\item AWS
\\item Docker
\\item Git
\\end{itemize}
\\end{multicols}

\\vspace{0.3cm}
\\section*{\\textcolor{terminalgreen}{\\large Professional Experience}}
\\textcolor{terminalgreen}{\\rule{\\textwidth}{0.5pt}}
\\vspace{0.2cm}
\\textbf{\\textcolor{terminalgreen!80!black}{Senior Software Engineer}} \\hfill \\textit{\\textcolor{terminalgreen!60!black}{2021 - Present}}\\\\
\\textit{\\textcolor{terminalgreen!70!black}{Tech Corp}}
\\begin{itemize}[leftmargin=*]
\\item Led development of microservices architecture serving 2M+ users
\\item Improved application performance by 40% through optimization
\\item Technologies: React, Node.js, PostgreSQL, AWS, Docker
\\end{itemize}

\\vspace{0.3cm}
\\section*{\\textcolor{terminalgreen}{\\large Projects}}
\\textcolor{terminalgreen}{\\rule{\\textwidth}{0.5pt}}
\\vspace{0.2cm}
\\textbf{\\textcolor{terminalgreen!80!black}{E-Commerce Platform | 2023}}\\\\
\\textit{\\textcolor{terminalgreen!70!black}{github.com/username/ecommerce}}
\\begin{itemize}[leftmargin=*]
\\item Full-stack application with React frontend and Node.js backend
\\item Integrated payment gateway and inventory management
\\end{itemize}

\\end{document}

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body { margin: 0; padding: 0; background: #000000; }
.resume { background: #1a1a1a; color: #00ff00; padding: 30px; border: 2px solid #00ff00; max-width: 850px; margin: 0 auto; font-family: 'Courier New', monospace; }
h1 { color: #00ff00; font-size: 28px; margin-bottom: 10px; margin-top: 0; text-transform: uppercase; font-weight: bold; }
.contact { color: #00ff88; margin-bottom: 10px; font-size: 14px; }
.github { color: #00ff88; margin-bottom: 25px; font-size: 14px; }
hr { border: none; border-top: 1px solid #00ff00; margin: 20px 0; }
h2 { color: #00ff00; font-size: 18px; margin-top: 25px; margin-bottom: 12px; border-bottom: 1px solid #00ff00; padding-bottom: 5px; }
.skills-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }
.skill { background: #0a0a0a; padding: 8px; border: 1px solid #00ff00; text-align: center; color: #00ff00; }
.job-title { font-weight: bold; color: #00ff88; margin-top: 15px; }
.company { color: #00ff00; font-style: italic; margin-bottom: 10px; }
.tech { color: #00ff88; }
ul { margin-top: 10px; margin-bottom: 20px; padding-left: 20px; }
li { color: #00ff00; margin-bottom: 5px; }
@media print {
  body { background: #1a1a1a; }
  .resume { border: 2px solid #00ff00; }
}
</style>
</head>
<body>
<div class="resume">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
    <h1 style="margin: 0;">NAME</h1>
    <div class="contact" style="text-align: right; margin-top: 5px;">email - phone</div>
  </div>
  <div class="github">github.com/username</div>
  <hr>
  <h2>Technical Skills</h2>
  <div class="skills-grid">
    <div class="skill">React</div>
    <div class="skill">TypeScript</div>
    <div class="skill">Node.js</div>
    <div class="skill">PostgreSQL</div>
    <div class="skill">AWS</div>
    <div class="skill">Docker</div>
    <div class="skill">Git</div>
  </div>
  <h2>Professional Experience</h2>
  <div class="job-title">Senior Software Engineer</div>
  <div class="company">Tech Corp | 2021 - Present</div>
  <ul>
    <li class="tech">Led development of microservices architecture serving 2M+ users</li>
    <li class="tech">Improved application performance by 40% through optimization</li>
    <li class="tech">Technologies: React, Node.js, PostgreSQL, AWS, Docker</li>
  </ul>
  <h2>Projects</h2>
  <div class="job-title">E-Commerce Platform | 2023</div>
  <div class="github">github.com/username/ecommerce</div>
  <ul>
    <li>Full-stack application with React frontend and Node.js backend</li>
    <li>Integrated payment gateway and inventory management</li>
  </ul>
</div>
</body>
</html>

CRITICAL FORMATTING RULES:
- Background MUST be black (#000000 or #1a1a1a)
- Text MUST be bright green (#00ff00)
- Skills MUST be in 3-column grid with boxes (border: 1px solid #00ff00)
- Each skill in a box with dark background (#0a0a0a)
- Use monospace font (Courier New or monospace)
- GitHub link MUST be prominently displayed
- Section headings MUST have green border-bottom
- Horizontal line (hr) MUST separate header from content
- Terminal/hacker aesthetic is MANDATORY`,
  },

  // ── 7. Creative Designer ────────────────────────────────────────────────
  {
    id: 'creative-designer',
    name: 'Creative Designer',
    category: 'creative',
    description: 'Design-focused resume with visual portfolio emphasis',
    preview: 'Designer resume with emphasis on visual work, portfolio, and creative projects',
    format: 'html',
    styleGuide: `CREATIVE DESIGNER TEMPLATE STYLE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{tikz}

\\definecolor{design}{RGB}{147, 51, 234}

\\begin{document}
\\vspace*{-0.5cm}

\\begin{minipage}[t]{0.6\\textwidth}
{\\Huge\\textbf{\\textcolor{design}{NAME}}}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.35\\textwidth}
\\raggedleft
\\textcolor{black}{email — phone}
\\end{minipage}

\\vspace{0.3cm}
\\hrule
\\vspace{0.4cm}

\\section*{\\textcolor{design}{\\Large Portfolio Highlights}}
\\begin{minipage}[t]{0.95\\textwidth}
\\textbf{\\textcolor{design!80!black}{Project Name — Description}}\\\\
\\textcolor{black}{Technologies — Year}
\\begin{itemize}[leftmargin=*]
\\item Design achievement with detailed description spanning multiple lines
\\item Another design achievement with detailed description spanning multiple lines
\\end{itemize}
\\vspace{0.3cm}
\\end{minipage}

\\section*{\\textcolor{design}{\\Large Design Skills}}
\\textcolor{black}{Skill1, Skill2, Skill3, Skill4, Skill5}

\\section*{\\textcolor{design}{\\Large Experience}}
\\textbf{\\textcolor{design!80!black}{Job Title}}\\\\
\\textcolor{black}{Company or Field} \\hfill \\textcolor{black}{Location — Dates}
\\begin{itemize}[leftmargin=*]
\\item Leading design and development initiatives with detailed description
\\end{itemize}

\\end{document}

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body { margin: 0; padding: 0; }
.resume { background: white; padding: 40px; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 20px rgba(147, 51, 234, 0.2); }
.header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
h1 { color: #9333ea; font-size: 36px; margin: 0; font-weight: bold; }
.contact-info { text-align: right; color: #000; font-size: 14px; margin-top: 5px; }
.contact-line { margin-bottom: 5px; }
hr { border: none; border-top: 1px solid #000; margin: 20px 0; }
h2 { color: #9333ea; font-size: 22px; margin-top: 30px; margin-bottom: 15px; font-weight: bold; }
.portfolio-section { margin-left: 0; }
.portfolio-item { margin-bottom: 20px; }
.project-title { font-weight: bold; color: #9333ea; margin-bottom: 8px; }
.project-description { color: #000; margin-bottom: 10px; }
ul { margin-top: 10px; margin-bottom: 20px; padding-left: 20px; }
li { color: #000; margin-bottom: 8px; }
.job-title { font-weight: bold; color: #9333ea; margin-top: 20px; }
.company { color: #000; font-style: italic; margin-bottom: 10px; }
@media print {
  body { margin: 0; padding: 0; }
  .resume { padding: 20px; }
}
</style>
</head>
<body>
<div class="resume">
  <div class="header-row">
    <h1>NAME</h1>
    <div class="contact-info">
      <div class="contact-line">email — phone</div>
    </div>
  </div>
  <hr>
  <h2>Portfolio Highlights</h2>
  <div class="portfolio-section">
    <div class="portfolio-item">
      <div class="project-title">Project Name — Description</div>
      <div class="project-description">Technologies — Year</div>
      <ul>
        <li>Design achievement with detailed description spanning multiple lines</li>
        <li>Another design achievement with detailed description spanning multiple lines</li>
      </ul>
    </div>
  </div>
  <h2>Design Skills</h2>
  <p>Skill1, Skill2, Skill3, Skill4, Skill5</p>
  <h2>Experience</h2>
  <div class="job-title">Job Title</div>
  <div style="display: flex; justify-content: space-between; color: #000; margin-bottom: 10px;">
    <span>Company or Field</span>
    <span>Location — Dates</span>
  </div>
  <ul>
    <li>Leading design and development initiatives with detailed description</li>
  </ul>
</div>
</body>
</html>

CRITICAL FORMATTING RULES:
- Header: Name on LEFT, email-phone on RIGHT (same line, use em dash —), portfolio/behance links on second line (RIGHT) ONLY if provided by user
- Portfolio/Behance links: ONLY include if user provided them in their data. If user did NOT provide portfolio.com or behance.net links, DO NOT add them. Skip the second contact line entirely if no portfolio/behance links are provided.
- Portfolio Highlights section: NO vertical bar or border - clean layout without decorative elements
- Project format: "Project Name — Description" on first line (bold, purple), then "Technologies — Year" on second line (regular, black), then bullet points below
- Design Skills section: MUST be simple comma-separated list (Skill1, Skill2, Skill3). DO NOT add categories like "Frontend Development:", "Backend Development:", etc. DO NOT use bold for categories. Just list all skills as comma-separated text.
- Experience section: Job Title (bold, purple), then Company/Location — Dates on same line (regular, black, right-aligned)
- Use purple/violet color scheme (#9333ea) for headings and accents
- Portfolio section should have left border/bar in purple color
- Emphasize design work and creative projects`,
  },

  // ── 8. Minimal Clean ────────────────────────────────────────────────────
  {
    id: 'minimal-clean',
    name: 'Minimal Clean',
    category: 'minimal',
    description: 'Ultra-clean design with maximum readability',
    preview: 'Ultra-minimal resume with focus on content and readability',
    styleGuide: `MINIMAL CLEAN TEMPLATE STYLE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{multicol}

\\begin{document}
\\vspace*{-0.5cm}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\
email — phone
\\end{center}

\\vspace{0.4cm}

\\begin{multicols}{2}

\\textbf{SKILLS}\\\\
Skills list (comma-separated, no bullets)

\\vspace{0.15cm}

\\textbf{EDUCATION}\\\\
\\textbf{Degree — Institution — Dates}\\\\
Additional details

\\columnbreak

\\textbf{EXPERIENCE}\\\\
\\textbf{Job Title}\\\\
Company — Location — Dates\\\\
\\begin{itemize}[leftmargin=*]
\\item Description with detailed information spanning multiple lines
\\item Another achievement with detailed description spanning multiple lines
\\end{itemize}

\\vspace{0.3cm}

\\textbf{PROJECTS}\\\\
\\textbf{Project Name — Technologies — Year}\\\\
\\begin{itemize}[leftmargin=*]
\\item Project description with detailed information spanning multiple lines
\\item Another project achievement with detailed description spanning multiple lines
\\end{itemize}

\\end{multicols}

\\end{document}

MANDATORY STRUCTURE (HTML):
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body { margin: 0; padding: 0; }
.resume { max-width: 900px; margin: 0 auto; padding: 40px; }
.contact { text-align: center; color: #000; margin-bottom: 20px; font-size: 14px; }
.two-column { display: grid; grid-template-columns: 1fr 1.5fr; gap: 40px; margin-bottom: 30px; align-items: start; }
.left-column { }
.right-column { }
h2 { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; color: #000; letter-spacing: 1px; }
.skills-content { color: #000; font-size: 14px; line-height: 1.6; }
.education-content { color: #000; font-size: 14px; line-height: 1.6; }
.education-degree { font-weight: bold; color: #000; margin-bottom: 5px; }
.education-details { color: #000; font-size: 14px; }
.experience-section { margin-top: 20px; }
.job-title { font-weight: bold; color: #000; margin-bottom: 5px; }
.company { color: #000; margin-bottom: 10px; }
ul { margin-top: 10px; margin-bottom: 20px; padding-left: 20px; }
li { color: #000; margin-bottom: 8px; font-size: 14px; line-height: 1.6; }
@media print {
  body { margin: 0; padding: 0; }
  .resume { padding: 20px; }
}
</style>
</head>
<body>
<div class="resume">
    <div class="contact">
    <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">NAME</div>
    <div>email — phone</div>
  </div>
  <div class="two-column">
    <div class="left-column">
      <h2>Skills</h2>
      <div class="skills-content">Skills list (comma-separated, no bullets)</div>
      <h2 style="margin-top: 15px;">Education</h2>
      <div class="education-content">
        <div class="education-degree">Degree — Institution — Dates</div>
        <div class="education-details">Additional details</div>
      </div>
    </div>
    <div class="right-column">
      <h2>Experience</h2>
      <div class="experience-section">
        <div class="job-title">Job Title</div>
        <div class="company">Company — Location — Dates</div>
        <ul>
          <li>Description with detailed information spanning multiple lines</li>
          <li>Another achievement with detailed description spanning multiple lines</li>
        </ul>
      </div>
      <h2 style="margin-top: 30px;">Projects</h2>
      <div class="experience-section">
        <div class="job-title">Project Name — Technologies — Year</div>
        <ul>
          <li>Project description with detailed information spanning multiple lines</li>
          <li>Another project achievement with detailed description spanning multiple lines</li>
        </ul>
      </div>
    </div>
  </div>
</div>
</body>
</html>

CRITICAL FORMATTING RULES:
- Header MUST be centered at top: Name (large, bold) on first line, then email — phone on second line (use em dash — NOT pipe |)
- MUST use two-column layout for ALL content: Left column (Skills, Education), Right column (Experience, Projects)
- For LaTeX: ALL sections (Skills, Education, Experience, Projects) MUST be inside \\begin{multicols}{2}...\\end{multicols} environment
- Use \\columnbreak to separate left and right columns in LaTeX (place \\columnbreak after Education section, before Experience section)
- For HTML: Use CSS Grid with grid-template-columns: 1fr 1.5fr for proper two-column layout
- Left column (40% width): Contains Skills and Education sections
- Right column (60% width): Contains Experience and Projects sections
- Columns should be properly balanced and aligned at the top (align-items: start)
- Ensure proper spacing between columns (gap: 40px for HTML, automatic for LaTeX multicols)
- Skills MUST be comma-separated text (can wrap across multiple lines), NOT bullet points (e.g., "React, TypeScript, Node.js, PostgreSQL, AWS")
- Section titles MUST be bold, uppercase: "SKILLS", "EXPERIENCE", "EDUCATION", "PROJECTS"
- All text MUST be black (#000) - NO colors, NO blue, NO colored headings - everything must be pure black
- Simple, clean layout with no decorative elements
- NO borders, dividers, or visual separators
- Contact format: email — phone (use em dash — NOT pipe |)
- Education format: "Degree — Institution — Dates" on first line (bold), then additional details on second line (regular text) - use em dash — NOT pipe |
- Experience format: Job Title (bold) on first line, then "Company — Location — Dates" on second line (regular text), then bullet points below - use em dash — NOT pipe |
- Projects format: "Project Name — Technologies — Year" on first line (bold), then bullet points below - use em dash — NOT pipe |
- DO NOT use any colors - everything must be black text only
- MUST include Projects section if user provided project data`,
    format: 'html',
  },
  
  // ── LaTeX Templates ────────────────────────────────────────────────────────
  
  // 1. Classic Professional LaTeX Resume
  {
    id: 'latex-classic-professional',
    name: 'Classic Professional',
    category: 'professional',
    description: 'Traditional single-column layout with clean typography',
    preview: 'Professional LaTeX resume with clear sections and traditional formatting',
    format: 'latex',
    styleGuide: `CLASSIC PROFESSIONAL LATEX TEMPLATE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass[11pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{hyperref}

\\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    filecolor=blue,
    urlcolor=blue,
}

\\titlespacing*{\\section}{0pt}{12pt}{6pt}
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]

\\setlength{\\parskip}{0.5em}
\\setlength{\\itemsep}{0.2em}
\\setlist[itemize]{leftmargin=*,topsep=0.2em,itemsep=0.1em}

\\begin{document}

\\begin{center}
{\\Huge\\textbf{NAME}}\\\\[0.3cm]
{\\large Job Title}\\\\[0.2cm]
email | phone | location\\\\
linkedin | portfolio
\\end{center}

\\vspace{0.3cm}

\\section*{Summary}
Summary text describing professional background and key qualifications. This section should be 2-3 lines highlighting your expertise and career focus.

\\section*{Skills}
\\begin{itemize}
\\item Skill1, Skill2, Skill3, Skill4
\\item Skill5, Skill6, Skill7, Skill8
\\item Skill9, Skill10, Skill11, Skill12
\\end{itemize}

\\section*{Work Experience}

\\textbf{Job Title} \\hfill \\textit{Dates}\\\\
\\textit{Company Name, Location} \\hfill \\textit{Start Date - End Date}
\\begin{itemize}
\\item Achievement or responsibility description with detailed information spanning multiple lines to provide context and impact
\\item Another achievement with specific metrics and outcomes that demonstrate value delivered
\\item Additional responsibility or accomplishment with relevant details and scope
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Job Title} \\hfill \\textit{Dates}\\\\
\\textit{Company Name, Location} \\hfill \\textit{Start Date - End Date}
\\begin{itemize}
\\item Achievement or responsibility description with detailed information spanning multiple lines
\\item Another achievement with specific metrics and outcomes
\\end{itemize}

\\section*{Education}

\\textbf{Degree Name} \\hfill \\textit{Graduation Date}\\\\
\\textit{Institution Name, Location}\\\\
Relevant coursework, honors, or GPA if applicable

\\section*{Projects}

\\textbf{Project Name} \\hfill \\textit{Year}\\\\
\\textit{Technologies Used}
\\begin{itemize}
\\item Project description with detailed information about the problem solved, technologies used, and impact delivered
\\item Key features or achievements with specific outcomes and user impact
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Project Name} \\hfill \\textit{Year}\\\\
\\textit{Technologies Used}
\\begin{itemize}
\\item Project description with detailed information spanning multiple lines
\\item Key features or achievements with specific outcomes
\\end{itemize}

\\section*{Certifications}

\\textbf{Certification Name} \\hfill \\textit{Date}\\\\
\\textit{Issuing Organization}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info format: "email | phone | location" on one line, "linkedin | portfolio" on second line (use pipe separator |)
- Skills MUST be grouped in comma-separated lists within bullet points (NOT individual items)
- Experience format: Job Title (bold) on first line with dates (italic, right-aligned), Company and Location (italic) on second line with date range (italic, right-aligned)
- Education format: Degree (bold) with graduation date (italic, right-aligned), Institution and Location (italic) on second line
- Projects format: Project Name (bold) with Year (italic, right-aligned), Technologies (italic) on second line
- Each bullet point MUST be 2-5 lines (ideally 3 lines) with detailed descriptions
- Use \\hfill for right-aligned dates
- Section headings use \\section* with custom formatting
- Optimize spacing to prevent blank first page`,

  },

  // 2. Compact LaTeX Resume
  {
    id: 'latex-compact',
    name: 'Compact Layout',
    category: 'professional',
    description: 'Space-efficient single-column design for maximum content',
    preview: 'Compact LaTeX resume optimized for dense information presentation',
    format: 'latex',
    styleGuide: `COMPACT LATEX TEMPLATE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass[10pt]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{titlesec}

\\titlespacing*{\\section}{0pt}{8pt}{4pt}
\\titleformat{\\section}{\\normalsize\\bfseries\\uppercase}{}{0em}{}

\\setlength{\\parskip}{0.3em}
\\setlength{\\itemsep}{0.1em}
\\setlist[itemize]{leftmargin=*,topsep=0.1em,itemsep=0.05em,labelsep=0.2em}

\\begin{document}

\\noindent
{\\Large\\textbf{NAME}}\\\\
{\\normalsize Job Title}\\\\
email | phone | location

\\vspace{0.2cm}

\\section*{SUMMARY}
Summary text in 2-3 lines describing professional background and key qualifications.

\\section*{SKILLS}
Skill1, Skill2, Skill3, Skill4, Skill5, Skill6, Skill7, Skill8, Skill9, Skill10

\\section*{EXPERIENCE}
\\textbf{Job Title} | \\textit{Company Name} | \\textit{Dates}\\\\
\\begin{itemize}
\\item Achievement description with detailed information spanning multiple lines to provide context
\\item Another achievement with specific metrics and outcomes demonstrating value
\\end{itemize}

\\textbf{Job Title} | \\textit{Company Name} | \\textit{Dates}\\\\
\\begin{itemize}
\\item Achievement description with detailed information
\\item Another achievement with specific metrics
\\end{itemize}

\\section*{EDUCATION}
\\textbf{Degree Name} | \\textit{Institution Name} | \\textit{Dates}\\\\
Relevant coursework, honors, or GPA

\\section*{PROJECTS}
\\textbf{Project Name} | \\textit{Technologies} | \\textit{Year}\\\\
\\begin{itemize}
\\item Project description with detailed information about problem solved and impact
\\item Key features or achievements with specific outcomes
\\end{itemize}

\\section*{CERTIFICATIONS}
\\textbf{Certification Name} | \\textit{Issuing Organization} | \\textit{Date}

\\end{document}

CRITICAL FORMATTING RULES:
- Compact spacing: Use 10pt font, 0.6in margins, tight itemsep and parskip
- Contact info: Single line format "email | phone | location" (use pipe separator |)
- Skills: Comma-separated single line (NOT bullet points)
- Experience: "Job Title | Company Name | Dates" format on one line (use pipe separator |)
- Education: "Degree Name | Institution Name | Dates" format (use pipe separator |)
- Projects: "Project Name | Technologies | Year" format (use pipe separator |)
- Certifications: "Certification Name | Organization | Date" format (use pipe separator |)
- Section headings: UPPERCASE, bold, no extra spacing
- Each bullet point MUST be 2-5 lines (ideally 3 lines) with detailed descriptions`,

  },

  // 3. Two-Column LaTeX Resume
  {
    id: 'latex-two-column',
    name: 'Two-Column Layout',
    category: 'professional',
    description: 'Traditional two-column layout with sidebar',
    preview: 'Two-column LaTeX resume with left sidebar for contact/skills and right column for experience',
    format: 'latex',
    styleGuide: `TWO-COLUMN LATEX TEMPLATE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass[11pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{titlesec}

\\titlespacing*{\\section}{0pt}{10pt}{5pt}
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]

\\setlength{\\parskip}{0.4em}
\\setlist[itemize]{leftmargin=*,topsep=0.2em,itemsep=0.1em}

\\begin{document}

\\begin{minipage}[t]{0.32\\textwidth}
{\\Huge\\textbf{NAME}}\\\\[0.2cm]
{\\normalsize Job Title}\\\\[0.3cm]

\\section*{Contact}
email\\\\
phone\\\\
location\\\\
linkedin\\\\
portfolio

\\vspace{0.3cm}

\\section*{Skills}
\\begin{itemize}
\\item Skill1, Skill2
\\item Skill3, Skill4
\\item Skill5, Skill6
\\item Skill7, Skill8
\\end{itemize}

\\vspace{0.3cm}

\\section*{Education}
\\textbf{Degree Name}\\\\
\\textit{Institution}\\\\
\\textit{Dates}\\\\
Relevant details

\\vspace{0.3cm}

\\section*{Certifications}
\\textbf{Certification}\\\\
\\textit{Organization}\\\\
\\textit{Date}

\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.65\\textwidth}

\\section*{Summary}
Summary text in 2-3 lines describing professional background and key qualifications.

\\section*{Experience}

\\textbf{Job Title} \\hfill \\textit{Dates}\\\\
\\textit{Company Name, Location}
\\begin{itemize}
\\item Achievement description with detailed information spanning multiple lines to provide context and impact
\\item Another achievement with specific metrics and outcomes that demonstrate value delivered
\\item Additional responsibility or accomplishment with relevant details
\\end{itemize}

\\vspace{0.2cm}

\\textbf{Job Title} \\hfill \\textit{Dates}\\\\
\\textit{Company Name, Location}
\\begin{itemize}
\\item Achievement description with detailed information
\\item Another achievement with specific metrics
\\end{itemize}

\\section*{Projects}

\\textbf{Project Name} \\hfill \\textit{Year}\\\\
\\textit{Technologies Used}
\\begin{itemize}
\\item Project description with detailed information about problem solved and impact
\\item Key features or achievements with specific outcomes
\\end{itemize}

\\end{minipage}

\\end{document}

CRITICAL FORMATTING RULES:
- Two-column layout: Left column 32% width (Contact, Skills, Education, Certifications), Right column 65% width (Summary, Experience, Projects)
- Left column: Contact info on separate lines (NOT pipe-separated)
- Skills: Grouped in comma-separated pairs within bullet points
- Right column: Experience and Projects with dates right-aligned using \\hfill
- Each bullet point MUST be 2-5 lines (ideally 3 lines) with detailed descriptions
- Use minipage for columns, NOT multicol package`,

  },

  // 4. Minimal ATS-Friendly LaTeX Resume
  {
    id: 'latex-minimal-ats',
    name: 'Minimal ATS-Friendly',
    category: 'minimal',
    description: 'Ultra-clean design optimized for ATS systems',
    preview: 'Minimal LaTeX resume with simple formatting for maximum ATS compatibility',
    format: 'latex',
    styleGuide: `MINIMAL ATS-FRIENDLY LATEX TEMPLATE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass[11pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}

\\setlength{\\parskip}{0.5em}
\\setlength{\\itemsep}{0.2em}
\\setlist[itemize]{leftmargin=*,topsep=0.3em,itemsep=0.15em}

\\begin{document}

\\begin{center}
{\\Large\\textbf{NAME}}\\\\[0.2cm]
email | phone | location
\\end{center}

\\vspace{0.3cm}

\\textbf{SUMMARY}\\\\
Summary text in 2-3 lines describing professional background and key qualifications.

\\vspace{0.3cm}

\\textbf{SKILLS}\\\\
Skill1, Skill2, Skill3, Skill4, Skill5, Skill6, Skill7, Skill8, Skill9, Skill10

\\vspace{0.3cm}

\\textbf{EXPERIENCE}\\\\
\\textbf{Job Title} | Company Name | Location | Dates
\\begin{itemize}
\\item Achievement description with detailed information spanning multiple lines to provide context
\\item Another achievement with specific metrics and outcomes demonstrating value
\\item Additional responsibility with relevant details and scope
\\end{itemize}

\\textbf{Job Title} | Company Name | Location | Dates
\\begin{itemize}
\\item Achievement description with detailed information
\\item Another achievement with specific metrics
\\end{itemize}

\\vspace{0.3cm}

\\textbf{EDUCATION}\\\\
\\textbf{Degree Name} | Institution Name | Location | Dates
Relevant coursework, honors, or GPA if applicable

\\vspace{0.3cm}

\\textbf{PROJECTS}\\\\
\\textbf{Project Name} | Technologies | Year
\\begin{itemize}
\\item Project description with detailed information about problem solved and impact
\\item Key features or achievements with specific outcomes
\\end{itemize}

\\textbf{Project Name} | Technologies | Year
\\begin{itemize}
\\item Project description with detailed information
\\item Key features or achievements
\\end{itemize}

\\vspace{0.3cm}

\\textbf{CERTIFICATIONS}\\\\
Certification Name | Issuing Organization | Date

\\end{document}

CRITICAL FORMATTING RULES:
- NO colors, NO fancy formatting - pure black text only
- NO section commands - use \\textbf{} for section headings
- Contact info: Single line "email | phone | location" (use pipe separator |)
- Skills: Comma-separated single line (NOT bullet points)
- Experience: "Job Title | Company Name | Location | Dates" format (use pipe separator |)
- Education: "Degree Name | Institution Name | Location | Dates" format (use pipe separator |)
- Projects: "Project Name | Technologies | Year" format (use pipe separator |)
- Certifications: "Certification Name | Organization | Date" format (use pipe separator |)
- Simple spacing with \\vspace between sections
- Each bullet point MUST be 2-5 lines (ideally 3 lines) with detailed descriptions
- Maximum ATS compatibility - no complex LaTeX commands`,

  },

  // 5. Modern Clean LaTeX Resume
  {
    id: 'latex-modern-clean',
    name: 'Modern Clean',
    category: 'modern',
    description: 'Contemporary design with balanced spacing',
    preview: 'Modern LaTeX resume with clean typography and professional layout',
    format: 'latex',
    styleGuide: `MODERN CLEAN LATEX TEMPLATE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass[11pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{titlesec}

\\definecolor{sectioncolor}{RGB}{0,51,102}

\\titlespacing*{\\section}{0pt}{12pt}{6pt}
\\titleformat{\\section}{\\large\\bfseries\\color{sectioncolor}}{}{0em}{}

\\setlength{\\parskip}{0.5em}
\\setlength{\\itemsep}{0.25em}
\\setlist[itemize]{leftmargin=*,topsep=0.3em,itemsep=0.15em}

\\begin{document}

\\begin{center}
{\\Huge\\textbf{NAME}}\\\\[0.3cm]
{\\large\\textit{Job Title}}\\\\[0.2cm]
email $\\cdot$ phone $\\cdot$ location\\\\
linkedin $\\cdot$ portfolio
\\end{center}

\\vspace{0.4cm}

\\section*{Professional Summary}
Summary text in 2-3 lines describing professional background, key qualifications, and career focus.

\\section*{Technical Skills}
\\begin{itemize}
\\item \\textbf{Category1:} Skill1, Skill2, Skill3
\\item \\textbf{Category2:} Skill4, Skill5, Skill6
\\item \\textbf{Category3:} Skill7, Skill8, Skill9
\\end{itemize}

\\section*{Professional Experience}

\\textbf{Job Title} \\hfill \\textcolor{gray}{Start Date - End Date}\\\\
\\textit{Company Name} \\hfill \\textit{Location}
\\begin{itemize}
\\item Achievement description with detailed information spanning multiple lines to provide context and demonstrate impact
\\item Another achievement with specific metrics, technologies used, and outcomes that show value delivered
\\item Additional responsibility or accomplishment with relevant details about scope and collaboration
\\end{itemize}

\\vspace{0.3cm}

\\textbf{Job Title} \\hfill \\textcolor{gray}{Start Date - End Date}\\\\
\\textit{Company Name} \\hfill \\textit{Location}
\\begin{itemize}
\\item Achievement description with detailed information spanning multiple lines
\\item Another achievement with specific metrics and outcomes
\\end{itemize}

\\section*{Education}

\\textbf{Degree Name} \\hfill \\textcolor{gray}{Graduation Date}\\\\
\\textit{Institution Name} \\hfill \\textit{Location}\\\\
Relevant coursework, honors, GPA, or academic achievements

\\section*{Notable Projects}

\\textbf{Project Name} \\hfill \\textcolor{gray}{Year}\\\\
\\textit{Technologies:} Technology1, Technology2, Technology3
\\begin{itemize}
\\item Project description with detailed information about the problem solved, approach taken, and impact delivered
\\item Key features or technical achievements with specific outcomes and user benefits
\\item Additional details about challenges overcome or innovative solutions implemented
\\end{itemize}

\\vspace{0.3cm}

\\textbf{Project Name} \\hfill \\textcolor{gray}{Year}\\\\
\\textit{Technologies:} Technology1, Technology2
\\begin{itemize}
\\item Project description with detailed information spanning multiple lines
\\item Key features or achievements with specific outcomes
\\end{itemize}

\\section*{Certifications \\& Awards}

\\textbf{Certification Name} \\hfill \\textcolor{gray}{Date}\\\\
\\textit{Issuing Organization}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info: Use $\\cdot$ (centered dot) as separator: "email $\\cdot$ phone $\\cdot$ location"
- Skills: Grouped by category with bold category names (e.g., "\\textbf{Category1:} Skill1, Skill2")
- Experience: Dates in gray color using \\textcolor{gray}, right-aligned with \\hfill
- Education: Similar format with gray dates
- Projects: "Technologies:" label in italic before comma-separated list
- Section headings: Colored blue using \\definecolor{sectioncolor}
- Each bullet point MUST be 2-5 lines (ideally 3 lines) with detailed descriptions
- Professional spacing with \\vspace between major sections`,

  },

  // 6. Balanced Professional LaTeX Resume
  {
    id: 'latex-balanced-professional',
    name: 'Balanced Professional',
    category: 'professional',
    description: 'Well-structured layout with equal emphasis on all sections',
    preview: 'Balanced LaTeX resume with harmonious section distribution',
    format: 'latex',
    styleGuide: `BALANCED PROFESSIONAL LATEX TEMPLATE - YOU MUST USE THIS EXACT LAYOUT:

🚨 COPY THIS EXACT STRUCTURE - DO NOT MODIFY 🚨

MANDATORY STRUCTURE (LaTeX):
\\documentclass[11pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{titlesec}

\\titlespacing*{\\section}{0pt}{10pt}{5pt}
\\titleformat{\\section}{\\normalsize\\bfseries\\uppercase}{}{0em}{}[\\vspace{-0.3em}\\titlerule\\vspace{0.5em}]

\\setlength{\\parskip}{0.4em}
\\setlength{\\itemsep}{0.2em}
\\setlist[itemize]{leftmargin=*,topsep=0.25em,itemsep=0.12em}

\\begin{document}

\\begin{center}
{\\LARGE\\textbf{NAME}}\\\\[0.25cm]
{\\normalsize Job Title}\\\\[0.15cm]
email | phone | location\\\\
\\small linkedin | portfolio
\\end{center}

\\vspace{0.4cm}

\\section*{PROFESSIONAL SUMMARY}
Summary text in 2-3 lines describing professional background, key qualifications, and career objectives.

\\section*{CORE COMPETENCIES}
Skill1, Skill2, Skill3, Skill4, Skill5, Skill6, Skill7, Skill8, Skill9, Skill10, Skill11, Skill12

\\section*{PROFESSIONAL EXPERIENCE}

\\textbf{Job Title} \\hfill \\textit{Start Date - End Date}\\\\
\\textit{Company Name} \\hfill \\textit{Location}
\\begin{itemize}
\\item Achievement description with detailed information spanning multiple lines to provide comprehensive context about responsibilities and impact
\\item Another achievement with specific metrics, technologies utilized, and quantifiable outcomes that demonstrate value and results
\\item Additional responsibility or project accomplishment with relevant details about scope, team collaboration, and business impact
\\end{itemize}

\\vspace{0.25cm}

\\textbf{Job Title} \\hfill \\textit{Start Date - End Date}\\\\
\\textit{Company Name} \\hfill \\textit{Location}
\\begin{itemize}
\\item Achievement description with detailed information spanning multiple lines
\\item Another achievement with specific metrics and outcomes
\\end{itemize}

\\section*{EDUCATION}

\\textbf{Degree Name} \\hfill \\textit{Graduation Date}\\\\
\\textit{Institution Name} \\hfill \\textit{Location}\\\\
Relevant coursework, academic honors, GPA, or notable achievements

\\section*{KEY PROJECTS}

\\textbf{Project Name} \\hfill \\textit{Year}\\\\
\\textit{Technologies Used:} Technology1, Technology2, Technology3
\\begin{itemize}
\\item Project description with detailed information about the problem addressed, technical approach, and impact delivered
\\item Key features or technical achievements with specific outcomes, user benefits, and measurable results
\\item Additional details about innovative solutions, challenges overcome, or collaboration aspects
\\end{itemize}

\\vspace{0.25cm}

\\textbf{Project Name} \\hfill \\textit{Year}\\\\
\\textit{Technologies Used:} Technology1, Technology2
\\begin{itemize}
\\item Project description with detailed information spanning multiple lines
\\item Key features or achievements with specific outcomes
\\end{itemize}

\\section*{CERTIFICATIONS}

\\textbf{Certification Name} \\hfill \\textit{Date}\\\\
\\textit{Issuing Organization}

\\end{document}

CRITICAL FORMATTING RULES:
- Contact info: "email | phone | location" on first line, "linkedin | portfolio" on second line in \\small (use pipe separator |)
- Core Competencies: Comma-separated single line (NOT bullet points)
- Experience: Dates in italic, right-aligned with \\hfill
- Education: Similar format with dates right-aligned
- Projects: "Technologies Used:" label in italic before comma-separated list
- Section headings: UPPERCASE with horizontal rule below
- Each bullet point MUST be 2-5 lines (ideally 3 lines) with detailed descriptions
- Balanced spacing throughout for harmonious appearance`,

  },
]
