import { INK, MUTED, RULE, defineTheme } from "../theme";

// Helvetica for reading, Courier for the things an engineer scans for: headings, links and skills.
// Web links are ink, not gray, so a recruiter finds the GitHub profile at a glance.
export const developer = defineTheme({
  styles: {
    page: { fontSize: 9.75 },
    name: { fontSize: 21 },
    headline: { marginTop: 3, fontFamily: "Courier", fontSize: 10.5, color: MUTED },
    webLink: { fontFamily: "Courier", color: INK, textDecoration: "none" },
    section: { marginTop: 13 },
    sectionTitle: {
      marginBottom: 6,
      paddingBottom: 2,
      borderBottomWidth: 0.5,
      borderBottomColor: RULE,
      fontFamily: "Courier",
      fontSize: 10.5,
      letterSpacing: 0,
    },
    entry: { marginTop: 7 },
    entryTitle: { fontSize: 10.25 },
    skillItems: { fontFamily: "Courier", fontSize: 9.25 },
  },
});
