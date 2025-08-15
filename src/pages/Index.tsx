import { useState } from "react";
import { Shield, Lock, Unlock, Github, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EncryptionPanel } from "@/components/EncryptionPanel";
import { DecryptionPanel } from "@/components/DecryptionPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AboutDialog } from "@/components/AboutDialog";

const Index = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">SecureShare</h1>
                <p className="text-sm text-muted-foreground">Client-side file encryption</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => setIsAboutOpen(true)}>
                <Info className="w-4 h-4 mr-2" />
                How it works
              </Button>
              <a href="https://github.com/lovable-labs/secureshare" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Github className="w-4 h-4 mr-2" />
                  Source
                </Button>
              </a>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 lg:py-16">
        <div className="grid lg:grid-cols-2 lg:gap-16 items-start">
          {/* Left Column: Hero Text */}
          <div className="text-center lg:text-left lg:pt-4">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              <span>100% Client-Side Encryption</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Secure File
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Encryption</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 mb-8">
              Encrypt and decrypt your text files securely in your browser. 
              No data ever leaves your device - complete privacy guaranteed.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>AES-256-GCM Encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>Device-Specific Keys</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>No Server Interaction</span>
              </div>
            </div>

            {/* Security Notice - Desktop */}
            <Card className="hidden lg:block mt-12 p-6 bg-primary/5 border-primary/20">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Security & Privacy</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    All processing happens in your browser. Your files and passphrase never leave your device. 
                    Click "How it works" for details.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Main App Interface */}
          <div className="w-full mt-12 lg:mt-0">
            <Tabs defaultValue="encrypt" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-background/50 border border-border/50">
                <TabsTrigger 
                  value="encrypt" 
                  className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Lock className="w-4 h-4" />
                  <span>Encrypt</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="decrypt"
                  className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Decrypt</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="encrypt">
                <EncryptionPanel />
              </TabsContent>

              <TabsContent value="decrypt">
                <DecryptionPanel />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Security Notice - Mobile */}
        <Card className="lg:hidden max-w-2xl mx-auto mt-12 p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Security & Privacy</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All processing happens in your browser. Your files and passphrase never leave your device. 
                Click "How it works" for details.
              </p>
            </div>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-background/10 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Built with React, TypeScript, and Tailwind CSS. No backend required.</p>
          </div>
        </div>
      </footer>
      
      <AboutDialog open={isAboutOpen} onOpenChange={setIsAboutOpen} />
    </div>
  );
};

export default Index;