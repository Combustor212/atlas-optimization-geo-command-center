
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Business } from "@/api/entities";
import { motion, AnimatePresence } from "framer-motion";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Send, 
  RefreshCw, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  BookOpen,
  MessageCircle,
  RotateCcw,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RANDALL_AVATAR = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d742e6c4913147eef6a1ba/4cceef92d_ChatGPTImageSep27202503_59_46PM.png";

// Knowledge Base - Randall's complete understanding of the platform
const KNOWLEDGE_BASE = {
  onboarding: {
    welcome: "Welcome to AGS! I'm Randall, your AI guide. I'll help you dominate local search through GEO (AI visibility), MEO (Maps), and SEO. Let's get started!",
    firstSteps: [
      "Add your first business location",
      "Run a comprehensive audit",
      "Review your visibility scores",
      "Set up automated monitoring"
    ]
  },
  features: {
    dashboard: {
      description: "Your control center. Track all businesses, visibility scores, reviews, and alerts in one place.",
      keyMetrics: ["Total Businesses", "Avg Visibility Score", "Total Reviews", "Needs Attention"],
      actions: ["View trends", "Quick access to audits", "Monitor month-over-month growth"]
    },
    geoMeoOperator: {
      description: "The audit engine. Scans businesses for GEO (AI mentions) and MEO (Maps) optimization opportunities.",
      features: ["Deterministic scoring", "SWOT analysis", "30-day quick wins", "AI-generated content kits"],
      howToUse: "Enter business details → Run scan → Review fixes → Implement recommendations"
    },
    businesses: {
      description: "Portfolio management for all your locations.",
      features: ["Filter by city/category", "Priority scoring", "One-click audits", "Performance tracking"],
      bestPractices: ["Add complete NAP info", "Upload logos/photos", "Connect GBP", "Schedule regular audits"]
    },
    aiVisibility: {
      description: "Check if your business appears in AI-generated answers from ChatGPT, Google AI, and Perplexity.",
      howItWorks: "We test queries like 'best [category] in [city]' and track your mentions.",
      improveTips: ["Create FAQ content", "Build local citations", "Generate topical blog posts", "Optimize schema markup"]
    },
    mapsHealth: {
      description: "NAP consistency checker across 50+ directories.",
      colorCoding: {
        green: "Perfect match - your info is consistent",
        red: "Mismatch detected - needs fixing",
        orange: "Missing listing - opportunity to claim"
      },
      platforms: ["Google", "Apple Maps", "Yelp", "Bing", "Facebook", "BBB"]
    },
    auditReports: {
      description: "Historical audit repository with export capabilities.",
      features: ["Filter by business/date", "Compare trends", "Export to PDF/CSV", "Client-ready presentations"],
      uses: ["Track progress", "Share with clients", "Document improvements", "Identify patterns"]
    },
    businessAssistant: {
      description: "AI content generator for local businesses.",
      capabilities: ["Blog posts (400-600 words)", "GBP posts", "FAQ pages", "Social media captions", "Review responses"],
      tips: "Be specific with prompts. Include city, niche, and desired tone for best results."
    },
    competitorWatchdog: {
      description: "Monitor up to 3 competitors per business.",
      tracking: ["Review velocity", "Rating changes", "AI visibility", "Map pack rankings"],
      strategy: "Use insights to identify gaps and opportunities in your market."
    },
    directorySyncHub: {
      description: "One-click synchronization across 50+ business directories.",
      importance: "Consistent NAP = higher local rankings. Google uses citation consistency as a ranking factor.",
      process: "Connect account → Verify info → Push to directories → Monitor for changes"
    },
    reputationManager: {
      description: "Review monitoring, requesting, and response system.",
      features: ["Automated review requests", "AI response templates", "Sentiment analysis", "Review tracking"],
      bestPractices: ["Respond within 24hrs", "Personalize responses", "Address negatives professionally", "Thank positive reviewers"]
    }
  },
  troubleshooting: {
    login: {
      cantLogin: "Try: 1) Check your email for correct spelling, 2) Use 'Forgot Password', 3) Clear browser cache, 4) Try incognito mode",
      googleAuth: "Make sure pop-ups are enabled. If blocked, check your browser settings → Site Settings → Pop-ups."
    },
    scans: {
      scanFailing: "Common causes: 1) Incomplete business info, 2) Invalid address, 3) Rate limits (wait 5min), 4) Missing API keys",
      slowScans: "Scans take 30-90 seconds. We're checking 50+ directories and running AI analysis. Please wait."
    },
    billing: {
      trialEnded: "Your subscription has ended. Upgrade to PRO ($499/mo) to continue. Go to Plans & Pricing.",
      payment: "We accept all major credit cards via Stripe. Your data is encrypted and PCI-compliant.",
      refund: "14-day money-back guarantee. Contact info@atlasgrowths.com for refunds."
    },
    integrations: {
      gbp: "Connect via Google OAuth. Make sure you're logged into the Google account that owns the business.",
      api: "API keys go in Settings → Integrations. Never share keys publicly."
    }
  },
  quickActions: [
    { label: "Add First Business", action: "navigate_businesses", icon: "plus" },
    { label: "Run Audit", action: "navigate_operator", icon: "scan" },
    { label: "View Dashboard", action: "navigate_dashboard", icon: "home" },
    { label: "Check AI Visibility", action: "navigate_ai", icon: "sparkles" },
    { label: "Manage Reviews", action: "navigate_reviews", icon: "star" },
    { label: "Restart Tour", action: "start_walkthrough", icon: "refresh" }
  ]
};

