import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { DownloadCloud, KeyRound, File as FileIcon, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { decryptFile } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";

type Status = "idle" | "loading" | "ready" | "decrypting" | "success" | "error";
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

  const initialCode = useMemo(() => location.hash.slice(1), [location.hash]);

  useEffect(() => {
    if (initialCode) {
      setDownloadCode(initialCode);
    }
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
        setErrorMessage(error?.message || "File not found, expired, or already downloaded.");
      } else {
        setMetadata(data);
        setStatus("ready");
      }
    };
    getMetadata();
  }, [fileId, initialCode]);

  const handleDownload = async () => {
    if (!fileId || !metadata || !downloadCode) return;

    setStatus("decrypting");
    setErrorMessage("");

    try {
      // Step 1: Increment download count via Edge Function to validate the link
      const { error: functionError } = await supabase.functions.invoke('increment-download-count', {
        body: { fileId },
      });

      if (functionError) {
        const errorResponse = await functionError.context?.json();
        throw new Error(errorResponse?.error || 'This link has expired or reached its download limit.');
      }

      // Step 2: Download the file from storage
      const filePath = `${fileId}/${metadata.filename}`;
      const { data: blob, error: downloadError } = await supabase.storage
        .from("files")
        .download(filePath);

      if (downloadError) throw new Error(`Failed to download file: ${downloadError.message}`);

      // Step 3: Decrypt and save the file
      const decryptedBlob = await decryptFile(await blob.arrayBuffer(), metadata, downloadCode);

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
      console.error(err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card/80 backdrop-blur-md border-primary/20 shadow-card">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">Download File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4">Fetching file details...</p>
            </div>
          )}

          {(status === "ready" || status === "decrypting") && metadata && (
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
                <label htmlFor="download-code" className="flex items-center text-muted-foreground">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Download Code
                </label>
                <Input
                  id="download-code"
                  value={downloadCode}
                  onChange={(e) => setDownloadCode(e.target.value)}
                  placeholder="Enter the download code..."
                  className="font-mono"
                />
              </div>
              <Button onClick={handleDownload} disabled={!downloadCode || status === "decrypting"} className="w-full bg-gradient-primary text-primary-foreground hover:shadow-glow">
                {status === "decrypting" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying & Downloading...</> : <><DownloadCloud className="mr-2 h-4 w-4" /> Decrypt & Download</>}
              </Button>
            </>
          )}

          {status === "success" && (
             <div className="space-y-6 text-center p-8">
              <CheckCircle className="mx-auto h-16 w-16 text-success" />
              <h3 className="text-2xl font-bold">Download Started!</h3>
              <p className="text-muted-foreground">
                Your file has been decrypted and should be downloading now. This link is now expired.
              </p>
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