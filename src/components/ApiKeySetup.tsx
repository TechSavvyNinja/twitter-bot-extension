
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Key } from "lucide-react";

export function ApiKeySetup() {
  const { toast } = useToast();
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load the custom API key from storage when component mounts
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['customApiKey'], (result) => {
            if (result.customApiKey) {
              setCustomApiKey(result.customApiKey);
            }
          });
        } else {
          const storedKey = localStorage.getItem('customApiKey');
          if (storedKey) {
            setCustomApiKey(storedKey);
          }
        }
      } catch (error) {
        console.error("Error loading API key:", error);
      }
    };
    
    loadApiKey();
  }, []);

  const handleSaveApiKey = async () => {
    try {
      setIsLoading(true);
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ customApiKey }, () => {
          if (chrome.runtime.lastError) {
            throw new Error(chrome.runtime.lastError.message);
          }
          
          toast({
            title: "API Key Saved",
            description: "Your custom OpenAI API key has been saved.",
            duration: 3000,
          });
          setIsLoading(false);
        });
      } else {
        localStorage.setItem('customApiKey', customApiKey);
        
        toast({
          title: "API Key Saved", 
          description: "Your custom OpenAI API key has been saved.",
          duration: 3000,
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error Saving API Key",
        description: "There was a problem saving your API key. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">OpenAI API Key (Optional)</h3>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-xs">
              Custom API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your OpenAI API key"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              className="h-8 text-xs"
            />
            <p className="text-xs text-muted-foreground">
              You can use your own API key for enhanced privacy. If not provided, the extension will use the default key.
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveApiKey} 
              disabled={isLoading} 
              className="h-8 text-xs px-3 py-1"
            >
              {isLoading ? "Saving..." : "Save API Key"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
