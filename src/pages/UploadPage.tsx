import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, File as FileIcon, CheckCircle, Copy, AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { generateDownloadCode, encryptFile } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Status = "idle" | "uploading" | "success" | "error";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [downloadCode, setDownloadCode] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [expireAfterDownload, setExpireAfterDownload] = useState(true);
  const { toast } = useToast();

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
      setDownloadCode(code);

      setProgress(25);
      const { ciphertext, envelope } = await encryptFile(file, code);
      setProgress(50);

      const fileId = crypto.randomUUID();
      const filePath = `${fileId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("files")
        .upload(filePath, ciphertext, {
          contentType: "application/octet-stream",
        });

      if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);
      setProgress(75);

      const expires_at = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
      const max_downloads = expireAfterDownload ? 1 : 10;

      const { error: dbError } = await supabase.from("files").insert({
        id: fileId,
        ...envelope,
        expires_at,
        max_downloads,
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard!` });
  };

  const resetState = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setDownloadCode("");
    setShareUrl("");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card/80 backdrop-blur-md border-primary/20 shadow-card">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">SecureShare</CardTitle>
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
                  <div className="space-y-2">
                    <Label htmlFor="expires-in">Expires In</Label>
                    <Select
                      value={String(expiresInHours)}
                      onValueChange={(value) => setExpiresInHours(Number(value))}
                    >
                      <SelectTrigger id="expires-in" className="w-full">
                        <SelectValue placeholder="Select expiration time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Hour</SelectItem>
                        <SelectItem value="6">6 Hours</SelectItem>
                        <SelectItem value="12">12 Hours</SelectItem>
                        <SelectItem value="24">24 Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="expire-after-download">Expire after 1 download</Label>
                      <p className="text-[0.8rem] text-muted-foreground">
                        The link will become invalid after one download.
                      </p>
                    </div>
                    <Switch
                      id="expire-after-download"
                      checked={expireAfterDownload}
                      onCheckedChange={setExpireAfterDownload}
                    />
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
              <h3 className="text-2xl font-bold">File Encrypted & Ready to Share!</h3>
              <p className="text-muted-foreground">
                Share the link below. The file will expire in {expiresInHours} {expiresInHours === 1 ? 'hour' : 'hours'}
                {expireAfterDownload && " or after one download"}.
              </p>
              
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

              <Button onClick={resetState} className="w-full">Share Another File</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}