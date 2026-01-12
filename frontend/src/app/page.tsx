'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModeToggle } from '@/components/mode-toggle';
import { IssueGraphModal } from '@/components/issue-graph-modal';
import { Search, ExternalLink, FileCode, MessageSquare, Sparkles, Network } from 'lucide-react';

type Issue = {
  id: number;
  title: string;
  url: string;
  filePath: string;
  repo?: string;
  comments?: number;
  isAvailable?: boolean;
  assignees?: string[];
  state?: string;
  updatedAt?: string;
};

type AIResponse = {
  issues: Issue[];
  explanation: string;
  count: number;
};

export default function HomePage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [repos, setRepos] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [graphModalOpen, setGraphModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch repositories
        const reposRes = await fetch('http://localhost:3001/api/repos');
        const reposData = await reposRes.json();
        setRepos(reposData.repos || []);
        if (reposData.repos.length > 0) {
          setSelectedRepo(reposData.repos[0]);
        }

        // Fetch all issues
        const issuesRes = await fetch('http://localhost:3001/api/issues');
        const issuesData = await issuesRes.json();
        setIssues(issuesData.issues || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAskAI = async () => {
    if (!aiQuery.trim() || !selectedRepo) {
      console.log('Missing query or repo:', { aiQuery, selectedRepo });
      return;
    }

    setIsQuerying(true);
    setAiResponse(null);
    
    try {
      console.log('Sending AI query:', { repo: selectedRepo, query: aiQuery });
      const res = await fetch('http://localhost:3001/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: selectedRepo, query: aiQuery }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('AI response:', data);
      setAiResponse(data);
      setIssues(data.issues);
    } catch (err) {
      console.error('AI query failed:', err);
      alert(`AI query failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsQuerying(false);
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.filePath.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = !showOnlyAvailable || issue.isAvailable;
    return matchesSearch && matchesAvailability;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileCode className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">OSS Contribution Guide</h1>
                <p className="text-sm text-muted-foreground">AI-powered issue recommendations</p>
              </div>
            </div>
          </div>
          <ModeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* AI Assistant Section */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Assistant
            </CardTitle>
            <CardDescription>
              Ask natural language questions to find relevant issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Repository Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Repository</label>
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a repository" />
                </SelectTrigger>
                <SelectContent>
                  {repos.map(repo => (
                    <SelectItem key={repo} value={repo}>
                      {repo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Suggested Queries */}
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setAiQuery("What's a good issue for a beginner?")}
              >
                Beginner issues
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setAiQuery("Show me frontend bugs")}
              >
                Frontend bugs
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setAiQuery("I want to work on API documentation")}
              >
                API docs
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setAiQuery("Find testing issues")}
              >
                Testing
              </Badge>
            </div>

            {/* AI Query Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g., What's a good issue for a beginner?"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleAskAI} disabled={isQuerying || !selectedRepo}>
                {isQuerying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Ask AI
                  </>
                )}
              </Button>
            </div>

            {/* AI Response */}
            {aiResponse && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">AI Analysis:</p>
                    <p className="text-sm text-muted-foreground mb-3">{aiResponse.explanation}</p>
                    <Badge variant="secondary">
                      Found {aiResponse.count} matching {aiResponse.count === 1 ? 'issue' : 'issues'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card className="mb-8 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Filter Results
            </CardTitle>
            <CardDescription>
              Refine by title, file path, or availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filter issues or files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="availableOnly"
                checked={showOnlyAvailable}
                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
              />
              <label htmlFor="availableOnly" className="text-sm font-medium cursor-pointer">
                Show only available issues (no one assigned)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardDescription>Total Issues</CardDescription>
              <CardTitle className="text-3xl text-primary">{issues.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardDescription>Filtered Results</CardDescription>
              <CardTitle className="text-3xl text-accent">{filteredIssues.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardDescription>Repository</CardDescription>
              <CardTitle className="text-lg">langchain-ai/langchain</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Issue List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Open Issues ({filteredIssues.length})
          </h2>
          
          {filteredIssues.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No issues match your search.</p>
              </CardContent>
            </Card>
          ) : (
            filteredIssues.map((issue, index) => (
              <Card key={`${issue.id}-${index}`} className="border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="secondary" className="font-mono">
                          #{issue.id}
                        </Badge>
                        {issue.isAvailable ? (
                          <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                            ✓ Available
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
                            ⚠ Claimed
                          </Badge>
                        )}
                        {issue.assignees && issue.assignees.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            👤 {issue.assignees.join(', ')}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg mb-2">
                        <a 
                          href={issue.url.trim()} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group"
                        >
                          {issue.title}
                          <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {issue.filePath}
                        </code>
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedIssueId(issue.id);
                        setGraphModalOpen(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Network className="h-4 w-4" />
                      View Graph
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Issue Graph Modal */}
      <IssueGraphModal
        issueId={selectedIssueId}
        open={graphModalOpen}
        onOpenChange={setGraphModalOpen}
      />
    </div>
  );
}