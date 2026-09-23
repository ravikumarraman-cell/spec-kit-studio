import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface MermaidViewerProps {
  chart: string;
  isDarkMode?: boolean;
}

function sanitizeMermaidChart(chart: string): string {
  if (!chart) return '';
  // Wrap unquoted link labels containing @ or special characters in quotes
  return chart.replace(/\|([^|"'\n]*@[^|"'\n]*)\|/g, (match, label) => {
    return `|"${label.trim()}"|`;
  });
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ chart, isDarkMode = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      if (!chart || !chart.trim()) {
        setSvgContent('');
        setError(null);
        return;
      }

      setIsRendering(true);
      setError(null);

      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? 'dark' : 'default',
          securityLevel: 'strict',
          fontFamily: 'system-ui, sans-serif',
        });
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
        const cleanedChart = sanitizeMermaidChart(chart);
        const { svg } = await mermaid.render(id, cleanedChart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Syntax error in Mermaid diagram definition.';
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, isDarkMode]);

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-mono space-y-2">
        <div className="flex items-center gap-2 font-semibold text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>Diagram Render Warning</span>
        </div>
        <p className="opacity-90">{error}</p>
        <div className="mt-2 text-[11px] text-zinc-400 bg-zinc-950 p-2 rounded border border-zinc-800 overflow-x-auto">
          <code>{chart}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-auto rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-4 min-h-40 flex items-center justify-center">
      {isRendering && (
        <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center gap-2 text-xs text-cyan-400 font-medium z-10">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Rendering Architecture Diagram...</span>
        </div>
      )}
      {svgContent ? (
        <div
          ref={containerRef}
          className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : (
        <div className="text-xs text-zinc-500 italic">No valid Mermaid diagram provided.</div>
      )}
    </div>
  );
};
