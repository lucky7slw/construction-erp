'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Generate tasks for my project',
    'Analyze budget health',
    'Draft an email',
    'Summarize today\'s work',
  ]);

  const handleQuickAction = async (action: string) => {
    setLoading(true);
    try {
      // Route to appropriate AI endpoint based on action
      if (action.includes('tasks')) {
        // Get current project from context
        const projectId = 'current-project-id'; // TODO: Get from context
        await apiClient.post(`/ai-automation/projects/${projectId}/generate-tasks`);
      }
      // Add more quick actions
    } catch (error) {
      console.error('AI action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating AI Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* AI Assistant Panel */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 shadow-2xl z-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Assistant
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-2"
                    onClick={() => handleQuickAction(suggestion)}
                    disabled={loading}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask AI anything..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAction(message)}
              />
              <Button
                size="icon"
                onClick={() => handleQuickAction(message)}
                disabled={loading || !message}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* AI Capabilities */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">I can help you:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Generate project tasks automatically</li>
                <li>Classify and route RFIs</li>
                <li>Analyze budgets and predict overruns</li>
                <li>Draft professional emails</li>
                <li>Summarize daily logs</li>
                <li>Process meeting transcripts</li>
                <li>Classify documents</li>
                <li>Generate quotes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
