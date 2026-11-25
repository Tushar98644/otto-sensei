// Privacy policy, terms, refund policy and acceptable use (P2); English governs.
export default {
  page: {
    contents: "Contents",
    lastUpdated: "Last updated:",
    shortVersion: "The short version",
    englishGoverns:
      "This page is a translation. If it differs from the <link>English version</link>, the English version applies.",
  },
  // MERCHANT.disclosure in src/app/[lang]/(marketing)/_components/merchant.ts.
  disclosure:
    "Our order process is conducted by our online reseller {merchant}, the merchant of record for all our orders. {merchant} handles payment, receipts, sales tax or VAT, refunds and billing support.",
  privacy: {
    meta: {
      title: "Privacy policy: where your resume is stored",
      description:
        "What {brand} collects, where your resume is stored and who else processes it, in plain English. No ads, no tracking cookies, no selling your data.",
    },
    title: "Privacy policy",
    intro:
      "{brand} helps you check and improve your resume. This page explains what we collect, why, and who else sees it.",
    summary: {
      noSelling:
        "We don't sell your data or share it for advertising, and we don't use ads or tracking cookies.",
      browser:
        "Your resumes are saved in your browser. If you sign in, we also keep a backup so you can open them on other devices.",
      ai: "Each AI feature sends only the text it needs, when you use it. We tell OpenRouter to use only providers that don't train on it.",
      payments: "Payments go through {merchant}. We never see your full card number.",
      deleting:
        "Deleting your account removes your account data right away. If you've had a trial or paid, only a one-way fingerprint of your email stays, so each person gets the Pro trial once.",
    },
    collect: {
      title: "What we collect",
      items: {
        email:
          "<b>Your email address,</b> if you sign in, either with Google or with a code we email you. We use it to sign you in and to send important notices about your account or billing. There are no passwords. If you use Google, it also shares your name and profile picture with our sign-in provider; we don't use them.",
        resumes:
          "<b>Your resumes.</b> They're saved in your browser's local storage, on your device. If you sign in, we also keep a backup copy in our database so you can open them on other devices.",
        shareLinks:
          "<b>Share links.</b> If you share a resume, we keep a copy of that version (without hidden lines or tailoring notes) so anyone with the link can read it and download it as a PDF. Your email and phone show only if you turn that on, and search engines are asked to skip the page unless you allow them. We count views: to count each reader once, we keep a scrambled code made from their network address and browser (not the address itself) for about two days. Turning the link off deletes the copy.",
        applications:
          "<b>Applications you log.</b> If you track job applications, we store what you enter (company, job title, job link, date, status and notes) and which resume you sent, so you can see your own interview rate. If you make an interview prep pack for one, we save it with that application. Nobody else sees it.",
        jobEmails:
          "<b>Job emails you forward to Otto.</b> If you turn on tracking from email, you pick a handle for a private address, and the emails your Gmail filter forwards to it pass through Cloudflare, which hands each one to us as text with the result of its signature checks. We read it with fixed rules, not AI, and keep only the sender's domain, the subject, what kind of update it was, the company, job title, job link and interview date we read in it, and what we changed on your board or ask you to check. We also keep your handles and the Gmail address you confirm forwards to it. The rest of the email, its attachments and its headers are dropped as soon as it's read; neither Cloudflare nor we keep a copy. These records are deleted after six months, when you delete your account, and are in your data download. A handle you change or turn off is kept from anyone else for 90 days.",
        letters:
          "<b>Letters and messages you keep.</b> When you write a cover letter, an application answer or an outreach message while signed in, we store it with the company, job title and job link it was for and the title of the resume it came from, so you can find it again under Letters and messages. Edits you make to an outreach message are saved as you type. Otto doesn't look anyone up, but what you type into a message, such as the name of the person you're writing to, is saved with it. Deleting one deletes it. Nobody else sees them.",
        reminders:
          "<b>Reminders.</b> When you mark a job applied, we store a follow-up date (7 days later unless you pick another number). When it comes, we add a note to the bell on your dashboard; Otto doesn't email reminders. We store the note, whether you've read it, the date, and your reminder settings. Read notes are deleted after 90 days, unread ones after a year.",
        matches:
          "<b>New matches.</b> Once a week Otto looks for new jobs that match your resume and adds a note to the bell saying how many there are. We store when the last note went out and when we last looked; it uses your resume and work profile the way the Jobs tab does, and leaves out jobs you saved or applied to. Otto no longer sends the weekly jobs email, tips or views emails. We keep the email choices you made before and the record of which tips we sent you and when (never the email's text), but they no longer do anything. Emails sent before still have a working one-click unsubscribe link.",
        careerLog:
          "<b>Your career log.</b> If you keep one, we store the text you write for each month (what you shipped, any numbers, what you learned or led, or that nothing was new) and your check-in settings: the day, your time zone, and whether it's on or paused. If you use the mic, the recording is turned into text and thrown away; only the text is kept. With the check-in on, Otto adds a note to the bell and Home on your day and sends one email a month, which you can turn off in one click. It's free on every plan. You can edit or delete any month, it's in your data download, and it's deleted with your account.",
        week: "<b>Your week with Otto.</b> To show your weekly recap, we keep the days your account opened the app (the date only, never the time or the page) and a copy of each week's recap, which includes the names of companies and jobs from your own applications and saved jobs. We keep both for about 10 weeks. Days are recorded only where usage events are allowed: if your browser sends Do Not Track or Global Privacy Control, we don't record them, and the recap counts only what you saved in Otto. Both are in your data download and are deleted with your account.",
        workProfile:
          "<b>Your work profile.</b> If you fill it in, we store the country you live in, your time zone, where you can work without a sponsored visa, whether you want full-time or contract work, and whether you only want remote jobs. Otto checks job posts against it in your browser, and on our server when ranking the Jobs tab. Nobody else sees it.",
        writingStyle:
          "<b>Your writing style.</b> If you set one, we store the tone, length, spelling and sign-off you pick and any notes you write for Otto. They shape your cover letters, application answers and outreach messages. Nobody else sees them.",
        jobs: "<b>Jobs you match and save.</b> To rank open jobs for you, your browser sends the skills, job titles and years of experience it reads from your resume, never the resume itself or your contact details. We use them for that one request and don't store them or send them to an AI. If you save a job, we store which one and when. The jobs themselves come from companies' public careers pages and job feeds, each linked to its original post.",
        jobsNear:
          "<b>Jobs near you and the map.</b> If you search for jobs near your location, your browser asks you first, then sends us your position rounded to about 1 km for that one search. We don't store it: it isn't kept with your account, in our logs or in the day's saved lists. A city you pick to search near, and your other filters, are remembered in your browser only. What a job card says about the company (how many jobs it has open, where most of them are, whether it's hiring now) comes from the public job posts, not from you.",
        files:
          "<b>Files you upload.</b> We read them in memory to pull out the text and run the checks. We don't store the files.",
        usage:
          "<b>Usage counts.</b> For signed-in users, how many line fixes, tailored versions, cover letters and answers you've used this month (or during your trial), plus any extra an invite earned you, so plan limits work.",
        billing:
          "<b>Plan and billing status.</b> If you subscribe or start a trial, we store your plan and the subscription details {merchant} sends us, such as whether it's active, when your trial ends and when it renews. We never see your full card number.",
        trial:
          "<b>Trial record.</b> So each person gets the Pro trial only once, we keep a one-way fingerprint (a SHA-256 hash) of the email of anyone who has started a trial or paid. It can't be turned back into your email, and we keep it after you delete your account, only to check whether that email has had a trial.",
        feedback:
          "<b>Feedback you send.</b> Your note, whether it's a problem or an idea, and the page you sent it from. If you're signed in, it's linked to your account.",
        invites:
          "<b>Invites.</b> Your invite code, which account joined through whose link, and the device cookie ids (below) of the browsers used, so nobody can invite themselves. Inviters only see counts, never who joined. Once you have an invite link, the “Made with Otto Sensei” link at the foot of your share links carries your invite code, so people who sign up from there count as your invites. The code alone doesn't say who you are.",
        abuse:
          "<b>Abuse-prevention counters.</b> To stop abuse, we count requests per IP address, device and email address in short time windows. These counters are deleted after about two days.",
        logs: "<b>Technical logs.</b> Our servers log events such as errors. Logs never include your resume text, and email addresses in them are masked.",
        events:
          "<b>Usage events.</b> Which pages people open and which steps they take, such as uploading a resume, downloading a PDF or upgrading, with simple counts like how many checks failed. For a page, that's the kind of page (never the address of a share link or portfolio), the name of the site that sent you, any campaign tags in the link, whether you're on a phone, tablet or computer, how long you stayed on it and, for some visits, how fast the page loaded. They never include your resume text, job posts, name or email address. If you're signed in, they're linked to your account's random id. If your browser sends Do Not Track or Global Privacy Control, we send none at all.",
      },
    },
    ai: {
      title: "How Otto uses AI",
      intro:
        "Otto uses AI models (by default Z.ai's GLM) through OpenRouter. Each feature sends only the text it needs, and only when you use it:",
      items: {
        importing: "<b>Importing a resume:</b> the text of the file, to sort it into sections.",
        fixing:
          "<b>Fixing a line:</b> the line, its job title and company, and your answers to Otto's questions.",
        summary:
          "<b>Writing your summary:</b> your resume without its contact details, or only the summary you asked Otto to tighten.",
        tailoring:
          "<b>Tailoring, cover letters, outreach messages and application answers:</b> your resume, the job post, for an answer the question, and your writing style if you set one (with any contact details in your notes replaced by placeholders).",
        prep: "<b>Interview prep:</b> your resume and the job post.",
        build:
          '<b>"Build with Otto":</b> the job you want and what you wrote about each job, never your name.',
        github:
          "<b>Import from GitHub:</b> the description, README and pull request text of the repos and pull requests you pick.",
      },
      notes: {
        placeholders:
          "Before any of this goes to the AI, Otto replaces your name, email, phone number and links with placeholders, and puts them back afterwards. It spots them by their usual patterns, so an unusual format can slip through. OpenRouter passes the text to the model's provider and sends back the result. We tell OpenRouter to use only providers that don't train on this data. Providers may keep it for a limited time under their own policies, for example to detect abuse.",
        safety:
          "<b>Safety checks:</b> text Otto writes, and the text of pages you publish (your portfolio and shared resume links), is checked by a safety model through OpenRouter, with data collection turned off, to block sexual or explicit content.",
        noAi: "The recruiter checks, the editor and PDF downloads don't use AI. Line checks and PDFs are made right in your browser.",
        inBrowser:
          "A LinkedIn data export or a JSON Resume file you import is read in your browser and never uploaded. The job post eligibility check also runs in your browser, with no AI.",
        voice:
          "<b>Voice typing:</b> when you press a microphone button, your browser listens only while it's on. In Chrome, Edge and Safari, the browser's own speech service (Google in Chrome, Microsoft in Edge, Apple in Safari) turns your speech into text, under that company's privacy policy. In other browsers, or when that service isn't available, the browser records a clip that goes to our speech-to-text provider through OpenRouter, with data collection turned off. We never store the audio, only the text you keep.",
        github:
          "\"Import from GitHub\" reads only public data from GitHub (your repos and merged pull requests) by the username you type, without your GitHub login. Nothing is added to your resume until you confirm. We don't store the GitHub data: a server keeps it in memory for up to an hour, so a second look doesn't ask GitHub again.",
      },
    },
    chrome: {
      title: "Otto for Chrome",
      intro:
        "The Chrome extension shows how your resume matches a job post on the page where you read it. It works like this:",
      items: {
        reads:
          "<b>What it reads:</b> the title, company, location and text of a job post. It runs only on job posts on LinkedIn, Naukri, Indeed, Greenhouse, Lever, Ashby, Workday, SmartRecruiters and Workable, and on any other page only when you press its toolbar button. It doesn't read other pages or your browsing history, and it never sends an application for you.",
        fill: "<b>Fill with Otto (Pro):</b> when you press it on a Greenhouse, Lever, Ashby or Workday application form, the extension fetches your name, email, phone, location, links, work history, education and saved answers from your account, puts them into that form and attaches your resume's PDF; it doesn't keep them. It never answers self-identification or consent questions and never sends the form. Draft with Otto sends that question and the job post to us. After you send a form it filled, it adds the application to your board with the job's link, title and company.",
        device:
          "<b>The match runs on your device.</b> The extension keeps a copy of what the match needs in Chrome's storage for extensions: the text of your resumes without your name, email, phone and links, your work profile, where you're looking for work, and which jobs you saved. It refreshes that copy every few hours. Checking a post sends nothing to us.",
        save: "<b>Save:</b> when you press Save, the extension sends us that job's link, title, company, location and post text. We keep them with your account, so the job waits on your board and Otto can still read the post if it's taken down.",
        tailor:
          "<b>Tailor and Letter</b> open {brand} in a new tab with that saved post, and work like the AI features above.",
        connecting:
          "<b>Connecting:</b> the extension holds a random key for your account. We keep only a one-way fingerprint of it, with when it was made and last used. It stops working after 90 days unused, when you press Disconnect on your account page or in the extension, or when you delete your account.",
      },
      outro: "The extension shows no ads and sends no usage events.",
    },
    payments: {
      title: "Payments",
      checkout:
        "{disclosure} Checkout happens on the {merchant} site, not ours. There, {merchant} collects your payment details and billing address (also for the trial, so the plan can start when it ends) under its own <link>privacy policy</link>.",
      items: {
        send: "<b>What we send {merchant}:</b> when you start a checkout, your account email, our random id for your account and the plan you picked, so the payment is linked to your account. When you start a checkout or delete your account, we also look up that email at {merchant}, so you're never charged for a second subscription and every one is cancelled.",
        receive:
          "<b>What {merchant} sends us:</b> your subscription's plan and status, its billing period, when it renews or your trial ends, a pending cancellation, and the ids {merchant} uses for you, your subscription and your payments. Its notices also carry the name, email and billing address on the order and the card's network and last four digits. We use that email only to match a payment to your account, and we don't store any of these. {merchant} never sends us your full card number.",
      },
    },
    cookies: {
      title: "Cookies and local storage",
      intro: "We use only what the app needs to work:",
      items: {
        signIn:
          "<b>Sign-in cookies</b> keep you signed in. They renew while you use the app and are removed when you sign out.",
        device:
          "<b>A device cookie</b> holds a random id that limits free uploads and checks per device. It isn't linked to your name or email, and it lasts a year.",
        invite:
          "<b>An invite cookie</b> holds a friend's invite code for 30 days after you open their link, so the invite still counts if you sign up later. It's removed once the invite is settled.",
        language:
          "<b>A language cookie</b> remembers which language you chose for the app. It holds only that choice and lasts a year.",
        localStorage:
          "<b>Local storage</b> (not a cookie) keeps your resumes, your progress and which tours you've seen on your device until you delete them or clear your browser data.",
        checkout:
          "<b>The {merchant} checkout</b> runs on its own site, which may set its own cookies there to run the payment and prevent fraud, under the {merchant} <link>privacy policy</link>. Our site sets no payment cookies.",
      },
      outro:
        "We don't use ads or tracking cookies. For the usage events above, a random id is kept in local storage so your steps can be counted together, across visits. It isn't linked to your name or email, and clearing your browser data removes it.",
    },
    sharing: {
      title: "Who we share data with",
      intro:
        "We don't sell your data or share it for advertising. We only use these providers to run {brand}:",
      items: {
        openRouter:
          "<b>OpenRouter</b> and the AI model provider it routes to process resume text for the AI features above.",
        merchant:
          "<b>{merchant}</b> processes payments as our merchant of record and online reseller.",
        supabase:
          "<b>Supabase</b> hosts our database and runs sign-in, including your sign-in sessions.",
        resend:
          "<b>Resend</b> delivers our sign-in codes and notices about your account, such as a trial ending.",
        google: "<b>Google</b>, only if you choose to sign in with your Google account.",
        github:
          "<b>GitHub</b> receives the username you look up, only if you use Import from GitHub.",
        vercel: "<b>Vercel</b> hosts the app itself.",
        cloudflare:
          "<b>Cloudflare</b> receives the job emails you forward to your Otto address and passes them to us, only if you turn on tracking from email.",
        sentry:
          "<b>Sentry</b> receives error reports when something breaks, with emails, phone numbers and resume text removed first.",
        posthog:
          "<b>PostHog</b> receives the usage events above, so we can see which steps help and where people get stuck.",
        openFreeMap:
          "<b>OpenFreeMap</b> serves the map's tiles when you open the Jobs map, so it receives your IP address and which areas you view, including the area around you if you use “Go to my location”. We send it nothing else.",
      },
      outro:
        "These providers may process data outside your country, including in the United States. We may also share information if the law requires it.",
    },
    retention: {
      title: "How long we keep data",
      items: {
        account:
          "Account data, resume backups, logged applications, interview prep, your work profile and your writing style: until you delete them or your account.",
        shareLinks: "Share links: until you turn the link off or delete your account.",
        savedJobs: "Saved jobs: until you remove them, or 30 days after the job closes.",
        chromeJobs:
          "Jobs saved from Otto for Chrome: until you remove them or delete your account.",
        chromeKey:
          "The Chrome extension's key: until you disconnect it, or 90 days after its last use.",
        reminders: "Reminder notes: 90 days once read, a year if never read.",
        recaps:
          "The days you opened the app and your weekly recaps: about 10 weeks, or until you delete your account.",
        codes: "Sign-in codes: they work once and expire after 10 minutes.",
        feedback:
          "Feedback and invite records: until your account is deleted. Feedback sent while signed out isn't linked to any account.",
        abuse: "Abuse-prevention counters: about two days.",
        uploads: "Uploaded files: not kept at all.",
        emailChoices:
          "Your email choices and the record of which tips we sent: until you delete your account.",
        trialEnd:
          "A copy of your trial's end date: 30 days after the trial ends, or until you turn tips off.",
        letters:
          "Letters, answers and outreach messages you keep: until you delete them or your account.",
      },
    },
    choices: {
      title: "Your choices",
      items: {
        resumes:
          "Delete any resume in the studio whenever you like. Its backup goes right away; the copy in this browser waits in Recently deleted for 30 days, or until you sign out or empty it.",
        account:
          "Delete your account from your <link>account page</link>. This removes your email, sign-in record, resume backups, logged applications and their prep, work profile, writing style, letters and messages, saved jobs, the Chrome extension's connection, share links, reminders and email choices, invite records, feedback and usage records right away, and signs you out on every device. Deleting your account cancels your paid plan or trial right away, and you won't be charged again. Only the trial fingerprint above stays.",
        data: "Ask us for a copy of your data, or to correct or delete it, by emailing <link>{email}</link>. You can also complain to your local data protection authority.",
      },
    },
    children: {
      title: "Children",
      body: "{brand} isn't meant for anyone under 16, and we don't knowingly collect their data.",
    },
    changes: {
      title: "Changes to this policy",
      body: "If we change this policy, we'll update the date at the top. If a change affects how we use your data, we'll email signed-in users before it takes effect.",
    },
    contact: {
      title: "Contact",
      body: "Questions about privacy? Email <link>{email}</link>.",
    },
  },
  terms: {
    meta: {
      title: "Terms of service: plans, limits and cancelling",
      description:
        "The rules for using {brand}, in plain English: your content stays yours, what each plan includes and costs, its monthly limits and how to cancel.",
    },
    title: "Terms of service",
    intro:
      "These terms are the agreement between you and {brand} when you use this site. By using it, you agree to them. We kept them short and plain on purpose.",
    summary: {
      yours: "Your resumes and anything you write or upload stay yours.",
      guidance:
        "Otto's checks and suggestions are guidance, not a guarantee of an interview or a job.",
      price:
        "Pro costs {month} a month or {year} a year. New accounts can try it for {days} days for {trialPrice}, once per person.",
      cancel:
        "Cancel anytime from your account page, and you keep your plan until the end of the period you paid for.",
      kept: "If a paid plan ends, nothing you made is deleted.",
    },
    who: {
      title: "Who we are",
      body: "{brand} is the business that runs this site and sells its plans, and the party these terms are with. You can reach us at <link>{email}</link>.",
    },
    service: {
      title: "The service",
      asIs: "{brand} lets you check, edit and tailor your resume and download it as a PDF. We provide it as is. We work hard to keep it accurate and online, but we can't promise it will always be error-free or available.",
      guidance:
        "Otto's checks and suggestions are guidance, not a guarantee. Hiring software differs between employers, and no tool can promise you an interview or a job. You decide what goes on your resume, so read every suggestion before you keep it.",
    },
    account: {
      title: "Your account",
      body: "You sign in with a code sent to your email. Keep your email account secure, since anyone who can read it can sign in as you. You must be at least 16 to use {brand}.",
    },
    content: {
      title: "Your content is yours",
      yours:
        "Your resumes and anything you write or upload stay yours. You give us permission to store and process them only to run the service for you, for example to check a file, back up your resumes, or send text to our AI provider when you ask Otto for help. Our <link>privacy policy</link> explains how.",
      rights: "Only upload content you have the right to use.",
    },
    misuse: {
      title: "Don't misuse it",
      items: {
        limits:
          "Don't try to break, overload or get around the service or its limits, for example with scripts, bots or many accounts.",
        copy: "Don't copy, resell or scrape the service.",
        harmful: "Don't upload anything illegal, harmful, or someone else's private data.",
        pretend: "Don't use it to pretend to be someone else.",
      },
      outro: "We may suspend or close accounts that break these rules.",
    },
    ai: {
      title: "The AI writing tools",
      intro:
        "The AI tools (line fixes, tailoring, summaries, cover letters, outreach messages, answers to application questions, interview prep and Build with Otto) are for job-search writing only.",
      items: {
        explicit:
          "Don't use them to create sexual, sexually explicit or other NSFW (not safe for work) content of any kind.",
        hateful:
          "Don't use them to create hateful, harassing, violent, illegal or deceptive content.",
      },
      outro:
        "The AI is set up to refuse such requests and leave such material out. Automated safety checks also block sexual or explicit content in what Otto writes and on pages you publish. We may remove content that breaks this rule and suspend or close the account that asked for it. Our <link>acceptable use policy</link> has the full list.",
    },
    plans: {
      title: "Plans and their limits",
      includes: {
        title: "What each plan includes",
        free: "<b>Free:</b> the basic reader for uploads, the recruiter view, editing by hand, {fixes} line fixes a month with Otto (summary help counts as one), {resumes}, the Classic and Compact formats, PDF downloads, the {matches} closest job matches and {applications} with its reminder.",
        paid: "<b>Pro and Max</b> add more line fixes and the rest of Otto's AI help (tailoring, letters, answers, interview prep, Build with Otto, GitHub drafts and AI reading of uploads), the other formats, Word downloads, every job match with filters and saved jobs, share links, the work-rights check and portfolios. {pro} and the trial keep up to {proResumes} resumes and track up to {proApplications} applications; {max} keeps up to {maxResumes} and tracks up to {maxApplications}. Tailored versions count as resumes.",
        ends: "<b>If a paid plan ends,</b> nothing you made is deleted. You can still open, edit and download it, and links you shared stay up, but you can't add more until you upgrade again. Moving to a smaller plan works the same way: resumes and applications past its limits stay, and you can add more once you're under them.",
      },
      resumes: { one: "{count} resume", other: "{count} resumes" },
      trackedApplications: {
        one: "{count} tracked application",
        other: "{count} tracked applications",
      },
      resets: {
        title: "When limits reset",
        intro: "Each plan has a limit for each thing Otto does with AI, shown in the table below.",
        items: {
          free: "<b>Free:</b> line fixes reset at the start of each calendar month (UTC).",
          monthly:
            "<b>Monthly plans:</b> the limits run from one renewal to the next and reset when your plan renews.",
          yearly:
            "<b>Yearly plans:</b> the same limits per month, reset on the day of the month the plan started. In a shorter month they reset on its last day: a plan started on the 31st resets on the 30th of a 30-day month.",
          trial: "<b>The Pro trial:</b> its own smaller limits for the whole trial.",
          unused: "Unused limits don't carry over.",
          invites:
            "<b>Invite extras</b> add to the current month or trial. On Free, the extra line fixes count that calendar month; the extra tailored versions count once you start a trial or upgrade that month, and extras you haven't used move with you when you do.",
        },
        next: "Your account page shows the date your limits next reset.",
      },
      table: {
        eachMonth: "Each month",
        // No-break spaces: on phones the header may break only after the comma.
        trial: "Pro trial, in total",
        none: "None",
        // FEATURE_LABELS in src/config/plans.ts, as row headings.
        features: {
          tailor: "Tailored versions",
          letter: "Cover letters, outreach messages, answers and interview prep",
          fix: "Line fixes",
          import: "AI reads of an uploaded resume",
          draft: "Build with Otto drafts",
          github: "GitHub project drafts",
        },
      },
      atLimit: {
        title: "At a limit",
        pauses:
          "That feature pauses until your limits reset (on Free, at the start of the next month; on a monthly plan, at your next renewal; on a yearly plan, on the next monthly reset day; on the trial, until Pro starts), or until you move to a bigger plan. Moving up from Pro to Max between renewals doesn't reset a limit: what you used this month counts on the new plan. Uploads never stop: past the AI reads, the basic reader reads your file instead. Editing, recruiter checks and PDF downloads have no limit on any plan.",
        budget:
          "Each paid plan also has a monthly AI budget ({proTokens} tokens on {pro}, {maxTokens} on {max}, {trialTokens} on the trial) that covers full use of the limits above and only stops automated or abusive use.",
        halfMillion: "half a million",
      },
      voice: {
        title: "Voice typing",
        body: "Voice typing is free and unlimited in browsers with built-in speech (Chrome, Edge and Safari). In other browsers, like Brave and Firefox, it uses our speech service: up to {freeClips} clips a day on Free, {proClips} on {pro} and the trial, and {maxClips} on {max}, each up to 2 minutes.",
      },
    },
    payments: {
      title: "Payments and cancelling",
      prices:
        "Pro costs {proMonth} a month or {proYear} a year. Max costs {maxMonth} a month or {maxYear} a year. Prices are in US dollars, plus any taxes where you live.",
      trial:
        "New accounts can have a {days}-day Pro trial for {price}, once per person. You add a card at checkout, and the {price} (plus any taxes) is charged when the trial starts. When the trial ends, Pro starts at {proMonth} a month unless you cancel before then. During the trial a portfolio can be built and previewed, but it goes public only on a paid plan.",
      merchant: "{disclosure} Its <link>buyer terms</link> also apply to the purchase.",
      renewal:
        "A paid plan renews every period you picked until you cancel. Cancel anytime from your <link>account page</link>, and you keep it until the end of the period you paid for. You can move up from Pro to Max on the billing period you already have: your subscription changes in place, so you're never billed twice, and the difference for the rest of the period is charged right away. During the Pro trial you can start Max instead: the trial ends at once, the full Max price for the period you pick (plus any taxes) is charged right away to your card on file, and the {price} trial charge isn't taken off. To move to Pro, or between monthly and yearly, cancel and pick the new plan once your current period ends. If you drop to Free, your published portfolio goes offline, and its data is kept in case you come back.",
      // Only while credit is on sale, like the pricing page's line about it.
      credit:
        "A paid {pro} or {max} plan past any trial can add prepaid credit, from {min} to {maxUsd} at a time in whole dollars, plus any taxes. It pays for AI help only once a month's allowance for that help, or the AI budget, runs out, at the prices shown at the time it's used. Credit is prepaid and isn't refundable once used. It doesn't expire while your account exists, can be used only while you're on a paid plan, and is removed when your account is deleted.",
      failed:
        "If a payment fails when your plan renews or your trial ends, you keep the plan for a few days while the payment is tried again. If it still fails, your account moves to Free until you update your card from your account page and the payment goes through.",
      changes:
        "Prices and limits may change. If your plan's price or limits change, we'll email you before the change applies to you, so you can cancel first if you prefer.",
      refunds:
        "Refund requests are handled by {merchant} under its <link>buyer terms</link>. Our <link>refund page</link> explains how to ask.",
    },
    ending: {
      title: "Ending things",
      body: "You can stop using {brand} and delete your account at any time. We may suspend or close an account that breaks these terms, and we'll tell you why when we can. We may also change or stop parts of the service over time.",
    },
    liability: {
      title: "Limits on our liability",
      body: "As far as the law allows, {brand} isn't liable for indirect losses, such as a missed job opportunity or lost income. Our total liability to you is limited to what you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under consumer protection laws where you live.",
    },
    changes: {
      title: "Changes to these terms",
      body: "We may update these terms. When we do, we'll change the date at the top, and for important changes we'll email signed-in users before they take effect. Using {brand} after a change means you accept the new terms.",
    },
    contact: {
      title: "Contact",
      body: "Questions about these terms? Email <link>{email}</link>.",
    },
  },
  refunds: {
    meta: {
      title: "Refund policy: cancelling Pro and Max",
      description:
        "Refunds for Pro and Max plans are handled by {merchant}, our merchant of record, under its buyer terms. Cancel anytime and you won't be charged again.",
    },
    title: "Refund policy",
    intro:
      "{merchant} is our merchant of record, and your card statement shows the charge under their name, starting with <b>{prefix}</b>. Here's how payments, refunds and cancelling work on Pro and Max.",
    summary: {
      cancel:
        "Cancel anytime from your account page. You keep your plan until the end of the period you've paid for.",
      trial:
        "The {days}-day Pro trial costs {price}, charged when it starts. Cancel before it ends and you won't pay anything more.",
      ask: "To ask for a refund, contact {merchant} through its <link>buyer help page</link>, or <link>email us</link> from the address you sign in with.",
    },
    manageBilling: "Manage billing",
    pay: {
      title: "Who you pay",
      receipt:
        "After each payment, {merchant} emails you a receipt with a link to download your invoice.",
    },
    refunds: {
      title: "Refunds",
      body: "Refund requests are handled by {merchant} under its <link>buyer terms</link>. To ask for one, contact {merchant} through its <link>buyer help page</link>, or email us from the address you sign in with and we'll pass your request on.",
    },
    cancel: {
      title: "Cancel anytime",
      anytime:
        "Cancel from your <link>account page</link> whenever you like. You keep your plan until the end of the period you've paid for, then your account moves to the Free plan. Your resumes stay yours either way.",
      trial:
        "The {days}-day Pro trial costs {price}, charged when it starts. Cancel before the trial ends and you won't pay anything more; otherwise your first Pro payment is taken when it ends. If you start Max during the trial, the full Max price is charged right away and the {price} trial charge isn't taken off.",
    },
    deleting: {
      title: "Deleting your account",
      body: "Deleting your account cancels your paid plan right away, and you won't be charged again. It ends at that moment rather than at the end of the period you've paid for.",
    },
    questions: {
      title: "Questions about a charge",
      email:
        "Email <link>{email}</link> from the address you sign in with. For a payment itself, you can also contact {merchant} through its <link>buyer help page</link>.",
      rights: "This policy doesn't affect any rights you have under consumer laws where you live.",
    },
  },
  acceptableUse: {
    meta: {
      title: "Acceptable use policy for the AI writing tools",
      description:
        "What {brand} and its AI writing tools may be used for: professional job-search text only. No explicit, hateful, illegal or deceptive content.",
    },
    title: "Acceptable use policy",
    intro:
      "{brand} helps people with their job search: checking and improving resumes, tailoring them to a job, writing cover letters and answers to application questions, preparing for interviews, finding jobs and building a portfolio page. This policy says what it may and may not be used for. It is part of our <link>terms of service</link>.",
    purpose: {
      title: "What the AI tools are for",
      body: "The AI writing tools write and improve job-search text from your own resume and the job posts you give them. Use them only for that.",
    },
    forbidden: {
      title: "Not allowed",
      items: {
        sexual:
          "Sexual, sexually explicit or sexually suggestive content, or any other NSFW (not safe for work) content.",
        hateful: "Hateful, harassing, threatening or violent content.",
        illegal: "Illegal content, or content that helps someone break the law.",
        deceptive:
          "Deceptive content: fake credentials, made-up employers or degrees, or pretending to be someone else.",
        privateData: "Someone else's private data uploaded without their permission.",
        limits:
          "Getting around the service's safeguards or limits, for example with scripts, bots or many accounts.",
      },
    },
    enforcement: {
      title: "How we enforce it",
      body: "The AI is instructed to write only professional job-search text and to refuse or leave out anything this policy forbids. Automated safety checks also block sexual or explicit content in what Otto writes and on public pages (portfolios and shared resume links). We may remove content that breaks this policy, and suspend or close the account that created it.",
    },
    models: {
      title: "The AI behind it",
      body: "{brand} is an independent product. Its AI features run on third-party AI models, reached through OpenRouter. We are not affiliated with or endorsed by the companies that make those models. Our <link>privacy policy</link> says what text is sent and how it is protected.",
    },
    report: {
      title: "Report a problem",
      body: "Seen something that breaks this policy? Email <link>{email}</link>. We reply within 3 business days.",
    },
  },
} as const;
