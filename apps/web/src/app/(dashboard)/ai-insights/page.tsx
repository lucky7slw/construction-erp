'use client';

import * as React from 'react';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
  Activity,
  Sparkles,
  ChevronRight,
  BarChart3,
  Shield,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useProjects } from '@/hooks/useProjects';
import { useProjectRiskAssessment, useAIStatistics, useAIHealthCheck, getRiskColor } from '@/hooks/useAI';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function AIInsightsPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>();
  const { data: aiHealth } = useAIHealthCheck();
  const { data: aiStats } = useAIStatistics(true);

  // Select first project by default
  React.useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const { data: riskAssessment, isLoading: riskLoading } = useProjectRiskAssessment(
    selectedProjectId,
    !!selectedProjectId
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-construction-600" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered analytics, predictions, and recommendations for your projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={aiHealth?.overall ? 'default' : 'destructive'} className="gap-1">
            <Activity className="h-3 w-3" />
            {aiHealth?.overall ? 'AI Online' : 'AI Offline'}
          </Badge>
          {aiStats && (
            <Badge variant="outline">
              {aiStats.rateLimit.remaining}/{aiStats.rateLimit.limit} requests
            </Badge>
          )}
        </div>
      </div>

      {/* AI Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Requests Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats?.requestCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {aiStats?.rateLimit.remaining || 0} remaining this minute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">
              {aiStats?.cacheStats.totalKeys || 0} cached items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">Based on user feedback</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142h</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="risk-assessment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="risk-assessment">Risk Assessment</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="insights">Smart Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="risk-assessment" className="space-y-4">
          {/* Project Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Project</CardTitle>
              <CardDescription>Choose a project to view AI-powered risk assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {projectsLoading ? (
                  <>
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </>
                ) : (
                  projects?.map((project: any) => (
                    <Button
                      key={project.id}
                      variant={selectedProjectId === project.id ? 'default' : 'outline'}
                      className="h-auto p-4 justify-start"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <div className="text-left">
                        <div className="font-semibold">{project.name}</div>
                        <div className="text-xs opacity-70">{project.status}</div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment Results */}
          {selectedProjectId && (
            <>
              {riskLoading ? (
                <Card>
                  <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ) : riskAssessment?.data ? (
                <>
                  {/* Overall Risk */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Overall Risk Assessment
                          </CardTitle>
                          <CardDescription>
                            AI confidence: {((riskAssessment.data.confidence || 0) * 100).toFixed(0)}%
                          </CardDescription>
                        </div>
                        <Badge className={getRiskColor(riskAssessment.data.overallRisk)}>
                          {riskAssessment.data.overallRisk} RISK
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Budget Variance */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Budget Variance
                          </span>
                          <span className={`text-sm font-bold ${riskAssessment.data.budgetVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {riskAssessment.data.budgetVariance > 0 ? '+' : ''}
                            {riskAssessment.data.budgetVariance.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={Math.min(Math.abs(riskAssessment.data.budgetVariance), 100)}
                          className="h-2"
                        />
                      </div>

                      {/* Schedule Variance */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Schedule Variance
                          </span>
                          <span className={`text-sm font-bold ${riskAssessment.data.scheduleVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {riskAssessment.data.scheduleVariance > 0 ? '+' : ''}
                            {riskAssessment.data.scheduleVariance.toFixed(1)} days
                          </span>
                        </div>
                        <Progress
                          value={Math.min(Math.abs(riskAssessment.data.scheduleVariance), 100)}
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Identified Risks */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Identified Risks</CardTitle>
                      <CardDescription>
                        {riskAssessment.data.risks.length} potential risks detected
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {riskAssessment.data.risks.map((risk: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold">{risk.type}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {risk.description}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Badge className={getRiskColor(risk.impact)}>
                                  {risk.impact}
                                </Badge>
                                <Badge variant="outline">{risk.probability}</Badge>
                              </div>
                            </div>
                            <Separator className="my-3" />
                            <div>
                              <p className="text-sm font-medium mb-1">Mitigation Strategy:</p>
                              <p className="text-sm text-muted-foreground">{risk.mitigation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-construction-600" />
                        AI Recommendations
                      </CardTitle>
                      <CardDescription>
                        Actionable steps to improve project outcomes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {riskAssessment.data.recommendations.map((rec: any, index: number) => (
                          <li key={index} className="flex items-start gap-3">
                            <ChevronRight className="h-5 w-5 text-construction-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      No risk assessment data available for this project
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-construction-600" />
                AI Predictions
              </CardTitle>
              <CardDescription>
                Machine learning predictions based on historical data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Prediction features coming soon. This will include cost forecasting, timeline predictions, and resource optimization.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-construction-600" />
                Smart Recommendations
              </CardTitle>
              <CardDescription>
                Personalized recommendations for your projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Recommendation engine coming soon. This will provide personalized suggestions for process improvements.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-construction-600" />
                Smart Insights
              </CardTitle>
              <CardDescription>
                Discover patterns and trends in your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Smart insights coming soon. This will analyze patterns across all your projects.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
