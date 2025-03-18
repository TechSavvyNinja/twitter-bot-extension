
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AccountProps {
  type: "like" | "comment";
}

export function AccountManager({ type }: AccountProps) {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [newAccount, setNewAccount] = useState("");
  const { toast } = useToast();

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAccount) return;
    
    // Remove @ if present
    const username = newAccount.startsWith("@") 
      ? newAccount.substring(1) 
      : newAccount;
    
    // Check if already exists
    if (accounts.includes(username)) {
      toast({
        title: "Account Already Added",
        description: `@${username} is already in your list.`,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Add account
    const updatedAccounts = [...accounts, username];
    setAccounts(updatedAccounts);
    
    // Save to storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 
        [type === "like" ? "targetAccounts" : "commentAccounts"]: updatedAccounts 
      });
    } else {
      // If not in extension context (development)
      localStorage.setItem(
        type === "like" ? "targetAccounts" : "commentAccounts", 
        JSON.stringify(updatedAccounts)
      );
    }
    
    toast({
      title: "Account Added",
      description: `@${username} has been added to your ${type === "like" ? "like" : "comment"} list.`,
      duration: 3000,
    });
    
    setNewAccount("");
  };
  
  const handleRemoveAccount = (account: string) => {
    const updatedAccounts = accounts.filter((a) => a !== account);
    setAccounts(updatedAccounts);
    
    // Save to storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 
        [type === "like" ? "targetAccounts" : "commentAccounts"]: updatedAccounts 
      });
    } else {
      // If not in extension context (development)
      localStorage.setItem(
        type === "like" ? "targetAccounts" : "commentAccounts", 
        JSON.stringify(updatedAccounts)
      );
    }
    
    toast({
      title: "Account Removed",
      description: `@${account} has been removed from your ${type === "like" ? "like" : "comment"} list.`,
      duration: 3000,
    });
  };

  // Load accounts from storage on component mount
  useState(() => {
    const loadAccounts = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // In extension context
          chrome.storage.local.get(
            [type === "like" ? "targetAccounts" : "commentAccounts"], 
            (result) => {
              const storedAccounts = result[type === "like" ? "targetAccounts" : "commentAccounts"] || [];
              setAccounts(storedAccounts);
            }
          );
        } else {
          // In development
          const storedAccounts = localStorage.getItem(
            type === "like" ? "targetAccounts" : "commentAccounts"
          );
          if (storedAccounts) {
            setAccounts(JSON.parse(storedAccounts));
          }
        }
      } catch (error) {
        console.error("Error loading accounts:", error);
      }
    };
    
    loadAccounts();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === "like" ? "Auto-Like Accounts" : "AI-Comment Accounts"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddAccount} className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Twitter username (e.g. elonmusk)"
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
          />
          <Button type="submit">Add</Button>
        </form>
        
        <Separator className="my-4" />
        
        <ScrollArea className="h-[200px] rounded-md border p-4">
          {accounts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No accounts added yet. Add some accounts to get started!
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accounts.map((account) => (
                <Badge key={account} variant="secondary" className="text-sm py-2">
                  @{account}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => handleRemoveAccount(account)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
