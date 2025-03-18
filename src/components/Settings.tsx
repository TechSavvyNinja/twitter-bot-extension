import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Save, 
  Clock, 
  MessageSquare, 
  ThumbsUp, 
  UserRound
} from "lucide-react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
// Import for ApiKeySetup is commented out as we're no longer using custom API keys
// import { ApiKeySetup } from "./ApiKeySetup";

interface SettingsValues {
  actionOrder: "like_first" | "comment_first";
  scheduleStart: string;
  scheduleEnd: string;
  enableScheduling: boolean;
  // Like settings
  maxDailyLikes: number;
  likeSpeed: {
    min: number;
    max: number;
  };
  likeCount: number;
  // Comment settings
  maxDailyComments: number;
  commentInterval: {
    min: number;
    max: number;
  };
  // Check intervals
  checkInterval: number;
  newPostCheckInterval: number;
  // Human behavior
  randomizeActions: boolean;
  enableTypos: boolean;
  humanVariability: number;
  // AI settings
  aiPrompt: string;
}

// Default settings to avoid undefined values
const defaultSettings: SettingsValues = {
  actionOrder: "like_first",
  scheduleStart: "09:00",
  scheduleEnd: "18:00",
  enableScheduling: false,
  // Like settings
  maxDailyLikes: 100,
  likeSpeed: {
    min: 3,
    max: 15
  },
  likeCount: 5,
  // Comment settings
  maxDailyComments: 50,
  commentInterval: {
    min: 30,
    max: 180
  },
  // Check intervals
  checkInterval: 60,
  newPostCheckInterval: 30,
  // Human behavior
  randomizeActions: true,
  enableTypos: false,
  humanVariability: 50,
  // AI settings
  aiPrompt: "Write an engaging, relevant comment for the tweet. Be conversational and natural.",
};

