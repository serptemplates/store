/**
 * Education Q&A Schema for Google Rich Results
 * Implements QAPage schema for educational content
 * Different from FAQ - this is for community Q&A style content
 */

export interface EducationQAOptions {
  question: string;
  questionAuthor?: string;
  questionDate?: string;
  upvoteCount?: number;
  answers: Array<{
    text: string;
    author?: string;
    date?: string;
    upvoteCount?: number;
    isBestAnswer?: boolean;
    url?: string;
  }>;
  url: string;
  dateCreated?: string;
  keywords?: string[];
}

/**
 * Generate Education Q&A schema (QAPage)
 * Used for tutorial Q&As, how-to questions, educational content
 */
export function generateEducationQASchema({
  question,
  questionAuthor = 'User',
  questionDate = new Date().toISOString(),
  upvoteCount = 0,
  answers,
  url,
  dateCreated = new Date().toISOString(),
  keywords = [],
}: EducationQAOptions) {
  // Sort answers to put best answer first
  const sortedAnswers = [...answers].sort((a, b) => {
    if (a.isBestAnswer) return -1;
    if (b.isBestAnswer) return 1;
    return (b.upvoteCount || 0) - (a.upvoteCount || 0);
  });

  // Get the accepted/best answer
  const acceptedAnswer = sortedAnswers.find(a => a.isBestAnswer) || sortedAnswers[0];

  // Get suggested answers (all other answers)
  const suggestedAnswers = sortedAnswers.filter(a => a !== acceptedAnswer);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    name: question,
    url: url,
    dateCreated: dateCreated,
    ...(keywords.length > 0 && { keywords: keywords.join(', ') }),
    mainEntity: {
      '@type': 'Question',
      name: question,
      text: question,
      answerCount: answers.length,
      upvoteCount: upvoteCount,
      dateCreated: questionDate,
      author: {
        '@type': 'Person',
        name: questionAuthor,
      },
      // Accepted answer (best or first answer)
      acceptedAnswer: {
        '@type': 'Answer',
        text: acceptedAnswer.text,
        upvoteCount: acceptedAnswer.upvoteCount || 0,
        dateCreated: acceptedAnswer.date || new Date().toISOString(),
        url: acceptedAnswer.url || url,
        author: {
          '@type': 'Person',
          name: acceptedAnswer.author || 'Expert',
        },
      },
      // Additional suggested answers
      ...(suggestedAnswers.length > 0 && {
        suggestedAnswer: suggestedAnswers.map(answer => ({
          '@type': 'Answer',
          text: answer.text,
          upvoteCount: answer.upvoteCount || 0,
          dateCreated: answer.date || new Date().toISOString(),
          url: answer.url || url,
          author: {
            '@type': 'Person',
            name: answer.author || 'Community Member',
          },
        })),
      }),
    },
  };

  return schema;
}

/**
 * Generate Learning Resource schema for educational content
 * Complements Education Q&A for tutorial/course content
 */
export function generateLearningResourceSchema({
  name,
  description,
  educationalLevel,
  learningResourceType,
  teaches,
  timeRequired,
  prerequisites,
  url,
  author,
  datePublished,
}: {
  name: string;
  description: string;
  educationalLevel?: string; // e.g., "Beginner", "Intermediate", "Advanced"
  learningResourceType?: string; // e.g., "Tutorial", "How-to", "Course"
  teaches?: string[]; // Skills or concepts taught
  timeRequired?: string; // ISO 8601 duration format, e.g., "PT30M"
  prerequisites?: string[];
  url: string;
  author?: string;
  datePublished?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: name,
    description: description,
    url: url,
    ...(educationalLevel && { educationalLevel }),
    ...(learningResourceType && { learningResourceType }),
    ...(teaches && teaches.length > 0 && {
      teaches: teaches.map(skill => ({
        '@type': 'DefinedTerm',
        name: skill,
      }))
    }),
    ...(timeRequired && { timeRequired }),
    ...(prerequisites && prerequisites.length > 0 && {
      educationalAlignment: prerequisites.map(prereq => ({
        '@type': 'AlignmentObject',
        alignmentType: 'requires',
        targetName: prereq,
      }))
    }),
    author: {
      '@type': 'Organization',
      name: author || 'SERP Apps',
    },
    datePublished: datePublished || new Date().toISOString(),
    publisher: {
      '@type': 'Organization',
      name: 'SERP Apps',
    },
  };
}

/**
 * Generate Course schema for structured educational content
 */
export function generateCourseSchema({
  name,
  description,
  provider,
  url,
  courseCode,
  coursePrerequisites,
  educationalCredentialAwarded,
  hasCourseInstance,
}: {
  name: string;
  description: string;
  provider?: string;
  url: string;
  courseCode?: string;
  coursePrerequisites?: string[];
  educationalCredentialAwarded?: string;
  hasCourseInstance?: {
    startDate: string;
    endDate: string;
    location?: string;
    instructor?: string;
  };
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: name,
    description: description,
    url: url,
    ...(courseCode && { courseCode }),
    ...(coursePrerequisites && coursePrerequisites.length > 0 && {
      coursePrerequisites: coursePrerequisites.join(', '),
    }),
    ...(educationalCredentialAwarded && { educationalCredentialAwarded }),
    provider: {
      '@type': 'Organization',
      name: provider || 'SERP Apps',
      sameAs: 'https://apps.serp.co',
    },
    ...(hasCourseInstance && {
      hasCourseInstance: {
        '@type': 'CourseInstance',
        startDate: hasCourseInstance.startDate,
        endDate: hasCourseInstance.endDate,
        ...(hasCourseInstance.location && {
          location: {
            '@type': 'Place',
            name: hasCourseInstance.location,
          },
        }),
        ...(hasCourseInstance.instructor && {
          instructor: {
            '@type': 'Person',
            name: hasCourseInstance.instructor,
          },
        }),
      },
    }),
  };
}

/**
 * Example usage for a product tutorial Q&A
 */
export const exampleEducationQA = {
  question: 'How do I set up automated downloads with this tool?',
  questionAuthor: 'John User',
  questionDate: '2024-01-15T10:00:00Z',
  upvoteCount: 25,
  answers: [
    {
      text: 'To set up automated downloads: 1) Navigate to Settings, 2) Enable Auto-Download, 3) Configure your schedule, 4) Select target folders. The tool will then automatically download content based on your preferences.',
      author: 'Support Team',
      date: '2024-01-15T11:00:00Z',
      upvoteCount: 42,
      isBestAnswer: true,
    },
    {
      text: 'You can also use the API for more advanced automation. Check the documentation for API endpoints.',
      author: 'Developer',
      date: '2024-01-15T12:00:00Z',
      upvoteCount: 15,
    },
  ],
  url: 'https://apps.serp.co/support/how-to-automate-downloads',
  keywords: ['automation', 'downloads', 'tutorial', 'setup'],
};