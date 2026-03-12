'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X, FileText, Code, Monitor } from 'lucide-react'
import type { ResumeTemplate } from '../templates'

interface ResumeTemplatePreviewModalProps {
  open: boolean
  onClose: () => void
  template: ResumeTemplate | null
  defaultFormat?: 'latex' | 'html'
}

// Sample resume data for preview
const SAMPLE_RESUME_DATA = {
  fullName: 'John Doe',
  email: 'john.doe@email.com',
  phone: '+1 (555) 123-4567',
  skills: 'React, TypeScript, Node.js, PostgreSQL, AWS, Docker, Git',
  experience: `Senior Software Engineer | Tech Corp | 2021 - Present
• Led development of microservices architecture serving 2M+ users
• Improved application performance by 40% through optimization
• Mentored team of 5 junior developers

Software Engineer | StartupXYZ | 2019 - 2021
• Built core features using React and Node.js
• Collaborated with design team on UI/UX improvements
• Reduced deployment time by 50% with CI/CD automation`,
  education: `Bachelor of Science in Computer Science
University of Technology | 2015 - 2019
• Graduated Magna Cum Laude
• Relevant coursework: Data Structures, Algorithms, Database Systems`,
  projects: `E-Commerce Platform | 2023
• Full-stack application with React frontend and Node.js backend
• Integrated payment gateway and inventory management
• 10,000+ active users

Task Management App | 2022
• Real-time collaboration features using WebSockets
• Mobile-responsive design with PWA support
• Open source project with 500+ GitHub stars`,
}

