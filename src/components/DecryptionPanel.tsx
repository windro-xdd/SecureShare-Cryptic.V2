import { useState, useCallback } from "react";
import { Unlock, Download, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { decrypt } from "@/lib/crypto";
import { PasswordInput } from "./PasswordInput";

export function DecryptionPanel() {
  const [encryptedInput, setEncryptedInput] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      toast({ title: "Invalid file type", description: "Please upload the .json file that was generated during encryption.", variant: "destructive" });
      return;
    }

    try {
      const content = await file.text();
      setEncryptedInput(content);
      toast({ title: "File loaded successfully" });
    } catch (error) {
      toast({ title: "Error reading file", description: error instanceof Error ? error.message : "Failed to read file", variant: "destructive" });
    }
  }, [toast]);

  const handleClear = () => {
    setEncryptedInput("");
    setDecryptedText("");
    setPassphrase("");
    toast({ title: "Inputs cleared" });
  };

  const handleDecrypt = useCallback(async () => {
    if (!encryptedInput.trim()) {
      toast({ title: "No content to decrypt", description: "Please paste the encrypted data or upload a file.", variant: "destructive" });
      return;
    }
    if (!passphrase) {
      toast({ title: "Passphrase required", description: "Please enter the passphrase used for encryption.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setDecryptedText("");
    try {
      const decrypted = await decrypt(encryptedInput, passphrase);
      setDecryptedText(decrypted);
      toast({ title: "Decryption successful" });
    } catch (error) {
      toast({ title: "Decryption Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [encryptedInput, passphrase, toast]);

  const handleCopy = useCallback(async () => {
    if (!decryptedText) return;
    await navigator.clipboard.writeText(decryptedText);
    toast({ title: "Copied to clipboard" });
  }, [decryptedText, toast]);

  const handleDownload = useCallback(() => {
    if (!decryptedText) return;
    const blob = new Blob([decryptedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decrypted_file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Download started" });
  }, [decryptedText, toast]);

  return (
    <Card className="p-6 bg-gradient-card shadow-lg border-border/50 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Unlock className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Decrypt Data</h2>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleClear} disabled={!encryptedInput && !decryptedText}>
              <X className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Clear all inputs</p></TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium mb-3 block">1. Upload or Paste Encrypted Data</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
            <input type="file" accept=".json" onChange={handleFileUpload} className="w-full cursor-pointer" />
          </div>
          <Textarea
            value={encryptedInput}
            onChange={(e) => setEncryptedInput(e.target.value)}
            placeholder="Or paste your encrypted JSON data here..."
            className="min-h-[200px] font-mono text-sm bg-background/50 border-border/50 mt-4"
          />
        </div>

        <div>
          <Label htmlFor="passphrase-decrypt" className="text-base font-medium mb-3 block">2. Enter Passphrase</Label>
          <PasswordInput
            id="passphrase-decrypt"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter the original passphrase"
          />
        </div>

        <Button
          onClick={handleDecrypt}
          disabled={!encryptedInput.trim() || !passphrase || isProcessing}
          className="w-full h-12 text-base font-medium bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          {isProcessing ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> : <Unlock className="w-5 h-5 mr-2" />}
          {isProcessing ? "Decrypting..." : "Decrypt Data"}
        </Button>

        {decryptedText && (
          <div>
            <Label className="text-base font-medium mb-3 block text-success">3. Decrypted Output</Label>
            <Textarea value={decryptedText} readOnly className="min-h-[150px] font-mono text-sm bg-success/5 border-success/30" />
            <div className="flex space-x-3 mt-3">
              <Button onClick={handleCopy} variant="outline" className="flex-1"><Copy className="w-4 h-4 mr-2" />Copy Text</Button>
              <Button onClick={handleDownload} variant="outline" className="flex-1"><Download className="w-4 h-4 mr-2" />Download .txt</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}