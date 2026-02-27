import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import mailaLogo from '@/assets/e9a712672cfa9778c78d1abe8cc715fbb4f2438a.png';
import type { UserProfile } from '@/app/App';

interface ChatInterfaceProps {
  username: string;
  onComplete: (profile: UserProfile) => void;
}

interface Message {
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

const questions = [
  "Hi! I'm MAILA, your AI Learning Assistant. 👋 Let's find the perfect learning path for you. First, can you tell me about your current role or job function?",
  "Great! Now, how would you describe your current experience with Data, Analytics & AI?",
  "Perfect! What areas of Data, Analytics & AI are you most interested in exploring?",
  "Excellent choices! What are you hoping to achieve through learning?",
  "Last question - how much time can you dedicate over the next three months?"
];

export function ChatInterface({ username, onComplete }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { text: questions[0], sender: 'bot', timestamp: new Date() }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userResponses, setUserResponses] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pathId, setPathId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentQuestion]);

  // ✅ Create draft on mount
  useEffect(() => {
    const initDraft = async () => {
      try {
        const res = await fetch("http://localhost:8000/learning-paths/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username })
        });

        const data = await res.json();
        console.log("Draft created:", data);
        setPathId(data.path_id);
      } catch (error) {
        console.error("Failed to create draft:", error);
      }
    };

    initDraft();
  }, []);

  const parseResponses = (responses: string[]): UserProfile => {
    return {
      jobFunction: null,
      experienceLevel: null,
      interests: [],
      goals: [],
      responses,
      timeCommitment: 20
    };
  };

  const handleSend = async () => {
    if (!currentInput.trim()) return;

    const questionIndex = currentQuestion;

    // Add user message
    const userMessage: Message = {
      text: currentInput,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    const newResponses = [...userResponses, currentInput];
    setUserResponses(newResponses);

    // ✅ Save response to backend
    if (pathId !== null) {
      try {
        await fetch(`http://localhost:8000/learning-path/${pathId}/response`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_id: `question_${questionIndex}`,
            written_answer: currentInput
          })
        });

        console.log("Saved question:", questionIndex);
      } catch (error) {
        console.error("Save failed:", error);
      }
    }

    setCurrentInput('');
    setIsTyping(true);

    setTimeout(async () => {
      setIsTyping(false);

      if (currentQuestion < questions.length - 1) {
        const nextQuestion = currentQuestion + 1;
        setMessages(prev => [
          ...prev,
          { text: questions[nextQuestion], sender: 'bot', timestamp: new Date() }
        ]);
        setCurrentQuestion(nextQuestion);
      } else {
        // ✅ Final question — complete learning path
        setMessages(prev => [
          ...prev,
          {
            text: "Perfect! Preparing your personalized learning path... 🎯",
            sender: 'bot',
            timestamp: new Date()
          }
        ]);

        if (pathId !== null) {
          try {
            const res = await fetch(
              `http://localhost:8000/learning-path/${pathId}/complete`,
              { method: "POST" }
            );

            const result = await res.json();
            console.log("Completed:", result);
          } catch (error) {
            console.error("Complete failed:", error);
          }
        }

        const profile = parseResponses(newResponses);
        setTimeout(() => {
          onComplete(profile);
        }, 1500);
      }
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[700px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-[#F40009] text-white p-6 flex items-center gap-3">
          <img src={mailaLogo} alt="MAILA" className="h-10" />
          <div>
            <h2 className="text-xl">Learning Assistant</h2>
            <p className="text-sm text-white/80">Here to help you find your path</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  message.sender === 'bot' ? 'bg-[#F40009]' : 'bg-gray-300'
                }`}
              >
                {message.sender === 'bot' ? (
                  <Bot className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div
                className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                  message.sender === 'bot'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-[#F40009] text-white'
                }`}
              >
                <p>{message.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer here..."
              disabled={isTyping}
              className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-full focus:outline-none focus:border-[#F40009]"
            />
            <button
              onClick={handleSend}
              disabled={!currentInput.trim() || isTyping}
              className="w-12 h-12 bg-[#F40009] text-white rounded-full flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}