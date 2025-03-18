
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Play, Pause, RefreshCw, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ControlPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if bot is running
    const checkStatus = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // In extension context
          chrome.storage.local.get(['botRunning'], (result) => {
            setIsRunning(result.botRunning || false);
          });
        } else {
          // In development
          setIsRunning(localStorage.getItem('botRunning') === 'true');
        }
      } catch (error) {
        console.error("Error checking bot status:", error);
      }
    };
    
    checkStatus();
    
    // Set up a listener for changes
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.botRunning) {
          setIsRunning(changes.botRunning.newValue);
        }
      });
    }
  }, []);

  const handleStartBot = async () => {
    setIsLoading(true);
    
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // In extension context
        const response = await new Promise<any>((resolve) => {
          chrome.runtime.sendMessage({ action: "startBot" }, (response) => {
            resolve(response);
          });
        });
        
        if (response.success) {
          toast({
            title: "Bot Started",
            description: "The bot has started running according to your settings.",
            duration: 3000,
          });
          setIsRunning(true);
        } else {
          toast({
            title: "Error Starting Bot",
            description: response.error || "There was an error starting the bot.",
            variant: "destructive",
            duration: 3000,
          });
        }
      } else {
        // In development
        toast({
          title: "Bot Started",
          description: "The bot has started running according to your settings.",
          duration: 3000,
        });
        localStorage.setItem('botRunning', 'true');
        setIsRunning(true);
      }
    } catch (error) {
      toast({
        title: "Error Starting Bot",
        description: "There was an error starting the bot. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopBot = async () => {
    setIsLoading(true);
    
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // In extension context
        const response = await new Promise<any>((resolve) => {
          chrome.runtime.sendMessage({ action: "stopBot" }, (response) => {
            resolve(response);
          });
        });
        
        if (response.success) {
          toast({
            title: "Bot Stopped",
            description: "The bot has been stopped successfully.",
            duration: 3000,
          });
          setIsRunning(false);
        } else {
          toast({
            title: "Error Stopping Bot",
            description: response.error || "There was an error stopping the bot.",
            variant: "destructive",
            duration: 3000,
          });
        }
      } else {
        // In development
        toast({
          title: "Bot Stopped",
          description: "The bot has been stopped successfully.",
          duration: 3000,
        });
        localStorage.setItem('botRunning', 'false');
        setIsRunning(false);
      }
    } catch (error) {
      toast({
        title: "Error Stopping Bot",
        description: "There was an error stopping the bot. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckNewPosts = async () => {
    setIsLoading(true);
    
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // In extension context
        const response = await new Promise<any>((resolve) => {
          chrome.runtime.sendMessage({ action: "checkNewPosts" }, (response) => {
            resolve(response);
          });
        });
        
        if (response.success) {
          toast({
            title: "Check Completed",
            description: response.message || "Checked for new posts successfully.",
            duration: 3000,
          });
        } else {
          toast({
            title: "Error Checking Posts",
            description: response.error || "There was an error checking for new posts.",
            variant: "destructive",
            duration: 3000,
          });
        }
      } else {
        // In development
        toast({
          title: "Check Completed",
          description: "Checked for new posts successfully.",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Error Checking Posts",
        description: "There was an error checking for new posts. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Control Panel</CardTitle>
          {isRunning ? (
            <Badge className="bg-green-500 hover:bg-green-600">Running</Badge>
          ) : (
            <Badge variant="outline">Stopped</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {isRunning ? (
            <Button 
              variant="destructive" 
              className="w-full" 
              disabled={isLoading} 
              onClick={handleStopBot}
            >
              <Pause className="mr-2 h-4 w-4" />
              Stop Bot
            </Button>
          ) : (
            <Button 
              className="w-full gradient-bg" 
              disabled={isLoading} 
              onClick={handleStartBot}
            >
              <Play className="mr-2 h-4 w-4" />
              Start Bot
            </Button>
          )}
          
          <Button 
            variant="outline" 
            className="w-full break-words" 
            disabled={isLoading} 
            onClick={handleCheckNewPosts}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Check New Posts
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground mt-4">
          <Clock className="inline-block mr-2 h-4 w-4" />
          The bot will automatically check for new posts based on your schedule settings.
        </div>
      </CardContent>
    </Card>
  );
}
