// Word lists for the demo-mode keyword extractor in ./tailor-demo.ts. Kept sorted so a reviewer can
// check them quickly.

const words = (text: string): string[] => text.trim().split(/\s+/);
// Comma-separated items over several lines; lines starting with "#" are group titles.
const list = (text: string): string[] =>
  text
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .flatMap((line) => line.split(","))
    .map((item) => item.trim())
    .filter(Boolean);

// Function words plus job-post boilerplate: words that are frequent in every post and say nothing
// about this one.
export const STOPWORDS: ReadonlySet<string> = new Set(
  words(`
    a about above across after again all also am an and any are as at
    be because been before being below best between both but by
    can could did do does doing down during each either etc every
    few for from further get had has have having he her here him his how
    i if in into is it its just may me might more most much must my
    no nor not now of off on once one only or other our ours out over own
    per plus same she should so some such than that the their them then there these they this those
    through to too under until up upon us very via was we well were what when where whether which
    while who whom whose why will with within without would yet you your yours
    ability able apply applicant applicants applications based benefit benefits bonus candidate
    candidates career closely company competitive culture day days degree eligible employee
    employees employer employment ensure environment equal excellent experience experienced
    familiar familiarity fast field good great grow growing growth help high highly hire hiring
    ideal including join key knowledge level like looking make making mission new offer offering
    office opportunities opportunity paid part people perks position preferred proficiency
    proficient proven related remote required requirement requirements responsibilities
    responsible role salary skill skills solid strong success successful support team teams
    time understanding using want way week work working world year years
    better build building create creating deliver delivering drive driving faster helping helps
    improve improving large manage managing process processes provide providing small
  `),
);

// Common skills, tools and certifications across industries, written the way the demo shows them.
// Words that double as everyday English ("rails", "helm") are left out or listed below as
// EXACT_CASE_SKILLS.
export const COMMON_SKILLS: readonly string[] = list(`
  # Programming languages
  Bash, C#, C++, Dart, Elixir, Golang, Java, JavaScript, Kotlin, MATLAB, PHP, Python, Ruby, Rust,
  Scala, SQL, Swift, TypeScript,
  # Web and backend
  Angular, ASP.NET, CSS, Django, FastAPI, Flask, GraphQL, gRPC, HTML, Laravel, Microservices,
  NestJS, Next.js, Node.js, React, Redux, REST API, Spring Boot, Svelte, Tailwind, Vue,
  # Data stores and messaging
  BigQuery, Cassandra, DynamoDB, Elasticsearch, Kafka, MongoDB, MySQL, PostgreSQL, RabbitMQ,
  Redis, Snowflake, SQL Server,
  # Cloud and operations
  Ansible, AWS, Azure, CI/CD, Datadog, DevOps, Docker, Git, GitHub Actions, Google Cloud, Grafana,
  Helm, Jenkins, Kubernetes, Linux, Nginx, Prometheus, Serverless, Terraform,
  # Data analytics and AI
  A/B testing, AI, Airflow, Computer vision, Data analysis, Data modeling, Data visualization,
  dbt, Deep learning, ETL, Excel, Hadoop, LLMs, Looker, Machine learning, NLP, NumPy, Pandas,
  Power BI, PyTorch, scikit-learn, Spark, Statistics, Tableau, TensorFlow,
  # Mobile and testing
  Android, Cypress, Flutter, iOS, Jest, Playwright, React Native, Selenium, SwiftUI,
  Test automation, Unit testing,
  # Design
  Accessibility, Figma, Illustrator, InDesign, Photoshop, Prototyping, Sketch, UI design,
  User research, UX design, Wireframing,
  # Product and project work
  Agile, Asana, Confluence, Jira, Kanban, PMP, PRINCE2, Product management, Project management,
  Scrum, Stakeholder management,
  # Marketing and sales
  Account management, B2B, Cold calling, Content marketing, Copywriting, CRM, Customer service,
  Customer success, Email marketing, Google Ads, Google Analytics, HubSpot, Lead generation,
  Mailchimp, Marketing automation, Marketo, Negotiation, SaaS, Salesforce, SEM, SEO, Social media,
  Zendesk,
  # Finance and operations
  Accounting, Auditing, Bookkeeping, Budgeting, CFA, CPA, Financial analysis, Financial modeling,
  Forecasting, GAAP, IFRS, Inventory management, ITIL, Lean, Logistics, Payroll, Procurement,
  QuickBooks, SAP, Six Sigma, Supply chain, Xero,
  # Security
  Cybersecurity, ISO 27001, Network security, OWASP, Penetration testing, SIEM, SOC 2,
  # Office and people skills
  Data entry, Google Workspace, Mentoring, Microsoft Office, PowerPoint, Public speaking,
  Recruiting, Team leadership, Technical writing,
`);

// Skills that are also common English words ("you'll excel at", "a swift reply", "lean team"). In
// a job post they only count when capitalized exactly like this.
export const EXACT_CASE_SKILLS: ReadonlySet<string> = new Set(
  words("Excel Flutter Helm Lean Rust Sketch Spark Swift"),
);
