'use client';

import { ModeToggle } from '@/components/mode-toggle';
import { AnalyticsCharts } from '@/components/analytics-charts';
import { GraphNetwork } from '@/components/graph-network';
import { FileCode, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function VisualizationsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Analytics & Visualizations</h1>
                <p className="text-sm text-muted-foreground">Data insights and network graphs</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                <FileCode className="h-4 w-4 mr-2" />
                Back to Issues
              </Button>
            </Link>
          </div>
          <ModeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Charts Section */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-6">📊 Analytics Dashboard</h2>
            <AnalyticsCharts />
          </section>

          {/* Graph Network Section */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-6">🕸️ Relationship Network</h2>
            <GraphNetwork />
          </section>
        </div>
      </main>
    </div>
  );
}