// Generate sample LaTeX preview based on template
function generateSampleLatex(template: ResumeTemplate): string {
  const { id, styleGuide } = template
  
  // Template-specific LaTeX generation
  switch (id) {
    case 'professional-classic':
      return `\\documentclass{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{multicol}

\\begin{document}

% Two-column professional layout
\\begin{minipage}[t]{0.35\\textwidth}
{\\Huge\\textbf{\\textcolor{blue!90!black}{${SAMPLE_RESUME_DATA.fullName}}}}\\\\
\\textcolor{blue!70!black}{${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}}

\\vspace{0.5cm}
\\section*{\\textcolor{blue!75!black}{\\large Skills}}
\\begin{itemize}[leftmargin=*]
${SAMPLE_RESUME_DATA.skills.split(', ').slice(0, 5).map(s => `  \\item ${s}`).join('\n')}
\\end{itemize}

\\section*{\\textcolor{blue!75!black}{\\large Education}}
\\textbf{\\textcolor{blue!60!black}{${SAMPLE_RESUME_DATA.education.split('\\n')[0]}}}\\\\
\\textit{\\textcolor{blue!50!black}{${SAMPLE_RESUME_DATA.education.split('\\n')[1]}}}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.62\\textwidth}
\\section*{\\textcolor{blue!75!black}{\\large Experience}}
\\textbf{\\textcolor{blue!60!black}{Senior Software Engineer}}\\\\
\\textit{\\textcolor{blue!50!black}{Tech Corp | 2021 - Present}}
\\begin{itemize}[leftmargin=*]
\\item Led development of microservices architecture serving 2M+ users
\\item Improved application performance by 40% through optimization
\\end{itemize}

\\section*{\\textcolor{blue!75!black}{\\large Projects}}
\\textbf{\\textcolor{blue!60!black}{E-Commerce Platform | 2023}}
\\begin{itemize}[leftmargin=*]
\\item Full-stack application with React frontend and Node.js backend
\\end{itemize}
\\end{minipage}

\\end{document}`

    case 'modern-minimal':
      return `\\documentclass{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}

\\begin{document}

\\begin{center}
{\\Huge\\textbf{${SAMPLE_RESUME_DATA.fullName}}}\\\\
\\vspace{0.2cm}
${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}
\\end{center}

\\vspace{0.4cm}
\\hrule
\\vspace{0.4cm}

\\section*{Skills}
${SAMPLE_RESUME_DATA.skills}

\\vspace{0.3cm}
\\hrule
\\vspace{0.3cm}

\\section*{Experience}
\\textbf{Senior Software Engineer} \\hfill \\textit{2021 - Present}\\\\
Tech Corp
\\begin{itemize}[leftmargin=*]
\\item Led development of microservices architecture serving 2M+ users
\\item Improved application performance by 40% through optimization
\\end{itemize}

\\vspace{0.3cm}
\\hrule
\\vspace{0.3cm}

\\section*{Education}
\\textbf{${SAMPLE_RESUME_DATA.education.split('\\n')[0]}}\\\\
${SAMPLE_RESUME_DATA.education.split('\\n')[1]}

\\end{document}`

    case 'creative-portfolio':
      return `\\documentclass{article}
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
{\\Huge\\textbf{\\textcolor{primary}{${SAMPLE_RESUME_DATA.fullName}}}}\\\\
\\textcolor{accent}{${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}}

\\vspace{0.5cm}
\\section*{\\textcolor{primary}{\\Large Experience}}
\\textbf{\\textcolor{accent}{Senior Software Engineer}} \\hfill \\textit{2021 - Present}\\\\
\\textbf{Tech Corp}
\\begin{itemize}[leftmargin=*]
\\item Led development of microservices architecture serving 2M+ users
\\item Improved application performance by 40% through optimization
\\end{itemize}

\\section*{\\textcolor{primary}{\\Large Skills}}
\\textbf{${SAMPLE_RESUME_DATA.skills}}

\\section*{\\textcolor{primary}{\\Large Projects}}
\\textbf{\\textcolor{accent}{E-Commerce Platform | 2023}}
\\begin{itemize}[leftmargin=*]
\\item Full-stack application with React frontend and Node.js backend
\\end{itemize}

\\end{document}`

    case 'executive-summary':
      return `\\documentclass{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}

\\begin{document}

{\\Huge\\textbf{\\textcolor{blue!90!black}{${SAMPLE_RESUME_DATA.fullName}}}}\\\\
\\textcolor{blue!70!black}{${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}}

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
\\textbf{\\textcolor{blue!60!black}{Senior Software Engineer}} \\hfill \\textit{2021 - Present}\\\\
\\textit{\\textcolor{blue!50!black}{Tech Corp}}

\\section*{\\textcolor{blue!75!black}{\\large Education}}
\\textbf{\\textcolor{blue!60!black}{${SAMPLE_RESUME_DATA.education.split('\\n')[0]}}}\\\\
\\textit{\\textcolor{blue!50!black}{${SAMPLE_RESUME_DATA.education.split('\\n')[1]}}}

\\end{document}`

    case 'academic-scholar':
      return `\\documentclass{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}

\\begin{document}

\\begin{center}
{\\Huge\\textbf{${SAMPLE_RESUME_DATA.fullName}}}\\\\
\\vspace{0.2cm}
${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}
\\end{center}

\\vspace{0.3cm}
\\hrule
\\vspace{0.3cm}

\\section*{Education}
\\textbf{${SAMPLE_RESUME_DATA.education.split('\\n')[0]}}\\\\
${SAMPLE_RESUME_DATA.education.split('\\n')[1]}\\\\
\\textit{${SAMPLE_RESUME_DATA.education.split('\\n')[2] || 'Graduated Magna Cum Laude'}}

\\vspace{0.2cm}
\\section*{Research Experience}
\\textbf{Research Assistant} \\hfill \\textit{2018 - 2019}\\\\
University of Technology
\\begin{itemize}[leftmargin=*]
\\item Conducted research on distributed systems and published findings
\\item Collaborated with faculty on peer-reviewed publications
\\end{itemize}

\\section*{Publications}
\\begin{itemize}[leftmargin=*]
\\item "Scalable Architecture Patterns" - Journal of Computer Science, 2023
\\item "Microservices Best Practices" - Conference on Software Engineering, 2022
\\end{itemize}

\\section*{Technical Skills}
${SAMPLE_RESUME_DATA.skills}

\\end{document}`

    case 'tech-professional':
      return `\\documentclass{article}
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
{\\Huge\\textbf{\\textcolor{terminalgreen}{${SAMPLE_RESUME_DATA.fullName}}}}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.35\\textwidth}
\\raggedleft
\\textcolor{terminalgreen!70!black}{${SAMPLE_RESUME_DATA.email} - ${SAMPLE_RESUME_DATA.phone}}
\\end{minipage}

\\textcolor{terminalgreen!70!black}{github.com/johndoe}

\\vspace{0.3cm}
\\textcolor{terminalgreen}{\\rule{\\textwidth}{0.5pt}}
\\vspace{0.3cm}

\\section*{\\textcolor{terminalgreen}{\\large Technical Skills}}
\\textcolor{terminalgreen}{\\rule{\\textwidth}{0.5pt}}
\\vspace{0.2cm}
\\begin{multicols}{3}
\\begin{itemize}[leftmargin=*]
${SAMPLE_RESUME_DATA.skills.split(', ').map(s => `  \\item ${s}`).join('\n')}
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
\\textit{\\textcolor{terminalgreen!70!black}{github.com/johndoe/ecommerce}}
\\begin{itemize}[leftmargin=*]
\\item Full-stack application with React frontend and Node.js backend
\\item Integrated payment gateway and inventory management
\\end{itemize}

\\end{document}`

    case 'creative-designer':
      return `\\documentclass{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{tikz}

\\definecolor{design}{RGB}{147, 51, 234}

\\begin{document}
\\vspace*{-0.5cm}

\\begin{minipage}[t]{0.6\\textwidth}
{\\Huge\\textbf{\\textcolor{design}{${SAMPLE_RESUME_DATA.fullName}}}}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.35\\textwidth}
\\raggedleft
\\textcolor{black}{${SAMPLE_RESUME_DATA.email} — ${SAMPLE_RESUME_DATA.phone}}
\\end{minipage}

\\vspace{0.3cm}
\\hrule
\\vspace{0.4cm}

\\section*{\\textcolor{design}{\\Large Portfolio Highlights}}
\\begin{minipage}[t]{0.95\\textwidth}
\\textbf{\\textcolor{design!80!black}{E-Commerce Platform Design — Creative direction and UI/UX design}}\\\\
\\textcolor{black}{React, TypeScript, Node.js — 2023}
\\begin{itemize}[leftmargin=*]
\\item Designed intuitive user interface with focus on conversion optimization and user experience
\\item Created comprehensive design system and component library for consistent branding
\\end{itemize}
\\vspace{0.3cm}
\\end{minipage}

\\section*{\\textcolor{design}{\\Large Design Skills}}
\\textcolor{black}{${SAMPLE_RESUME_DATA.skills}}

\\section*{\\textcolor{design}{\\Large Experience}}
\\textbf{\\textcolor{design!80!black}{Senior Software Engineer}}\\\\
\\textcolor{black}{Tech Corp} \\hfill \\textcolor{black}{2021 - Present}
\\begin{itemize}[leftmargin=*]
\\item Leading design and development initiatives with focus on user experience
\\end{itemize}

\\end{document}`

    case 'minimal-clean':
      return `\\documentclass{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{multicol}

\\begin{document}
\\vspace*{-0.5cm}

\\begin{center}
{\\Large\\textbf{${SAMPLE_RESUME_DATA.fullName}}}\\\\
${SAMPLE_RESUME_DATA.email} — ${SAMPLE_RESUME_DATA.phone}
\\end{center}

\\vspace{0.4cm}

\\begin{multicols}{2}

\\textbf{SKILLS}\\\\
${SAMPLE_RESUME_DATA.skills}

\\vspace{0.15cm}

\\textbf{EDUCATION}\\\\
\\textbf{Bachelor of Science in Computer Science — University of Technology — 2015 - 2019}\\\\
Graduated Magna Cum Laude • Relevant coursework: Data Structures, Algorithms, Database Systems

\\columnbreak

\\textbf{EXPERIENCE}\\\\
\\textbf{Senior Software Engineer}\\\\
Tech Corp — 2021 - Present\\\\
\\begin{itemize}[leftmargin=*]
\\item Led development of microservices architecture serving 2M+ users
\\item Improved application performance by 40% through optimization
\\end{itemize}

\\vspace{0.3cm}

\\textbf{PROJECTS}\\\\
\\textbf{E-Commerce Platform — React, Node.js — 2023}\\\\
\\begin{itemize}[leftmargin=*]
\\item Full-stack application with React frontend and Node.js backend
\\item Implemented secure payment processing and user authentication
\\end{itemize}

\\end{multicols}

\\end{document}`

    default:
      // Fallback to professional classic
      return `\\documentclass{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{multicol}

\\begin{document}

{\\Huge\\textbf{\\textcolor{blue!90!black}{${SAMPLE_RESUME_DATA.fullName}}}}\\\\
\\textcolor{blue!70!black}{${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}}

\\vspace{0.3cm}
\\hrule
\\vspace{0.3cm}

\\begin{multicols}{2}
\\section*{\\textcolor{blue!75!black}{\\large Skills}}
\\begin{itemize}[leftmargin=*]
${SAMPLE_RESUME_DATA.skills.split(', ').map(s => `  \\item ${s}`).join('\n')}
\\end{itemize}

\\section*{\\textcolor{blue!75!black}{\\large Education}}
\\textbf{\\textcolor{blue!60!black}{${SAMPLE_RESUME_DATA.education.split('\\n')[0]}}}\\\\
\\textit{\\textcolor{blue!50!black}{${SAMPLE_RESUME_DATA.education.split('\\n')[1]}}}
\\end{multicols}

\\section*{\\textcolor{blue!75!black}{\\large Experience}}
\\textbf{\\textcolor{blue!60!black}{Senior Software Engineer}}\\\\
\\textit{\\textcolor{blue!50!black}{Tech Corp | 2021 - Present}}
\\begin{itemize}[leftmargin=*]
\\item Led development of microservices architecture serving 2M+ users
\\item Improved application performance by 40% through optimization
\\end{itemize}

\\end{document}`
  }
}

