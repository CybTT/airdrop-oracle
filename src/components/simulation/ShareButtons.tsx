import { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, Copy, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { SimpleSimulationResults, SimpleSimulationParams } from "@/lib/simple-monte-carlo";
import { AdvancedSimulationParams } from "@/lib/advanced-monte-carlo";
import { ShareCard } from "./ShareCard";
import { formatCurrency } from "@/lib/format";

interface ShareButtonsProps {
  results: SimpleSimulationResults;
  params: SimpleSimulationParams | AdvancedSimulationParams;
  thresholds: number[];
}

export function ShareButtons({ results, params, thresholds }: ShareButtonsProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copyError, setCopyError] = useState<string | null>(null);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    // Wait for fonts to load
    await document.fonts.ready;

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background').trim() 
          ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--background').trim()})`
          : '#0a0a0b'
      });

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  }, []);

  const handleCopyImage = useCallback(async () => {
    setIsGenerating(true);
    setCopyStatus('idle');
    setCopyError(null);

    try {
      const blob = await generateImage();
      if (!blob) {
        throw new Error("Failed to generate image");
      }

      // Check if ClipboardItem is supported
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
        setCopyStatus('error');
        setCopyError("Copy not supported in this browser. Use Download PNG instead.");
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);

      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 3000);
    } catch (error) {
      console.error("Error copying image:", error);
      setCopyStatus('error');
      setCopyError("Copy not supported in this browser. Use Download PNG instead.");
    } finally {
      setIsGenerating(false);
    }
  }, [generateImage]);

  const handleDownloadPng = useCallback(async () => {
    setIsGenerating(true);

    try {
      const blob = await generateImage();
      if (!blob) {
        throw new Error("Failed to generate image");
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `airdrop-simulation-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [generateImage]);

  const handleShareOnX = useCallback(() => {
    const { stats } = results;
    const median = formatCurrency(stats.median, 0);
    const p10 = formatCurrency(stats.p10, 0);
    const p90 = formatCurrency(stats.p90, 0);

    const tweetText = `Sorry For Your Loss. 0 is the answer.

Median per NFT: ${median}
Range (P10–P90): ${p10} – ${p90}

Run your own simulation:
${window.location.origin}`;

    const encodedText = encodeURIComponent(tweetText);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  }, [results]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareOnX}
            className="flex-1 min-w-[100px]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2 fill-current" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyImage}
            disabled={isGenerating}
            className="flex-1 min-w-[100px]"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : copyStatus === 'success' ? (
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copyStatus === 'success' ? 'Copied!' : 'Copy Image'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPng}
            disabled={isGenerating}
            className="flex-1 min-w-[100px]"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PNG
          </Button>
        </div>

        {copyError && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span>{copyError}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Tip: Copy Image first, then paste into X.
        </p>

        {/* Hidden ShareCard for image generation */}
        <div className="absolute -left-[9999px] -top-[9999px] overflow-hidden">
          <ShareCard
            ref={cardRef}
            results={results}
            params={params}
            thresholds={thresholds}
          />
        </div>
      </CardContent>
    </Card>
  );
}
