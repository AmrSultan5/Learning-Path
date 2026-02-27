import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageCircle, ArrowLeft } from 'lucide-react';
import hellenLogo from '@/assets/a1c07c8833c1385f9acba9acb24b2ea7df9be827.png';
import cocaColaHBCLogo from '@/assets/59218e6eca964424a8f051f5c7fe905235198f2c.png';
import type { UserProfile, JobFunction, ExperienceLevel, InterestArea } from '@/app/App';
import { useSound } from '@/utils/sounds';
import { Briefcase, Package, Megaphone, DollarSign, Settings, Users as UsersIcon } from 'lucide-react';
import { Sprout, TrendingUp, Award } from 'lucide-react';
import { BarChart3, Calculator, Brain, Database, PieChart } from 'lucide-react';
import { Target, Lightbulb, Users as UsersGoalIcon, Rocket, Clock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;

interface HybridChatInterfaceProps {
  username: string;
  onComplete: (
    profile: UserProfile,
    pathId: number,
    aiSummary: any
  ) => void;
}

interface Message {
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

const jobFunctions: { value: JobFunction; label: string; icon: React.ComponentType<any> }[] = [
  { value: 'commercial', label: 'Commercial', icon: Briefcase },
  { value: 'supply-chain', label: 'Supply Chain', icon: Package },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
  { value: 'finance', label: 'Finance', icon: DollarSign },
  { value: 'operations', label: 'Operations', icon: Settings },
  { value: 'hr', label: 'Human Resources', icon: UsersIcon },
];

const experienceLevels: { value: ExperienceLevel; label: string; description: string; icon: React.ComponentType<any> }[] = [
  { value: 'beginner', label: 'Beginner', description: 'New to Data, Analytics & AI', icon: Sprout },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience with data tools', icon: TrendingUp },
  { value: 'advanced', label: 'Advanced', description: 'Strong technical skills', icon: Award },
];

const interestAreas: { value: InterestArea; label: string; description: string; icon: React.ComponentType<any> }[] = [
  { value: 'visualization', label: 'Data Visualization', description: 'Creating dashboards and visual reports', icon: PieChart },
  { value: 'statistics', label: 'Statistics & Analysis', description: 'Statistical methods and data analysis', icon: Calculator },
  { value: 'ml-ai', label: 'Machine Learning & AI', description: 'Predictive models and AI applications', icon: Brain },
  { value: 'data-engineering', label: 'Data Engineering', description: 'Building data pipelines and infrastructure', icon: Database },
  { value: 'business-intelligence', label: 'Business Intelligence', description: 'Strategic insights and decision support', icon: BarChart3 },
];

const goalOptions: { value: string; label: string; icon: React.ComponentType<any> }[] = [
  { value: 'skill-development', label: 'Develop new technical skills', icon: Target },
  { value: 'decision-making', label: 'Make better data-driven decisions', icon: Lightbulb },
  { value: 'team-collaboration', label: 'Collaborate better with data teams', icon: UsersGoalIcon },
  { value: 'career-advancement', label: 'Advance my career in analytics', icon: Rocket },
];

const timeOptions: { value: number; label: string }[] = [
  { value: 10, label: '10-20 hours' },
  { value: 30, label: '30-40 hours' },
  { value: 50, label: '50-60 hours' },
  { value: 75, label: '75+ hours' },
];

const questions = [
  "Hi! I'm Hellen+, your AI Learning Assistant. 👋 Let's find the perfect learning path for you. First, what's your job function?",
  "Great! Now, what's your current experience level with Data, Analytics & AI?",
  "Perfect! What areas are you most interested in exploring? (You can select multiple)",
  "Excellent! What are your main learning goals? (You can select multiple)",
  "Last question - how much time can you dedicate over the next three months?"
];

export function HybridChatInterface({ username, onComplete }: HybridChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { text: questions[0], sender: 'bot', timestamp: new Date() }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [waitingForFollowUp, setWaitingForFollowUp] = useState(false);
  
  // Profile state
  const [selectedJobFunction, setSelectedJobFunction] = useState<JobFunction | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<ExperienceLevel | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<InterestArea[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [userResponses, setUserResponses] = useState<string[]>([]);
  const [pathId, setPathId] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Sound effects
  const { playTyping, playClick } = useSound();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (showCustomInput) {
      inputRef.current?.focus();
    }
  }, [showCustomInput]);

  useEffect(() => {
    const createDraft = async () => {
      try {
        const res = await fetch("${API_BASE}/learning-paths/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username })
        });

        const data = await res.json();
        console.log("Draft created:", data);
        setPathId(data.path_id);
      } catch (err) {
        console.error("Failed to create draft", err);
      }
    };

    if (username && pathId === null) {
      createDraft();
    }
  }, [username, pathId]);

  const saveResponse = async (
    writtenAnswer?: string,
    selectedOption?: string | string[]
  ) => {
    if (pathId === null) return;

    const body: any = {
      question_id: `question_${currentQuestion}`,
    };

    if (writtenAnswer !== undefined) {
      body.written_answer = writtenAnswer;
    }

    if (selectedOption !== undefined) {
      body.selected_option = Array.isArray(selectedOption)
        ? selectedOption.join(",")
        : String(selectedOption);
    }

    await fetch(`${API_BASE}/learning-path/${pathId}/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  };

  const addUserMessage = async (text: string) => {
    const userMessage: Message = {
      text,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setUserResponses(prev => [...prev, text]);
  };

  const moveToNextQuestion = () => {
    setIsTyping(true);
    setShowCustomInput(false);
    setWaitingForFollowUp(false);
    
    setTimeout(() => {
      setIsTyping(false);
      
      if (currentQuestion < questions.length - 1) {
        const nextQuestion = currentQuestion + 1;
        const botMessage: Message = {
          text: questions[nextQuestion],
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setCurrentQuestion(nextQuestion);
      } else {
        if (pathId !== null) {
          const profile: UserProfile = {
            jobFunction: selectedJobFunction,
            experienceLevel: selectedExperience,
            interests: selectedInterests,
            goals: selectedGoals,
            responses: userResponses,
            timeCommitment: selectedTime || 20
          };

          onComplete(profile, pathId, null);
        }
      }
    }, 800);
  };

  const showFollowUpQuestion = () => {
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      const followUpMessage: Message = {
        text: "Any more details you want to add to this question? The more you input, the better Hellen+ can fine-tune your learning path. 💡",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, followUpMessage]);
      setWaitingForFollowUp(true);
      setShowCustomInput(true);
    }, 600);
  };

  const skipFollowUp = async () => {
    await addUserMessage("No, let's continue");
    moveToNextQuestion();
  };

  const handleFollowUpSubmit = async () => {
    if (!currentInput.trim()) return;
    
    await addUserMessage(currentInput);

    let selectedValue: any = undefined;

    if (currentQuestion === 2) {
      selectedValue = selectedInterests;
    } else if (currentQuestion === 3) {
      selectedValue = selectedGoals;
    } else if (currentQuestion === 0) {
      selectedValue = selectedJobFunction;
    } else if (currentQuestion === 1) {
      selectedValue = selectedExperience;
    } else if (currentQuestion === 4) {
      selectedValue = selectedTime;
    }

    await saveResponse(currentInput, selectedValue);
    setCurrentInput('');
    moveToNextQuestion();
  };

  const handleBackButton = () => {
    playClick();
    if (currentQuestion > 0) {
      setIsTyping(true);
      setShowCustomInput(false);
      setWaitingForFollowUp(false);
      setCurrentInput('');
      
      setTimeout(() => {
        setIsTyping(false);
        const prevQuestion = currentQuestion - 1;
        
        // Add bot message for previous question
        const botMessage: Message = {
          text: questions[prevQuestion],
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setCurrentQuestion(prevQuestion);
        
        // Clear selections for current question
        if (currentQuestion === 1) {
          setSelectedJobFunction(null);
        } else if (currentQuestion === 2) {
          setSelectedExperience(null);
        } else if (currentQuestion === 3) {
          setSelectedInterests([]);
        } else if (currentQuestion === 4) {
          setSelectedGoals([]);
        }
      }, 500);
    }
  };

  const handleQuickSelection = async (value: any, label: string) => {
    playClick();
    if (currentQuestion === 0) {
      setSelectedJobFunction(value as JobFunction);
      await addUserMessage(label);
      await saveResponse(undefined, value);
      showFollowUpQuestion();
    } else if (currentQuestion === 1) {
      setSelectedExperience(value as ExperienceLevel);
      await addUserMessage(label);
      await saveResponse(undefined, value);
      showFollowUpQuestion();
    } else if (currentQuestion === 4) {
      setSelectedTime(value as number);
      await addUserMessage(label);
      await saveResponse(undefined, value);
      moveToNextQuestion();
    }
  };

  const handleInterestToggle = (interest: InterestArea) => {
    playClick();
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  const handleGoalToggle = (goal: string) => {
    playClick();
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(prev => prev.filter(g => g !== goal));
    } else {
      setSelectedGoals(prev => [...prev, goal]);
    }
  };

  const confirmMultipleSelection = async () => {
    playClick();
    if (currentQuestion === 2 && selectedInterests.length > 0) {
      const interestLabels = selectedInterests.map(i => 
        interestAreas.find(a => a.value === i)?.label
      ).join(', ');
      await addUserMessage(interestLabels);
      await saveResponse(undefined, selectedInterests);
      showFollowUpQuestion();
    } else if (currentQuestion === 3 && selectedGoals.length > 0) {
      const goalLabels = selectedGoals.map(g => 
        goalOptions.find(o => o.value === g)?.label
      ).join(', ');
      await addUserMessage(goalLabels);
      await saveResponse(undefined, selectedGoals);
      showFollowUpQuestion();
    }
  };

  const handleCustomSubmit = async () => {
    if (!currentInput.trim()) return;

    // If we're waiting for a follow-up, just add the message and move on
    if (waitingForFollowUp) {
      handleFollowUpSubmit();
      return;
    }

    // Parse custom input based on current question
    if (currentQuestion === 0) {
      const jobResponse = currentInput.toLowerCase();
      let detectedJob: JobFunction = 'other';
      if (jobResponse.includes('commercial') || jobResponse.includes('sales')) {
        detectedJob = 'commercial';
      } else if (jobResponse.includes('supply') || jobResponse.includes('chain')) {
        detectedJob = 'supply-chain';
      } else if (jobResponse.includes('marketing')) {
        detectedJob = 'marketing';
      } else if (jobResponse.includes('finance')) {
        detectedJob = 'finance';
      } else if (jobResponse.includes('operation')) {
        detectedJob = 'operations';
      } else if (jobResponse.includes('hr') || jobResponse.includes('human resource')) {
        detectedJob = 'hr';
      }
      setSelectedJobFunction(detectedJob);
    } else if (currentQuestion === 1) {
      const expResponse = currentInput.toLowerCase();
      let detectedExp: ExperienceLevel = 'intermediate';
      if (expResponse.includes('beginner') || expResponse.includes('new') || expResponse.includes('starting')) {
        detectedExp = 'beginner';
      } else if (expResponse.includes('advanced') || expResponse.includes('experienced') || expResponse.includes('expert')) {
        detectedExp = 'advanced';
      }
      setSelectedExperience(detectedExp);
    } else if (currentQuestion === 2) {
      const interestResponse = currentInput.toLowerCase();
      const detectedInterests: InterestArea[] = [];
      if (interestResponse.includes('visualiz') || interestResponse.includes('dashboard')) {
        detectedInterests.push('visualization');
      }
      if (interestResponse.includes('statistic') || interestResponse.includes('analysis')) {
        detectedInterests.push('statistics');
      }
      if (interestResponse.includes('machine learning') || interestResponse.includes('ml') || interestResponse.includes('ai')) {
        detectedInterests.push('ml-ai');
      }
      if (interestResponse.includes('engineer') || interestResponse.includes('pipeline')) {
        detectedInterests.push('data-engineering');
      }
      if (interestResponse.includes('business intelligence') || interestResponse.includes('bi')) {
        detectedInterests.push('business-intelligence');
      }
      if (detectedInterests.length > 0) {
        setSelectedInterests(detectedInterests);
      } else {
        setSelectedInterests(['business-intelligence']); // default
      }
    } else if (currentQuestion === 3) {
      const goalsResponse = currentInput.toLowerCase();
      const detectedGoals: string[] = [];
      if (goalsResponse.includes('skill') || goalsResponse.includes('learn')) {
        detectedGoals.push('skill-development');
      }
      if (goalsResponse.includes('decision') || goalsResponse.includes('data-driven')) {
        detectedGoals.push('decision-making');
      }
      if (goalsResponse.includes('team') || goalsResponse.includes('collaborat')) {
        detectedGoals.push('team-collaboration');
      }
      if (goalsResponse.includes('career') || goalsResponse.includes('advance')) {
        detectedGoals.push('career-advancement');
      }
      if (detectedGoals.length > 0) {
        setSelectedGoals(detectedGoals);
      } else {
        setSelectedGoals(['skill-development']); // default
      }
    } else if (currentQuestion === 4) {
      const timeMatch = currentInput.match(/\d+/);
      if (timeMatch) {
        setSelectedTime(parseInt(timeMatch[0]));
      } else {
        setSelectedTime(20);
      }
    }

    await addUserMessage(currentInput);
    setCurrentInput('');
    moveToNextQuestion();
  };

  const renderQuickOptions = () => {
    if (showCustomInput || currentQuestion >= questions.length) return null;

    if (currentQuestion === 0) {
      // Job Function
      return (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {jobFunctions.map((func) => {
            const Icon = func.icon;
            return (
              <button
                key={func.value}
                onClick={() => handleQuickSelection(func.value, func.label)}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-[#F40009] hover:bg-red-50 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-700">{func.label}</span>
              </button>
            );
          })}
        </div>
      );
    } else if (currentQuestion === 1) {
      // Experience Level
      return (
        <div className="space-y-3 mb-4">
          {experienceLevels.map((level) => {
            const Icon = level.icon;
            return (
              <button
                key={level.value}
                onClick={() => handleQuickSelection(level.value, level.label)}
                className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#F40009] hover:bg-red-50 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm text-gray-800 mb-0.5">{level.label}</h3>
                  <p className="text-xs text-gray-600">{level.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      );
    } else if (currentQuestion === 2) {
      // Interests (multi-select)
      return (
        <div className="mb-3">
          <div className="space-y-1.5 mb-3">
            {interestAreas.map((area) => {
              const Icon = area.icon;
              const isSelected = selectedInterests.includes(area.value);
              return (
                <button
                  key={area.value}
                  onClick={() => handleInterestToggle(area.value)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-[#F40009] bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-[#F40009] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xs ${isSelected ? 'text-[#F40009] font-medium' : 'text-gray-800'}`}>
                      {area.label}
                    </h3>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 bg-[#F40009] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={confirmMultipleSelection}
            disabled={selectedInterests.length === 0}
            className="w-full py-2 rounded-full bg-[#F40009] text-white text-sm hover:bg-[#DC0012] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md mb-3"
          >
            Continue with {selectedInterests.length} selection{selectedInterests.length !== 1 ? 's' : ''}
          </button>
        </div>
      );
    } else if (currentQuestion === 3) {
      // Goals (multi-select)
      return (
        <div className="mb-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {goalOptions.map((goal) => {
              const Icon = goal.icon;
              const isSelected = selectedGoals.includes(goal.value);
              return (
                <button
                  key={goal.value}
                  onClick={() => handleGoalToggle(goal.value)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all text-center ${
                    isSelected
                      ? 'border-[#F40009] bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-[#F40009] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] leading-tight ${isSelected ? 'text-[#F40009] font-medium' : 'text-gray-700'}`}>
                    {goal.label}
                  </span>
                  {isSelected && (
                    <div className="w-3.5 h-3.5 bg-[#F40009] rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={confirmMultipleSelection}
            disabled={selectedGoals.length === 0}
            className="w-full py-2 rounded-full bg-[#F40009] text-white text-sm hover:bg-[#DC0012] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md mb-3"
          >
            Continue with {selectedGoals.length} goal{selectedGoals.length !== 1 ? 's' : ''}
          </button>
        </div>
      );
    } else if (currentQuestion === 4) {
      // Time Commitment
      return (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {timeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleQuickSelection(option.value, option.label)}
              className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-[#F40009] hover:bg-red-50 transition-all"
            >
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-700">{option.label}</span>
            </button>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[85vh] max-h-[800px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#F40009] text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src={hellenLogo} alt="MAILA" className="h-8" />
            <div>
              <h2 className="text-lg">Learning Assistant</h2>
              <p className="text-xs text-white/80">Here to help you find your path</p>
            </div>
          </div>
          <img src={cocaColaHBCLogo} alt="Coca-Cola HBC" className="h-7" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
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
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  message.sender === 'bot'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-[#F40009] text-white'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#F40009]">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Options or Input */}
        <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0 overflow-y-auto max-h-[45vh]">
          {!showCustomInput && currentQuestion < questions.length ? (
            <>
              {renderQuickOptions()}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    playClick();
                    setShowCustomInput(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">Or chat with Hellen+ to elaborate</span>
                </button>
                {currentQuestion > 0 && (
                  <button
                    onClick={handleBackButton}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to previous question</span>
                  </button>
                )}
              </div>
            </>
          ) : currentQuestion < questions.length ? (
            <>
              <div className="flex gap-3 mb-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Typing sound
                    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
                      playTyping();
                    }

                    // Submit on Enter
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCustomSubmit();
                    }
                  }}
                  placeholder={
                    waitingForFollowUp
                      ? "Add more details or skip..."
                      : "Type your answer here..."
                  }
                  disabled={isTyping}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-full focus:outline-none focus:border-[#F40009] disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
                />
                <button
                  onClick={() => {
                    playClick();
                    handleCustomSubmit();
                  }}
                  disabled={!currentInput.trim() || isTyping}
                  className="w-11 h-11 bg-[#F40009] text-white rounded-full flex items-center justify-center hover:bg-[#DC0012] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {waitingForFollowUp ? (
                  <button
                    onClick={() => {
                      playClick();
                      skipFollowUp();
                    }}
                    className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 transition-all border border-gray-300 rounded-full hover:bg-gray-50"
                  >
                    Skip and continue →
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      playClick();
                      setShowCustomInput(false);
                    }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 transition-all"
                  >
                    ← Back to quick options
                  </button>
                )}
                {currentQuestion > 0 && (
                  <button
                    onClick={handleBackButton}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to previous question</span>
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}