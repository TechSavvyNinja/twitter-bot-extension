
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLicense } from "@/contexts/LicenseContext";
import { LicenseActivation } from "@/components/LicenseActivation";
import { Logo } from "@/assets/logo";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const Index = () => {
  const { isActivated, loading } = useLicense();
  const navigate = useNavigate();
  
  // If license is already activated, redirect to dashboard
  useEffect(() => {
    if (isActivated && !loading) {
      navigate("/dashboard");
    }
  }, [isActivated, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2 h-[400px] w-[360px]">
        <Card className="w-full max-w-[320px] mx-auto p-2 shadow-lg">
          <CardContent className="flex flex-col items-center p-1">
            <Logo className="h-8 w-8 mb-1" />
            <p className="text-sm">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-[360px] chrome-extension-container">
      <ScrollArea className="flex-1 h-[615px]">
        <main className="flex-1 bg-gray-100 dark:bg-gray-900 p-4">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tighter">
                <span className="gradient-text">Tweet Boost</span>
              </h1>
              <p className="mx-auto max-w-[320px] text-xs text-gray-500 dark:text-gray-400">
                Grow your Twitter presence with automation.
              </p>
            </div>
            
            <div className="w-full max-w-[320px]">
              <LicenseActivation />
            </div>
            
            <div className="mx-auto max-w-[320px] text-[11px] text-gray-500 dark:text-gray-400">
              <p className="mb-1 font-medium">How It Works:</p>
              <ul className="list-disc list-inside space-y-1 text-left">
                <li>Auto-like tweets from your targets</li>
                <li>Engage with comments naturally</li>
                <li>Post AI-generated relevant comments</li>
                <li>Schedule actions for optimal times</li>
              </ul>
            </div>
          </div>
        </main>
      </ScrollArea>
      
      <footer className="border-t py-1 text-center bg-background w-full">
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} Tweet Boost Buddy
        </p>
      </footer>
    </div>
  );
};

export default Index;
