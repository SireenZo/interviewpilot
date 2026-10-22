import type { InterviewSetup, Lang } from "./types";

export const SAMPLE_CV = `Lina Haddad, Junior Software Engineer, Beirut, Lebanon

EDUCATION
B.S. Computer Science, Lebanese International University, 2025. GPA 3.6/4.0

EXPERIENCE
Software Engineering Intern, Cedar Tech (Jun 2024 – Sep 2024)
- Built reusable React components for the company website.
- Diagnosed and fixed bugs in the internal admin dashboard.
- Took part in code reviews and wrote tests.

Freelance Web Developer (2023 – present)
- Built an appointment booking system for a Beirut clinic (Node.js REST API + MongoDB).
- Delivered websites for 6 small businesses.

PROJECTS
- Campus Marketplace: a web app where LIU students buy and sell used books (React, Firebase).

SKILLS
JavaScript, TypeScript (learning), React, Node.js, MongoDB, Python, Git, Firebase
Languages: Arabic (native), English (fluent), French (intermediate)`;

export const SAMPLE_JOB = `Frontend Engineer (React / TypeScript), Remote, MENA

We're a fast-growing fintech building payment tools for SMEs across the Middle East.

Requirements
- 1–3 years of experience building production web apps with React
- Strong TypeScript skills
- Experience with Next.js and server-side rendering
- Comfortable writing unit and integration tests
- Familiarity with REST APIs and state management
- Excellent communication in English; Arabic is a plus`;

/** Scripted interviewer used when no API key is configured, so the voice loop can be tried for free. */
const SCRIPT: Record<Lang, (name: string) => string[]> = {
  en: (name) => [
    `Hi ${name}, welcome, and thanks for joining. I'm Maya, and I'll be interviewing you today for the Frontend Engineer role. To start, could you walk me through a project you're most proud of and what you personally built?`,
    "Thanks, that gives me a good picture. Let's go deeper on the technical side. How would you structure state in a React app that shows live payment data to many users at once?",
    "Interesting approach. Now a situational one: a customer reports that a payment page is slow on their phone. What steps would you take to find and fix the problem?",
    "Good, I like that you started by measuring. Tell me about a time you disagreed with a teammate during a code review. What happened, and how did you resolve it?",
    "That's a mature way to handle it. Last question: why this role, and what would you want to learn in your first three months with us?",
  ],
  ar: (name) => [
    `أهلاً ${name}، وشكراً لانضمامك. أنا مايا، وسأجري معك المقابلة اليوم لوظيفة مهندس واجهات أمامية. لنبدأ: حدثني عن مشروع تفتخر به وما الذي بنيته فيه بنفسك؟`,
    "شكراً، هذا يعطيني صورة جيدة. لننتقل إلى الجانب التقني. كيف ستنظم الحالة في تطبيق React يعرض بيانات دفع مباشرة لعدد كبير من المستخدمين؟",
    "نهج مثير للاهتمام. سؤال عملي الآن: عميل يشتكي من بطء صفحة الدفع على هاتفه. ما الخطوات التي ستتبعها لإيجاد المشكلة وحلها؟",
    "جيد، يعجبني أنك بدأت بالقياس. حدثني عن موقف اختلفت فيه مع زميل أثناء مراجعة الكود. ماذا حدث وكيف حللتما الخلاف؟",
    "هذه طريقة ناضجة في التعامل. السؤال الأخير: لماذا هذه الوظيفة، وماذا تريد أن تتعلم في أشهرك الثلاثة الأولى معنا؟",
  ],
};

const CLOSING: Record<Lang, (name: string) => string> = {
  en: (name) => `Thank you, ${name}, that was a great conversation. That's the end of our interview. Your scorecard is being prepared now.`,
  ar: (name) => `شكراً لك يا ${name}، كانت محادثة رائعة. انتهت مقابلتنا، ويتم الآن تجهيز تقييمك.`,
};

export function demoTurn(setup: InterviewSetup, interviewerTurnsSoFar: number, closing: boolean) {
  const name = setup.candidateName.trim() || (setup.language === "ar" ? "صديقي" : "there");
  if (closing) return CLOSING[setup.language](name);
  const script = SCRIPT[setup.language](name);
  return script[Math.min(interviewerTurnsSoFar, script.length - 1)];
}
