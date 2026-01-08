'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings, Download, BarChart3, Sparkles } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">ZSXQ Exporter</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/export"
            className="flex items-center space-x-1 transition-colors hover:text-foreground/80 text-foreground/60"
          >
            <Download className="h-4 w-4" />
            <span>导出</span>
          </Link>
          <Link
            href="/analyze"
            className="flex items-center space-x-1 transition-colors hover:text-foreground/80 text-foreground/60"
          >
            <BarChart3 className="h-4 w-4" />
            <span>分析</span>
          </Link>
          <Link
            href="/generate"
            className="flex items-center space-x-1 transition-colors hover:text-foreground/80 text-foreground/60"
          >
            <Sparkles className="h-4 w-4" />
            <span>生成</span>
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
