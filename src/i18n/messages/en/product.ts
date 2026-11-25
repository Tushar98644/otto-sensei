// Product and tool pages: resume builder, cover letters, tracker, interview prep, portfolio (P2).
export default {
  common: {
    breadcrumb: "Breadcrumb",
    home: "Home",
    howItWorks: "How it works",
    questions: "Questions",
    keepReading: "Keep reading",
    seePlan: "See what {pro} includes",
    trialFor: "{headline} for {price}.",
    checkButtons: { match: "Match my resume to a job", check: "Check my resume" },
  },
  // RELATED in src/lib/seo-pages/pages.ts, for the links these pages show.
  related: {
    examples: {
      title: "Resume examples",
      text: "{count} full examples by job, each with stronger lines, skills and common mistakes.",
    },
    templates: {
      title: "Resume templates",
      text: "{count} formats, each one column of real text. {free} are free.",
    },
    jobMatch: {
      title: "Job match check",
      text: "Paste your resume and a job post to see which of its skills you show. Free, no sign-in.",
    },
    ats: {
      title: "ATS guides",
      text: "Sourced notes on {count} hiring systems: how they read files, screen applicants and rank them with AI.",
    },
    compare: {
      title: "Compare Otto Sensei",
      text: "How Otto differs from {names}, from each product's own pages.",
    },
    coverLetters: {
      title: "AI cover letter generator",
      text: "Cover letters, outreach messages and answers to application questions, from your resume and the job post.",
    },
    tracker: {
      title: "Job application tracker",
      text: "Your applications on one board, with the resume you sent, follow-up reminders and interview dates.",
    },
    interviewPrep: {
      title: "AI interview prep",
      text: "Likely questions, stories from your own resume lines and questions to ask, for each interview.",
    },
    portfolio: {
      title: "Portfolio website builder",
      text: "A portfolio site made from your resume in one of {count} designs, hosted at your own link.",
    },
  },
  builder: {
    meta: {
      title: "Free resume builder with AI and ATS checks",
      description:
        "Build your resume free: start from scratch or a file, see the text hiring software reads, fix weak lines with Otto's AI help and download a clean PDF.",
    },
    crumb: "Resume builder",
    eyebrow: "Free resume builder",
    title: "A resume builder",
    titleEm: "that shows what software reads.",
    intro:
      "Start from a file, a blank page or an example. Otto checks every line, shows the text hiring software pulls from your file, and the PDF is free to download.",
    action: "Build my resume",
    seeExamples: "See resume examples",
    stepsTitle: "How Otto builds and checks a resume",
    stepsIntro:
      "Five steps in the studio. Stop after any of them; your resume is saved in your browser as you go.",
    steps: {
      start: {
        title: "Start from what you have",
        text: "Upload a PDF or Word file, import your LinkedIn data export or a JSON Resume file, start from a blank page, or open one of the <link>resume examples</link>. With {pro}, Build with Otto writes a first draft from a few answers about your jobs.",
      },
      read: {
        title: "See what hiring software reads",
        text: "The recruiter view shows the text a hiring system pulls from your file, in order, with plain checks for contact details, headings, columns, tables, icons, dates and length. Each problem comes with the reason.",
      },
      fix: {
        title: "Fix weak lines with Otto",
        text: "Otto's line check marks lines that read like duties, miss a result or lean on stock phrases. Ask him to fix one and he asks for the missing fact first, then writes the line from your answer. You keep, edit or skip every suggestion. {free} includes {fixes} line fixes a month.",
      },
      match: {
        title: "Match it to a job",
        text: "Paste a job post or its link to see which skills it names, which your resume shows and which are missing. The <link>job match check</link> works without signing in. With {pro}, Otto tailors a copy of your resume to the post.",
      },
      download: {
        title: "Download a clean PDF",
        text: "Pick a format and Letter or A4 paper, then download. Every format is one column of real text, tested by reading the PDF back. {freeFormats} are free with no download cap; the other {proFormats} formats and Word downloads come with {pro}.",
      },
    },
    plans: {
      title: "What's free, and what {pro} adds",
      intro:
        "Prices in US dollars. Taxes may apply. {max} is {price} a month for more of Otto's help each month.",
      freeCta: "Build my resume",
      freeNote: "No card needed",
      paidCta: "See {pro} and {max}",
      cancelAnytime: "Cancel anytime",
    },
    audiencesTitle: "Who it's for",
    audiences: {
      freshers: {
        title: "Freshers and students",
        text: "Put Education first, write projects like jobs, and keep it to one page. The <link>fresher example</link> shows the shape for a B.Tech or any other graduate, and checking and PDFs cost nothing.",
      },
      changing: {
        title: "Changing jobs",
        text: "Upload the resume you have. The recruiter view shows what to fix first, and the job match check shows which skills the next job asks for that your resume doesn't show yet.",
      },
      abroad: {
        title: "Applying abroad",
        text: "Pick Letter paper for the US and Canada, and A4 for most other places. Leave off a photo, date of birth and marital status, and write money in the employer's currency.",
      },
      many: {
        title: "Applying to many jobs",
        text: "{pro} keeps a tailored copy for each job, writes cover letters and answers to application questions, and tracks up to {tracked} applications with follow-up reminders.",
      },
    },
    indiaTitle: "Resumes for jobs in India",
    indiaIntro:
      "CTC, notice period, Naukri and the biodata habits of old templates: where each one goes, and what to leave off.",
    india: {
      ctc: {
        title: "Keep CTC off the resume",
        text: "Recruiters ask for current and expected CTC in the application form, on your Naukri profile or on the first call. Leave it off the page, so one resume works for every application. With {pro}, when Otto drafts an answer to a question about salary, he leaves a blank for you to fill in.",
      },
      notice: {
        title: "Give your notice period where it's asked",
        text: "Put it in the application form or your cover note, not under your name. Otto never guesses it: with {pro}, a drafted answer that needs your notice period gets a blank in brackets for you to fill in.",
      },
      naukri: {
        title: "Use the same story on Naukri",
        text: "Upload the PDF you download here to your Naukri profile, and use the same job title and key skills in the profile as on the resume. A recruiter who finds you there then sees the same story twice.",
      },
      biodata: {
        title: "Drop the old biodata details",
        text: "Photo, date of birth, marital status, father's name and a signed declaration come from old templates. Most employers don't ask for them, and Otto's formats have no place for a photo.",
      },
      marks: {
        title: "Show marks while they matter",
        text: "For freshers, CGPA and Class XII marks still count, because many campus and trainee posts set a cut-off. After a few years of work, the degree and college are enough.",
      },
    },
    examplesTitle: "Start from an example",
    examplesIntro:
      "Each one is a complete resume you can open in the studio and make your own. <link>See all {count} examples</link>.",
    faq: {
      free: {
        question: "Is this resume builder really free?",
        answer:
          "Yes. Building, checking and downloading one resume as a PDF is free, in {freeFormats}, with no cap on downloads and no card. {free} also includes {fixes} line fixes a month from Otto. {pro} is {price} a month for tailoring, cover letters, every format and Word downloads.",
      },
      ai: {
        question: "Is it an AI resume builder?",
        answer:
          "Yes, with limits on purpose. Otto's AI fixes lines, tailors resumes and writes cover letters, but only from facts you give him: he asks for numbers instead of making them up, and you approve every change. The recruiter view and the line check are plain rules, not AI.",
      },
      ats: {
        question: "Will my resume get through an ATS?",
        answer:
          "Nobody can promise that, because every employer sets up its hiring system differently. Otto shows you the text a system pulls from your file and flags what often goes wrong, like columns, tables, icons and text boxes. The <link>ATS guides</link> show what common systems are known to do.",
      },
      freshers: {
        question: "Is it good for freshers?",
        answer:
          "Yes. Start from the fresher example or a blank page, put Education first, and keep it to one page. {freeFormats} are both free and suit a first resume.",
      },
      ctc: {
        question: "Should I put my CTC and notice period on my resume?",
        answer:
          "No. Give them when an application form, a recruiter or your Naukri profile asks. A resume without them works for every application, and the numbers change more often than your work does.",
      },
      signUp: {
        question: "Do I need to sign up?",
        answer:
          "Not to build, check or download: your resume is saved in your browser. A free account backs it up and turns on Otto's {fixes} line fixes a month. Sign in with Google or an emailed code, no password.",
      },
      paper: {
        question: "Letter or A4?",
        answer:
          "Both are there. Pick Letter for jobs in the US and Canada, and A4 for India, the UK, Europe and most other places. Your words stay the same either way.",
      },
      word: {
        question: "Can I download my resume in Word?",
        answer:
          "Word (.docx) downloads come with {pro}. On {free}, downloads are PDFs, as many as you like. <link>See pricing</link>.",
      },
    },
    closing: {
      otto: "Otto the otter, reading a resume",
      title: "Build it, check it, download it.",
      cta: "Build my resume",
      note: "Free, and no account needed.",
    },
  },
  coverLetters: {
    meta: {
      title: "AI cover letter generator from your resume",
      description:
        "Otto writes cover letters, outreach and application answers from your resume and the job post, and flags any line it can't back up. Comes with {pro}.",
    },
    crumb: "Cover letter generator",
    eyebrow: "Cover letters · {pro}",
    title: "An AI cover letter generator",
    titleEm: "that sticks to your facts.",
    action: "Write a cover letter",
    planNote:
      "Comes with {pro}, {price} a month for {letters} letters, messages, answers and interview preps.",
    check: {
      title: "Check the match before you write",
      text: "A letter lands better when your resume already shows what the post asks for. The job match check and the recruiter view are free, with no card.",
    },
    closing: {
      title: "A letter for every job, from your own resume.",
      art: "Otto the otter, pointing at a letter",
    },
    intro:
      "Paste a job post or its link. Otto writes the cover letter from that post and your resume, and flags anything you should check before you send it.",
    featuresTitle: "What Otto writes for you",
    features: {
      letter: {
        title: "A cover letter for each job",
        text: "Three short paragraphs: the role and your best fact for it, two or three results that match what the post asks for most, then why this job. The greeting and sign-off are added for you.",
      },
      answers: {
        title: "Answers to application questions",
        text: "Paste a question like “Why do you want to work here?” and Otto answers it from your resume. Anything only you know, such as a start date or salary, becomes a blank in brackets for you to fill in.",
      },
      outreach: {
        title: "Outreach, follow-ups and thank-yous",
        text: "A short email and a LinkedIn note for someone at the company, a follow-up when an application goes quiet, and a thank-you after an interview.",
      },
      facts: {
        title: "Nothing made up",
        text: "Otto writes only from your resume and the job post. If a draft has a number your resume doesn't, a stronger verb than your line uses or a stock phrase, he flags it for you to check.",
      },
      style: {
        title: "Your tone, your spelling",
        text: "Pick a tone ({tones}), a standard or shorter length, and US or UK spelling. Set it once and every letter follows it.",
      },
      send: {
        title: "Ready to send",
        text: "Copy it, open it as an email, or download it as a PDF or Word file. Each one is kept with the job it was written for.",
      },
    },
    steps: {
      job: {
        title: "Pick the job",
        text: "Choose a job you saved, an application on your board or a tailored copy of your resume. Or paste a job post or its link.",
      },
      kind: {
        title: "Pick what to write",
        text: "A cover letter, an answer to an application question or an outreach message. Otto writes it from your resume and the post.",
      },
      send: {
        title: "Check it and send it",
        text: "Read the draft, fix anything Otto flagged, then copy it, email it or download it.",
      },
    },
    faq: {
      free: {
        question: "Is the AI cover letter generator free?",
        answer:
          "It comes with {pro} and {max}. {pro} is {price} a month and includes {letters} a month, shared across cover letters, outreach messages, answers and interview prep. On {free}, checking your resume, editing it and PDF downloads stay free. <link>See every plan</link>.",
      },
      madeUp: {
        question: "Will Otto make things up?",
        answer:
          "No. He writes only from your resume and the job post, then checks the draft against both. A number your resume doesn't have, a stronger verb than your line uses or a stock phrase gets flagged, so you can fix it, or keep it if it's true.",
      },
      link: {
        question: "Can it write from a job link?",
        answer:
          "Yes. Paste the link and Otto reads the post. If a site won't share it, paste the text of the post instead.",
      },
      tone: {
        question: "Can I change the tone or length?",
        answer:
          "Yes. Pick a {tones} tone, a standard or shorter length, US or UK spelling, and your own sign-off. You can also leave Otto a note, such as “Mention I'm open to relocating.”",
      },
      why: {
        question: "How does it answer “Why do you want to work here?”",
        answer:
          "Paste the question and pick the job. Otto answers from your resume and the post in a short paragraph or two. Anything only you know, like what draws you to the company, becomes a blank in brackets for you to fill in.",
      },
    },
    // TONE_CHOICES in src/lib/writing-style/schema.ts, as they read inside a sentence.
    tones: { natural: "natural", warm: "warm", direct: "direct", formal: "formal" },
  },
  tracker: {
    meta: {
      title: "Job application tracker with email updates",
      description:
        "Track every job application on one board, with the resume you sent, follow-up reminders and interview dates. On {pro}, it updates from your job emails.",
    },
    crumb: "Job application tracker",
    eyebrow: "Application tracker",
    title: "A job application tracker",
    titleEm: "that keeps up with your inbox.",
    action: "Track my applications",
    planNote:
      "{free} tracks {freeApplications}, {pro} up to {proApplications} with email updates, and {max} up to {maxApplications}.",
    applications: { one: "{count} application", other: "{count} applications" },
    check: {
      title: "Send a resume that reads well",
      text: "Before you log the next application, see which of the post's skills your resume shows and what hiring software reads from your file. Both checks are free.",
    },
    closing: {
      title: "Every application, on one board.",
      art: "Otto the otter, reading a job application",
    },
    intro:
      "Log every job you apply to on one board, with the resume you sent, a reminder to follow up and the interview date. On {pro}, your job emails move each card for you.",
    featuresTitle: "What the tracker keeps for you",
    features: {
      board: {
        title: "One board, from To apply to Offer",
        text: "Jobs you save wait in To apply. Drag each card to Applied, Interviewing and Offer as you hear back, and to Closed when it ends.",
      },
      resume: {
        title: "The resume you sent",
        text: "Each application keeps the resume or tailored copy you sent, so you know what they read. Once you've sent a few, see which version gets you interviews.",
      },
      reminders: {
        title: "Reminders to follow up",
        text: "Otto reminds you to follow up {followUp} days after you apply, or after the days you pick. Snooze one for {snooze} days or clear it. After an interview, he sets one for {afterInterview} business days later.",
      },
      interviews: {
        title: "Interview dates",
        text: "Add the interview day and time, then add it to your calendar with a reminder to practice the morning before.",
      },
      emails: {
        title: "Updates from your job emails ({pro})",
        text: "Get your own Otto address and add one Gmail filter that forwards job emails to it. A “thanks for applying” email adds the job to Applied, and an interview invite moves it to Interviewing with the date.",
      },
      rules: {
        title: "Read by rules, kept small",
        text: "Otto reads each forwarded email with fixed rules, not AI. He keeps the sender's domain, the subject and what he found, and drops the rest. Mail he can't verify waits for you to check.",
      },
    },
    steps: {
      add: {
        title: "Add an application",
        text: "Type the company, job title and link, or mark a saved job as applied. Pick the resume you sent.",
      },
      move: {
        title: "Move it along",
        text: "Drag the card as you hear back, and add the interview date and notes. On {pro}, your job emails do this for you.",
      },
      followUp: {
        title: "Follow up on time",
        text: "When a reminder comes due, follow up, snooze it or mark the job as no reply. On {pro}, Otto writes the follow-up message from your resume and the job.",
      },
    },
    faq: {
      free: {
        question: "Is the job application tracker free?",
        answer:
          "{free} tracks {freeApplications} with a follow-up reminder, so you can try it. {pro} tracks up to {proApplications} and adds updates from your job emails, and {max} tracks up to {maxApplications}. {pro} is {price} a month.",
      },
      email: {
        question: "How does it update from my email?",
        answer:
          "On {pro}, you pick a handle for your own Otto address, add it to Gmail's forwarding settings, confirm it's your Gmail, then add one filter for job emails. It takes a few minutes and ends with a test email. After that, each job email moves its card, or waits for you to check it.",
      },
      privacy: {
        question: "Does Otto read all my email?",
        answer:
          "No. Only the emails your Gmail filter forwards reach Otto. He reads each one with fixed rules, not AI, keeps the sender's domain, the subject and what he found in it, such as the company, job title and interview date, and drops the rest. These records are deleted after six months. The <link>privacy policy</link> has the details.",
      },
      wrong: {
        question: "What if Otto reads an email wrong?",
        answer:
          "Undo any change from the list of emails Otto read. When he can't verify who sent an email, nothing moves until you check it.",
      },
      versions: {
        question: "Can I see which resume gets interviews?",
        answer:
          "Yes. Each application keeps the resume you sent, so the board counts the interviews and offers each version got. Once two versions have {minForRate} or more applications each, Otto compares their interview rates.",
      },
    },
  },
  interviewPrep: {
    meta: {
      title: "AI interview prep from your resume and the job",
      description:
        "Prep for each interview with likely questions, stories from your own resume lines and questions to ask. Technical roles also get a technical round.",
    },
    crumb: "Interview prep",
    eyebrow: "Interview prep · {pro}",
    title: "AI interview prep",
    titleEm: "built from your own resume.",
    action: "Prep for an interview",
    planNote:
      "Comes with {pro}, {price} a month for {letters} interview preps, letters, messages and answers.",
    check: {
      title: "See what the post asks for",
      text: "The job match check lists the skills a post names and where your resume shows each one, a good place to start your prep. It's free, with no sign-in.",
    },
    closing: {
      title: "Walk in knowing what you'll say.",
      art: "Otto the otter, thinking about an interview question",
    },
    intro:
      "Pick the job and the resume you sent. Otto builds your prep from both: the questions you're likely to get, stories from your own resume lines and questions to ask them.",
    featuresTitle: "What's in each prep pack",
    features: {
      questions: {
        title: "Likely questions, round by round",
        text: "From the opening to the closing, each question says what the interviewer is checking, the points to hit and the follow-up to expect.",
      },
      stories: {
        title: "Stories from your own lines",
        text: "Each story starts from a line on your resume, told as situation, task, action and result. Anything your resume doesn't say stays a blank for you to fill, never made up.",
      },
      technical: {
        title: "A technical round for technical roles",
        text: "For {roles} kinds of role, from engineers and data scientists to product managers and designers: deep dives on your own work, core concepts for the role, and a design question, case or exercise. Each says what a strong answer covers and the mistakes to avoid.",
      },
      ask: {
        title: "Questions to ask them",
        text: "Four or five questions for the end of the interview, about the product, team or goals in the post. None about pay or time off.",
      },
      practice: {
        title: "Practice mode",
        text: "Otto plays the interviewer, one question at a time. Answer out loud with the mic or type, with a two-minute timer and your outline a tap away. Then run the ones you missed again.",
      },
      day: {
        title: "Ready on the day",
        text: "Add the interview to your calendar with a reminder to practice the morning before, or print the pack to read on the way.",
      },
    },
    steps: {
      job: {
        title: "Pick the job",
        text: "An application that reaches Interviewing waits with a Prepare button. Or start from any job's link, its post, or just the job title.",
      },
      setup: {
        title: "Check the setup",
        text: "Use the resume you sent. Otto picks the technical round from the job; change the role, or the level from {firstLevel} to {lastLevel}, if you like.",
      },
      practice: {
        title: "Read, fill in, practice",
        text: "Go through the questions and stories, fill each blank with your own facts, then run practice mode.",
      },
    },
    faq: {
      free: {
        question: "Is the AI interview prep free?",
        answer:
          "It comes with {pro} and {max}. Each prep pack counts toward the same monthly allowance as cover letters and messages: {letters} a month on {pro} and {maxLetters} on {max}. {pro} is {price} a month.",
      },
      backUp: {
        question: "Will it give me answers I can't back up?",
        answer:
          "No. Facts about you come only from your resume. Where an answer needs something your resume doesn't say, Otto leaves a question in brackets, like “[How many people used it?]”, for you to answer. In the technical round, general know-how is written as guidance, never as something you did.",
      },
      roles: {
        question: "Which roles get a technical round?",
        answer:
          "{roles} kinds, from backend, frontend and AI/ML engineers to data analysts, product managers and designers. Otto picks one from the job title and post, and you can change it or turn it off.",
      },
      aloud: {
        question: "Can I practice out loud?",
        answer:
          "Yes. In practice mode, press the mic and answer out loud, and your answer shows up as text. Mark each question as done or to practice again, and the notes you keep stay in your browser.",
      },
      noPost: {
        question: "Can I prep without the job post?",
        answer:
          "Yes. Paste the whole post for sharper questions, or leave it out and Otto works from the job title.",
      },
    },
    // PREP_LEVELS in src/lib/insights/prep-focus.ts, as they read inside a sentence.
    levels: { junior: "junior", mid: "mid", senior: "senior", staff: "staff" },
  },
  portfolio: {
    meta: {
      title: "Resume to portfolio website in {designs} designs",
      description:
        "Turn your resume into a portfolio website. Pick one of {designs} designs, Otto fills it in from your resume, and we host it at your own link. Comes with {pro}.",
    },
    crumb: "Portfolio website builder",
    eyebrow: "Portfolio · {pro}",
    title: "From resume to portfolio website,",
    titleEm: "hosted at your own link.",
    action: "Make my portfolio",
    planNote: "Comes with {pro}, {price} a month with hosting included.",
    check: {
      title: "Start from a resume that reads well",
      text: "Your portfolio is built from your resume, so check it first: see what hiring software reads from your file, or match it to a job. Both are free.",
    },
    closing: {
      title: "Your resume, as a site of its own.",
      art: "Otto the otter, waving",
    },
    intro:
      "Pick one of {designs} designs and Otto fills it in from your resume: your projects, work, skills and links. We host it at your own link, so there's nothing to set up.",
    featuresTitle: "What you get",
    features: {
      designs: {
        title: "{designs} designs",
        text: "From one calm column to a dark page with big featured projects. Open each one full size with your own resume in it before you pick.",
      },
      filled: {
        title: "Filled in from your resume",
        text: "Otto drafts the about, projects, experience, skills, education and links from your resume. Edit any part, or hide a section you don't need.",
      },
      hosted: {
        title: "Hosted at your own link",
        text: "The page gets a link with your name in it, and we host it. Change the name later and the old link keeps working for {redirectDays} days.",
      },
      sync: {
        title: "In step with your resume",
        text: "With sync on, edits to your resume show on the page by themselves. Turn it off to update the page only when you're ready.",
      },
      private: {
        title: "Private details stay off",
        text: "Your email and phone start hidden, and search engines are asked to skip the page until you let them find it.",
      },
      views: {
        title: "Views and GitHub",
        text: "See how many times your page has been viewed. Connect GitHub and the page can show your GitHub numbers too.",
      },
    },
    steps: {
      pick: {
        title: "Pick a resume and a design",
        text: "See every design with your own resume in it, then pick one. Otto fills it in.",
      },
      check: {
        title: "Check what Otto wrote",
        text: "Edit the words, hide sections, and choose whether to show your email and phone.",
      },
      publish: {
        title: "Publish and share",
        text: "Nothing goes live until you publish. Then send the link to recruiters, or put it on your resume and LinkedIn.",
      },
    },
    faq: {
      free: {
        question: "Is the portfolio website free?",
        answer:
          "Portfolios come with {pro} and {max}, hosting included. {pro} is {price} a month. If your plan ends, the page goes offline, but it and its settings are kept, so it comes back as it was when you return.",
      },
      code: {
        question: "Do I need to code or buy hosting?",
        answer:
          "No. Otto builds the page from your resume and we host it. There's nothing to install and no domain to buy.",
      },
      google: {
        question: "Will Google find my portfolio?",
        answer:
          "Only if you want it to. Until you turn on “Let search engines find it,” search engines are asked to keep the page out of their results.",
      },
      update: {
        question: "What happens when I update my resume?",
        answer:
          "With sync on, the page picks up the change by itself. With sync off, Otto tells you the resume changed, and you update the page when you're ready.",
      },
      design: {
        question: "Can I change the design later?",
        answer:
          "Yes. Switch to any of the {designs} designs whenever you like. Your page keeps its link and settings.",
      },
    },
  },
} as const;
