import { useState, useCallback, useRef, useEffect } from "react";
import { Terminal, Upload, Download, Copy, X, Shield, Unlock, KeyRound, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "./PasswordInput";
import { useToast } from "@/hooks/use-toast";
import { encrypt, decrypt } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

type LogEntry = {
  id: number;
  type: 'command' | 'response' | 'error' | 'success' | 'info' | 'component';
  content: React.ReactNode;
  timestamp: string;
};

type ModeState = {
  fileContent: string;
  fileName: string | null;
  passphrase: string;
};

const initialModeState: ModeState = {
  fileContent: '',
  fileName: null,
  passphrase: '',
};

export function TerminalUI() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  
  const [encryptState, setEncryptState] = useState<ModeState>(initialModeState);
  const [decryptState, setDecryptState] = useState<ModeState>(initialModeState);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addLogEntry = useCallback((type: LogEntry['type'], content: React.ReactNode) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prevLog => [...prevLog, { id: Date.now(), type, content, timestamp }]);
  }, []);

  useEffect(() => {
    addLogEntry('info', 'Terminal initialized. Ready for commands.');
  }, [addLogEntry]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [mode]);

  const handleFileLoad = useCallback((content: string, filename: string) => {
    if (mode === 'encrypt') {
      setEncryptState(s => ({ ...s, fileContent: content, fileName: filename }));
    } else {
      setDecryptState(s => ({ ...s, fileContent: content, fileName: filename }));
    }
    addLogEntry('success', `File received: ${filename} (${(content.length / 1024).toFixed(2)} KB)`);
  }, [addLogEntry, mode]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleFileLoad(content, file.name);
      };
      reader.readAsText(file);
    }
  }, [handleFileLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleFileLoad(content, file.name);
      };
      reader.readAsText(file);
    }
  }, [handleFileLoad]);

  const handleClear = () => {
    if (mode === 'encrypt') {
      setEncryptState(initialModeState);
    } else {
      setDecryptState(initialModeState);
    }
    addLogEntry('info', `Inputs for ${mode} mode cleared.`);
  };

  const executeCommand = async () => {
    if (isProcessing) return;

    const command = mode === 'encrypt' ? 'encrypt' : 'decrypt';
    const currentState = mode === 'encrypt' ? encryptState : decryptState;

    addLogEntry('command', `secureshare> ${command} --file ${currentState.fileName || (mode === 'encrypt' ? 'pasted_text.txt' : 'pasted_data.json')}`);

    if (!currentState.fileContent) {
      addLogEntry('error', 'Error: No file or text content provided.');
      return;
    }
    if (!currentState.passphrase) {
      addLogEntry('error', 'Error: Passphrase is required.');
      return;
    }

    setIsProcessing(true);
    addLogEntry('info', `${mode === 'encrypt' ? 'Encrypting' : 'Decrypting'} data...`);

    try {
      const startTime = performance.now();
      let result: string;
      if (mode === 'encrypt') {
        result = await encrypt(currentState.fileContent, currentState.passphrase);
      } else {
        result = await decrypt(currentState.fileContent, currentState.passphrase);
      }
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(0);

      addLogEntry('success', `Operation successful in ${duration}ms.`);
      addLogEntry('component', <OutputBlock content={result} isJson={mode === 'encrypt'} fileName={currentState.fileName} />);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addLogEntry('error', `Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const OutputBlock = ({ content, isJson, fileName }: { content: string, isJson: boolean, fileName: string | null }) => (
    <div className="bg-black/30 p-4 rounded-md my-2">
      <pre className="whitespace-pre-wrap break-all text-sm text-foreground/80 max-h-48 overflow-y-auto">{content}</pre>
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(content); toast({ title: 'Copied to clipboard' }); }}>
          <Copy className="w-4 h-4 mr-2" /> Copy
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          const blob = new Blob([content], { type: isJson ? 'application/json' : 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${mode}_${fileName || 'output'}.${isJson ? 'json' : 'txt'}`;
          a.click();
          URL.revokeObjectURL(url);
        }}>
          <Download className="w-4 h-4 mr-2" /> Download
        </Button>
      </div>
    </div>
  );

  const currentState = mode === 'encrypt' ? encryptState : decryptState;
  const currentSetter = mode === 'encrypt' ? setEncryptState : setDecryptState;

  return (
    <div className="w-full max-w-4xl mx-auto h-[720px] flex flex-col bg-card/80 backdrop-blur-md border border-primary/20 rounded-lg shadow-card overflow-hidden">
      {/* Title Bar */}
      <div className="flex-shrink-0 flex items-center px-4 py-2 bg-black/20 border-b border-primary/20">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex-grow text-center text-sm text-muted-foreground">
          <Terminal className="w-4 h-4 inline-block mr-2" /> SecureShare — Terminal
        </div>
      </div>

      {/* Console Log */}
      <div
        className={cn("flex-grow p-4 overflow-y-auto relative", isDragOver && "bg-primary/10")}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isDragOver && (
            <div className="p-8 border-2 border-dashed border-primary rounded-lg text-center">
              <Upload className="w-12 h-12 text-primary mx-auto mb-2" />
              <p className="text-primary font-semibold">Drop file to upload</p>
            </div>
          )}
        </div>
        <div className="font-mono text-sm">
          <div className="text-primary">
            ┌─────────────────────────────────────────────────┐<br />
            │ SecureShare v2.0 — Client-Side Encryption │<br />
            └─────────────────────────────────────────────────┘
          </div>
          {log.map(entry => (
            <div key={entry.id} className="flex">
              <span className="text-muted-foreground/50 mr-4">{entry.timestamp}</span>
              <div className="flex-grow">
                {entry.type === 'command' && <span className="text-primary">{entry.content}</span>}
                {entry.type === 'response' && <span className="text-foreground">{entry.content}</span>}
                {entry.type === 'error' && <span className="text-destructive"><AlertTriangle className="inline w-4 h-4 mr-2"/>{entry.content}</span>}
                {entry.type === 'success' && <span className="text-success"><CheckCircle className="inline w-4 h-4 mr-2"/>{entry.content}</span>}
                {entry.type === 'info' && <span className="text-muted-foreground"><Info className="inline w-4 h-4 mr-2"/>{entry.content}</span>}
                {entry.type === 'component' && entry.content}
              </div>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-primary/20 bg-black/20 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-primary font-bold">secureshare&gt;</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={mode === 'encrypt' ? 'default' : 'outline'} onClick={() => setMode('encrypt')}><Shield className="w-4 h-4 mr-2"/>Encrypt</Button>
            <Button size="sm" variant={mode === 'decrypt' ? 'default' : 'outline'} onClick={() => setMode('decrypt')}><Unlock className="w-4 h-4 mr-2"/>Decrypt</Button>
          </div>
          <div className="relative">
            <Button size="sm" variant="outline" onClick={() => document.getElementById('file-input')?.click()}><Upload className="w-4 h-4 mr-2"/>Choose File</Button>
            <input id="file-input" type="file" className="hidden" onChange={handleFileSelect} />
          </div>
          <Button size="sm" variant="ghost" onClick={handleClear} className="text-muted-foreground"><X className="w-4 h-4 mr-2"/>Clear</Button>
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="passphrase-input" className="flex items-center text-muted-foreground whitespace-nowrap">
            <KeyRound className="w-4 h-4 mr-2"/>--passphrase
          </label>
          <PasswordInput 
            id="passphrase-input" 
            value={currentState.passphrase} 
            onChange={e => currentSetter(s => ({ ...s, passphrase: e.target.value }))} 
            placeholder="Enter passphrase..." 
            className="flex-grow bg-background/50" 
          />
          <Button onClick={executeCommand} disabled={isProcessing} className="bg-gradient-primary text-primary-foreground hover:shadow-glow">
            {isProcessing ? 'Processing...' : 'Execute'}
          </Button>
        </div>
        <Textarea 
          ref={textareaRef}
          value={currentState.fileContent}
          onChange={(e) => {
            currentSetter(s => ({ ...s, fileContent: e.target.value, fileName: s.fileName || (mode === 'encrypt' ? 'pasted_text.txt' : 'pasted_data.json') }));
          }}
          placeholder={mode === 'encrypt' ? "Paste text to encrypt here..." : "Paste encrypted JSON data here..."}
          className="min-h-[80px] bg-background/50 font-mono text-sm"
        />
      </div>
    </div>
  );
}