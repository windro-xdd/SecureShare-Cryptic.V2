import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File as FileIcon, CheckCircle, Copy, AlertTriangle, Loader2, X, Share2, Palette } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateDownloadCode, encryptFile } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

type Status = "idle" | "uploading" | "success" | "error";

const accents = [
  { name: "teal", color: "bg-[hsl(180,81%,55%)]" },
  { name: "blue", color: "bg-[hsl(217,91%,60%)]" },
  { name: "rose", color: "bg-[hsl(347,90%,61%)]" },
  { name: "amber", color: "bg-[hsl(43,96%,56%)]" },
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(1);
  const [instructions, setInstructions] = useState("");
  const { toast } = useToast();
  const { accent, setAccent } = useTheme();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus("idle");
      setErrorMessage("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    setProgress(0);
    setErrorMessage("");

    try {
      const code = generateDownloadCode();
      
      setProgress(25);
      const { ciphertext, envelope } = await encryptFile(file, code, instructions);
      setProgress(50);

      const fileId = crypto.randomUUID();
      const filePath = fileId;

      const { error: uploadError } = await supabase.storage
        .from("files")
        .upload(filePath, ciphertext, {
          contentType: "application/octet-stream",
        });

      if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);
      setProgress(75);

      const expires_at = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

      const { error: dbError } = await supabase.from("files").insert({
        id: fileId,
        ...envelope,
        expires_at,
        max_downloads: maxDownloads,
        theme_accent: accent,
      });

      if (dbError) throw new Error(`Database error: ${dbError.message}`);
      
      const url = `${window.location.origin}/d/${fileId}#${code}`;
      setShareUrl(url);
      setProgress(100);
      setStatus("success");

    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied to clipboard!` });
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast({
        title: "Failed to copy",
        description: "Could not copy text to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Secure Share File",
          text: "Here is a secure file shared with you:",
          url: shareUrl,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      await copyToClipboard(shareUrl, "Share link");
    }
  };

  const resetState = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setShareUrl("");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card/80 backdrop-blur-md border-primary/20 shadow-card">
        <CardHeader>
            <div className="flex justify-between items-center">
                <div className="w-8"></div>
                <CardTitle className="text-center text-2xl font-bold text-primary">Secure Share</CardTitle>
                <ThemeToggle />
            </div>
        </CardHeader>
        <CardContent>
          {status !== "success" && (
            <div className="space-y-6">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed border-primary/30 rounded-lg p-12 text-center cursor-pointer transition-colors",
                  isDragActive && "border-primary bg-primary/10"
                )}
              >
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto h-12 w-12 text-primary/70" />
                <p className="mt-4 text-muted-foreground">
                  {isDragActive ? "Drop the file here" : "Drag & drop a file here, or click to select"}
                </p>
              </div>

              {file && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border border-border bg-background/50 p-3">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-semibold">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expires-in">Expires In</Label>
                      <Select
                        value={String(expiresInHours)}
                        onValueChange={(value) => setExpiresInHours(Number(value))}
                      >
                        <SelectTrigger id="expires-in"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Hour</SelectItem>
                          <SelectItem value="6">6 Hours</SelectItem>
                          <SelectItem value="24">24 Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-downloads">Download Limit</Label>
                      <Select
                        value={String(maxDownloads)}
                        onValueChange={(value) => setMaxDownloads(Number(value))}
                      >
                        <SelectTrigger id="max-downloads"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => 
                            <SelectItem key={n} value={String(n)}>{n} download{n > 1 ? 's' : ''}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instructions">Recipient Note (optional, encrypted)</Label>
                    <Textarea 
                      id="instructions"
                      placeholder="e.g., Here is the report for Q3."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      maxLength={280}
                    />
                  </div>
                   <div className="space-y-2">
                    <Label className="flex items-center"><Palette className="mr-2 h-4 w-4" /> Accent Color</Label>
                    <div className="flex items-center gap-2">
                      {accents.map((a) => (
                        <button
                          key={a.name}
                          onClick={() => setAccent(a.name as any)}
                          className={cn(
                            "h-8 w-8 rounded-full transition-all",
                            a.color,
                            accent === a.name && "ring-2 ring-offset-2 ring-ring ring-offset-background"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {status === "uploading" && <Progress value={progress} className="w-full" />}
              
              {status === "error" && (
                <div className="flex items-center gap-3 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="text-sm font-medium">{errorMessage}</p>
                </div>
              )}

              <Button onClick={handleUpload} disabled={!file || status === "uploading"} className="w-full bg-gradient-primary text-primary-foreground hover:shadow-glow">
                {status === "uploading" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Encrypting & Uploading...</> : "Encrypt & Share"}
              </Button>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-6 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-success" />
              <h3 className="text-2xl font-bold">File Ready to Share!</h3>
              <div className="p-4 bg-white rounded-lg inline-block shadow-lg">
                <QRCodeSVG value={shareUrl} size={160} includeMargin={true} level="H" />
              </div>
              <div className="space-y-4 text-left">
                <div>
                  <Label htmlFor="share-url">Share Link (includes code)</Label>
                  <div className="flex gap-2">
                    <Input id="share-url" readOnly value={shareUrl} className="font-mono"/>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(shareUrl, "Share link")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleNativeShare} className="w-full">
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                <Button onClick={resetState} className="w-full" variant="outline">Share Another File</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}