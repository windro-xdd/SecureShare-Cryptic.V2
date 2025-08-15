import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileLoad: (content: string, filename: string) => void;
  accept?: string;
  className?: string;
}

export function FileUpload({ onFileLoad, accept = ".txt,.md,.json,.csv", className = "" }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('text/') && !file.name.match(/\.(txt|md|json|csv|log)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a text file (.txt, .md, .json, .csv, .log)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const content = await file.text();
      onFileLoad(content, file.name);
      toast({
        title: "File loaded successfully",
        description: `${file.name} has been loaded for encryption`,
      });
    } catch (error) {
      toast({
        title: "Error reading file",
        description: error instanceof Error ? error.message : "Failed to read file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [onFileLoad, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-primary bg-primary/5 shadow-glow' 
            : 'border-border hover:border-primary/50 hover:bg-primary/2'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center space-y-4">
          {isLoading ? (
            <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-16 h-16 text-muted-foreground" />
          )}
          
          <div>
            <p className="text-xl font-medium text-foreground">
              {isLoading ? "Reading file..." : "Drop your file here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse (.txt, .md, .json, .csv, .log)
            </p>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            disabled={isLoading}
            className="transition-all duration-200 hover:shadow-glow"
          >
            <FileText className="w-4 h-4 mr-2" />
            Choose File
          </Button>
        </div>
      </div>
    </div>
  );
}