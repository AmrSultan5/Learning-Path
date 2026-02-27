export interface PathTopic {
  name: string;
  duration?: string; // e.g., "3h", "4h" for classroom sessions
  url?: string; // URL to the topic content
}

export interface LearnerFeedback {
  name: string;
  role: string;
  rating: number; // 1-5
  comment: string;
  date: string;
}

export interface LearningPathData {
  id: string;
  title: string;
  description: string;
  topics: PathTopic[];
  totalDuration: string;
  url?: string; // URL to the learning path
  learnerFeedback: LearnerFeedback[];
}

export const learningPaths: LearningPathData[] = [
  {
    id: 'data-fundamentals',
    title: 'Data Fundamentals',
    description: 'Build a strong foundation in data concepts and understanding',
    totalDuration: '2-3 hours',
    url: '#/course/data-fundamentals',
    topics: [
      { name: 'What is Data', url: '#/course/data-fundamentals/what-is-data' },
      { name: 'Features & Labels', url: '#/course/data-fundamentals/features-labels' },
      { name: 'Problems with Data', url: '#/course/data-fundamentals/problems-with-data' },
      { name: 'Data Wrangling', url: '#/course/data-fundamentals/data-wrangling' }
    ],
    learnerFeedback: [
      { 
        name: 'Sarah Martinez', 
        role: 'Commercial Manager', 
        rating: 5, 
        comment: 'Perfect starting point! I had zero knowledge about data before this course. The explanations were clear and relatable to my daily work. Now I understand what my analytics team is talking about!', 
        date: 'December 2024' 
      },
      { 
        name: 'James Wong', 
        role: 'Supply Chain Analyst', 
        rating: 5, 
        comment: 'This course demystified data concepts for me. The module on data wrangling was especially helpful - I can now clean and prepare data without always relying on IT support.', 
        date: 'November 2024' 
      },
      { 
        name: 'Emily Roberts', 
        role: 'Marketing Coordinator', 
        rating: 4, 
        comment: 'Really enjoyed the practical examples. The only thing I wish is that it was a bit longer - I wanted to dive deeper into some topics!', 
        date: 'January 2025' 
      },
      { 
        name: 'David Chen', 
        role: 'Finance Associate', 
        rating: 5, 
        comment: 'As someone from finance with no tech background, this was incredibly accessible. I can now have meaningful conversations with our data team about our reporting needs.', 
        date: 'December 2024' 
      }
    ]
  },
  {
    id: 'data-science-basics',
    title: 'Data Science Basics (Data Preparation)',
    description: 'Learn essential data preparation and SQL skills',
    totalDuration: '4-5 hours',
    url: '#/course/data-science-basics',
    topics: [
      { name: 'Data Exploration', url: '#/course/data-science-basics/data-exploration' },
      { name: 'Structuring Data', url: '#/course/data-science-basics/structuring-data' },
      { name: 'SQL', url: '#/course/data-science-basics/sql' },
      { name: 'Data Warehouses', url: '#/course/data-science-basics/data-warehouses' },
      { name: 'Data Lakes', url: '#/course/data-science-basics/data-lakes' },
      { name: 'Classroom - SQL', duration: '3h', url: '#/course/data-science-basics/classroom-sql' },
      { name: 'Classroom - Python Intro', duration: '4h', url: '#/course/data-science-basics/classroom-python-intro' },
      { name: 'Classroom - Databricks Part 1', duration: '4h', url: '#/course/data-science-basics/classroom-databricks-part-1' }
    ],
    learnerFeedback: [
      { 
        name: 'Miguel Rodriguez', 
        role: 'Operations Analyst', 
        rating: 5, 
        comment: 'The SQL classroom session was a game-changer! I went from copy-pasting queries to writing my own. The Databricks intro helped me understand our company\'s data infrastructure much better.', 
        date: 'January 2025' 
      },
      { 
        name: 'Priya Patel', 
        role: 'Business Analyst', 
        rating: 4, 
        comment: 'Solid foundation in data prep. The Python intro was challenging but rewarding. Would recommend taking Data Fundamentals first if you\'re completely new to this.', 
        date: 'December 2024' 
      },
      { 
        name: 'Tom Anderson', 
        role: 'Data Engineer', 
        rating: 5, 
        comment: 'Great coverage of data warehouses vs data lakes - this distinction is crucial. The hands-on SQL practice was excellent for building confidence.', 
        date: 'November 2024' 
      },
      { 
        name: 'Lisa Thompson', 
        role: 'Marketing Analyst', 
        rating: 4, 
        comment: 'The classroom sessions made all the difference. Being able to ask questions in real-time helped me grasp SQL concepts that seemed confusing in the self-paced modules.', 
        date: 'January 2025' 
      }
    ]
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning',
    description: 'Master machine learning concepts and techniques',
    totalDuration: '6-8 hours',
    url: '#/course/machine-learning',
    topics: [
      { name: 'History of ML', url: '#/course/machine-learning/history-of-ml' },
      { name: 'ML Models', url: '#/course/machine-learning/ml-models' },
      { name: 'Supervised & Unsupervised Learning', url: '#/course/machine-learning/supervised-unsupervised-learning' },
      { name: 'Measuring Success', url: '#/course/machine-learning/measuring-success' },
      { name: 'Splitting Data', url: '#/course/machine-learning/splitting-data' },
      { name: 'Linear Regression', url: '#/course/machine-learning/linear-regression' },
      { name: 'Decision Trees', url: '#/course/machine-learning/decision-trees' },
      { name: 'Unsupervised Methods', url: '#/course/machine-learning/unsupervised-methods' },
      { name: 'Training, Testing and Validation', url: '#/course/machine-learning/training-testing-validation' },
      { name: 'Forecasting', url: '#/course/machine-learning/forecasting' },
      { name: 'Improving Methods', url: '#/course/machine-learning/improving-methods' },
      { name: 'Classroom - Databricks Part 2 & 3', duration: '4h', url: '#/course/machine-learning/classroom-databricks-part-2-3' }
    ],
    learnerFeedback: [
      { 
        name: 'Rachel Kim', 
        role: 'Data Scientist', 
        rating: 5, 
        comment: 'Finally, ML concepts explained in a way that makes sense! The progression from supervised to unsupervised learning was logical. The Databricks sessions let us apply theory immediately - that\'s where it all clicked for me.', 
        date: 'December 2024' 
      },
      { 
        name: 'Marcus Johnson', 
        role: 'Supply Chain Manager', 
        rating: 5, 
        comment: 'I was skeptical about learning ML as a non-technical person, but this course proved me wrong. The forecasting module was directly applicable to my demand planning work. Saw immediate results!', 
        date: 'January 2025' 
      },
      { 
        name: 'Nina Patel', 
        role: 'Business Intelligence Analyst', 
        rating: 4, 
        comment: 'Comprehensive coverage of ML fundamentals. Decision trees and linear regression modules were excellent. Would love to see more real Coca-Cola use cases in future iterations.', 
        date: 'November 2024' 
      },
      { 
        name: 'Alex Rivera', 
        role: 'Operations Analyst', 
        rating: 5, 
        comment: 'This course transformed how I approach data problems. Now I can identify when ML is the right solution vs when simpler analytics would work. The validation techniques saved me from making costly mistakes.', 
        date: 'December 2024' 
      }
    ]
  },
  {
    id: 'data-visualization',
    title: 'Data Visualization',
    description: 'Create compelling visualizations and dashboards',
    totalDuration: '3-4 hours',
    url: '#/course/data-visualization',
    topics: [
      { name: 'Intro to Data Viz', url: '#/course/data-visualization/intro-to-data-viz' },
      { name: 'Tools & Methods', url: '#/course/data-visualization/tools-methods' },
      { name: 'Data Viz Standards', url: '#/course/data-visualization/data-viz-standards' },
      { name: 'Dashboard Design Matrix', url: '#/course/data-visualization/dashboard-design-matrix' },
      { name: 'Data Viz Process', url: '#/course/data-visualization/data-viz-process' },
      { name: 'Classroom - Data Viz Fundamentals', duration: '2h', url: '#/course/data-visualization/classroom-data-viz-fundamentals' },
      { name: 'Classroom - PowerBI', duration: '4h', url: '#/course/data-visualization/classroom-powerbi' }
    ],
    learnerFeedback: [
      { 
        name: 'Carolina Diaz', 
        role: 'Commercial Director', 
        rating: 5, 
        comment: 'Transformed how I present to leadership! The Dashboard Design Matrix module taught me to create visuals that tell a story. My quarterly business reviews are now more impactful and get better engagement.', 
        date: 'January 2025' 
      },
      { 
        name: 'Kevin O\'Brien', 
        role: 'Marketing Manager', 
        rating: 5, 
        comment: 'The PowerBI classroom was hands-on and immediately applicable. Within a week, I built my first dashboard tracking campaign performance. My team loves the visual insights!', 
        date: 'December 2024' 
      },
      { 
        name: 'Jasmine Lee', 
        role: 'Finance Analyst', 
        rating: 4, 
        comment: 'Excellent overview of visualization best practices. The standards module helped me avoid common mistakes. Would have liked more advanced PowerBI tips, but overall very valuable.', 
        date: 'November 2024' 
      },
      { 
        name: 'Roberto Santos', 
        role: 'Supply Chain Planner', 
        rating: 5, 
        comment: 'Game-changer for communicating complex supply chain data! Now stakeholders actually understand our capacity constraints and inventory trends. The visualization process framework is gold.', 
        date: 'January 2025' 
      }
    ]
  },
  {
    id: 'data-projects',
    title: 'Data Projects',
    description: 'Learn to manage and execute data science projects',
    totalDuration: '3-4 hours',
    url: '#/course/data-projects',
    topics: [
      { name: 'Intro to Data Science', url: '#/course/data-projects/intro-to-data-science' },
      { name: 'DS Basics, Project Lifecycle & RACI', url: '#/course/data-projects/ds-basics-lifecycle-raci' },
      { name: 'Skills & Roles', url: '#/course/data-projects/skills-roles' },
      { name: 'Tools', url: '#/course/data-projects/tools' },
      { name: 'Classroom - Scrum', duration: '8h', url: '#/course/data-projects/classroom-scrum' }
    ],
    learnerFeedback: [
      { 
        name: 'Victoria Chen', 
        role: 'Operations Manager', 
        rating: 5, 
        comment: 'The RACI matrix and project lifecycle modules were eye-opening! I\'ve been leading data projects informally, but this structured approach improved our delivery rate by 40%. The Scrum classroom was intensive but worth every minute.', 
        date: 'December 2024' 
      },
      { 
        name: 'Daniel Foster', 
        role: 'Business Analyst', 
        rating: 5, 
        comment: 'Perfect for anyone collaborating with data teams! Now I understand the different roles and can communicate requirements more effectively. My data science colleagues appreciate the structured approach.', 
        date: 'January 2025' 
      },
      { 
        name: 'Amara Johnson', 
        role: 'Project Coordinator', 
        rating: 4, 
        comment: 'Great overview of data project management. The tools module introduced me to platforms I didn\'t know existed. Would love a follow-up course on advanced agile techniques for data projects.', 
        date: 'November 2024' 
      },
      { 
        name: 'Hassan Al-Rashid', 
        role: 'Supply Chain Director', 
        rating: 5, 
        comment: 'This course bridges the gap between business and tech beautifully. The skills and roles framework helps me build better cross-functional teams. Highly recommend for anyone managing analytics initiatives.', 
        date: 'December 2024' 
      }
    ]
  },
  {
    id: 'generative-ai',
    title: 'Generative AI',
    description: 'Explore AI applications and prompt engineering',
    totalDuration: '2-3 hours',
    url: '#/course/generative-ai',
    topics: [
      { name: 'Intro to Generative AI', url: '#/course/generative-ai/intro-to-generative-ai' },
      { name: 'GenAI in Practice', url: '#/course/generative-ai/genai-in-practice' },
      { name: 'About Prompt Literacy', url: '#/course/generative-ai/about-prompt-literacy' },
      { name: 'Intro to Prompt Engineering', url: '#/course/generative-ai/intro-to-prompt-engineering' },
      { name: 'Prompt Engineering Techniques', url: '#/course/generative-ai/prompt-engineering-techniques' },
      { name: 'Pitfalls in Prompting', url: '#/course/generative-ai/pitfalls-in-prompting' },
      { name: 'Prompt for Content Creation', url: '#/course/generative-ai/prompt-for-content-creation' },
      { name: 'Prompt Engineering Conclusion', url: '#/course/generative-ai/prompt-engineering-conclusion' }
    ],
    learnerFeedback: [
      { 
        name: 'Sophia Zhang', 
        role: 'Marketing Director', 
        rating: 5, 
        comment: 'Mind-blowing! The prompt engineering techniques immediately boosted my productivity by 50%. I now use GenAI for content creation, data analysis, and even brainstorming sessions. The pitfalls module saved me from some embarrassing mistakes!', 
        date: 'January 2025' 
      },
      { 
        name: 'Michael O\'Connor', 
        role: 'Commercial Analyst', 
        rating: 5, 
        comment: 'This course demystified AI for me. The practical examples showed real business applications - from generating customer insights to automating reports. Now I\'m the go-to person in my team for AI solutions!', 
        date: 'December 2024' 
      },
      { 
        name: 'Fatima Hassan', 
        role: 'HR Business Partner', 
        rating: 4, 
        comment: 'Excellent introduction to GenAI! The content creation module was particularly useful for writing job descriptions and training materials. Would love a deeper dive into AI ethics and responsible use.', 
        date: 'November 2024' 
      },
      { 
        name: 'Lucas Silva', 
        role: 'Finance Manager', 
        rating: 5, 
        comment: 'Perfect timing for this course! I\'m now using GenAI to analyze financial trends and generate executive summaries. The prompt engineering framework is a game-changer - my outputs are so much better than generic ChatGPT responses.', 
        date: 'January 2025' 
      }
    ]
  }
];

export function getPathById(id: string): LearningPathData | undefined {
  return learningPaths.find(path => path.id === id);
}