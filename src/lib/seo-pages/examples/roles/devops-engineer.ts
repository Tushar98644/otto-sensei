import type { RoleExample } from "../types";

export const devopsEngineer = {
  slug: "devops-engineer",
  role: "DevOps engineer",
  occupation: "15-1299.08",
  titles: [
    "DevOps Engineer",
    "Site Reliability Engineer",
    "Cloud Engineer",
    "Infrastructure Engineer",
  ],
  updated: "2026-11-24",
  card: "Deploys, recovery time and cloud cost, the numbers on-call teams live by.",
  description:
    "A DevOps engineer resume example with Kubernetes, Terraform and CI/CD lines that show deploy speed, uptime and cloud cost, plus skills and common mistakes.",
  intro:
    "DevOps is judged by what stops happening: failed deploys, long outages, surprise cloud bills. A resume has to turn that quiet into numbers, like how often teams ship, how fast they recover and what the platform costs. This example shows each one.",
  person:
    "Sofia is made up: a DevOps engineer with 5 years in healthcare software and online retail, based in Salt Lake City, Utah. Names, companies and numbers are invented.",
  resume: {
    title: "DevOps engineer resume",
    template: "minimal",
    basics: {
      name: "Sofia Ramirez",
      headline: "DevOps Engineer",
      email: "sofia.ramirez@example.com",
      phone: "+1 801 555 0137",
      location: "Salt Lake City, UT",
      links: [{ label: "GitHub", url: "github.example.com/sofia-ramirez" }],
    },
    summary:
      "DevOps engineer with 5 years running AWS and Kubernetes platforms for product teams. Builds pipelines and infrastructure as code so teams ship daily and recover from incidents in minutes.",
    experience: [
      {
        company: "Clearpath Health",
        title: "DevOps Engineer",
        location: "Salt Lake City, UT",
        startDate: "Apr 2023",
        endDate: "Present",
        bullets: [
          "Moved 45 services from hand-built EC2 servers to Kubernetes with Helm, raising deploys from 3 a week to 20 a day.",
          "Wrote Terraform modules for networks, databases and clusters that 9 product teams now use, cutting new environment setup from 2 weeks to 1 day.",
          "Set up Prometheus and Grafana alerts tied to service-level objectives, lowering mean time to recovery from 75 minutes to 18.",
          "Cut the AWS bill by $38,000 a month by moving batch jobs to spot instances and deleting 600 unused volumes.",
        ],
      },
      {
        company: "Summit Trail Goods",
        title: "Cloud Engineer",
        location: "Provo, UT",
        startDate: "Jun 2021",
        endDate: "Mar 2023",
        bullets: [
          "Built a GitHub Actions pipeline with automated tests and one-click rollbacks, lowering failed releases from 1 in 8 to 1 in 40.",
          "Wrote Ansible playbooks that patched 300 Linux servers in one night instead of across 2 weekends.",
          "Ran 4 disaster recovery drills a year, bringing database restore time from 6 hours to 45 minutes.",
        ],
      },
    ],
    education: [
      {
        school: "Bonneville Technical University",
        degree: "B.S.",
        field: "Computer Engineering",
        startDate: "2017",
        endDate: "2021",
      },
    ],
    skills: [
      { label: "Cloud", items: ["AWS", "Terraform", "Kubernetes", "Helm", "Docker"] },
      {
        label: "Delivery and monitoring",
        items: ["GitHub Actions", "Jenkins", "Prometheus", "Grafana", "Datadog"],
      },
      { label: "Scripting", items: ["Python", "Bash", "Go", "Linux"] },
    ],
    certifications: [
      {
        name: "Certified Kubernetes Administrator (CKA)",
        issuer: "The Linux Foundation",
        date: "2024",
      },
    ],
  },
  lines: [
    {
      weak: "Was involved in moving services to Kubernetes.",
      strong:
        "Moved 45 services from hand-built EC2 servers to Kubernetes with Helm, raising deploys from 3 a week to 20 a day.",
    },
    {
      weak: "Handled monitoring and on-call for production.",
      strong:
        "Set up Prometheus and Grafana alerts tied to service-level objectives, lowering mean time to recovery from 75 minutes to 18.",
    },
    {
      weak: "Responsible for the release pipeline.",
      strong:
        "Built a GitHub Actions pipeline with automated tests and one-click rollbacks, lowering failed releases from 1 in 8 to 1 in 40.",
    },
  ],
  skills: [
    {
      label: "Cloud and infrastructure",
      items: ["AWS", "Azure", "Google Cloud", "Terraform", "Ansible", "Pulumi"],
    },
    {
      label: "Containers and delivery",
      items: ["Docker", "Kubernetes", "Helm", "CI/CD", "GitHub Actions", "Jenkins"],
    },
    {
      label: "Monitoring and scripting",
      items: ["Prometheus", "Grafana", "Datadog", "Linux", "Bash", "Python"],
    },
  ],
  tips: [
    {
      title: "Use the four delivery numbers",
      text: "How often you deploy, how long a change takes to reach production, how many releases fail, and how fast you recover. Engineering leaders track these, so one of them in a line reads as fluent.",
    },
    {
      title: "Count the teams you unblocked",
      text: "Platform work is done for other engineers. Say how many teams or services use what you built, and how much waiting it took out of their week.",
    },
    {
      title: "Put a dollar figure on cloud savings",
      text: "A monthly or yearly saving in dollars is a line both finance and engineering read. Name what you changed to get it, such as spot instances, rightsizing or storage tiers.",
    },
  ],
  mistakes: [
    {
      title: "A wall of certification badges",
      text: "Six cloud badges above your work push the proof down the page. Keep the one or two the post asks for and let your lines show the rest.",
    },
    {
      title: "No incident in sight",
      text: "Nearly every DevOps interview asks about an outage. A line on recovery time, a postmortem fix or a drill you ran shows you have carried the pager, not only written YAML.",
    },
    {
      title: "The tool changed, but what improved?",
      text: "“Implemented Kubernetes” says what you installed, not what got better. Add the deploy count, recovery time or cost from before and after.",
    },
  ],
  faq: [
    {
      question: "What should a DevOps engineer resume include?",
      answer:
        "The clouds and tools you run, the platforms you built, and numbers for deploy frequency, uptime, recovery time or cost. Add the teams that relied on your work and one or two current certifications.",
    },
    {
      question: "Is a DevOps engineer the same as a site reliability engineer?",
      answer:
        "The work overlaps a lot, and Otto's job matching files both titles under the same kind of job. Use the title from the post in your headline, and lead with uptime and recovery lines for SRE roles and delivery lines for DevOps roles.",
    },
    {
      question: "How do I move into DevOps from system administration?",
      answer:
        "Show the automation in your current job: scripts that replaced manual steps, servers you patched with Ansible, a pipeline you set up. Those lines read as DevOps work whatever your title was.",
    },
  ],
  related: ["backend-developer", "software-engineer", "data-engineer"],
} as const satisfies RoleExample;
