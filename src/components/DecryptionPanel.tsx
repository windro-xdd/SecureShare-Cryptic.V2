import { useState, useCallback } from "react";
import { Unlock, Download, Copy, Upload, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { decryptText, DEFAULT_MAPPING, mappingToString, stringToMapping, isValidBase64, type CharacterMapping } from "@/lib/encryption";

export function DecryptionPanel() {
  const [encryptedText, setEncryptedText] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [useBase64, setUseBase64] = useState(false);
  const [customMapping, setCustomMapping] = useState<CharacterMapping>(DEFAULT_MAPPING);
  const [mappingString, setMappingString] = useState(mappingToString(DEFAULT_MAPPING));
  const [showMapping, setShowMapping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const file = files[0];
    try {
      const content = await file.text();
      setEncryptedText(content);
      
      if (isValidBase64(content.trim())) {
        setUseBase64(true);
        toast({
          title: "File loaded",
          description: "Base64 content detected. Base64 option enabled automatically.",
        });
      } else {
        toast({
          title: "File loaded successfully",
          description: `${file.name} content loaded for decryption`,
        });
      }
    } catch (error) {
      toast({
        title: "Error reading file",
        description: error instanceof Error ? error.message : "Failed to read file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleClear = () => {
    setEncryptedText("");
    setDecryptedText("");
    toast({ title: "Inputs cleared" });
  };

  const handleDecrypt = useCallback(async () => {
    if (!encryptedText.trim()) {
      toast({
        title: "No content to decrypt",
        description: "Please enter encrypted text or upload a file first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      let mapping = customMapping;
      try {
        mapping = stringToMapping(mappingString);
        setCustomMapping(mapping);
      } catch (error) {
        toast({
          title: "Invalid mapping format",
          description: "Using default mapping. Please check your custom mapping format.",
          variant: "destructive",
        });
        mapping = DEFAULT_MAPPING;
      }

      const decrypted = decryptText(encryptedText.trim(), { useBase64, customMapping: mapping });
      setDecryptedText(decrypted);
      
      toast({
        title: "Decryption successful",
        description: "Text has been decrypted successfully",
      });
    } catch (error) {
      let description = "Invalid encrypted text or wrong settings.";
      if (error instanceof Error && error.message.includes("Invalid character")) {
        description = "Decryption failed. The text may not be valid Base64. Try toggling the Base64 option.";
      } else if (isValidBase64(encryptedText.trim()) && !useBase64) {
        description = "This looks like Base64 text. Try enabling the 'Text is Base64 encoded' option.";
      }

      toast({
        title: "Decryption failed",
        description,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [encryptedText, useBase64, customMapping, mappingString, toast]);

  const handleCopy = useCallback(async () => {
    if (!decryptedText) return;
    
    try {
      await navigator.clipboard.writeText(decryptedText);
      toast({
        title: "Copied to clipboard",
        description: "Decrypted text has been copied to your clipboard",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the text manually",
        variant: "destructive",
      });
    }
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
    
    toast({
      title: "Download started",
      description: "Decrypted file is being downloaded",
    });
  }, [decryptedText, toast]);

  return (
    <Card className="p-6 bg-gradient-card shadow-card border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Unlock className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Decrypt Files</h2>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleClear} disabled={!encryptedText && !decryptedText}>
              <X className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear all inputs</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium mb-3 block">Upload Encrypted File</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept=".txt,.enc"
              onChange={handleFileUpload}
              className="w-full cursor-pointer"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Or upload an encrypted file (.txt, .enc)
            </p>
          </div>
        </div>

        <div>
          <Label className="text-base font-medium mb-3 block">Encrypted Text</Label>
          <Textarea
            value={encryptedText}
            onChange={(e) => setEncryptedText(e.target.value)}
            placeholder="Paste your encrypted text here..."
            className="min-h-[200px] font-mono text-sm bg-background/50 border-border/50"
          />
        </div>

        <div className="bg-background/30 rounded-lg p-4 border border-border/30">
          <Label className="text-base font-medium mb-4 block">Decryption Options</Label>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="base64-decrypt"
                      checked={useBase64}
                      onCheckedChange={setUseBase64}
                    />
                    <Label htmlFor="base64-decrypt" className="text-sm cursor-pointer">
                      Text is Base64 encoded
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enable this if the text was encrypted with Base64.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMapping(!showMapping)}
              >
                {showMapping ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showMapping ? "Hide" : "Show"} Character Mapping
              </Button>
            </div>

            {showMapping && (
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Character Mapping (must match encryption mapping)
                </Label>
                <Textarea
                  value={mappingString}
                  onChange={(e) => setMappingString(e.target.value)}
                  className="h-32 font-mono text-xs bg-background/50"
                  placeholder="a=x&#10;b=y&#10;c=z..."
                />
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleDecrypt}
          disabled={!encryptedText.trim() || isProcessing}
          className="w-full h-12 text-base font-medium bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Unlock className="w-5 h-5 mr-2" />
          )}
          {isProcessing ? "Decrypting..." : "Decrypt Text"}
        </Button>

        {decryptedText && (
          <div>
            <Label className="text-base font-medium mb-3 block text-success">
              Decrypted Output
            </Label>
            <Textarea
              value={decryptedText}
              readOnly
              className="min-h-[150px] font-mono text-sm bg-success/5 border-success/30 text-foreground"
            />
            
            <div className="flex space-x-3 mt-3">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1 transition-all duration-300 hover:shadow-glow"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Text
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex-1 transition-all duration-300 hover:shadow-glow"
              >
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}