// Context-aware message generator
const generateContextualWelcome = (user, businesses, location) => {
  const hasBusinesses = businesses && businesses.length > 0;
  const isNewUser = !localStorage.getItem('randall_welcomed');
  const currentPage = location.pathname;

  if (isNewUser) {
    localStorage.setItem('randall_welcomed', 'true');
    return {
      message: KNOWLEDGE_BASE.onboarding.welcome,
      suggestions: KNOWLEDGE_BASE.onboarding.firstSteps,
      quickActions: ["Add First Business", "Start Tour", "Watch Demo"]
    };
  }

  if (!hasBusinesses) {
    return {
      message: "I notice you haven't added any businesses yet. Let's get your first location set up so we can start tracking your visibility!",
      suggestions: ["Click 'Add Business' to get started", "Need help? I can walk you through it", "Import from Google Business Profile"],
      quickActions: ["Add First Business", "Watch Tutorial"]
    };
  }

  // Context-based on current page
  const pageContexts = {
    '/dashboard': {
      message: "You're on the Dashboard. Here's your control center with all key metrics.",
      suggestions: ["Check businesses needing attention", "View month-over-month trends", "Run a new audit"]
    },
    '/businesses': {
      message: "Managing your business portfolio. You can filter, audit, or add new locations here.",
      suggestions: ["Filter by priority level", "Run bulk audits", "Update business information"]
    },
    '/geomeooperator': {
      message: "Ready to run a comprehensive audit? This will check GEO (AI visibility) and MEO (Maps) performance.",
      suggestions: ["Enter complete business details", "Review SWOT analysis after scan", "Download content kit"]
    }
  };

  const context = Object.keys(pageContexts).find(path => currentPage.includes(path));
  if (context) {
    return pageContexts[context];
  }

  return {
    message: `Welcome back! You have ${businesses.length} business${businesses.length !== 1 ? 'es' : ''} being tracked. How can I help today?`,
    suggestions: ["Run new audit", "Check AI visibility", "View reports", "Manage reviews"],
    quickActions: ["Dashboard", "Run Audit", "View Reports"]
  };
};

