'use client';

import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileCode, Users, Tag } from 'lucide-react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type IssueGraphData = {
  issue: {
    id: number;
    title: string;
    url: string;
    isAvailable: boolean;
  };
  file: {
    path: string;
  };
  assignees: string[];
  labels: string[];
  relatedIssues: Array<{
    id: number;
    title: string;
    isAvailable: boolean;
  }>;
};

type GraphNode = {
  id: string;
  name: string;
  type: 'issue' | 'file' | 'related-issue';
  url?: string;
  isAvailable?: boolean;
  val?: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
};

type GraphLink = {
  source: string;
  target: string;
  label: string;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

interface IssueGraphModalProps {
  issueId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueGraphModal({ issueId, open, onOpenChange }: IssueGraphModalProps) {
  const [data, setData] = useState<IssueGraphData | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    if (!open || !issueId) {
      setData(null);
      setGraphData({ nodes: [], links: [] });
      return;
    }

    const fetchGraphData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3001/api/issues/${issueId}/graph`);
        if (!res.ok) throw new Error('Failed to fetch graph data');
        
        const graphInfo = await res.json();
        setData(graphInfo);

        // Build force-directed graph with initial positioning
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        // Main issue node (center) - larger
        nodes.push({
          id: `issue-${graphInfo.issue.id}`,
          name: `#${graphInfo.issue.id}`,
          type: 'issue',
          url: graphInfo.issue.url,
          isAvailable: graphInfo.issue.isAvailable,
          val: 30,
          x: 0,
          y: 0,
          fx: 0, // Fix position initially
          fy: 0,
        });

        // File node - medium size, positioned to the right
        nodes.push({
          id: `file-${graphInfo.file.path}`,
          name: graphInfo.file.path,
          type: 'file',
          val: 25,
          x: 300,
          y: 0,
        });

        // Link issue to file
        links.push({
          source: `issue-${graphInfo.issue.id}`,
          target: `file-${graphInfo.file.path}`,
          label: 'RELATES_TO',
        });

        // Related issues - position them in a circle around the file
        graphInfo.relatedIssues.forEach((relatedIssue: { id: number; title: string; isAvailable: boolean }, index: number) => {
          const angle = (index * 2 * Math.PI) / Math.max(graphInfo.relatedIssues.length, 1);
          const radius = 250;
          
          nodes.push({
            id: `issue-${relatedIssue.id}`,
            name: `#${relatedIssue.id}`,
            type: 'related-issue',
            url: `https://github.com/langchain-ai/langchain/issues/${relatedIssue.id}`,
            isAvailable: relatedIssue.isAvailable,
            val: 20,
            x: 300 + Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          });

          // Link related issue to same file
          links.push({
            source: `issue-${relatedIssue.id}`,
            target: `file-${graphInfo.file.path}`,
            label: 'RELATES_TO',
          });
        });

        setGraphData({ nodes, links });
      } catch (err) {
        console.error('Failed to fetch issue graph:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [issueId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-screen h-screen max-h-screen m-0 rounded-none overflow-hidden flex flex-col p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            Issue Relationship Graph
          </DialogTitle>
          <DialogDescription>
            Visualize how this issue connects to code files and related issues
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading graph...</p>
            </div>
          </div>
        ) : data ? (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Issue Info */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">#{data.issue.id}</Badge>
                    {data.issue.isAvailable ? (
                      <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                        ✓ Available
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
                        ⚠ Claimed
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{data.issue.title}</h3>
                  <a
                    href={data.issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View on GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm">
                {data.file && (
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <code className="text-xs bg-muted px-2 py-1 rounded">{data.file.path}</code>
                  </div>
                )}
                {data.assignees.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{data.assignees.join(', ')}</span>
                  </div>
                )}
                {data.labels.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {data.labels.map((label) => (
                      <Badge key={label} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {data.relatedIssues.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <strong>{data.relatedIssues.length}</strong> other issue(s) also touch this file
                </div>
              )}
            </div>

            {/* Force-Directed Graph */}
            <div className="flex-1 border border-border rounded-lg overflow-hidden bg-muted/20 flex flex-col">
              <div className="p-3 border-b border-border bg-card shrink-0">
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span> This Issue
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span> Code File
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span> Related Issues
                  </span>
                </div>
              </div>
              <div className="flex-1 min-h-0 relative flex items-center justify-center p-8">
                {/* Simple SVG-based tree layout */}
                <svg className="w-full h-full max-w-4xl" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
                  {/* Arrow marker definition */}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                    </marker>
                  </defs>
                  
                  {/* Main Issue to File arrow */}
                  <line
                    x1="120"
                    y1="200"
                    x2="330"
                    y2="200"
                    stroke="#64748b"
                    strokeWidth="3"
                    markerEnd="url(#arrowhead)"
                  />
                  
                  {/* File to Related Issues arrows */}
                  {graphData.nodes
                    .filter(n => n.type === 'related-issue')
                    .map((node, index, arr) => {
                      const totalRelated = arr.length;
                      const spacing = Math.min(80, 300 / Math.max(totalRelated, 1));
                      const startY = 200 - ((totalRelated - 1) * spacing) / 2;
                      const y = startY + index * spacing;
                      return (
                        <line
                          key={node.id}
                          x1="470"
                          y1="200"
                          x2="630"
                          y2={y}
                          stroke="#64748b"
                          strokeWidth="3"
                          markerEnd="url(#arrowhead)"
                        />
                      );
                    })}
                  
                  {/* Main Issue Node (Blue) */}
                  <g 
                    className="cursor-pointer"
                    onClick={() => {
                      const mainIssue = graphData.nodes.find(n => n.type === 'issue');
                      if (mainIssue?.url) window.open(mainIssue.url, '_blank');
                    }}
                  >
                    <circle cx="80" cy="200" r="40" fill="#3b82f6" stroke="#1e40af" strokeWidth="3" />
                    <text x="80" y="260" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                      {graphData.nodes.find(n => n.type === 'issue')?.name || ''}
                    </text>
                    <text x="80" y="280" textAnchor="middle" fill="#94a3b8" fontSize="11">
                      (This Issue)
                    </text>
                  </g>
                  
                  {/* File Node (Green) */}
                  <g>
                    <circle cx="400" cy="200" r="35" fill="#10b981" stroke="#047857" strokeWidth="3" />
                    <text x="400" y="255" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                      {graphData.nodes.find(n => n.type === 'file')?.name.split('/').pop() || ''}
                    </text>
                    <text x="400" y="275" textAnchor="middle" fill="#94a3b8" fontSize="10">
                      (Code File)
                    </text>
                  </g>
                  
                  {/* Related Issue Nodes (Purple) */}
                  {graphData.nodes
                    .filter(n => n.type === 'related-issue')
                    .map((node, index, arr) => {
                      const totalRelated = arr.length;
                      const spacing = Math.min(80, 300 / Math.max(totalRelated, 1));
                      const startY = 200 - ((totalRelated - 1) * spacing) / 2;
                      const y = startY + index * spacing;
                      return (
                        <g 
                          key={node.id}
                          className="cursor-pointer"
                          onClick={() => node.url && window.open(node.url, '_blank')}
                        >
                          <circle cx="680" cy={y} r="30" fill="#8b5cf6" stroke="#6d28d9" strokeWidth="3" />
                          <text x="680" y={y + 50} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                            {node.name}
                          </text>
                        </g>
                      );
                    })}
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No graph data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
