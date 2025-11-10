'use client';

import * as React from 'react';
import { Bot, Send, X, Minimize2, Maximize2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useProcessVoiceCommand } from '@/hooks/useAI';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
}

interface AIAssistantProps {
  projectId?: string;
  context?: Record<string, unknown>;
}

export function AIAssistant({ projectId, context }: AIAssistantProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI construction assistant. I can help you with expense categorization, time tracking, risk assessment, and more. What can I help you with today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const processVoice = useProcessVoiceCommand();

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const response = await processVoice.mutateAsync({
        transcription: input,
        context: {
          projectId,
          ...context,
        },
      });

      if (response.success && response.data) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: getResponseMessage(response.data),
          timestamp: new Date(),
          confidence: response.data.confidence,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to process command');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I couldn't process that request. Please try rephrasing or contact support if the issue persists.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      toast({
        title: 'Error',
        description: 'Failed to process your request',
        variant: 'destructive',
      });
    }
  };

  const getResponseMessage = (data: any): string => {
    const { intent, entities, actionable, transcription } = data;

    // Handle general conversation/questions that aren't construction commands
    if (!actionable || !intent || intent === 'UNKNOWN' || intent === 'GENERAL_QUERY') {
      // Check if it's a general question or conversation
      const lowerTranscription = (transcription || '').toLowerCase();

      if (lowerTranscription.includes('joke')) {
        return "Why did the construction worker bring a ladder to work? Because they wanted to reach new heights! 😄\n\nNow, is there anything construction-related I can help you with?";
      }

      if (lowerTranscription.includes('hello') || lowerTranscription.includes('hi')) {
        return "Hello! I'm your AI construction assistant. I can help you log time, track expenses, assess project risks, and manage tasks. What can I help you with today?";
      }

      if (lowerTranscription.includes('help') || lowerTranscription.includes('what can you do')) {
        return "I can help you with:\n• Logging time entries\n• Recording expenses\n• Updating task status\n• Reporting issues\n• Requesting materials\n• Assessing project risks\n\nJust tell me what you need!";
      }

      return "I'm specialized in construction management tasks. I can help you log time, track expenses, manage tasks, and more. Could you rephrase your request as a construction-related action?";
    }

    // Generate contextual responses based on intent
    switch (intent) {
      case 'LOG_TIME':
        return `I'll log ${entities?.hours || 0} hours for ${entities?.task || 'this task'}. Would you like me to proceed?`;
      case 'LOG_EXPENSE':
        return `I'll record an expense of $${entities?.amount || 0} for ${entities?.description || 'this item'}. Should I categorize it now?`;
      case 'UPDATE_TASK':
        return `I'll update the task status to ${entities?.status || 'in progress'}. Anything else you'd like to add?`;
      case 'REPORT_ISSUE':
        return `I've noted the ${entities?.type || 'issue'} you reported. I'll alert the project manager immediately.`;
      case 'REQUEST_MATERIALS':
        return `Material request for ${entities?.material || 'items'} has been noted. I'll add this to the procurement list.`;
      default:
        return `I understood your request (${intent}). Let me help you with that.`;
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-construction-600 hover:bg-construction-700 z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
        <span className="sr-only">Open AI Assistant</span>
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card className="fixed bottom-6 right-6 w-80 shadow-xl z-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-construction-600" />
            <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
            <Badge variant="outline" className="ml-auto">
              <Sparkles className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(false)}
              className="h-6 w-6"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-xl flex flex-col z-50 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b shrink-0">
        <div className="flex items-center space-x-2">
          <div className="h-10 w-10 rounded-full bg-construction-100 flex items-center justify-center">
            <Bot className="h-6 w-6 text-construction-600" />
          </div>
          <div>
            <CardTitle className="text-base">AI Assistant</CardTitle>
            <p className="text-xs text-muted-foreground">Always here to help</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(true)}
            className="h-8 w-8"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-[80%] break-words [overflow-wrap:anywhere]',
                    message.role === 'user'
                      ? 'bg-construction-600 text-white'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  {message.confidence !== undefined && (
                    <p className="text-xs mt-1 opacity-70">
                      Confidence: {(message.confidence * 100).toFixed(0)}%
                    </p>
                  )}
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            {processVoice.isPending && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-2 bg-muted flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={processVoice.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || processVoice.isPending}
            >
              {processVoice.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Powered by Gemini AI
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