// Conversational AI Response Generator
const generateSmartResponse = async (userInput, context) => {
  const input = userInput.toLowerCase();
  
  // Quick pattern matching for common questions
  if (input.includes('how') && input.includes('work')) {
    return "AGS works in 3 steps:\n\n1️⃣ **Add your business** - Enter NAP (Name, Address, Phone)\n2️⃣ **Run audits** - We scan 50+ directories + AI engines\n3️⃣ **Fix issues** - Follow our recommendations to boost visibility\n\nWant me to walk you through each step?";
  }

  if (input.includes('pricing') || input.includes('cost') || input.includes('price')) {
    return "**AGS Pricing:**\n\n💎 **PRO** - $499/month\n• Unlimited businesses\n• Daily audits\n• AI content generation\n• Priority support\n\nClick 'Plans & Pricing' in the sidebar to upgrade.";
  }

  if (input.includes('demo') || input.includes('tour') || input.includes('walkthrough')) {
    return "I can start a full platform tour for you! It covers:\n\n✅ Dashboard & metrics\n✅ Running audits\n✅ Understanding scores\n✅ Fixing issues\n✅ AI visibility\n✅ Review management\n\nWould you like to start the guided tour?";
  }

  if (input.includes('help') || input.includes('stuck') || input.includes('problem')) {
    return "I'm here to help! Common issues:\n\n🔧 **Login problems** - Clear cache or use password reset\n🔧 **Scan errors** - Check business info is complete\n🔧 **Billing questions** - Contact info@atlasgrowths.com\n\nWhat specifically are you struggling with?";
  }

  if (input.includes('geo') || input.includes('ai visibility')) {
    return KNOWLEDGE_BASE.features.aiVisibility.description + "\n\n**How to improve:**\n" + 
      KNOWLEDGE_BASE.features.aiVisibility.improveTips.map((tip, i) => `${i+1}. ${tip}`).join('\n') +
      "\n\nWant me to run an AI visibility check for you?";
  }

  if (input.includes('meo') || input.includes('maps') || input.includes('nap')) {
    const info = KNOWLEDGE_BASE.features.mapsHealth;
    return info.description + "\n\n**What the colors mean:**\n🟢 " + info.colorCoding.green + 
      "\n🔴 " + info.colorCoding.red + "\n🟠 " + info.colorCoding.orange +
      "\n\nWe check: " + info.platforms.join(", ") + " and 44+ more.";
  }

  // Fallback to LLM for complex questions
  try {
    const systemPrompt = `You are Randall, a friendly AI assistant for AGS - a local SEO platform. 
    
Context: ${JSON.stringify(context)}

Guidelines:
- Be conversational and helpful
- Use emojis sparingly (1-2 per response)
- Keep responses under 150 words
- Use bullet points for lists
- Offer actionable next steps
- Maintain a professional but friendly tone

User's knowledge base access:
${JSON.stringify(KNOWLEDGE_BASE, null, 2)}`;

    const response = await InvokeLLM({
      prompt: `${systemPrompt}\n\nUser question: ${userInput}`
    });

    return response || "I'm not quite sure about that. Could you rephrase your question, or would you like me to connect you with our team?";
  } catch (error) {
    console.error('LLM invocation failed:', error);
    return "I'm having trouble generating a response right now. Here are some things I can definitely help with:\n\n• Platform tour\n• Running audits\n• Understanding scores\n• Troubleshooting\n• Feature explanations\n\nWhat would you like to know?";
  }
};

// Message Bubble Component
const MessageBubble = ({ message, isUser, avatar }) => {
  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <img 
          src={avatar} 
          alt="Randall" 
          className="w-8 h-8 rounded-full flex-shrink-0 mt-1"
        />
      )}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser 
          ? "bg-theme-gradient text-white" 
          : "bg-white border border-slate-200 text-slate-800 shadow-sm"
      )}>
        {message}
      </div>
    </div>
  );
};

// Quick Action Button Component
const QuickActionButton = ({ label, onClick, icon }) => {
  const icons = {
    plus: <Sparkles className="w-4 h-4" />,
    scan: <Zap className="w-4 h-4" />,
    home: <BookOpen className="w-4 h-4" />,
    sparkles: <Sparkles className="w-4 h-4" />,
    star: <MessageCircle className="w-4 h-4" />,
    refresh: <RotateCcw className="w-4 h-4" />
  };

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition-all border border-indigo-200 hover:border-indigo-300"
    >
      {icons[icon] || <HelpCircle className="w-4 h-4" />}
      {label}
    </button>
  );
};

