import { useState, useCallback } from "react";
import { Shield, Download, Copy, X, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { encrypt } from "@/lib/crypto";
import { FileUpload } from "./FileUpload";
import { PasswordInput } from "./PasswordInput";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function EncryptionPanel() {
  const [originalText, setOriginalText] = useState("");
  const [encryptedOutput, setEncryptedOutput] = useState("");
  const [fileName, setFileName] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileLoad = useCallback((content: string, filename: string) => {
    setOriginalText(content);
    setFileName(filename);
    setEncryptedOutput("");
  }, []);

  const handleClear = () => {
    setOriginalText("");
    setEncryptedOutput("");
    setFileName("");
    setPassphrase("");
    toast({ title: "Inputs cleared" });
  };

  const handleEncrypt = useCallback(async () => {
    if (!originalText.trim()) {
      toast({ title: "No content to encrypt", description: "Please upload a file or enter text first.", variant: "destructive" });
      return;
    }
    if (!passphrase) {
      toast({ title: "Passphrase required", description: "Please enter a passphrase to secure your data.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const encrypted = await encrypt(originalText, passphrase);
      setEncryptedOutput(encrypted);
      toast({ title: "Encryption successful", description: "Your data has been securely encrypted." });
    } catch (error) {
      toast({ title: "Encryption failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [originalText, passphrase, toast]);

  const handleCopy = useCallback(async () => {
    if (!encryptedOutput) return;
    await navigator.clipboard.writeText(encryptedOutput);
    toast({ title: "Copied to clipboard" });
  }, [encryptedOutput, toast]);

  const handleDownload = useCallback(() => {
    if (!encryptedOutput) return;
    const blob = new Blob([encryptedOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `encrypted_${fileName || 'data'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Download started" });
  }, [encryptedOutput, fileName, toast]);

  return (
    <Card className="p-6 bg-gradient-card shadow-card border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Encrypt Data</h2>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleClear} disabled={!originalText && !encryptedOutput}>
              <X className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Clear all inputs</p></TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium mb-3 block">1. Upload or Paste Text</Label>
          <FileUpload onFileLoad={handleFileLoad} />
          {originalText && (
            <Textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="Or paste your text here..."
              className="min-h-[150px] font-mono text-sm bg-background/50 border-border/50 mt-4"
            />
          )}
        </div>

        <div>
          <Label htmlFor="passphrase-encrypt" className="text-base font-medium mb-3 block">
            2. Set a Passphrase
          </Label>
          <PasswordInput
            id="passphrase-encrypt"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter a strong passphrase"
          />
          <p className="text-xs text-muted-foreground mt-2">
            This is your key. It is never stored. You MUST remember it to decrypt your data.
          </p>
        </div>

        <Button
          onClick={handleEncrypt}
          disabled={!originalText.trim() || !passphrase || isProcessing}
          className="w-full h-12 text-base font-medium bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          {isProcessing ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> : <Shield className="w-5 h-5 mr-2" />}
          {isProcessing ? "Encrypting..." : "Encrypt Data"}
        </Button>

        {encryptedOutput && (
          <div>
            <Label className="text-base font-medium mb-3 block text-primary">3. Save Encrypted Output</Label>
            <Alert className="mb-4 border-primary/30 bg-primary/5 text-primary-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <AlertTitle>Save this output!</AlertTitle>
              <AlertDescription>
                You need this entire block of data, plus your passphrase, to decrypt your file.
              </AlertDescription>
            </Alert>
            <Textarea value={encryptedOutput} readOnly className="min-h-[200px] font-mono text-sm bg-primary/5 border-primary/30" />
            <div className="flex space-x-3 mt-3">
              <Button onClick={handleCopy} variant="outline" className="flex-1"><Copy className="w-4 h-4 mr-2" />Copy Data</Button>
              <Button onClick={handleDownload} variant="outline" className="flex-1"><Download className="w-4 h-4 mr-2" />Download .json</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}