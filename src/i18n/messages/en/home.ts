// The home page (P2). The demo's names, emails, phone, file names and company names stay in code.
export default {
  meta: {
    title: "Free ATS resume checker and builder with AI",
    description:
      "Free ATS resume checker and builder with Otto's AI help, plus jobs ranked for your resume, application tracking, interview prep and a portfolio site.",
  },
  cta: {
    check: "Check my resume",
    continueWith: "Continue with {title}",
  },
  hero: {
    eyebrow: "Free to start",
    title: "Your whole job hunt,",
    // <b> is the words Otto's squiggle underlines.
    titleEm: "in <b>one place</b>.",
    lead: {
      check: "Check and fix your resume, then find jobs ranked for it.",
      track: "Track applications, prep for interviews, share a portfolio.",
    },
    featuresLabel: "What Otto does",
    features: {
      checker: "Resume checker",
      jobs: "{count} open jobs",
      jobsNoCount: "Open jobs",
      emailTracking: "Email tracking",
      interviewPrep: "Interview prep",
      portfolio: "Portfolio site",
      extension: "Chrome extension",
      extensionSoon: "Chrome extension, soon",
    },
    noSignup: "No signup needed. Your file is read, then deleted.",
    another: "Or <link>check another file</link>. It's read, then deleted.",
    jobPost: "Have a job post? <link>Check your match</link>.",
  },
  demo: {
    see: "What you see",
    reads: "What hiring software reads",
    views: { label: "Example resume", see: "What you see", reads: "What software reads" },
    otto: "Otto the otter, peeking over the window",
    plainText: "Plain text",
    mixed: "Skills mixed into jobs",
    captionTitle: "Example resume",
    caption: "Columns look sharp to people. Software reads straight across them.",
  },
  // Maya Chen's example resume, in the hero and How it works.
  resume: {
    label:
      "Example resume for {name}, a product designer. Skills and languages sit in a left column, work history in a right column, with small icons next to her email and phone.",
    role: "Product Designer",
    headings: { skills: "Skills", languages: "Languages", experience: "Experience" },
    skills: { research: "User research", prototyping: "Prototyping" },
    languages: { english: "English", spanish: "Spanish" },
    jobs: {
      senior: {
        title: "Senior Product Designer",
        dates: "2021 – now",
        bullet: "Redesigned checkout. Orders up 18%.",
      },
      designer: {
        title: "Product Designer",
        dates: "2018 – 2021",
        bullet: "Built the team's design system.",
      },
    },
  },
  upload: {
    opening: "Opening {name} in the studio.",
    oneFile: "Choose one file at a time.",
    // checkFile in src/components/ui/file-check.ts.
    problems: {
      unsupported: "That file type isn't supported.",
      unsupportedKinds: "That file type isn't supported. Choose a {kinds} file.",
      kinds: "{first} or {last}",
      empty: "That file is empty. Choose another one.",
      tooBig: "That file is too big. The limit is {limit}.",
    },
    drop: "Drop your resume to check it",
    formats: "PDF or Word (.docx), up to {size}",
  },
  how: {
    eyebrow: "How it works",
    title: "From old file to clean PDF",
    intro: "Five steps. Stop after any of them.",
    step: "Step {number} · {name}",
    steps: {
      upload: {
        name: "Upload",
        caption: "Drop in your PDF or Word file, or start from scratch.",
      },
      recruiterView: {
        name: "Recruiter view",
        caption:
          "See the text hiring software pulls out, with plain checks and the reason for each.",
      },
      fix: {
        name: "Fix lines with Otto",
        caption:
          "Otto asks for the missing fact, then writes the line from your answer. Type it or say it. He never makes up numbers, and you keep, edit or skip every suggestion.",
      },
      tailor: {
        name: "Tailor to a job",
        caption: "Paste a job post to see which keywords you have and which are missing.",
      },
      download: {
        name: "Free PDF",
        caption:
          "Download a clean PDF for free, then check it again. Every format reads top to bottom, with headings on their own lines, on Letter or A4.",
      },
    },
    upload: { meta: "PDF · 1 page", reading: "Reading your file" },
    checks: {
      meta: { one: "{count} check", other: "{count} checks" },
      items: {
        columns: {
          title: "Two-column layout",
          detail: "Your skills got mixed into your job history.",
        },
        icons: {
          title: "Icons in your contact line",
          detail: "They turn into stray symbols. Plain words work better.",
        },
        contact: { title: "Email and phone found", detail: "Recruiters can reach you." },
      },
    },
    fixer: {
      addNumber: "Add a number",
      before: "Before: ",
      line: "Responsible for managing social media accounts",
      questions: "1 question",
      question: "How much did followers grow?",
      you: "You",
      saidOutLoud: "Said out loud",
      answer: "They tripled in 6 months. I posted short videos every day.",
      looksGood: "Looks good",
      after: "After: ",
      fixed: "Grew social media followers 3x in 6 months by posting short videos daily",
      updated: "Line updated",
    },
    tailor: {
      jobPost: "Job post",
      jobTitle: "Senior Product Designer",
      onResume: "On your resume",
      missing: "Missing",
      onlyIfTrue: "· add only if true",
      terms: { accessibility: "Accessibility", abTesting: "A/B testing" },
    },
    download: {
      before: "Before",
      beforeText: "problems in the old file",
      after: "After",
      afterText: "problems in your new PDF",
    },
  },
  jobs: {
    eyebrow: "Jobs · new every day",
    title: "{count} open jobs, ranked for your resume",
    titleNoCount: "Open jobs, ranked for your resume",
    intro:
      "Otto reads companies' careers pages every day and shows only jobs in your line of work, best fit first, with a plain reason for each. Free shows your top {free}; Pro matches you against all of them.",
    caption:
      "The real Jobs page: a sales rep with a digital marketing internship picks Any marketing role, and Otto ranks entry-level marketing jobs by the SEO, Google Ads and HubSpot on their resume.",
    points: {
      matched: {
        title: "Your kind of work, matched to your resume",
        text: "Otto reads what a job title means, so a Software Engineer sees Backend Developer posts but not support or sales ones. Each job shows what your resume has and what it's missing.",
      },
      visa: {
        title: "Visa and work rights, checked",
        text: "On Pro, tell Otto where you can work: posts that say they can't hire you are marked, and one switch hides them. Companies on the public US H-1B and UK sponsor registers say so.",
      },
      role: {
        title: "The role, level and place you want",
        text: "Pick a role, a level and a place, or remote only. Otto guesses them from your resume to start.",
      },
      direct: {
        title: "Straight from the company",
        text: "Jobs come from companies' own careers pages and public job feeds in the US, the UK, Australia, Latin America, Europe and more, read every day. Each one links to the original post.",
      },
    },
    link: "Find my matches",
  },
  emailTracking: {
    eyebrow: "Email tracking · Pro",
    title: "Your applications update themselves",
    intro:
      "Hiring emails already say where each application stands. Forward them to Otto once, and your board keeps up without you dragging a single card.",
    caption:
      "The real board as three emails arrive: Northwind's thank-you adds the job, Brightloop's invite moves it to Interviewing with the date, and Acme's update closes it.",
    points: {
      setup: {
        title: "Set up once, in Gmail",
        text: "You get your own Otto address and one Gmail filter that forwards only job emails to it. Three steps, a few minutes, with a test at the end.",
      },
      board: {
        title: "The board moves by itself",
        text: "A thank-you adds the job to Applied, an interview or test invite moves it to Interview with the date, and offers and rejections land where they belong. A card never moves back.",
      },
      rules: {
        title: "Read by rules, kept small",
        text: "Otto reads each email with fixed rules, no AI, and keeps only the sender's domain, the subject and what it found. Mail it can't verify waits in a Check this list for you.",
      },
    },
  },
  interviewPrep: {
    eyebrow: "Interview prep · Pro",
    title: "Know what they'll ask,",
    titleEm: "and what you'll say.",
    intro:
      "For each interview, Otto reads the job post and your resume and writes a prep pack for that one job. Then you practice it out loud, with Otto asking.",
    caption:
      "A real prep pack for a Product Designer interview at Northwind: the likely questions, a story from the resume, the design craft round and practice mode.",
    points: {
      questions: {
        title: "Likely questions, round by round",
        text: "From the opening to the closing, each question says what the interviewer is checking, the points to hit and the follow-up to expect. Then come questions for you to ask them.",
      },
      stories: {
        title: "Stories from your own lines",
        text: "Each story starts from a line on your resume, told as situation, task, action and result. Anything your resume doesn't say stays a blank for you to fill, never made up.",
      },
      craft: {
        title: "A round on your craft, then practice",
        text: "Technical roles get a technical round on your projects, core concepts and system design. Designers and product managers get one on their craft. Then Otto plays the interviewer, one question at a time.",
      },
    },
    also: {
      title: "Also in Otto",
      letters: {
        label: "Letters",
        text: "Cover letters, outreach messages and answers to application questions, written only from your resume and the job post.",
      },
      careerLog: {
        label: "Career log",
        text: "A one-minute note on your work each month, free on every plan. On Pro, Otto turns the notes into resume lines with your own numbers.",
      },
    },
  },
  extension: {
    eyebrow: "Otto for Chrome",
    eyebrowSoon: "Otto for Chrome · coming soon",
    title: "Apply faster, right from the job post",
    intro:
      "See how well you match before you read the whole post, save it to your board in one click, and let Otto fill long application forms from your resume. You check every answer and press Submit.",
    onPost: "On the job post",
    onForm: "On the application form",
    points: {
      badge: {
        title: "A match badge on the post",
        text: "On LinkedIn, Naukri and company career pages, Otto's badge shows which of the post's skills your resume has and which it's missing. The check runs in your browser and never sends the post anywhere.",
      },
      save: {
        title: "Save to your tracker",
        text: "Save puts the job in To apply on your Applications board, with a copy of the post in case it's taken down.",
      },
      tailor: {
        title: "Tailor and Letter from the post",
        text: "On {plans}, Tailor opens Otto with your resume tailored to that job, and Letter with a cover letter for it.",
      },
      fill: {
        title: "Fill with Otto on application forms",
        text: "On {plans}, Otto fills Greenhouse, Lever, Ashby and Workday forms from your resume and saved answers. You check it and press Submit. Otto never fills self-identification or consent questions.",
      },
    },
    post: {
      label:
        "Example: Otto's badge in the corner of a {title} post, with {found} of {total} skills found and {missing} missing.",
      title: "Senior Product Designer",
      where: "Remote, Europe",
      careers: "{company} careers",
      meta: "Job post",
      about: "About the role",
      bring: "What you'll bring",
      found: "of <b>{total}</b> skills found",
      missing: "Missing: <b>{skill}</b>",
      skill: "accessibility",
      actions: { save: "Save", tailor: "Tailor", letter: "Letter" },
    },
    form: {
      label:
        'Example: Fill with Otto on {company}\'s application form, with {filled} fields filled, the resume attached, a drafted answer to "{question}" and the gender question left blank for you.',
      window: "{company} · Apply",
      meta: "Application form",
      heading: "Apply for this job",
      fields: {
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        company: "Current company",
        portfolio: "Portfolio",
      },
      resume: "Resume/CV",
      question: "Why {company}?",
      answer:
        "I like how {company} makes complex data easy to read, and I'd bring the same care to its product, from research to prototypes.",
      draft: "Draft with Otto",
      selfId: "Voluntary self-identification",
      gender: "Gender",
      select: "Select…",
      submit: "Submit application",
      filled: "Filled {count} fields and attached <b>{file}</b>.",
      leftForYou:
        "Left for you: 1 self-identification or consent question. Otto never answers those.",
      checkEvery: "Check every answer, then press Submit yourself. Otto never sends a form.",
    },
    addToChrome: "Add to Chrome",
    newTab: "(opens in a new tab)",
    comingSoon: "Coming soon",
    notInStore: "Not in the Chrome Web Store yet.",
  },
  portfolio: {
    eyebrow: "Portfolio · hosted for you",
    title: "A real portfolio,",
    titleEm: "live at your own link.",
    intro:
      "Not your resume as a web page. Pick one of {count} designs and Otto fills it with your projects, work, writing and links. We host it, so there's nothing to set up. {offer}",
    offer: "It comes with Pro.",
    offerTrial: "It comes with Pro, and you can start with a {days}-day trial.",
    // PORTFOLIO_TEMPLATE_INFO descriptions in src/lib/portfolio/templates.ts, for the designs shown.
    templates: {
      paper:
        "Drawn by hand: your name in marker over a fox by the sea, inked cards and wavy underlines, by day or night.",
      gazette:
        "Your page as a 1926 broadsheet: a blackletter masthead, your headline, ruled columns and a ticker.",
      reel: "A huge rotating title over a 3D sphere, then each project in a device frame.",
    },
    link: "Make my portfolio",
  },
  wontDo: {
    title: "What Otto won’t do",
    pledges: {
      score: {
        claim: "Make up a score.",
        reason: "You get clear checks with reasons, not a mystery number out of 100.",
      },
      numbers: {
        claim: "Invent your numbers.",
        reason: "Otto asks for your real numbers and results, and you approve every change.",
      },
      download: {
        claim: "Charge you to download.",
        reason: "Edit and download as many PDFs as you like. No paywall at the last step.",
      },
      file: {
        claim: "Keep your file.",
        reason:
          "We read your upload to get the text, then let it go. Your resumes stay in your browser unless you sign in to back them up. <link>How we handle data</link>",
      },
    },
  },
  pricingTeaser: {
    eyebrow: "Pricing",
    title: "Free for the basics.",
    titleEm: "More when the hunt gets busy.",
    free: "<b>{plan}:</b> check, fix and download {resumes} as a PDF, with {fixes} line fixes a month from Otto.",
    pro: "<b>{plan}, {price} a month:</b> tailoring, cover letters, every job match, up to {resumes} and {applications}. {close}",
    resumes: { one: "{count} resume", other: "{count} resumes" },
    trackedApplications: {
      one: "{count} tracked application",
      other: "{count} tracked applications",
    },
    trial: "Try {days} days for {price}.",
    link: "See pricing",
  },
  faq: {
    title: "Before you start",
    applications: { one: "{count} application", other: "{count} applications" },
    items: {
      free: {
        question: "Is it really free to download?",
        answer:
          "Yes. Editing, recruiter checks and PDF downloads are free, with no paywall at the last step, and Free includes {fixes} line fixes a month with Otto. Pro and Max add the rest of Otto's AI help, more formats, more resumes and Word downloads on top.",
      },
      ats: {
        question: "What is an ATS?",
        answer:
          "An applicant tracking system: the software most employers use to collect and sort applications. It reads the text in your file, and fancy layouts can scramble it. Otto shows you exactly what it reads.",
      },
      invent: {
        question: "Will Otto invent things on my resume?",
        answer:
          "No. Otto asks you for facts, like numbers and results, and only uses what you tell him. You review every change before it goes on your resume.",
      },
      talk: {
        question: "Can I talk instead of typing?",
        answer:
          "Yes. The boxes where you write for Otto have a microphone, including Otto's questions when he fixes a line. Press it and speak, then press it again when you're done. It works in any modern browser. In some browsers, like Brave and Firefox, you'll need to be signed in. Otto keeps only the text.",
      },
      account: {
        question: "Do I need an account?",
        answer:
          "Not to check, edit or download. Backups and Otto's {fixes} line fixes a month need a free account: sign in with Google or an emailed 6-digit code, no password. The rest of Otto's AI help, the full list of job matches (Free shows your closest {matches}) and tracking more than {applications} come with {pro}. {trialHeadline}: {trialSentence}",
      },
      data: {
        question: "Where is my data stored?",
        answer:
          "Your resumes are saved in your browser. If you sign in, we also keep a backup so you can open them on any device. We read uploaded files to get the text, then let them go. Details are in our <link>privacy policy</link>.",
      },
      cancel: {
        question: "Can I cancel anytime?",
        answer:
          "Yes. Cancel your plan from your account page whenever you like. You keep it until the end of the period you paid for, and you aren't charged again.",
      },
      anyJob: {
        question: "Does it work for any job?",
        answer:
          "Yes, from your first job to senior roles, in any field. Tailoring works with any job post you paste in. Otto reads resumes written in English best. The <link>resume examples</link> show {count} jobs, from freshers to sales.",
      },
    },
  },
  finalCta: {
    otto: "Otto the otter, reading a resume",
    title: "See what the software sees.",
    note: "Checking and PDFs are free. Pro and Max add more help from Otto.",
  },
} as const;
