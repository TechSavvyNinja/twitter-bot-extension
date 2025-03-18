
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useLicense } from "@/contexts/LicenseContext";
import { useToast } from "@/components/ui/use-toast";

export function LicenseActivation() {
  const { licenseKey, setLicenseKey, activateLicense } = useLicense();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const success = await activateLicense();
      
      if (success) {
        toast({
          title: "License Activated!",
          description: "Your license key has been successfully activated.",
          duration: 3000,
        });
        navigate("/dashboard");
      } else {
        toast({
          title: "Activation Failed",
          description: "Please enter any text in the license key field.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Activation Error",
        description: "There was an error activating your license. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold">Activate License</CardTitle>
        <CardDescription className="text-xs">
          Enter any text as your license key to activate Tweet Boost Buddy.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleActivate}>
        <CardContent className="pb-2">
          <div className="grid w-full items-center gap-2">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="licenseKey" className="text-sm">License Key</Label>
              <Input
                id="licenseKey"
                placeholder="Enter any text as license key"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            type="submit"
            className="w-full gradient-bg h-8 text-sm"
            disabled={isSubmitting || !licenseKey.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Activate License
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
