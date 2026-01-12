'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type GraphItem = {
  issueId: number;
  issueTitle: string;
  isAvailable: boolean;
  filePath: string;
  assignees: string[];
};

type GraphNode = {
  id: string;
  name: string;
  type: 'issue' | 'file' | 'user';
  url?: string;
  isAvailable?: boolean;
  val?: number;
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

export function GraphNetwork() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/analytics');
        const data = await res.json();
        
        // Build nodes and links for force-directed graph
        const nodeMap = new Map<string, GraphNode>();
        const linkList: GraphLink[] = [];
        
        data.graph.forEach((item: GraphItem) => {
          // Create issue node
          const issueNodeId = `issue-${item.issueId}`;
          if (!nodeMap.has(issueNodeId)) {
            nodeMap.set(issueNodeId, {
              id: issueNodeId,
              name: `#${item.issueId}: ${item.issueTitle.substring(0, 50)}...`,
              type: 'issue',
              url: `https://github.com/langchain-ai/langchain/issues/${item.issueId}`,
              isAvailable: item.isAvailable,
              val: 15, // Node size
            });
          }

          // Create file node
          const fileNodeId = `file-${item.filePath}`;
          if (!nodeMap.has(fileNodeId)) {
            nodeMap.set(fileNodeId, {
              id: fileNodeId,
              name: item.filePath,
              type: 'file',
              val: 10,
            });
          }

          // Create link from issue to file
          linkList.push({
            source: issueNodeId,
            target: fileNodeId,
            label: 'RELATES_TO',
          });

          // Create user nodes and links
          item.assignees.forEach((assignee) => {
            const userNodeId = `user-${assignee}`;
            if (!nodeMap.has(userNodeId)) {
              nodeMap.set(userNodeId, {
                id: userNodeId,
                name: `👤 ${assignee}`,
                type: 'user',
                val: 8,
              });
            }

            // Create link from issue to user
            linkList.push({
              source: issueNodeId,
              target: userNodeId,
              label: 'ASSIGNED_TO',
            });
          });
        });

        setGraphData({
          nodes: Array.from(nodeMap.values()),
          links: linkList,
        });
      } catch (err) {
        console.error('Failed to fetch graph data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading graph...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Issue Relationship Graph</CardTitle>
        <CardDescription>
          Interactive force-directed network showing how issues connect to code files
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span> Issues (Blue)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500"></span> Files (Green)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span> Users (Purple)
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            💡 Click nodes to open GitHub • Drag to rearrange • Scroll to zoom
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: '700px', width: '100%' }}>
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="name"
            nodeAutoColorBy="type"
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              
              // Node color based on type
              let color = '#3b82f6'; // blue for issues
              if (node.type === 'file') {
                color = '#10b981'; // green for files
              } else if (node.type === 'user') {
                color = '#8b5cf6'; // purple for users
              } else if (node.type === 'issue' && !node.isAvailable) {
                color = '#ef4444'; // red for claimed issues
              }
              
              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val || 5, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
              
              // Draw label
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#fff';
              ctx.fillText(label, node.x, node.y + (node.val || 5) + fontSize + 2);
            }}
            onNodeClick={(node: any) => {
              if (node.url) {
                window.open(node.url, '_blank');
              }
            }}
            linkLabel="label"
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.25}
            linkColor={() => '#64748b'}
            linkWidth={2}
            backgroundColor="transparent"
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            cooldownTicks={100}
            onEngineStop={() => fgRef.current?.zoomToFit(400)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