export function Settings() {
  const [settings, setSettings] = useState<SettingsValues>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error loading settings:", chrome.runtime.lastError);
              setSettings(defaultSettings);
            } else if (response && response.success && response.settings) {
              setSettings({...defaultSettings, ...response.settings});
            } else {
              setSettings(defaultSettings);
            }
            setLoading(false);
          });
        } else {
          const storedSettings = localStorage.getItem('settings');
          if (storedSettings) {
            try {
              const parsedSettings = JSON.parse(storedSettings);
              setSettings({...defaultSettings, ...parsedSettings});
            } catch (e) {
              console.error("Failed to parse stored settings:", e);
              setSettings(defaultSettings);
            }
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        setSettings(defaultSettings);
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ action: "saveSettings", settings }, (response) => {
          if (chrome.runtime.lastError) {
            toast({
              title: "Error Saving Settings",
              description: chrome.runtime.lastError.message || "There was an error saving your settings. Please try again.",
              variant: "destructive",
              duration: 3000,
            });
          } else if (response && response.success) {
            toast({
              title: "Settings Saved",
              description: "Your settings have been saved successfully.",
              duration: 3000,
            });
          }
        });
      } else {
        localStorage.setItem('settings', JSON.stringify(settings));
        toast({
          title: "Settings Saved",
          description: "Your settings have been saved successfully.",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Error Saving Settings",
        description: "There was an error saving your settings. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Bot Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading settings...</div>
        ) : (
          <>
            {/* ApiKeySetup component is removed as we're using a default API key for all users */}
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="general">
                <AccordionTrigger className="text-base font-medium py-2">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    General Settings
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-sm">Action Order</Label>
                      <RadioGroup
                        value={settings.actionOrder}
                        onValueChange={(value) => 
                          setSettings({ ...settings, actionOrder: value as "like_first" | "comment_first" })
                        }
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="like_first" id="like_first" />
                          <Label htmlFor="like_first">Like first, then comment</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="comment_first" id="comment_first" />
                          <Label htmlFor="comment_first">Comment first, then like</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm" htmlFor="enableScheduling">
                          Enable Scheduling
                        </Label>
                        <Switch
                          id="enableScheduling"
                          checked={settings.enableScheduling}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, enableScheduling: checked })
                          }
                        />
                      </div>
                      
                      {settings.enableScheduling && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor="scheduleStart" className="text-xs">Start Time</Label>
                            <Input
                              id="scheduleStart"
                              type="time"
                              value={settings.scheduleStart}
                              onChange={(e) =>
                                setSettings({ ...settings, scheduleStart: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="scheduleEnd" className="text-xs">End Time</Label>
                            <Input
                              id="scheduleEnd"
                              type="time"
                              value={settings.scheduleEnd}
                              onChange={(e) =>
                                setSettings({ ...settings, scheduleEnd: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="checkInterval" className="text-sm">Check Interval (minutes)</Label>
                        <span className="text-xs text-muted-foreground">
                          {settings.checkInterval}
                        </span>
                      </div>
                      <Slider
                        id="checkInterval"
                        min={15}
                        max={180}
                        step={5}
                        value={[settings.checkInterval]}
                        onValueChange={(values) =>
                          setSettings({ ...settings, checkInterval: values[0] })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="newPostCheckInterval" className="text-sm">New Posts Check Interval (minutes)</Label>
                        <span className="text-xs text-muted-foreground">
                          {settings.newPostCheckInterval}
                        </span>
                      </div>
                      <Slider
                        id="newPostCheckInterval"
                        min={5}
                        max={120}
                        step={5}
                        value={[settings.newPostCheckInterval]}
                        onValueChange={(values) =>
                          setSettings({ ...settings, newPostCheckInterval: values[0] })
                        }
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="likes">
                <AccordionTrigger className="text-base font-medium py-2">
                  <div className="flex items-center">
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Like Settings
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="maxDailyLikes" className="text-sm">Max Daily Likes</Label>
                        <span className="text-xs text-muted-foreground">
                          {settings.maxDailyLikes}
                        </span>
                      </div>
                      <Slider
                        id="maxDailyLikes"
                        min={10}
                        max={200}
                        step={10}
                        value={[settings.maxDailyLikes]}
                        onValueChange={(values) =>
                          setSettings({ ...settings, maxDailyLikes: values[0] })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="likeCount" className="text-sm">Comments to Like Per Post</Label>
                        <span className="text-xs text-muted-foreground">
                          {settings.likeCount}
                        </span>
                      </div>
                      <Slider
                        id="likeCount"
                        min={1}
                        max={10}
                        step={1}
                        value={[settings.likeCount]}
                        onValueChange={(values) =>
                          setSettings({ ...settings, likeCount: values[0] })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Like Speed Interval (seconds)</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between items-center">
                            <Label htmlFor="likeSpeedMin" className="text-xs">Minimum</Label>
                            <span className="text-xs text-muted-foreground">
                              {settings.likeSpeed.min}s
                            </span>
                          </div>
                          <Slider
                            id="likeSpeedMin"
                            min={1}
                            max={30}
                            step={1}
                            value={[settings.likeSpeed.min]}
                            onValueChange={(values) =>
                              setSettings({ 
                                ...settings, 
                                likeSpeed: {
                                  ...settings.likeSpeed,
                                  min: values[0]
                                }
                              })
                            }
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center">
                            <Label htmlFor="likeSpeedMax" className="text-xs">Maximum</Label>
                            <span className="text-xs text-muted-foreground">
                              {settings.likeSpeed.max}s
                            </span>
                          </div>
                          <Slider
                            id="likeSpeedMax"
                            min={5}
                            max={60}
                            step={1}
                            value={[settings.likeSpeed.max]}
                            onValueChange={(values) =>
                              setSettings({ 
                                ...settings, 
                                likeSpeed: {
                                  ...settings.likeSpeed,
                                  max: values[0]
                                }
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="comments">
                <AccordionTrigger className="text-base font-medium py-2">
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comment Settings
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="maxDailyComments" className="text-sm">Max Daily Comments</Label>
                        <span className="text-xs text-muted-foreground">
                          {settings.maxDailyComments}
                        </span>
                      </div>
                      <Slider
                        id="maxDailyComments"
                        min={10}
                        max={200}
                        step={10}
                        value={[settings.maxDailyComments]}
                        onValueChange={(values) =>
                          setSettings({ ...settings, maxDailyComments: values[0] })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Comment Interval (seconds)</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between items-center">
                            <Label htmlFor="commentIntervalMin" className="text-xs">Minimum</Label>
                            <span className="text-xs text-muted-foreground">
                              {settings.commentInterval.min}s
                            </span>
                          </div>
                          <Slider
                            id="commentIntervalMin"
                            min={10}
                            max={120}
                            step={5}
                            value={[settings.commentInterval.min]}
                            onValueChange={(values) =>
                              setSettings({ 
                                ...settings, 
                                commentInterval: {
                                  ...settings.commentInterval,
                                  min: values[0]
                                }
                              })
                            }
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center">
                            <Label htmlFor="commentIntervalMax" className="text-xs">Maximum</Label>
                            <span className="text-xs text-muted-foreground">
                              {settings.commentInterval.max}s
                            </span>
                          </div>
                          <Slider
                            id="commentIntervalMax"
                            min={60}
                            max={300}
                            step={10}
                            value={[settings.commentInterval.max]}
                            onValueChange={(values) =>
                              setSettings({ 
                                ...settings, 
                                commentInterval: {
                                  ...settings.commentInterval,
                                  max: values[0]
                                }
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="aiPrompt" className="text-sm">AI Comment Prompt</Label>
                      <Textarea
                        id="aiPrompt"
                        placeholder="Write a custom prompt for the AI..."
                        value={settings.aiPrompt}
                        onChange={(e) =>
                          setSettings({ ...settings, aiPrompt: e.target.value })
                        }
                        rows={3}
                        className="text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Customize how AI generates comments. This prompt will guide the
                        AI to create natural, relevant responses.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="humanBehavior">
                <AccordionTrigger className="text-base font-medium py-2">
                  <div className="flex items-center">
                    <UserRound className="h-4 w-4 mr-2" />
                    Human Behavior
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm" htmlFor="randomizeActions">
                        Randomize Action Order
                      </Label>
                      <Switch
                        id="randomizeActions"
                        checked={settings.randomizeActions}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, randomizeActions: checked })
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-[-0.5rem]">
                      Sometimes like first, sometimes comment first to appear more natural
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm" htmlFor="enableTypos">
                        Enable Occasional Typos
                      </Label>
                      <Switch
                        id="enableTypos"
                        checked={settings.enableTypos}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, enableTypos: checked })
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-[-0.5rem]">
                      Adds occasional typos to comments for more human-like behavior
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="humanVariability" className="text-sm">
                          Human Variability
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {settings.humanVariability}%
                        </span>
                      </div>
                      <Slider
                        id="humanVariability"
                        min={0}
                        max={100}
                        step={5}
                        value={[settings.humanVariability]}
                        onValueChange={(values) =>
                          setSettings({ ...settings, humanVariability: values[0] })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher values increase randomness in timing and behavior
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
        
        <div className="flex justify-end pt-4">
          <Button onClick={handleSaveSettings} className="gradient-bg">
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