// Generate sample HTML preview based on template
function generateSampleHtml(template: ResumeTemplate): string {
  const { id } = template
  
  // Template-specific HTML generation
  switch (id) {
    case 'professional-classic':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Preview - ${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px; }
    .resume { background: white; max-width: 900px; margin: 0 auto; padding: 40px; display: flex; gap: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .left-column { width: 35%; border-right: 2px solid #3b82f6; padding-right: 20px; }
    .right-column { width: 65%; }
    h1 { color: #1e40af; font-size: 28px; margin-bottom: 10px; }
    .contact { color: #3b82f6; font-size: 14px; margin-bottom: 25px; }
    h2 { color: #1e40af; font-size: 18px; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
    .job-title { font-weight: bold; color: #2563eb; margin-top: 15px; }
    .company { color: #60a5fa; font-style: italic; }
    ul { margin-left: 20px; margin-top: 8px; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="resume">
    <div class="left-column">
      <h1>${SAMPLE_RESUME_DATA.fullName}</h1>
      <div class="contact">${SAMPLE_RESUME_DATA.email} ${SAMPLE_RESUME_DATA.phone}</div>
      <h2>Skills</h2>
      <ul>
        ${SAMPLE_RESUME_DATA.skills.split(', ').slice(0, 5).map(s => `<li>${s}</li>`).join('')}
      </ul>
      <h2>Education</h2>
      <div class="job-title">${SAMPLE_RESUME_DATA.education.split('\\n')[0]}</div>
      <div class="company">${SAMPLE_RESUME_DATA.education.split('\\n')[1]}</div>
    </div>
    <div class="right-column">
      <h2>Experience</h2>
      <div class="job-title">Senior Software Engineer</div>
      <div class="company">Tech Corp | 2021 - Present</div>
      <ul>
        <li>Led development of microservices architecture serving 2M+ users</li>
        <li>Improved application performance by 40% through optimization</li>
      </ul>
      <h2>Projects</h2>
      <div class="job-title">E-Commerce Platform | 2023</div>
      <ul>
        <li>Full-stack application with React frontend and Node.js backend</li>
      </ul>
    </div>
  </div>
</body>
</html>`

    case 'modern-minimal':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Preview - ${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.8; color: #2d3748; background: #ffffff; padding: 60px 20px; }
    .resume { max-width: 700px; margin: 0 auto; }
    h1 { font-size: 36px; font-weight: 300; text-align: center; margin-bottom: 10px; letter-spacing: 2px; }
    .contact { text-align: center; color: #718096; margin-bottom: 40px; font-size: 14px; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 30px 0; }
    h2 { font-size: 16px; font-weight: 600; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; color: #4a5568; }
    .job-title { font-weight: 600; margin-top: 20px; }
    .company { color: #718096; font-size: 14px; }
    ul { margin-left: 20px; margin-top: 10px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="resume">
    <h1>${SAMPLE_RESUME_DATA.fullName}</h1>
    <div class="contact">${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}</div>
    <hr>
    <h2>Skills</h2>
    <p>${SAMPLE_RESUME_DATA.skills}</p>
    <hr>
    <h2>Experience</h2>
    <div class="job-title">Senior Software Engineer</div>
    <div class="company">Tech Corp | 2021 - Present</div>
    <ul>
      <li>Led development of microservices architecture serving 2M+ users</li>
      <li>Improved application performance by 40% through optimization</li>
    </ul>
    <hr>
    <h2>Education</h2>
    <div class="job-title">${SAMPLE_RESUME_DATA.education.split('\\n')[0]}</div>
    <div class="company">${SAMPLE_RESUME_DATA.education.split('\\n')[1]}</div>
  </div>
</body>
</html>`

    case 'creative-portfolio':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Preview - ${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #1a1a1a; background: #fafafa; }
    .header { background: linear-gradient(135deg, #8b4513 0%, #d2691e 100%); padding: 40px; color: white; }
    .resume { max-width: 850px; margin: 0 auto; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .content { padding: 40px; }
    h1 { font-size: 42px; margin-bottom: 10px; font-weight: 700; }
    .contact { font-size: 16px; opacity: 0.9; }
    h2 { color: #8b4513; font-size: 24px; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #8b4513; padding-left: 15px; }
    .job-title { font-weight: bold; color: #8b4513; margin-top: 20px; font-size: 18px; }
    .company { color: #a0522d; font-style: italic; }
    ul { margin-left: 25px; margin-top: 10px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="resume">
    <div class="header">
      <h1>${SAMPLE_RESUME_DATA.fullName}</h1>
      <div class="contact">${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}</div>
    </div>
    <div class="content">
      <h2>Experience</h2>
      <div class="job-title">Senior Software Engineer</div>
      <div class="company">Tech Corp | 2021 - Present</div>
      <ul>
        <li>Led development of microservices architecture serving 2M+ users</li>
        <li>Improved application performance by 40% through optimization</li>
      </ul>
      <h2>Skills</h2>
      <p>${SAMPLE_RESUME_DATA.skills}</p>
      <h2>Projects</h2>
      <div class="job-title">E-Commerce Platform | 2023</div>
      <ul>
        <li>Full-stack application with React frontend and Node.js backend</li>
      </ul>
    </div>
  </div>
</body>
</html>`

    case 'executive-summary':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Preview - ${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; line-height: 1.7; color: #1a1a1a; background: #ffffff; padding: 40px 20px; }
    .resume { max-width: 800px; margin: 0 auto; }
    h1 { color: #1e40af; font-size: 32px; margin-bottom: 10px; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
    .contact { color: #3b82f6; margin-bottom: 25px; }
    .summary { background: #f0f4ff; padding: 20px; border-left: 4px solid #1e40af; margin: 25px 0; font-style: italic; }
    h2 { color: #1e40af; font-size: 20px; margin-top: 25px; margin-bottom: 15px; }
    .achievements { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .achievement { background: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; }
    .job-title { font-weight: bold; color: #2563eb; margin-top: 15px; }
    .company { color: #60a5fa; font-style: italic; }
    ul { margin-left: 20px; margin-top: 10px; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="resume">
    <h1>${SAMPLE_RESUME_DATA.fullName}</h1>
    <div class="contact">${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}</div>
    <div class="summary">
      Results-driven technology leader with 8+ years of experience driving innovation and delivering scalable solutions. Proven track record of leading cross-functional teams and delivering projects that serve millions of users.
    </div>
    <h2>Key Achievements</h2>
    <div class="achievements">
      <div class="achievement">Led platform migration serving 2M+ users</div>
      <div class="achievement">Improved performance by 40%</div>
      <div class="achievement">Mentored team of 5 developers</div>
      <div class="achievement">Reduced deployment time by 50%</div>
    </div>
    <h2>Experience</h2>
    <div class="job-title">Senior Software Engineer</div>
    <div class="company">Tech Corp | 2021 - Present</div>
    <ul>
      <li>Led development of microservices architecture serving 2M+ users</li>
      <li>Improved application performance by 40% through optimization</li>
    </ul>
  </div>
</body>
</html>`

    case 'academic-scholar':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Preview - ${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; line-height: 1.8; color: #2d3748; background: #ffffff; padding: 40px 20px; }
    .resume { max-width: 750px; margin: 0 auto; }
    h1 { text-align: center; font-size: 28px; margin-bottom: 10px; }
    .contact { text-align: center; color: #4a5568; margin-bottom: 30px; font-size: 14px; }
    h2 { font-size: 18px; margin-top: 25px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e0; padding-bottom: 5px; }
    .job-title { font-weight: bold; margin-top: 15px; }
    .company { color: #718096; font-size: 14px; }
    .publication { margin: 10px 0; padding-left: 20px; }
    ul { margin-left: 20px; margin-top: 8px; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="resume">
    <h1>${SAMPLE_RESUME_DATA.fullName}</h1>
    <div class="contact">${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}</div>
    <h2>Education</h2>
    <div class="job-title">${SAMPLE_RESUME_DATA.education.split('\\n')[0]}</div>
    <div class="company">${SAMPLE_RESUME_DATA.education.split('\\n')[1]}</div>
    <p style="margin-top: 8px; font-style: italic;">Graduated Magna Cum Laude</p>
    <h2>Research Experience</h2>
    <div class="job-title">Research Assistant</div>
    <div class="company">University of Technology | 2018 - 2019</div>
    <ul>
      <li>Conducted research on distributed systems and published findings</li>
      <li>Collaborated with faculty on peer-reviewed publications</li>
    </ul>
    <h2>Publications</h2>
    <div class="publication">"Scalable Architecture Patterns" - Journal of Computer Science, 2023</div>
    <div class="publication">"Microservices Best Practices" - Conference on Software Engineering, 2022</div>
    <h2>Technical Skills</h2>
    <p>${SAMPLE_RESUME_DATA.skills}</p>
  </div>
</body>
</html>`

    case 'tech-professional':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Preview - ${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; line-height: 1.6; color: #1a1a1a; background: #0a0a0a; padding: 20px; }
    .resume { max-width: 850px; margin: 0 auto; background: #1a1a1a; color: #00ff00; padding: 30px; border: 2px solid #00ff00; }
    h1 { color: #00ff00; font-size: 28px; margin-bottom: 10px; text-transform: uppercase; }
    .contact { color: #00ff88; margin-bottom: 25px; font-size: 14px; }
    .github { color: #00ff88; }
    h2 { color: #00ff00; font-size: 18px; margin-top: 25px; margin-bottom: 12px; border-bottom: 1px solid #00ff00; padding-bottom: 5px; }
    .skills-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }
    .skill { background: #0a0a0a; padding: 8px; border: 1px solid #00ff00; text-align: center; }
    .job-title { font-weight: bold; color: #00ff88; margin-top: 15px; }
    .company { color: #00ff00; font-style: italic; }
    ul { margin-left: 20px; margin-top: 8px; }
    li { margin-bottom: 6px; }
    .tech { color: #00ff88; }
  </style>
</head>
<body>
  <div class="resume">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
      <h1 style="margin: 0;">${SAMPLE_RESUME_DATA.fullName}</h1>
      <div class="contact" style="text-align: right; margin-top: 5px;">${SAMPLE_RESUME_DATA.email} - ${SAMPLE_RESUME_DATA.phone}</div>
    </div>
    <div class="github">github.com/johndoe</div>
    <hr style="border: none; border-top: 1px solid #00ff00; margin: 20px 0;">
    <h2>Technical Skills</h2>
    <div class="skills-grid">
      ${SAMPLE_RESUME_DATA.skills.split(', ').map(s => `<div class="skill">${s}</div>`).join('')}
    </div>
    <h2>Professional Experience</h2>
    <div class="job-title">Senior Software Engineer</div>
    <div class="company">Tech Corp | 2021 - Present</div>
    <ul>
      <li>Led development of microservices architecture serving 2M+ users</li>
      <li>Improved application performance by 40% through optimization</li>
      <li class="tech">Technologies: React, Node.js, PostgreSQL, AWS, Docker</li>
    </ul>
    <h2>Projects</h2>
    <div class="job-title">E-Commerce Platform | 2023</div>
    <div class="github">github.com/johndoe/ecommerce</div>
    <ul>
      <li>Full-stack application with React frontend and Node.js backend</li>
    </ul>
  </div>
</body>
</html>`

    case 'creative-designer':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Preview - ${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #1a1a1a; background: #faf5ff; padding: 20px; }
    .resume { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 4px 20px rgba(147, 51, 234, 0.2); }
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
  </style>
</head>
<body>
  <div class="resume">
    <div class="header-row">
      <h1>${SAMPLE_RESUME_DATA.fullName}</h1>
      <div class="contact-info">
        <div class="contact-line">${SAMPLE_RESUME_DATA.email} — ${SAMPLE_RESUME_DATA.phone}</div>
      </div>
    </div>
    <hr>
    <h2>Portfolio Highlights</h2>
    <div class="portfolio-section">
      <div class="portfolio-item">
        <div class="project-title">E-Commerce Platform Design — Creative direction and UI/UX design</div>
        <div class="project-description">React, TypeScript, Node.js — 2023</div>
        <ul>
          <li>Designed intuitive user interface with focus on conversion optimization and user experience</li>
          <li>Created comprehensive design system and component library for consistent branding</li>
        </ul>
      </div>
    </div>
    <h2>Design Skills</h2>
    <p>${SAMPLE_RESUME_DATA.skills}</p>
    <h2>Experience</h2>
    <div class="job-title">Senior Software Engineer</div>
    <div style="display: flex; justify-content: space-between; color: #000; margin-bottom: 10px;">
      <span>Tech Corp</span>
      <span>2021 - Present</span>
    </div>
    <ul>
      <li>Leading design and development initiatives with focus on user experience</li>
    </ul>
  </div>
</body>
</html>`

    case 'minimal-clean':
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Preview - ${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #000; background: #ffffff; }
    .resume { max-width: 900px; margin: 0 auto; padding: 40px; }
    .contact { text-align: center; color: #000; margin-bottom: 20px; font-size: 14px; }
    .two-column { display: grid; grid-template-columns: 1fr 1.5fr; gap: 40px; margin-bottom: 30px; }
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
  </style>
</head>
<body>
  <div class="resume">
    <div class="contact">
      <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">${SAMPLE_RESUME_DATA.fullName}</div>
      <div>${SAMPLE_RESUME_DATA.email} | ${SAMPLE_RESUME_DATA.phone}</div>
    </div>
    <div class="two-column">
      <div class="left-column">
        <h2>Skills</h2>
        <div class="skills-content">${SAMPLE_RESUME_DATA.skills}</div>
        <h2 style="margin-top: 15px;">Education</h2>
        <div class="education-content">
          <div class="education-degree">Bachelor of Science in Computer Science | University of Technology | 2015 - 2019</div>
          <div class="education-details">Graduated Magna Cum Laude • Relevant coursework: Data Structures, Algorithms, Database Systems</div>
        </div>
      </div>
      <div class="right-column">
        <h2>Experience</h2>
        <div class="experience-section">
          <div class="job-title">Senior Software Engineer</div>
          <div class="company">Tech Corp | 2021 - Present</div>
          <ul>
            <li>Led development of microservices architecture serving 2M+ users</li>
            <li>Improved application performance by 40% through optimization</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

    default:
      // Fallback to professional classic
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Preview - ${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px; }
    .resume { background: white; max-width: 900px; margin: 0 auto; padding: 40px; display: flex; gap: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .left-column { width: 35%; border-right: 2px solid #3b82f6; padding-right: 20px; }
    .right-column { width: 65%; }
    h1 { color: #1e40af; font-size: 28px; margin-bottom: 10px; }
    .contact { color: #3b82f6; font-size: 14px; margin-bottom: 25px; }
    h2 { color: #1e40af; font-size: 18px; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
    .job-title { font-weight: bold; color: #2563eb; margin-top: 15px; }
    .company { color: #60a5fa; font-style: italic; }
    ul { margin-left: 20px; margin-top: 8px; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="resume">
    <div class="left-column">
      <h1>${SAMPLE_RESUME_DATA.fullName}</h1>
      <div class="contact">${SAMPLE_RESUME_DATA.email} ${SAMPLE_RESUME_DATA.phone}</div>
      <h2>Skills</h2>
      <ul>
        ${SAMPLE_RESUME_DATA.skills.split(', ').map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
    <div class="right-column">
      <h2>Experience</h2>
      <div class="job-title">Senior Software Engineer</div>
      <div class="company">Tech Corp | 2021 - Present</div>
      <ul>
        <li>Led development of microservices architecture serving 2M+ users</li>
        <li>Improved application performance by 40% through optimization</li>
      </ul>
    </div>
  </div>
</body>
</html>`
  }
}

export function ResumeTemplatePreviewModal({
  open,
  onClose,
  template,
  defaultFormat = 'html',
}: ResumeTemplatePreviewModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [currentFormat, setCurrentFormat] = useState<'latex' | 'html'>(defaultFormat)

  useEffect(() => {
    if (!open || !template) return
    setCurrentFormat(defaultFormat)
  }, [open, template, defaultFormat])

  useEffect(() => {
    if (!open || !template) return
    
    // Generate preview content based on format
    if (currentFormat === 'latex') {
      setPreviewContent(generateSampleLatex(template))
    } else {
      setPreviewContent(generateSampleHtml(template))
    }
  }, [open, template, currentFormat])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !template) return null

  const isHtml = currentFormat === 'html'

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#0d0d11' }}>
      {/* Header */}
      <div
        className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#141418' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isHtml ? (
              <Code className="size-5 text-violet-400" />
            ) : (
              <FileText className="size-5 text-blue-400" />
            )}
            <h2 className="text-lg font-semibold text-white">{template.name}</h2>
          </div>
          <div className="h-4 w-px bg-white/10" />
          
          {/* Format Toggle */}
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={() => setCurrentFormat('html')}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors"
              style={{ 
                color: currentFormat === 'html' ? '#fff' : 'rgba(255,255,255,0.5)',
                background: currentFormat === 'html' ? 'rgba(255,255,255,0.12)' : 'transparent'
              }}
            >
              <Monitor className="size-3.5" />
              HTML
            </button>
            <button
              type="button"
              onClick={() => setCurrentFormat('latex')}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors"
              style={{ 
                color: currentFormat === 'latex' ? '#fff' : 'rgba(255,255,255,0.5)',
                background: currentFormat === 'latex' ? 'rgba(255,255,255,0.12)' : 'transparent'
              }}
            >
              <FileText className="size-3.5" />
              LaTeX
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.6)' }}
          title="Close preview (Esc)"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Preview Content */}
      <div
        ref={contentRef}
        className="flex flex-1 items-start justify-center overflow-auto"
        style={{ background: '#141416', padding: 24 }}
      >
        <div className="w-full max-w-4xl">
          {isHtml ? (
            // HTML Preview - Render in iframe
            <div className="rounded-lg border border-white/10 bg-white shadow-2xl">
              <iframe
                srcDoc={previewContent}
                className="h-[800px] w-full rounded-lg"
                style={{ border: 'none' }}
                title="HTML Resume Preview"
              />
            </div>
          ) : (
            // LaTeX Preview - Show code with syntax highlighting
            <div className="rounded-lg border border-white/10 bg-[#1e1e2e] p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="size-3 rounded-full bg-[#ff5f57]" />
                  <span className="size-3 rounded-full bg-[#febc2e]" />
                  <span className="size-3 rounded-full bg-[#28c840]" />
                </div>
                <span className="ml-4 text-xs text-white/40">LaTeX Code Preview</span>
              </div>
              <pre className="overflow-auto text-sm font-mono leading-relaxed text-[#cdd6f4]">
                <code>{previewContent}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div
        className="flex h-12 shrink-0 items-center justify-between border-t px-6"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#141418' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40">
            This is a preview with sample data. Your actual resume will be generated based on your information.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white/5 px-3 py-1 text-xs text-white/60">
            Template: {template.category}
          </span>
        </div>
      </div>
    </div>
  )
}
