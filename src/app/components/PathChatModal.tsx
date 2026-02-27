import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User } from 'lucide-react';
import cocaColaHBCLogo from '@/assets/59218e6eca964424a8f051f5c7fe905235198f2c.png';
import type { LearningPathData } from '@/app/data/learningPaths';
import { useSound } from '@/utils/sounds';

interface PathChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  learningPath: LearningPathData;
}

export function PathChatModal({ isOpen, onClose, learningPath }: PathChatModalProps) {
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'bot' | 'user' }>>([
    { 
      text: `Hi! I'm Hellen+. I can help you learn more about the ${learningPath.title} course. Feel free to ask me anything about the topics, duration, prerequisites, or learner feedback! 💡`, 
      sender: 'bot' 
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playTyping, playClick } = useSound();

  useEffect(() => {
    if (isOpen && learningPath) {
      // Initialize with greeting message
      setMessages([
        {
          text: `Hi! I'm Hellen+. I can help you learn more about the ${learningPath.title} course. Feel free to ask me anything about the topics, duration, prerequisites, or learner feedback! 💡`, 
          sender: 'bot' 
        }
      ]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, learningPath]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateBotResponse = (userMessage: string): string => {
    if (!learningPath) return '';
    
    const lowerMessage = userMessage.toLowerCase();

    // Random Forest explanation (for Machine Learning course)
    if ((lowerMessage.includes('random forest') || lowerMessage.includes('random tree')) && (lowerMessage.includes('confus') || lowerMessage.includes('understand') || lowerMessage.includes('explain') || lowerMessage.includes('metaphor') || lowerMessage.includes('layman') || lowerMessage.includes('help'))) {
      return `Great question! Let me explain Random Forest with a simple metaphor 🌳\n\nImagine you're trying to decide which movie to watch. Instead of asking just ONE friend (who might have biased taste), you ask 100 different friends. Each friend makes their recommendation based on different factors they care about - some focus on the director, others on genre, actors, reviews, etc.\n\nThen you take a "vote" - if 70 friends say "Action movie" and 30 say "Comedy", you go with Action.\n\nThat's exactly how Random Forest works:\n• Each "friend" = one Decision Tree\n• Each tree looks at the data slightly differently (random features)\n• All trees make their predictions independently\n• The final answer = majority vote from all trees\n\nWhy is this better than one tree?\n✓ More robust - one biased "friend" won't throw off the whole decision\n✓ More accurate - combining many perspectives reduces errors\n✓ Less overfitting - if one tree memorizes the training data, others balance it out\n\nNeed more clarification on any specific aspect?`;
    }

    // Learner feedback / Reviews / What others say (CHECK THIS FIRST!)
    if (lowerMessage.includes('feedback') || lowerMessage.includes('review') || lowerMessage.includes('rating') || lowerMessage.includes('other learner') || lowerMessage.includes('what do') || lowerMessage.includes('how is') || lowerMessage.includes('what others') || lowerMessage.includes('people say') || lowerMessage.includes('learner') && (lowerMessage.includes('think') || lowerMessage.includes('say'))) {
      if (learningPath.learnerFeedback && learningPath.learnerFeedback.length > 0) {
        const avgRating = (learningPath.learnerFeedback.reduce((sum, f) => sum + f.rating, 0) / learningPath.learnerFeedback.length).toFixed(1);
        const feedbackSummary = learningPath.learnerFeedback
          .map(f => `⭐ ${f.rating}/5 - ${f.name} (${f.role}), ${f.date}\n"${f.comment}"`)
          .join('\n\n');
        
        return `"${learningPath.title}" has an average rating of ${avgRating}/5 stars! Here's what learners are saying:\n\n${feedbackSummary}`;
      } else {
        return 'We\'re collecting feedback from learners. Check back soon for reviews and ratings!';
      }
    }

    // Summary/Overview
    if (lowerMessage.includes('summary') || lowerMessage.includes('overview') || lowerMessage.includes('about')) {
      return `${learningPath.title}: ${learningPath.description}\n\nThis learning path covers ${learningPath.topics.length} key topics and takes ${learningPath.totalDuration} to complete.`;
    }

    // Duration/Time
    if (lowerMessage.includes('duration') || lowerMessage.includes('long') || lowerMessage.includes('time') || lowerMessage.includes('hours')) {
      const sessionsWithDuration = learningPath.topics.filter(t => t.duration).length;
      const totalSessions = learningPath.topics.length;
      return `The "${learningPath.title}" path takes ${learningPath.totalDuration} in total. It includes ${sessionsWithDuration} classroom sessions (each 2 hours) and ${totalSessions - sessionsWithDuration} self-paced modules that you can complete at your own pace.`;
    }

    // Topics/Curriculum (make 'learn' more specific to avoid matching 'learner')
    if (lowerMessage.includes('topic') || lowerMessage.includes('cover') || lowerMessage.includes('curriculum') || lowerMessage.includes('teach') || (lowerMessage.includes('learn') && !lowerMessage.includes('learner'))) {
      const topicsList = learningPath.topics
        .map((topic, index) => `${index + 1}. ${topic.name}${topic.duration ? ' (Classroom Session - ' + topic.duration + ')' : ' (Self-paced)'}`)
        .join('\n');
      return `The "${learningPath.title}" path covers these topics:\n\n${topicsList}`;
    }

    // Skills
    if (lowerMessage.includes('skill') || lowerMessage.includes('what will i') || lowerMessage.includes('what can i')) {
      const topicsList = learningPath.topics.map(t => t.name).join(', ');
      return `By completing "${learningPath.title}", you'll gain skills in: ${topicsList}. These skills will help you ${learningPath.description.toLowerCase()}.`;
    }

    // Prerequisites
    if (lowerMessage.includes('prerequisite') || lowerMessage.includes('requirement') || lowerMessage.includes('need to know') || lowerMessage.includes('before')) {
      if (learningPath.id === 'data-fundamentals') {
        return 'No prerequisites! This is designed for complete beginners. All you need is curiosity and willingness to learn.';
      } else if (learningPath.id === 'data-science-basics') {
        return 'Basic understanding of data concepts is helpful. If you\'re new to data, I recommend starting with "Data Fundamentals" first.';
      } else if (learningPath.id === 'machine-learning' || learningPath.id === 'generative-ai') {
        return 'You should have foundational knowledge of data and statistics. Completing "Data Fundamentals" and "Data Science Basics" first is recommended.';
      } else {
        return 'Basic familiarity with data concepts would be helpful, though we\'ll guide you through the essentials.';
      }
    }

    // Classroom sessions
    if (lowerMessage.includes('classroom') || lowerMessage.includes('session') || lowerMessage.includes('live') || lowerMessage.includes('instructor')) {
      const classroomSessions = learningPath.topics.filter(t => t.duration);
      if (classroomSessions.length > 0) {
        const sessionList = classroomSessions.map((s, i) => `${i + 1}. ${s.name} (${s.duration})`).join('\n');
        return `This path includes ${classroomSessions.length} live classroom sessions:\n\n${sessionList}\n\nThese are instructor-led sessions where you can ask questions and interact with peers.`;
      } else {
        return 'This learning path is entirely self-paced with no live classroom sessions. You can complete it at your own schedule!';
      }
    }

    // Who is it for
    if (lowerMessage.includes('who is') || lowerMessage.includes('for me') || lowerMessage.includes('suitable') || lowerMessage.includes('right for')) {
      if (learningPath.id === 'data-fundamentals') {
        return 'This path is perfect for absolute beginners who are new to Data, Analytics & AI. Great for anyone wanting to build a strong foundation!';
      } else if (learningPath.id === 'data-visualization') {
        return 'Ideal for professionals in commercial, marketing, or finance roles who need to create compelling data visualizations and dashboards.';
      } else if (learningPath.id === 'machine-learning') {
        return 'Best suited for those with data fundamentals who want to dive into predictive modeling and machine learning algorithms.';
      } else if (learningPath.id === 'generative-ai') {
        return 'Perfect for learners interested in cutting-edge AI technologies like ChatGPT, image generation, and large language models.';
      } else if (learningPath.id === 'data-projects') {
        return 'Designed for those who want to lead or contribute to data projects, especially in operations and cross-functional teams.';
      } else {
        return 'This path is great for anyone looking to build practical data skills and advance their analytics capabilities.';
      }
    }

    // Next steps / After completion
    if (lowerMessage.includes('next') || lowerMessage.includes('after') || lowerMessage.includes('then') || lowerMessage.includes('follow')) {
      if (learningPath.id === 'data-fundamentals') {
        return 'After completing this, I recommend "Data Science Basics" or "Data Visualization" depending on your interests - data prep/SQL or creating dashboards!';
      } else if (learningPath.id === 'data-science-basics') {
        return 'Great next steps would be "Machine Learning" if you want predictive analytics, or "Data Visualization" if you want to focus on storytelling with data.';
      } else {
        return 'After this path, you could explore other specialized areas like Generative AI, or dive deeper into Data Projects to apply your skills in real-world scenarios.';
      }
    }

    // Default response
    return `I can help you with questions about:\n\n• Course summary and overview\n• Duration and time commitment\n• Topics and curriculum covered\n• Skills you'll learn\n• Prerequisites needed\n• Classroom sessions vs self-paced content\n• Who this path is for\n• Next steps after completion\n• Learner feedback and reviews\n\nWhat would you like to know about "${learningPath.title}"?`;
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: { text: string; sender: 'user' } = {
      text: input,
      sender: 'user'
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    playTyping();

    // Simulate bot typing and response
    setTimeout(() => {
      const botResponse = generateBotResponse(input);
      const botMessage: { text: string; sender: 'bot' } = {
        text: botResponse,
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMessage]);
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#F40009] text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6" />
            <div>
              <h3 className="text-lg">Chat with Hellen+</h3>
              <p className="text-xs text-white/80">{learningPath.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img src={cocaColaHBCLogo} alt="Coca-Cola HBC" className="h-7" />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'bot' ? 'bg-[#F40009]' : 'bg-gray-300'
                }`}
              >
                {message.sender === 'bot' ? (
                  <Bot className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  message.sender === 'bot'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'bg-[#F40009] text-white'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
                  playTyping();
                }
              }}
              onKeyPress={handleKeyPress}
              placeholder="Ask about this learning path..."
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-full focus:outline-none focus:border-[#F40009] disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
            />
            <button
              onClick={() => {
                playClick();
                handleSendMessage();
              }}
              disabled={!input.trim()}
              className="w-11 h-11 bg-[#F40009] text-white rounded-full flex items-center justify-center hover:bg-[#DC0012] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}