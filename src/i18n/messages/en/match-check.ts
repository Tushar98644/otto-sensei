// The free job match tool (src/components/match-check); it ships to the browser, so only the tool's own words go here.
export default {
  privacy: {
    pasted: "Pasted text is checked in your browser and never leaves it.",
    uploaded: "The check runs in your browser. Nothing is stored.",
  },
  sample: { try: "Try with a sample", putBack: "Put back my text", clear: "Clear the sample" },
  submit: "Check the match",
  failed: { title: "The check didn't load", body: "Check your connection, then try again." },
  stale: {
    title: "You've changed the text since this check",
    body: "Check the match again to update it.",
  },
  pasteText: "Paste text",
  resume: {
    title: "Your resume",
    tabs: "How to add your resume",
    upload: "Upload a file",
    label: "Resume text",
    placeholder: "Paste your resume here",
    hint: "Copy it from your file or your profile, headings and all.",
    problems: {
      reading: "Wait a moment while Otto reads your file.",
      noFile: "Choose your resume file, or paste the text instead.",
      empty: "Paste your resume first.",
      short: "That's a bit short. Paste your whole resume.",
      long: "That's longer than a resume. Paste just your resume.",
    },
  },
  upload: {
    label: "Upload your resume, a PDF or Word file",
    reading: "Reading {name}…",
    read: "Read {words} words. Choose another file to swap it.",
    drop: "Drop your resume here, or choose a file",
    formats: "PDF or Word (.docx), up to {size}",
    kept: "Your file is read on our server for its text, then thrown away. We don't store it.",
    failed: "Something went wrong reading that file. Try again, or paste the text instead.",
    pictureOnly:
      "That file is only a picture, so hiring software sees a blank page. Paste your resume text instead.",
  },
  post: {
    title: "The job post",
    tabs: "How to add the job post",
    link: "Paste a link",
    label: "Job post text",
    placeholder: "Paste the job post here, or its link",
    hint: "Paste all of it: duties, requirements and nice-to-haves.",
    problems: {
      empty: "Paste the job post first.",
      short: "That's a bit short. Paste the whole job post, not just the title.",
      long: "That's over {max} characters. Cut the company intro or the benefits.",
    },
  },
  link: {
    label: "Job link",
    hint: "Paste the link and Otto reads it at once. Works with most job sites, but not LinkedIn or Indeed.",
    reading: "Otto is reading the job post…",
    readingStatus: "Otto is reading the job post.",
    readStatus: "Read the job: {title}.",
    untitledStatus: "untitled",
    from: "From the link",
    untitled: "Untitled job",
    seeText: "See the text Otto read",
    pasteInstead: "Paste the job text instead",
    system: "This job uses {name}.",
    guide: "Read the {name} guide",
    newTab: "(opens in a new tab)",
    problems: {
      empty: "Paste the link to the job post first.",
      notLink: "That doesn't look like a link. Copy it from your browser's address bar.",
      tooLong: "That link is too long. Copy the address of the job post itself.",
      offline: "You seem to be offline. Check your connection, or paste the job text instead.",
      failed: "Otto couldn't read that link just now. Paste the job text instead.",
    },
  },
  result: {
    // Where a skill shows in the resume.
    places: {
      at: "{title} at {company}",
      line: "{place}, line {number}",
      experience: "Experience",
      project: "Project",
      education: "Education",
      jobTitle: "Job title",
      certifications: "Certifications",
      summary: "Summary",
      skills: "Skills",
      skillsGroup: "Skills: {label}",
      headline: "Headline",
      tools: "{name}, tools",
      projects: "Projects",
      top: "Top of your resume",
    },
    eyebrow: "Free word check",
    headline: {
      one: "Found {found} of {count} skill the post names",
      other: "Found {found} of {count} skills the post names",
    },
    none: "No skills or tools Otto knows in this post",
    noneBody:
      "Otto looks for the skills, tools, licences and languages he knows, and this post names none of them. Paste the whole post, with its requirements, and check again.",
    body: "Otto looked for each skill, tool and licence the post names, word for word, the way keyword filters do. It's a count, not a grade.",
    count: "{label}: {found} of {total} found",
    listed: {
      one: "One only appears in a list, such as your skills. Recruiters look for a line that says where you used it.",
      other:
        "{count} only appear in a list, such as your skills. Recruiters look for a line that says where you used them.",
    },
    groups: {
      must: "Must-haves",
      nice: "Nice-to-haves",
      alsoNamed: "Also named in the post",
      all: "Skills the post names",
    },
    status: { shown: "In a line", listed: "Listed, not shown", missing: "Not found" },
    missingHint:
      "If you've used it, add a line that says where and what you did. Use the post's own words.",
    asks: {
      label: "Also in the post",
      title: "The post also asks for",
      note: "A word check can't judge years or degrees. Compare these with your dates and education yourself.",
    },
  },
  // Otto's note above the result.
  otto: {
    none: "I couldn't find skills or tools I know in this post. A post that lists its requirements works better.",
    all: {
      one: "Your resume names the one skill this post names.",
      other: "Your resume names all {count} skills this post names.",
    },
    mustLeft: {
      one: "{count} of the post's {total} must-haves isn't in your resume yet. Start there.",
      other: "{count} of the post's {total} must-haves aren't in your resume yet. Start there.",
    },
    some: {
      one: "Your resume names {found} of the {count} skill this post names. Here's where.",
      other: "Your resume names {found} of the {count} skills this post names. Here's where.",
    },
  },
  studio: {
    title: "Take both to the studio",
    opens: {
      file: "The free studio reads your file",
      sample: "The free studio opens with the sample resume",
      pasted: "The free studio opens with the resume you pasted",
    },
    body: "{opens} and keeps this job post for Tailor. Fix lines by hand or with Otto ({fixes} line fixes a month free) and download a clean PDF. On Pro, Otto tailors your resume to this job.",
    cta: "Fix these lines with Otto",
    failed: "The studio didn't open. Check your connection, then try again.",
  },
} as const;
