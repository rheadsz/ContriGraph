// src/app/page.tsx
import { ModeToggle } from "@/components/mode-toggle";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background/90 via-blue-50/20 to-background/90 dark:from-background/90 dark:via-blue-900/10 dark:to-background/90">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-end">
          <ModeToggle />
        </div>
        
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
          <h1 className="text-3xl font-bold text-gray-900">OSS Contribution Guide</h1>
          <p className="mt-2 text-gray-600">
            Find your next open-source contribution with AI-powered insights.
          </p>
        </div>
      </div>
    </main>
  );
}