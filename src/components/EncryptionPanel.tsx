import { useState, useCallback } from "react";
import { Shield, Download, Copy, Settings, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { encryptText, DEFAULT_MAPPING, mappingToString, stringToMapping, type CharacterMapping } from "@/lib/encryption";
import { FileUpload } from "./FileUpload";

export function EncryptionPanel() {
  const [originalText, setOriginalText] = useState("");
  const [encryptedText, setEncryptedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [useBase64, setUseBase64] = useState(false);
  const [customMapping, setCustomMapping] = useState<CharacterMapping>(DEFAULT_MAPPING);
  const [mappingString, setMappingString] = useState(mappingToString(DEFAULT_MAPPING));
  const [showMapping, setShowMapping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileLoad = useCallback((content: string, filename: string) => {
    setOriginalText(content);
    setFileName(filename);
    setEncryptedText("");
  }, []);

  const handleClear = () => {
    setOriginalText("");
    setEncryptedText("");
    setFileName("");
    toast({ title: "Inputs cleared" });
  };

  const handleEncrypt = useCallback(async () => {
    if (!originalText.trim()) {
      toast({
        title: "No content to encrypt",
        description: "Please upload a file or enter text first",
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

      const encrypted = encryptText(originalText, { useBase64, customMapping: mapping });
      setEncryptedText(encrypted);
      
      toast({
        title: "Encryption successful",
        description: `Text encrypted with ${useBase64 ? 'Base64 encoding' : 'custom mapping only'}`,
      });
    } catch (error) {
      toast({
        title: "Encryption failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [originalText, useBase64, customMapping, mappingString, toast]);

  const handleCopy = useCallback(async () => {
    if (!encryptedText) return;
    
    try {
      await navigator.clipboard.writeText(encryptedText);
      toast({
        title: "Copied to clipboard",
        description: "Encrypted text has been copied to your clipboard",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the text manually",
        variant: "destructive",
      });
    }
  }, [encryptedText, toast]);

  const handleDownload = useCallback(() => {
    if (!encryptedText) return;
    
    const blob = new Blob([encryptedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `encrypted_${fileName || 'file.txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: "Encrypted file is being downloaded",
    });
  }, [encryptedText, fileName, toast]);

  return (
    <Card className="p-6 bg-gradient-card shadow-card border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Encrypt Files</h2>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleClear} disabled={!originalText && !encryptedText}>
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
          <Label className="text-base font-medium mb-3 block">Upload File</Label>
          <FileUpload onFileLoad={handleFileLoad} />
        </div>

        {originalText && (
          <div>
            <Label className="text-base font-medium mb-3 block">
              File Content {fileName && <span className="text-muted-foreground">({fileName})</span>}
            </Label>
            <Textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="Your file content will appear here..."
              className="min-h-[200px] font-mono text-sm bg-background/50 border-border/50"
            />
          </div>
        )}

        <div className="bg-background/30 rounded-lg p-4 border border-border/30">
          <Label className="text-base font-medium mb-4 block">Encryption Options</Label>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="base64"
                      checked={useBase64}
                      onCheckedChange={setUseBase64}
                    />
                    <Label htmlFor="base64" className="text-sm cursor-pointer">
                      Use Base64 encoding
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adds an extra layer of encoding. Recommended for most uses.</p>
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
                  Custom Character Mapping (format: original=mapped)
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
          onClick={handleEncrypt}
          disabled={!originalText.trim() || isProcessing}
          className="w-full h-12 text-base font-medium bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Shield className="w-5 h-5 mr-2" />
          )}
          {isProcessing ? "Encrypting..." : "Encrypt Text"}
        </Button>

        {encryptedText && (
          <div>
            <Label className="text-base font-medium mb-3 block text-primary">
              Encrypted Output
            </Label>
            <Textarea
              value={encryptedText}
              readOnly
              className="min-h-[150px] font-mono text-sm bg-primary/5 border-primary/30 text-foreground"
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