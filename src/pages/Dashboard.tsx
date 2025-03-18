
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLicense } from "@/contexts/LicenseContext";
import { MainNav } from "@/components/MainNav";
import { AccountManager } from "@/components/AccountManager";
import { Settings } from "@/components/Settings";
import { ControlPanel } from "@/components/ControlPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const Dashboard = () => {
  const { isActivated, loading } = useLicense();
  const navigate = useNavigate();
  const [hasError, setHasError] = useState(false);
  const [rateLimit, setRateLimit] = useState(false);
  
  // If license is not activated, redirect to home
  useEffect(() => {
    if (!isActivated && !loading) {
      navigate("/");
    }
  }, [isActivated, loading, navigate]);

  // Check for Twitter rate limits
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const checkRateLimits = () => {
        chrome.storage.local.get(['dailyStats'], (result) => {
          if (result.dailyStats && result.dailyStats.rateErrors && result.dailyStats.rateErrors > 0) {
            setRateLimit(true);
          } else {
            setRateLimit(false);
          }
        });
      };
      
      // Check immediately and set up an interval to check regularly
      checkRateLimits();
      const interval = setInterval(checkRateLimits, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] w-full bg-background text-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  // Error handling for Settings component
  const handleSettingsError = () => {
    setHasError(true);
    console.error("There was an error loading the Settings component");
  };

  return (
    <div className="flex flex-col h-full w-[360px] bg-background text-foreground chrome-extension-container">
      <MainNav />
      
      <ScrollArea className="flex-1 h-[550px]">
        <main className="p-2 w-[360px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <h1 className="text-sm font-bold tracking-tight gradient-text whitespace-nowrap">
                Dashboard
              </h1>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                Tweet Boost
              </p>
            </div>
            
            {rateLimit && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Twitter Rate Limit</AlertTitle>
                <AlertDescription className="text-xs">
                  Twitter is rate limiting your requests. The bot will automatically pause and retry later.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <div className="dashboard-card">
                <ControlPanel />
              </div>
              
              <Tabs defaultValue="like-accounts" className="w-full dashboard-tabs">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="like-accounts" className="tabs-trigger text-[10px]">Auto-Like</TabsTrigger>
                  <TabsTrigger value="comment-accounts" className="tabs-trigger text-[10px]">AI-Comment</TabsTrigger>
                </TabsList>
                <TabsContent value="like-accounts" className="mt-1.5">
                  <div className="dashboard-card">
                    <AccountManager type="like" />
                  </div>
                </TabsContent>
                <TabsContent value="comment-accounts" className="mt-1.5">
                  <div className="dashboard-card">
                    <AccountManager type="comment" />
                  </div>
                </TabsContent>
              </Tabs>
              
              {!hasError ? (
                <ErrorBoundary onError={handleSettingsError}>
                  <div className="dashboard-card">
                    <Settings />
                  </div>
                </ErrorBoundary>
              ) : (
                <div className="dashboard-card">
                  <h3 className="font-medium text-sm">Settings</h3>
                  <p className="text-xs text-muted-foreground">
                    Settings are currently unavailable.
                  </p>
                </div>
              )}
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

// Simple Error Boundary implementation as a component
const ErrorBoundary = ({ children, onError }) => {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const errorHandler = (event) => {
      event.preventDefault();
      setHasError(true);
      if (onError) onError();
    };
    
    window.addEventListener('error', errorHandler);
    
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, [onError]);
  
  if (hasError) {
    return null;
  }
  
  return children;
};

export default Dashboard;
