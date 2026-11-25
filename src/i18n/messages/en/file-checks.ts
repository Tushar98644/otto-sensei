// What the file checks say about an uploaded resume (src/lib/checks), by RecruiterCheck.copy.
export default {
  results: {
    textReadable: {
      title: "Text is readable",
      detail: "Hiring software can pull the text out of this file.",
    },
    textMissing: {
      title: "No readable text",
      detail: "Hiring software can't read any text in this file. It's probably a scan or an image.",
    },
    emailNotChecked: {
      title: "Email not checked",
      detail: "There's no readable text, so we couldn't check for an email address.",
    },
    emailFound: {
      title: "Email address found",
      detail: "We found {email}, so recruiters can reach you.",
    },
    emailMissing: {
      title: "No email address",
      detail:
        "We couldn't find an email address in the main text. Without one, recruiters can't reach you.",
    },
    phoneNotChecked: {
      title: "Phone not checked",
      detail: "There's no readable text, so we couldn't check for a phone number.",
    },
    phoneFound: { title: "Phone number found", detail: "We found {phone}." },
    phoneMissing: {
      title: "No phone number",
      detail: "We couldn't find a phone number. Many recruiters call or text before they email.",
    },
    headerPdf: {
      title: "Nothing hidden in headers",
      detail: "In a PDF, header text is part of the page, so hiring software reads it.",
    },
    headerClear: {
      title: "Nothing hidden in headers",
      detail: "None of your contact details are tucked away in a page header or footer.",
    },
    headerEmail: {
      title: "Contact details in the header",
      detail:
        "Your email is only in the page header or footer. Many systems skip those, so they never see it.",
    },
    headerPhone: {
      title: "Contact details in the header",
      detail:
        "Your phone number is only in the page header or footer. Many systems skip those, so they never see it.",
    },
    headerBoth: {
      title: "Contact details in the header",
      detail:
        "Your email and phone number are only in the page header or footer. Many systems skip those, so they never see them.",
    },
    sectionsNotChecked: {
      title: "Sections not checked",
      detail: "There's no readable text, so we couldn't check your section headings.",
    },
    sectionsProjectsOnly: {
      title: "No work history section",
      detail:
        "We found Projects but no Experience heading. That's fine early on, but jobs belong under Experience.",
    },
    sectionsNoWork: {
      title: "No work history section",
      detail:
        'We couldn\'t find a heading like "Experience" or "Work History". Without one, many systems can\'t tell your jobs apart.',
    },
    sectionsNoSkillsOrEducation: {
      title: "No Skills or Education section",
      detail:
        "We couldn't find Skills or Education headings. Many systems use both to match you to jobs.",
    },
    sectionsNoSkills: {
      title: "No Skills section",
      detail: "We couldn't find a Skills heading. Many systems use it to match you to jobs.",
    },
    sectionsNoEducation: {
      title: "No Education section",
      detail: "We couldn't find an Education heading. Many systems expect one, even a short one.",
    },
    sectionsFound: { title: "Clear section headings", detail: "We found {sections}." },
    layoutNotChecked: {
      title: "Layout not checked",
      detail: "There's no readable text, so we couldn't check the layout.",
    },
    singleColumn: {
      title: "Single column",
      detail: "Your text reads top to bottom in one column.",
    },
    columnsPdf: {
      title: "Two-column layout",
      detail:
        "Your page has side-by-side columns. Some systems read straight across and mix them together.",
    },
    columnsDocument: {
      title: "Two-column layout",
      detail:
        "Your document is set up in columns. Some systems read straight across and mix them together.",
    },
    tablesPdf: {
      title: "No table problems",
      detail:
        "Tables only trip up hiring software in Word files. In a PDF they're plain text, and the layout check covers them.",
    },
    tablesNone: {
      title: "No tables",
      detail: "Your text isn't inside tables, which some systems misread.",
    },
    tablesFound: {
      title: "Tables found",
      detail: {
        one: "Your file has {count} table. Some systems read table cells out of order or skip them.",
        other:
          "Your file has {count} tables. Some systems read table cells out of order or skip them.",
      },
    },
    textBoxesPdf: {
      title: "No text box problems",
      detail: "In a PDF, text boxes become regular text that hiring software can read.",
    },
    textBoxesNone: { title: "No text boxes", detail: "All your text sits in the main page." },
    textBoxesFound: {
      title: "Text boxes found",
      detail: {
        one: "Your file has {count} text box. Many systems skip text boxes entirely, so that text may never be read.",
        other:
          "Your file has {count} text boxes. Many systems skip text boxes entirely, so that text may never be read.",
      },
    },
    imagesNone: { title: "No images", detail: "Nothing important is hidden in a picture." },
    imagePages: {
      title: "Pages are images",
      detail: "Your pages are pictures. Hiring software can't see what's in them.",
    },
    imagesFound: {
      title: "Images found",
      detail: {
        one: "We found {count} image. Logos, photos and skill bars are invisible to hiring software.",
        other:
          "We found {count} images. Logos, photos and skill bars are invisible to hiring software.",
      },
    },
    iconsNotChecked: {
      title: "Icons not checked",
      detail: "There's no readable text, so we couldn't check for icon characters.",
    },
    iconsNone: {
      title: "No icon characters",
      detail: "No symbols that would show up as junk text.",
    },
    iconsFound: {
      title: "Icon characters found",
      detail: {
        one: "We found {count} icon character, like phone or email symbols. Many systems show them as boxes or junk.",
        other:
          "We found {count} icon characters, like phone or email symbols. Many systems show them as boxes or junk.",
      },
    },
    datesNotChecked: {
      title: "Dates not checked",
      detail: "There's no readable text, so we couldn't check your dates.",
    },
    datesNone: {
      title: "No dates found",
      detail:
        "We couldn't find dates for your jobs. Many systems use them to work out your years of experience.",
    },
    datesFound: {
      title: "Dates found",
      detail: 'We found dates like "{sample}", so systems can work out your experience.',
    },
    datesMixed: {
      title: "Mixed date formats",
      detail:
        'Your dates mix styles, like "{main}" and "{other}". Some systems misread mixed formats when they add up your experience.',
    },
    datesConsistent: {
      title: "Dates look consistent",
      detail: 'Your job dates all use one style, like "{sample}".',
    },
    lengthNotChecked: {
      title: "Length not checked",
      detail: "There's no readable text, so we couldn't check the length.",
    },
    lengthShort: {
      title: "Very little text",
      detail: {
        one: "We found only {count} word. That gives hiring software little to match against a job.",
        other:
          "We found only {count} words. That gives hiring software little to match against a job.",
      },
    },
    lengthLong: {
      title: "Longer than two pages",
      detail: {
        one: "Your resume is {count} page. Recruiters skim, and many expect one or two.",
        other: "Your resume is {count} pages. Recruiters skim, and many expect one or two.",
      },
    },
    lengthGood: {
      title: "Good length",
      detail: "{pages} and {words}: enough to match jobs, short enough to skim.",
    },
    bulletsNotChecked: {
      title: "Bullets not checked",
      detail: "There's no readable text, so we couldn't check your bullet points.",
    },
    bulletsParagraphs: {
      title: "Long paragraphs in your jobs",
      detail:
        "Your job details are written as long paragraphs. Short bullet points are easier to skim and to match.",
    },
    bulletsGood: {
      title: "Easy to skim",
      detail: "No long paragraphs, so your jobs are quick to scan.",
    },
  },
  fixes: {
    scan: "Upload a PDF exported from Word or Google Docs, not a scan or photo.",
    moveEmail: "Move your email out of the page header and into the main text.",
    addEmail: "Add your email address as plain text near the top of the page.",
    movePhone: "Move your phone number out of the page header and into the main text.",
    addPhone: "Add your phone number next to your email.",
    moveContact: "Move your contact details into the main body of the page.",
    addExperience: 'If you\'ve had jobs or internships, list them under an "Experience" heading.',
    nameExperience: 'Put your jobs under a clear heading such as "Experience".',
    addSkillsAndEducation: 'Add short "Skills" and "Education" sections.',
    addSkills: 'Add a "Skills" section that lists the tools you use.',
    addEducation: 'Add an "Education" section, even if it\'s one line.',
    oneColumn: "Switch to a single-column layout.",
    noTables: "Replace tables with plain lines of text.",
    noTextBoxes: "Move the text out of the text boxes and into the main page.",
    noImages: "Remove the images, or repeat anything important as plain text.",
    noIcons: 'Swap icons for plain words like "Email" and "Phone".',
    addDates: 'Add start and end dates to each job, like "Jan 2021 - Mar 2023".',
    oneDateStyle: 'Write every date the same way, like "{main}".',
    addLines: "Add a few bullet points about what you did in each role.",
    trim: "Trim older or less relevant roles to fit two pages.",
    bullets: "Break each job into 3-5 short bullet points that start with a verb.",
  },
  units: {
    pages: { one: "{count} page", other: "{count} pages" },
    words: { one: "{count} word", other: "{count} words" },
  },
  sections: {
    summary: "Summary",
    experience: "Experience",
    projects: "Projects",
    education: "Education",
    skills: "Skills",
    certifications: "Certifications",
  },
} as const;
