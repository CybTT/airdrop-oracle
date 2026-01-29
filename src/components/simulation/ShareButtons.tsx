import { useState, useRef, useCallback, useMemo } from "react";
import { toPng, toSvg } from "html-to-image";
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

  const themeRootClassName = useMemo(() => {
    // Ensure the offscreen capture subtree inherits the same theme classes as the live UI.
    // (This matters if the app ever toggles .dark or other theme root classes.)
    const root = document.documentElement;
    return root.className || "";
  }, []);

  const supportsDisplayP3 = useMemo(() => {
    try {
      const Offscreen = (window as any).OffscreenCanvas;
      if (!Offscreen) return false;
      const c = new Offscreen(1, 1);
      // Safari/Chrome support differs; feature-detect via context options.
      const ctx = c.getContext("2d", { colorSpace: "display-p3" } as any);
      return !!ctx;
    } catch {
      return false;
    }
  }, []);

  const getOpaqueBackground = useCallback(() => {
    // Use the *actual computed* background to avoid theme mismatches & transparency flattening.
    const el = cardRef.current;
    if (!el) return "rgb(0, 0, 0)";
    const bg = getComputedStyle(el).backgroundColor;
    // If somehow transparent, fall back to document background.
    if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") {
      return getComputedStyle(document.body).backgroundColor || "rgb(0, 0, 0)";
    }
    return bg;
  }, []);

  const blobFromCanvas = useCallback(async (canvas: HTMLCanvasElement | OffscreenCanvas, colorSpace?: "display-p3" | "srgb") => {
    // Prefer OffscreenCanvas.convertToBlob (supports modern colorSpace options in Safari).
    const anyCanvas = canvas as any;
    if (typeof anyCanvas.convertToBlob === "function") {
      return (await anyCanvas.convertToBlob({
        type: "image/png",
        // quality is ignored for PNG but harmless
        quality: 1,
        ...(colorSpace ? { colorSpace } : {}),
      })) as Blob;
    }

    // Fallback: HTMLCanvasElement.toBlob (no explicit colorSpace in most browsers).
    return await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob((b) => {
        if (!b) reject(new Error("Failed to create PNG blob"));
        else resolve(b);
      }, "image/png");
    });
  }, []);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    // Wait for fonts to load
    await document.fonts.ready;

    const background = getOpaqueBackground();
    const scale = 2; // Higher DPI while keeping layout width the same

    try {
      // Prefer SVG → (Display‑P3) canvas → PNG for wide-gamut fidelity on Safari/P3 displays.
      // This avoids the common "washed out" effect when DOM is rendered in P3 but rasterized in sRGB.
      const svgDataUrl = await toSvg(cardRef.current, {
        cacheBust: true,
        backgroundColor: background,
        style: {
          // Ensure OS/UI default form controls don't influence colors.
          colorScheme: "dark",
        },
      });

      const img = new Image();
      img.decoding = "async";
      img.src = svgDataUrl;
      await img.decode();

      const rect = cardRef.current.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      const outW = Math.round(width * scale);
      const outH = Math.round(height * scale);

      const useP3 = supportsDisplayP3;
      const colorSpace = useP3 ? ("display-p3" as const) : ("srgb" as const);

      if (useP3 && (window as any).OffscreenCanvas) {
        const offscreen = new (window as any).OffscreenCanvas(outW, outH) as OffscreenCanvas;
        const ctx = offscreen.getContext(
          "2d",
          { alpha: false, colorSpace } as any,
        ) as unknown as OffscreenCanvasRenderingContext2D | null;

        if (!ctx) throw new Error("Could not create 2D context (OffscreenCanvas)");

        ctx.scale(scale, scale);
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        return await blobFromCanvas(offscreen, colorSpace);
      }

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d", { alpha: false } as any) as CanvasRenderingContext2D | null;
      if (!ctx) throw new Error("Could not create 2D context");
      ctx.scale(scale, scale);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return await blobFromCanvas(canvas);
    } catch (error) {
      // Fallback to html-to-image's PNG path if SVG/canvas pipeline fails.
      try {
        const dataUrl = await toPng(cardRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: background,
          style: {
            colorScheme: "dark",
          },
        });
        const response = await fetch(dataUrl);
        return await response.blob();
      } catch (e) {
        console.error("Error generating image:", error, e);
        return null;
      }
    }
  }, [blobFromCanvas, getOpaqueBackground, supportsDisplayP3]);

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
              <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
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
          <div className="flex items-center gap-2 text-sm text-primary">
            <AlertCircle className="h-4 w-4" />
            <span>{copyError}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Tip: Copy Image first, then paste into X.
        </p>

        {/* Hidden ShareCard for image generation */}
        <div
          aria-hidden
          className="fixed left-0 top-0 -z-50 overflow-hidden"
          style={{ transform: "translateX(-200vw) translateY(-200vh)" }}
        >
          <div className={themeRootClassName}>
            <ShareCard
              ref={cardRef}
              results={results}
              params={params}
              thresholds={thresholds}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