// Main Randall AI Assistant Component
export default function RandallAIAssistant({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const hasInitialized = useRef(false); // Track if welcome message has been sent
  
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // Load businesses for context
  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const data = await Business.list();
        setBusinesses(data || []);
      } catch (error) {
        console.error('Failed to load businesses:', error);
      }
    };
    if (user) loadBusinesses();
  }, [user]);

  // Initialize Randall with contextual welcome - FIXED
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      const welcome = generateContextualWelcome(user, businesses, location);
      setMessages([{
        id: Date.now(),
        text: welcome.message,
        isUser: false,
        timestamp: new Date()
      }]);
      hasInitialized.current = true;
    }
    
    // Reset initialization when chat is closed
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, user, businesses, location]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const context = {
        user,
        businesses,
        currentPage: location.pathname,
        hasBusinesses: businesses.length > 0
      };

      const response = await generateSmartResponse(inputValue, context);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: response,
          isUser: false,
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 800);
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "I apologize, but I'm having trouble responding right now. Please try again or contact us if the issue persists.",
        isUser: false,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action) => {
    const actions = {
      navigate_businesses: () => navigate(createPageUrl('Businesses')),
      navigate_operator: () => navigate(createPageUrl('GeoMeoOperator')),
      navigate_dashboard: () => navigate(createPageUrl('dashboard')),
      navigate_ai: () => navigate(createPageUrl('AIVisibility')),
      navigate_reviews: () => navigate(createPageUrl('ReputationManager')),
      start_walkthrough: () => {
        toast.info('Starting platform tour...');
        // Implement tour start logic
      }
    };

    actions[action]?.();
  };

  const handleClearChat = () => {
    setMessages([]);
    hasInitialized.current = false; // Reset init state when chat is cleared
    const welcome = generateContextualWelcome(user, businesses, location);
    setMessages([{
      id: Date.now(),
      text: welcome.message,
      isUser: false,
      timestamp: new Date()
    }]);
    hasInitialized.current = true; // Mark as initialized after clearing and re-adding welcome
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-theme-gradient shadow-2xl flex items-center justify-center z-[9999] hover:shadow-lg transition-all"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <img 
            src={RANDALL_AVATAR} 
            alt="Randall AI Assistant" 
            className="w-12 h-12 rounded-full"
          />
        </motion.div>
        
        {/* Pulsing Ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-purple-400"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 0, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 w-[420px] bg-white rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden border-2 border-indigo-100"
      style={{ height: isMinimized ? 'auto' : '600px' }}
    >
      {/* Header */}
      <div className="bg-theme-gradient px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={RANDALL_AVATAR} 
            alt="Randall" 
            className="w-10 h-10 rounded-full border-2 border-white"
          />
          <div>
            <h3 className="text-white font-bold text-sm">Randall AI Assistant</h3>
            <p className="text-indigo-100 text-xs">Your AGS Guide</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white/80 hover:text-white transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <button
            onClick={handleClearChat}
            className="text-white/80 hover:text-white transition-colors"
            title="Clear chat"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg.text}
                isUser={msg.isUser}
                avatar={RANDALL_AVATAR}
              />
            ))}
            {isTyping && (
              <div className="flex gap-3 mb-4">
                <img src={RANDALL_AVATAR} alt="Randall" className="w-8 h-8 rounded-full flex-shrink-0 mt-1" />
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-3 bg-white border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2 font-medium">Quick Actions:</p>
            <div className="flex flex-wrap gap-2">
              {KNOWLEDGE_BASE.quickActions.slice(0, 3).map(action => (
                <QuickActionButton
                  key={action.action}
                  label={action.label}
                  icon={action.icon}
                  onClick={() => handleQuickAction(action.action)}
                />
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="bg-theme-gradient px-4 rounded-xl"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
