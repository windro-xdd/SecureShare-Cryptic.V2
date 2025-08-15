import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { DownloadCloud, KeyRound, File as FileIcon, AlertTriangle, Loader2, CheckCircle, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFileKey, decryptInstructions, decryptFile } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

type Status = "idle" | "loading" | "verifying" | "ready" | "decrypting" | "success" | "error";
type FileMetadata = Awaited<ReturnType<typeof fetchMetadata>>;

function fetchMetadata(fileId: string) {
  return supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .single();
}

export default function DownloadPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const location = useLocation();

  const [status, setStatus] = useState<Status>("loading");
  const [metadata, setMetadata] = useState<FileMetadata["data"] | null>(null);
  const [downloadCode, setDownloadCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState<CryptoKey | null>(null);

  const initialCode = useMemo(() => location.hash.slice(1), [location.hash]);

  useEffect(() => {
    if (initialCode) setDownloadCode(initialCode);
    if (!fileId) {
      setStatus("error");
      setErrorMessage("No file ID provided.");
      return;
    }
    const getMetadata = async () => {
      setStatus("loading");
      const { data, error } = await fetchMetadata(fileId);
      if (error || !data) {
        setStatus("error");
        setErrorMessage(error?.message || "File not found, expired, or has reached its download limit.");
      } else {
        setMetadata(data);
        setStatus("idle");
      }
    };
    getMetadata();
  }, [fileId, initialCode]);

  const handleVerifyCode = async () => {
    if (!metadata || !downloadCode) return;
    setStatus("verifying");
    setErrorMessage("");
    try {
      const key = await getFileKey(metadata, downloadCode);
      setFileKey(key);
      const decryptedInstructions = await decryptInstructions(metadata, key);
      setInstructions(decryptedInstructions);
      setIsCodeVerified(true);
      setStatus("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  const handleDownload = async () => {
    if (!fileId || !metadata || !fileKey) return;
    setStatus("decrypting");
    setErrorMessage("");
    try {
      const { error: functionError } = await supabase.functions.invoke('increment-download-count', { body: { fileId } });
      if (functionError) {
        const errorResponse = await functionError.context?.json();
        throw new Error(errorResponse?.error || 'This link has expired or reached its download limit.');
      }
      const { data: blob, error: downloadError } = await supabase.storage.from("files").download(fileId);
      if (downloadError) throw new Error(`Failed to download file: ${downloadError.message}`);
      const decryptedBlob = await decryptFile(await blob.arrayBuffer(), metadata, fileKey);
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = metadata.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card/80 backdrop-blur-md border-primary/20 shadow-card">
        <CardHeader>
            <div className="flex justify-between items-center">
                <div className="w-8"></div>
                <CardTitle className="text-center text-2xl font-bold text-primary">Download File</CardTitle>
                <ThemeToggle />
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4">Fetching file details...</p>
            </div>
          )}

          {(status === "idle" || status === "verifying" || status === "ready" || status === "decrypting") && metadata && !isCodeVerified && (
            <>
              <div className="flex items-center justify-between rounded-md border border-border bg-background/50 p-4">
                <div className="flex items-center gap-4">
                  <FileIcon className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">{metadata.filename}</p>
                    <p className="text-sm text-muted-foreground">{(metadata.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="download-code" className="flex items-center text-muted-foreground">
                  <KeyRound className="mr-2 h-4 w-4" /> Download Code
                </Label>
                <Input id="download-code" value={downloadCode} onChange={(e) => setDownloadCode(e.target.value)} placeholder="Enter the download code..." className="font-mono" />
              </div>
              <Button onClick={handleVerifyCode} disabled={!downloadCode || status === "verifying"} className="w-full">
                {status === "verifying" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Verify Code</>}
              </Button>
            </>
          )}

          {isCodeVerified && metadata && (
            <>
              {instructions && (
                <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/10 p-4">
                  <Label className="flex items-center"><MessageSquare className="mr-2 h-4 w-4" /> Note from Sender</Label>
                  <p className="text-sm text-foreground/90">{instructions}</p>
                </div>
              )}
              <Button onClick={handleDownload} disabled={status === "decrypting"} className="w-full bg-gradient-primary text-primary-foreground hover:shadow-glow">
                {status === "decrypting" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Decrypting...</> : <><DownloadCloud className="mr-2 h-4 w-4" /> Decrypt & Download</>}
              </Button>
            </>
          )}

          {status === "success" && (
             <div className="space-y-6 text-center p-8">
              <CheckCircle className="mx-auto h-16 w-16 text-success" />
              <h3 className="text-2xl font-bold">Download Started!</h3>
              <p className="text-muted-foreground">Your file has been decrypted and should be downloading now. This link may now be expired.</p>
              <Button onClick={() => window.location.href = '/'} className="w-full">Share Another File</Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-destructive bg-destructive/10 p-8 text-destructive">
              <AlertTriangle className="h-10 w-10" />
              <p className="text-center font-medium">{errorMessage}</p>
              <Button variant="destructive" onClick={() => window.location.href = '/'}>Go Home</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}