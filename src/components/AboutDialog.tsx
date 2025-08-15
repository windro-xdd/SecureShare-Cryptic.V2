import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Lock, ServerOff } from "lucide-react"

interface AboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">How SecureShare Works</DialogTitle>
          <DialogDescription>
            Your privacy and security are our top priorities.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-start space-x-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">100% Client-Side Encryption</h3>
              <p className="text-sm text-muted-foreground">
                All encryption and decryption happens directly in your browser. Your files, text, and passwords never leave your device.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Custom Encryption Algorithm</h3>
              <p className="text-sm text-muted-foreground">
                We use a multi-step process involving character substitution, string reversal, and optional Base64 encoding to secure your data.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <ServerOff className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">No Server, No Tracking</h3>
              <p className="text-sm text-muted-foreground">
                This is a serverless application. We do not store your data, track your activity, or use cookies. Your privacy is guaranteed.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}