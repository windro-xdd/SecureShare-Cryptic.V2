import { TerminalUI } from "@/components/TerminalUI";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Blobs */}
      <div className="absolute top-0 -left-24 w-96 h-96 bg-primary/5 rounded-full mix-blend-soft-light filter blur-3xl opacity-50 animate-blob" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-0 -right-24 w-96 h-96 bg-secondary/5 rounded-full mix-blend-soft-light filter blur-3xl opacity-50 animate-blob" style={{ animationDelay: '2s' }}></div>
      
      <div className="relative z-10 w-full">
        <TerminalUI />
      </div>
    </div>
  );
};

export default Index;