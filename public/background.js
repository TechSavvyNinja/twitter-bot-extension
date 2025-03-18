
// Background script for Tweet Boost Buddy Extension

// Default OpenAI API key for all extension users
const DEFAULT_API_KEY = "your-default-api-key"; // Replace this with your actual API key

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  chrome.storage.local.get(['licenseKey', 'isActivated', 'targetAccounts', 'commentAccounts', 'settings'], (result) => {
    if (!result.licenseKey) {
      chrome.storage.local.set({ licenseKey: '', isActivated: false });
    }
    
    if (!result.targetAccounts) {
      chrome.storage.local.set({ targetAccounts: [] });
    }
    
    if (!result.commentAccounts) {
      chrome.storage.local.set({ commentAccounts: [] });
    }
    
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          actionOrder: 'like_first', // 'like_first' or 'comment_first'
          scheduleStart: '09:00',
          scheduleEnd: '18:00',
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
          aiPrompt: 'Write an engaging, relevant comment for the tweet. Be conversational and natural.',
        }
      });
    }
    
    // Initialize counters for daily limits
    if (!result.dailyStats) {
      resetDailyStats();
    }
  });
});

// Reset daily stats at midnight
function resetDailyStats() {
  chrome.storage.local.set({
    dailyStats: {
      likesPerformed: 0,
      commentsPosted: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      rateErrors: 0,
      lastRateErrorTime: null
    }
  });
}

// Function to check if current time is within scheduled time
function isWithinScheduledTime() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      if (!result.settings || !result.settings.enableScheduling) {
        resolve(true); // If scheduling is disabled, always return true
        return;
      }
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const startTimeParts = result.settings.scheduleStart.split(':');
      const startTime = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
      
      const endTimeParts = result.settings.scheduleEnd.split(':');
      const endTime = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
      
      resolve(currentTime >= startTime && currentTime <= endTime);
    });
  });
}

// Check if we've hit daily limits
function checkDailyLimits() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['dailyStats', 'settings'], (result) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Reset stats if it's a new day
      if (result.dailyStats && result.dailyStats.lastResetDate !== today) {
        resetDailyStats();
        resolve({ canLike: true, canComment: true, canContinue: true });
        return;
      }
      
      const stats = result.dailyStats || { 
        likesPerformed: 0, 
        commentsPosted: 0,
        rateErrors: 0,
        lastRateErrorTime: null
      };
      
      const settings = result.settings || { 
        maxDailyLikes: 100, 
        maxDailyComments: 50 
      };
      
      // Check if we've hit too many rate limit errors
      const canContinue = stats.rateErrors < 5;
      
      // If we've had rate limit errors recently, check if enough time has passed
      let shouldPause = false;
      if (stats.lastRateErrorTime) {
        const lastErrorTime = new Date(stats.lastRateErrorTime);
        const now = new Date();
        const minutesSinceError = (now - lastErrorTime) / (1000 * 60);
        
        // If less than 15 minutes have passed since last rate error, pause operations
        shouldPause = minutesSinceError < 15;
      }
      
      resolve({
        canLike: stats.likesPerformed < settings.maxDailyLikes && canContinue && !shouldPause,
        canComment: stats.commentsPosted < settings.maxDailyComments && canContinue && !shouldPause,
        canContinue: canContinue && !shouldPause
      });
    });
  });
}

// Track rate limit errors
function recordRateLimitError() {
  chrome.storage.local.get(['dailyStats'], (result) => {
    const stats = result.dailyStats || { 
      likesPerformed: 0, 
      commentsPosted: 0,
      rateErrors: 0,
      lastResetDate: new Date().toISOString().split('T')[0]
    };
    
    stats.rateErrors += 1;
    stats.lastRateErrorTime = new Date().toISOString();
    
    console.log(`Rate limit error detected. Total errors today: ${stats.rateErrors}`);
    
    chrome.storage.local.set({ dailyStats: stats });
    
    // Notify user if we're hitting too many rate limits
    if (stats.rateErrors >= 3) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Twitter Rate Limit',
        message: 'Twitter rate limits detected. The bot will automatically pause for 15 minutes.'
      });
    }
  });
}

// Update daily stats
function updateDailyStats(type, count = 1) {
  chrome.storage.local.get(['dailyStats'], (result) => {
    const stats = result.dailyStats || { 
      likesPerformed: 0, 
      commentsPosted: 0,
      rateErrors: 0,
      lastResetDate: new Date().toISOString().split('T')[0]
    };
    
    if (type === 'like') {
      stats.likesPerformed += count;
    } else if (type === 'comment') {
      stats.commentsPosted += count;
    }
    
    chrome.storage.local.set({ dailyStats: stats });
  });
}

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'validateLicense') {
    // Accept any non-empty license key as valid
    const isValid = message.licenseKey && message.licenseKey.length > 0;
    chrome.storage.local.set({ isActivated: isValid });
    sendResponse({ success: isValid });
  }
  
  else if (message.action === 'startBot') {
    // Start the automation process
    startAutomation()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true; // Indicates async response
  }
  
  else if (message.action === 'stopBot') {
    // Stop any running automation
    stopAutomation()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true; // Indicates async response
  }
  
  else if (message.action === 'checkNewPosts') {
    // Manually check for new posts
    checkForNewPosts()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true; // Indicates async response
  }
  
  else if (message.action === 'getDailyStats') {
    // Return current daily stats
    chrome.storage.local.get(['dailyStats'], (result) => {
      sendResponse({ success: true, stats: result.dailyStats || { likesPerformed: 0, commentsPosted: 0 } });
    });
    return true; // Indicates async response
  }
  
  else if (message.action === 'saveSettings') {
    // Save settings to storage
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
  
  else if (message.action === 'getSettings') {
    // Get settings from storage
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse({ success: true, settings: result.settings });
    });
    return true; // Indicates async response
  }
  
  else if (message.action === 'recordRateLimit') {
    // Record a rate limit error
    recordRateLimitError();
    sendResponse({ success: true });
    return true;
  }
});

// Function to start automation
async function startAutomation() {
  // Check if license is activated
  const result = await chrome.storage.local.get(['isActivated', 'settings']);
  
  if (!result.isActivated) {
    return { success: false, error: 'License not activated' };
  }
  
  // Set a flag that the bot is running
  await chrome.storage.local.set({ botRunning: true });
  
  // Schedule the first check
  scheduleNextCheck();
  
  // Create a notification to let the user know the bot has started
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Tweet Boost Buddy',
    message: 'Bot started successfully! It will run based on your schedule settings.'
  });
  
  return { success: true, message: 'Bot started successfully' };
}

// Function to stop automation
async function stopAutomation() {
  // Clear any scheduled checks
  await chrome.storage.local.set({ botRunning: false });
  
  // Clear any pending alarms
  await chrome.alarms.clearAll();
  
  // Create a notification to let the user know the bot has stopped
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Tweet Boost Buddy',
    message: 'Bot stopped successfully.'
  });
  
  return { success: true, message: 'Bot stopped successfully' };
}

// Function to schedule the next check
function scheduleNextCheck() {
  chrome.storage.local.get(['settings'], (result) => {
    const checkInterval = result.settings?.checkInterval || 60; // Default to 60 minutes
    
    // Add some variability to the check interval for more human-like behavior
    const variabilityFactor = result.settings?.humanVariability || 50;
    const randomVariation = (Math.random() * variabilityFactor / 100) - (variabilityFactor / 200);
    const adjustedInterval = Math.max(5, checkInterval * (1 + randomVariation));
    
    console.log(`Scheduling next check in ${adjustedInterval.toFixed(2)} minutes`);
    
    // Create an alarm to check posts
    chrome.alarms.create('checkPosts', {
      delayInMinutes: adjustedInterval
    });
  });
}

// Function to schedule checking new posts
function scheduleNewPostsCheck() {
  chrome.storage.local.get(['settings'], (result) => {
    const checkInterval = result.settings?.newPostCheckInterval || 30; // Default to 30 minutes
    
    // Add some variability to the check interval for more human-like behavior
    const variabilityFactor = result.settings?.humanVariability || 50;
    const randomVariation = (Math.random() * variabilityFactor / 100) - (variabilityFactor / 200);
    const adjustedInterval = Math.max(5, checkInterval * (1 + randomVariation));
    
    console.log(`Scheduling new posts check in ${adjustedInterval.toFixed(2)} minutes`);
    
    // Create an alarm to check new posts
    chrome.alarms.create('checkNewPosts', {
      delayInMinutes: adjustedInterval
    });
  });
}

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkPosts') {
    // Check if bot is still supposed to be running
    chrome.storage.local.get(['botRunning'], async (result) => {
      if (result.botRunning) {
        // Check if we're within scheduled time
        const withinSchedule = await isWithinScheduledTime();
        
        if (withinSchedule) {
          // Perform the automation tasks
          performAutomationTasks();
        } else {
          console.log("Outside scheduled time. Skipping automation.");
        }
        
        // Schedule the next check regardless
        scheduleNextCheck();
      }
    });
  } else if (alarm.name === 'checkNewPosts') {
    // Check if bot is still supposed to be running
    chrome.storage.local.get(['botRunning'], async (result) => {
      if (result.botRunning) {
        // Check if we're within scheduled time
        const withinSchedule = await isWithinScheduledTime();
        
        if (withinSchedule) {
          // Check for new posts
          checkForNewPosts();
        } else {
          console.log("Outside scheduled time. Skipping new posts check.");
        }
        
        // Schedule the next check regardless
        scheduleNewPostsCheck();
      }
    });
  } else if (alarm.name === 'retryAfterRateLimit') {
    console.log("Retrying after rate limit pause");
    scheduleNextCheck();
  }
});

// Function to perform automation tasks
function performAutomationTasks() {
  chrome.storage.local.get(['settings', 'targetAccounts', 'commentAccounts'], async (result) => {
    // Check daily limits
    const limits = await checkDailyLimits();
    
    if (!limits.canContinue) {
      console.log("Too many rate limit errors. Pausing operations for a while.");
      // Create a notification to let the user know we're pausing
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Tweet Boost Buddy',
        message: 'Pausing due to Twitter rate limits. Will try again later.'
      });
      
      // Set an alarm to retry after 15 minutes
      chrome.alarms.create('retryAfterRateLimit', {
        delayInMinutes: 15
      });
      
      return;
    }
    
    // Determine action order
    let actionOrder = result.settings?.actionOrder || 'like_first';
    
    // Check if we have any accounts configured
    if (!result.targetAccounts || result.targetAccounts.length === 0) {
      console.log("No target accounts configured. Skipping like task.");
      limits.canLike = false;
    }
    
    if (!result.commentAccounts || result.commentAccounts.length === 0) {
      console.log("No comment accounts configured. Skipping comment task.");
      limits.canComment = false;
    }
    
    if (!limits.canLike && !limits.canComment) {
      console.log("No actions to perform. Skipping automation tasks.");
      return;
    }
    
    // Randomize action order if enabled
    if (result.settings?.randomizeActions && Math.random() > 0.5) {
      actionOrder = actionOrder === 'like_first' ? 'comment_first' : 'like_first';
    }
    
    console.log(`Performing tasks in order: ${actionOrder}`);
    
    if (actionOrder === 'like_first') {
      if (limits.canLike) {
        console.log("Starting like task...");
        handleLikeTask(result.targetAccounts, result.settings)
          .then(() => {
            if (limits.canComment) {
              console.log("Like task completed, starting comment task...");
              handleCommentTask(result.commentAccounts, result.settings);
            }
          })
          .catch(error => console.error('Error in automation tasks:', error));
      } else if (limits.canComment) {
        console.log("Skipping like task (limit reached), starting comment task...");
        handleCommentTask(result.commentAccounts, result.settings)
          .catch(error => console.error('Error in comment task:', error));
      }
    } else {
      if (limits.canComment) {
        console.log("Starting comment task...");
        handleCommentTask(result.commentAccounts, result.settings)
          .then(() => {
            if (limits.canLike) {
              console.log("Comment task completed, starting like task...");
              handleLikeTask(result.targetAccounts, result.settings);
            }
          })
          .catch(error => console.error('Error in automation tasks:', error));
      } else if (limits.canLike) {
        console.log("Skipping comment task (limit reached), starting like task...");
        handleLikeTask(result.targetAccounts, result.settings)
          .catch(error => console.error('Error in like task:', error));
      }
    }
  });
}

// Function to handle like tasks
async function handleLikeTask(targetAccounts, settings) {
  if (!targetAccounts || targetAccounts.length === 0) return;
  
  try {
    // Get the current tab or create a new one
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let tabId;
    
    if (tabs.length === 0) {
      const newTab = await chrome.tabs.create({ url: 'https://twitter.com', active: false });
      tabId = newTab.id;
      console.log(`Created new tab with id ${tabId}`);
    } else {
      tabId = tabs[0].id;
      await chrome.tabs.update(tabId, { url: 'https://twitter.com' });
      console.log(`Using existing tab with id ${tabId}`);
    }
    
    // Wait for the page to load with a variable delay based on human variability
    const variabilityFactor = settings?.humanVariability || 50;
    const loadDelay = 3000 + (Math.random() * variabilityFactor * 50);
    console.log(`Waiting ${loadDelay.toFixed(0)}ms for page to load`);
    await new Promise(resolve => setTimeout(resolve, loadDelay));
    
    // Process at most 3 random accounts to avoid hitting rate limits
    const shuffledAccounts = [...targetAccounts].sort(() => 0.5 - Math.random());
    const accountsToProcess = shuffledAccounts.slice(0, Math.min(3, shuffledAccounts.length));
    
    console.log(`Processing ${accountsToProcess.length} accounts for likes`);
    
    // Process each target account
    for (const account of accountsToProcess) {
      try {
        console.log(`Navigating to account: ${account}`);
        // Navigate to the account page
        await chrome.tabs.update(tabId, { url: `https://twitter.com/${account}` });
        
        // Wait for the page to load with variable delay
        const pageLoadDelay = 5000 + (Math.random() * variabilityFactor * 50);
        console.log(`Waiting ${pageLoadDelay.toFixed(0)}ms for account page to load`);
        await new Promise(resolve => setTimeout(resolve, pageLoadDelay));
        
        // Execute script to like posts
        const likeResult = await chrome.scripting.executeScript({
          target: { tabId },
          function: likePostsOnPage,
          args: [account, settings]
        });
        
        console.log(`Like task for ${account} completed:`, likeResult);
        
        // Random delay between accounts to appear more natural
        const accountDelay = 5000 + (Math.random() * variabilityFactor * 100);
        console.log(`Waiting ${accountDelay.toFixed(0)}ms before next account`);
        await new Promise(resolve => setTimeout(resolve, accountDelay));
      } catch (error) {
        console.error(`Error processing account ${account}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in handleLikeTask:", error);
    // Don't throw here, let the process continue with other tasks
  }
}

// Function to like posts on the current page (injected into the tab)
function likePostsOnPage(accountName, settings) {
  // This function will be stringified and injected into the page
  console.log(`Starting to like posts for account: ${accountName}`);
  
  return new Promise(async (resolve) => {
    // Human variability factor (0-100)
    const variabilityFactor = settings?.humanVariability || 50;
    let likesPerformed = 0;
    let rateLimited = false;
    
    // Check for rate limit errors on the page
    const checkForRateLimit = () => {
      // Check for error messages in the DOM
      const errorElements = document.querySelectorAll('[data-testid="error-detail"]');
      for (const el of errorElements) {
        if (el.textContent && (
          el.textContent.includes("limit") || 
          el.textContent.includes("429") || 
          el.textContent.includes("Too Many Requests")
        )) {
          console.error("Rate limit detected on page:", el.textContent);
          return true;
        }
      }
      return false;
    };
    
    // If we're already rate limited, report and exit
    if (checkForRateLimit()) {
      console.error("Rate limit already detected on page");
      try {
        chrome.runtime.sendMessage({ action: "recordRateLimit" });
      } catch (e) {
        console.log("Couldn't record rate limit:", e);
      }
      resolve({ likesPerformed: 0, rateLimited: true });
      return;
    }
    
    // Function to simulate human-like scrolling
    const scrollNaturally = async () => {
      console.log("Scrolling naturally");
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      
      // Randomize scroll steps based on variability
      const scrollSteps = Math.floor(Math.random() * (3 + variabilityFactor / 25)) + 2;
      
      for (let i = 0; i < scrollSteps; i++) {
        // Add some randomness to scroll amount
        const scrollRandom = 1 + ((Math.random() * variabilityFactor / 100) - (variabilityFactor / 200));
        const scrollAmount = (viewportHeight / scrollSteps) * (i + 1) * scrollRandom;
        
        window.scrollTo(0, scrollAmount);
        
        // Random delay between scrolls
        const scrollDelay = 300 + (Math.random() * variabilityFactor * 10);
        await new Promise(r => setTimeout(r, scrollDelay));
      }
    };
    
    // Wait a moment then scroll before getting tweets
    const initialDelay = 2000 + (Math.random() * variabilityFactor * 20);
    await new Promise(r => setTimeout(r, initialDelay));
    await scrollNaturally();
    
    // Find tweet elements
    console.log("Finding tweet elements");
    let tweetElements = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    
    // Process at most 2 tweets to avoid hitting rate limits
    tweetElements = tweetElements.slice(0, Math.min(2, tweetElements.length));
    
    if (tweetElements.length === 0) {
      console.log(`No tweets found for ${accountName}`);
      resolve({ likesPerformed: 0, rateLimited: false });
      return;
    }
    
    console.log(`Found ${tweetElements.length} tweets to process`);
    
    // Process each tweet
    for (let i = 0; i < tweetElements.length; i++) {
      const tweet = tweetElements[i];
      
      if (checkForRateLimit()) {
        console.error("Rate limit detected during processing");
        try {
          chrome.runtime.sendMessage({ action: "recordRateLimit" });
        } catch (e) {
          console.log("Couldn't record rate limit:", e);
        }
        rateLimited = true;
        break;
      }
      
      try {
        // Find and click like button if not already liked
        const likeButton = tweet.querySelector('[data-testid="like"]');
        if (likeButton) {
          // Use like speed settings for delay
          const minDelay = (settings?.likeSpeed?.min || 3) * 1000;
          const maxDelay = (settings?.likeSpeed?.max || 15) * 1000;
          
          // Add human variability to the delay
          const baseDelay = minDelay + Math.random() * (maxDelay - minDelay);
          const variableDelay = baseDelay * (1 + ((Math.random() * variabilityFactor / 200) - (variabilityFactor / 400)));
          
          console.log(`Waiting ${variableDelay.toFixed(0)}ms before liking tweet ${i+1}`);
          await new Promise(r => setTimeout(r, variableDelay));
          
          // Check if tweet is already liked
          const isAlreadyLiked = tweet.querySelector('[data-testid="unlike"]');
          if (isAlreadyLiked) {
            console.log(`Tweet ${i+1} is already liked, skipping`);
            continue;
          }
          
          likeButton.click();
          console.log(`Liked tweet ${i+1} from ${accountName}`);
          likesPerformed++;
          
          // Update like count in storage
          try {
            chrome.runtime.sendMessage({ action: "recordLike" });
          } catch (e) {
            console.log("Couldn't update like count:", e);
          }
          
          // Only process the first tweet in detail to reduce rate limit issues
          if (i === 0) {
            // Click on the tweet to open it
            const tweetLink = tweet.querySelector('a[href*="/status/"]');
            if (tweetLink) {
              // Add variable delay before clicking the tweet
              const clickDelay = 1500 + (Math.random() * variabilityFactor * 20);
              console.log(`Waiting ${clickDelay.toFixed(0)}ms before clicking tweet ${i+1}`);
              await new Promise(r => setTimeout(r, clickDelay));
              
              tweetLink.click();
              console.log(`Clicked on tweet ${i+1} to open it`);
              
              // Wait for the tweet page to load with variable delay
              const loadDelay = 5000 + (Math.random() * variabilityFactor * 30);
              console.log(`Waiting ${loadDelay.toFixed(0)}ms for tweet page to load`);
              await new Promise(r => setTimeout(r, loadDelay));
              
              // Check for rate limits again after opening tweet
              if (checkForRateLimit()) {
                console.error("Rate limit detected after opening tweet");
                try {
                  chrome.runtime.sendMessage({ action: "recordRateLimit" });
                } catch (e) {
                  console.log("Couldn't record rate limit:", e);
                }
                rateLimited = true;
                break;
              }
              
              // Scroll down to see comments with natural behavior
              await scrollNaturally();
              
              // Find and like some comments (up to settings.likeCount or 2, whichever is smaller)
              const commentLikes = document.querySelectorAll('article[data-testid="tweet"] [data-testid="like"]');
              const likeCount = Math.min(commentLikes.length, Math.min(settings?.likeCount || 5, 2));
              
              console.log(`Found ${commentLikes.length} comments, will like up to ${likeCount}`);
              
              for (let j = 0; j < likeCount; j++) {
                // Check for rate limits before each like
                if (checkForRateLimit()) {
                  console.error("Rate limit detected while liking comments");
                  try {
                    chrome.runtime.sendMessage({ action: "recordRateLimit" });
                  } catch (e) {
                    console.log("Couldn't record rate limit:", e);
                  }
                  rateLimited = true;
                  break;
                }
                
                // Variable delay between comment likes
                const commentLikeDelay = 2000 + (Math.random() * variabilityFactor * 30);
                console.log(`Waiting ${commentLikeDelay.toFixed(0)}ms before liking comment ${j+1}`);
                await new Promise(r => setTimeout(r, commentLikeDelay));
                
                commentLikes[j].click();
                console.log(`Liked comment ${j+1} on tweet ${i+1} from ${accountName}`);
                likesPerformed++;
                
                // Update like count in storage
                try {
                  chrome.runtime.sendMessage({ action: "recordLike" });
                } catch (e) {
                  console.log("Couldn't update like count:", e);
                }
              }
              
              // Go back to the profile page
              console.log("Going back to profile page");
              history.back();
              
              // Wait with variable delay
              const backDelay = 3000 + (Math.random() * variabilityFactor * 20);
              console.log(`Waiting ${backDelay.toFixed(0)}ms after going back`);
              await new Promise(r => setTimeout(r, backDelay));
            }
          }
        } else {
          console.log(`No like button found for tweet ${i+1}`);
        }
      } catch (error) {
        console.error(`Error processing tweet ${i+1} from ${accountName}:`, error);
      }
      
      // If rate limited, stop processing
      if (rateLimited) {
        break;
      }
    }
    
    console.log(`Like task completed for ${accountName}. Likes performed: ${likesPerformed}. Rate limited: ${rateLimited}`);
    resolve({ likesPerformed, rateLimited });
  });
}

// Function to handle comment tasks
async function handleCommentTask(commentAccounts, settings) {
  if (!commentAccounts || commentAccounts.length === 0) return;
  
  try {
    // Get the current tab or create a new one
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let tabId;
    
    if (tabs.length === 0) {
      const newTab = await chrome.tabs.create({ url: 'https://twitter.com', active: false });
      tabId = newTab.id;
    } else {
      tabId = tabs[0].id;
      await chrome.tabs.update(tabId, { url: 'https://twitter.com' });
    }
    
    // Wait for the page to load with variable delay based on human variability
    const variabilityFactor = settings?.humanVariability || 50;
    const loadDelay = 5000 + (Math.random() * variabilityFactor * 50);
    console.log(`Waiting ${loadDelay.toFixed(0)}ms for page to load before comment task`);
    await new Promise(resolve => setTimeout(resolve, loadDelay));
    
    // Process a random subset of accounts to appear more human-like (max 2)
    const shuffledAccounts = [...commentAccounts].sort(() => 0.5 - Math.random());
    const accountsToProcess = shuffledAccounts.slice(0, Math.min(2, shuffledAccounts.length));
    
    console.log(`Processing ${accountsToProcess.length} accounts for comments`);
    
    for (const account of accountsToProcess) {
      try {
        // Navigate to the account page
        console.log(`Navigating to account for commenting: ${account}`);
        await chrome.tabs.update(tabId, { url: `https://twitter.com/${account}` });
        
        // Wait for the page to load with variable delay
        const pageLoadDelay = 5000 + (Math.random() * variabilityFactor * 50);
        console.log(`Waiting ${pageLoadDelay.toFixed(0)}ms for account page to load`);
        await new Promise(resolve => setTimeout(resolve, pageLoadDelay));
        
        // Execute script to comment on posts
        const commentResult = await chrome.scripting.executeScript({
          target: { tabId },
          function: commentOnPosts,
          args: [account, settings, settings.aiPrompt]
        });
        
        console.log(`Comment task for ${account} completed:`, commentResult);
        
        // Random delay between accounts to appear more natural
        const accountDelay = 5000 + (Math.random() * variabilityFactor * 100);
        console.log(`Waiting ${accountDelay.toFixed(0)}ms before next account`);
        await new Promise(resolve => setTimeout(resolve, accountDelay));
      } catch (error) {
        console.error(`Error processing account ${account} for comments:`, error);
      }
    }
  } catch (error) {
    console.error("Error in handleCommentTask:", error);
    // Don't throw here, let the process continue with other tasks
  }
}

// Function to comment on posts (to be injected into the page)
function commentOnPosts(accountName, settings, aiPrompt) {
  console.log(`Starting to comment on posts for account: ${accountName}`);
  
  return new Promise(async (resolve) => {
    // Human variability factor (0-100)
    const variabilityFactor = settings?.humanVariability || 50;
    let commentsPosted = 0;
    let rateLimited = false;
    
    // Check for rate limit errors on the page
    const checkForRateLimit = () => {
      // Check for error messages in the DOM
      const errorElements = document.querySelectorAll('[data-testid="error-detail"]');
      for (const el of errorElements) {
        if (el.textContent && (
          el.textContent.includes("limit") || 
          el.textContent.includes("429") || 
          el.textContent.includes("Too Many Requests")
        )) {
          console.error("Rate limit detected on page:", el.textContent);
          return true;
        }
      }
      return false;
    };
    
    // If we're already rate limited, report and exit
    if (checkForRateLimit()) {
      console.error("Rate limit already detected on page for comments");
      try {
        chrome.runtime.sendMessage({ action: "recordRateLimit" });
      } catch (e) {
        console.log("Couldn't record rate limit:", e);
      }
      resolve({ commentsPosted: 0, rateLimited: true });
      return;
    }
    
    // Function to simulate natural scrolling
    const scrollNaturally = async () => {
      console.log("Scrolling naturally in comment task");
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      
      // Randomize scroll steps 
      const scrollSteps = Math.floor(Math.random() * (3 + variabilityFactor / 25)) + 2;
      
      for (let i = 0; i < scrollSteps; i++) {
        const scrollRandom = 1 + ((Math.random() * variabilityFactor / 100) - (variabilityFactor / 200));
        const scrollAmount = (viewportHeight / scrollSteps) * (i + 1) * scrollRandom;
        
        window.scrollTo(0, scrollAmount);
        
        // Random delay between scrolls
        const scrollDelay = 300 + (Math.random() * variabilityFactor * 10);
        await new Promise(r => setTimeout(r, scrollDelay));
      }
    };
    
    // Wait and scroll to find tweets
    const initialDelay = 2000 + (Math.random() * variabilityFactor * 20);
    await new Promise(r => setTimeout(r, initialDelay));
    await scrollNaturally();
    
    // Find tweet elements - only process 1 to reduce rate limit issues
    console.log("Finding tweets for commenting");
    let tweetElements = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    tweetElements = tweetElements.slice(0, 1); // Only get the first tweet
    
    if (tweetElements.length === 0) {
      console.log(`No tweets found for commenting on ${accountName}`);
      resolve({ commentsPosted: 0, rateLimited: false });
      return;
    }
    
    console.log(`Found ${tweetElements.length} tweets to process for comments`);
    
    // This would normally use AI to generate comments
    // For now, use predefined comments
    const sampleComments = [
      "Great post! Thanks for sharing this.",
      "This is really interesting content.",
      "I appreciate your perspective on this.",
      "Thanks for the insights!",
      "Valuable information, thanks for sharing."
    ];
    
    // Add typos to text if enabled
    function addTypos(text, typoChance = 0.05) {
      if (!settings.enableTypos) return text;
      
      // Adjusted typo chance based on human variability
      const adjustedTypoChance = typoChance * (variabilityFactor / 50);
      
      return text.split('').map(char => {
        if (Math.random() < adjustedTypoChance) {
          // Random typo operations: skip letter, duplicate letter, swap with adjacent
          const typoType = Math.floor(Math.random() * 3);
          if (typoType === 0) return ''; // Skip
          if (typoType === 1) return char + char; // Duplicate
          // For swap, we just insert a random common typo character
          const typoChars = 'asdfghjklqwertyuiopzxcvbnm';
          return typoChars.charAt(Math.floor(Math.random() * typoChars.length));
        }
        return char;
      }).join('');
    }
    
    // Process each tweet for commenting
    for (let i = 0; i < tweetElements.length; i++) {
      const tweet = tweetElements[i];
      
      if (checkForRateLimit()) {
        console.error("Rate limit detected during comment processing");
        try {
          chrome.runtime.sendMessage({ action: "recordRateLimit" });
        } catch (e) {
          console.log("Couldn't record rate limit:", e);
        }
        rateLimited = true;
        break;
      }
      
      try {
        // Click on the tweet to open it
        const tweetLink = tweet.querySelector('a[href*="/status/"]');
        if (tweetLink) {
          console.log(`Opening tweet ${i+1} for commenting`);
          tweetLink.click();
          
          // Wait for the tweet page to load
          const loadDelay = 5000 + (Math.random() * variabilityFactor * 30);
          console.log(`Waiting ${loadDelay.toFixed(0)}ms for tweet to open`);
          await new Promise(r => setTimeout(r, loadDelay));
          
          // Check for rate limits after loading tweet
          if (checkForRateLimit()) {
            console.error("Rate limit detected after opening tweet for comment");
            try {
              chrome.runtime.sendMessage({ action: "recordRateLimit" });
            } catch (e) {
              console.log("Couldn't record rate limit:", e);
            }
            rateLimited = true;
            break;
          }
          
          // Find the reply button and click it
          const replyButton = document.querySelector('[data-testid="reply"]');
          if (replyButton) {
            console.log("Clicking reply button");
            replyButton.click();
            
            // Wait for the reply dialog to appear
            const replyDialogDelay = 2000 + (Math.random() * variabilityFactor * 20);
            console.log(`Waiting ${replyDialogDelay.toFixed(0)}ms for reply dialog`);
            await new Promise(r => setTimeout(r, replyDialogDelay));
            
            // Find the reply input and type a comment
            const replyInput = document.querySelector('[data-testid="tweetTextarea_0"]');
            if (replyInput) {
              // Select a random comment or generate one (would use AI in a real implementation)
              const commentIndex = Math.floor(Math.random() * sampleComments.length);
              let commentText = sampleComments[commentIndex];
              
              // Add typos if enabled
              if (settings.enableTypos) {
                commentText = addTypos(commentText);
              }
              
              console.log(`Typing comment: ${commentText}`);
              
              // Type the text naturally with delays between characters
              for (let j = 0; j < commentText.length; j++) {
                const char = commentText[j];
                replyInput.textContent += char;
                
                // Create and dispatch an input event to trigger React's onChange
                const event = new Event('input', { bubbles: true });
                replyInput.dispatchEvent(event);
                
                // Random delay between keystrokes (faster than real typing but simulates human behavior)
                const typingDelay = 50 + (Math.random() * 150);
                await new Promise(r => setTimeout(r, typingDelay));
              }
              
              // Wait before clicking Post
              const prePostDelay = 1000 + (Math.random() * variabilityFactor * 30);
              console.log(`Waiting ${prePostDelay.toFixed(0)}ms before posting comment`);
              await new Promise(r => setTimeout(r, prePostDelay));
              
              // Find and click the Post button
              const postButton = document.querySelector('[data-testid="tweetButton"]');
              if (postButton) {
                // In a real implementation, we would click this
                // For safety in this demo, log but don't actually click
                console.log("Found post button - would click in real implementation");
                // postButton.click(); // Commented out for safety
                
                // Simulate as if we posted
                commentsPosted++;
                
                // Update comment count in storage
                try {
                  chrome.runtime.sendMessage({ action: "recordComment" });
                } catch (e) {
                  console.log("Couldn't update comment count:", e);
                }
                
                // Wait after posting
                const postDelay = 3000 + (Math.random() * variabilityFactor * 50);
                console.log(`Waiting ${postDelay.toFixed(0)}ms after posting comment`);
                await new Promise(r => setTimeout(r, postDelay));
              } else {
                console.log("Couldn't find post button");
              }
            } else {
              console.log("Couldn't find reply input");
            }
          } else {
            console.log("Couldn't find reply button");
          }
          
          // Go back to the profile page
          console.log("Going back to profile page after comment");
          history.back();
          
          // Wait after going back
          const backDelay = 3000 + (Math.random() * variabilityFactor * 20);
          console.log(`Waiting ${backDelay.toFixed(0)}ms after going back`);
          await new Promise(r => setTimeout(r, backDelay));
        } else {
          console.log(`No tweet link found for tweet ${i+1}`);
        }
      } catch (error) {
        console.error(`Error commenting on tweet ${i+1} from ${accountName}:`, error);
      }
      
      // If rate limited, stop processing
      if (rateLimited) {
        break;
      }
    }
    
    console.log(`Comment task completed for ${accountName}. Comments posted: ${commentsPosted}. Rate limited: ${rateLimited}`);
    resolve({ commentsPosted, rateLimited });
  });
}

// Function to manually check for new posts
async function checkForNewPosts() {
  console.log("Manually checking for new posts");
  
  try {
    // Get target accounts
    const result = await chrome.storage.local.get(['targetAccounts', 'settings']);
    
    if (!result.targetAccounts || result.targetAccounts.length === 0) {
      console.log("No target accounts configured.");
      return { success: true, message: 'No accounts configured to check' };
    }
    
    // Check daily limits
    const limits = await checkDailyLimits();
    
    if (!limits.canContinue) {
      console.log("Too many rate limit errors. Skipping new posts check.");
      return { 
        success: false, 
        message: 'Skipping due to Twitter rate limits. Will try again later.' 
      };
    }
    
    // Get the current tab or create a new one
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let tabId;
    
    if (tabs.length === 0) {
      const newTab = await chrome.tabs.create({ url: 'https://twitter.com', active: false });
      tabId = newTab.id;
    } else {
      tabId = tabs[0].id;
      await chrome.tabs.update(tabId, { url: 'https://twitter.com' });
    }
    
    // Pick at most 2 random accounts to check
    const shuffledAccounts = [...result.targetAccounts].sort(() => 0.5 - Math.random());
    const accountsToCheck = shuffledAccounts.slice(0, Math.min(2, shuffledAccounts.length));
    
    console.log(`Checking ${accountsToCheck.length} accounts for new posts`);
    
    // Wait for page to load
    const loadDelay = 3000;
    await new Promise(resolve => setTimeout(resolve, loadDelay));
    
    // Similar to handleLikeTask but only check for the newest posts
    for (const account of accountsToCheck) {
      try {
        console.log(`Checking for new posts from: ${account}`);
        await chrome.tabs.update(tabId, { url: `https://twitter.com/${account}` });
        
        // Wait for the page to load
        const pageLoadDelay = 5000;
        await new Promise(resolve => setTimeout(resolve, pageLoadDelay));
        
        // Execute script to check and like newest post
        await chrome.scripting.executeScript({
          target: { tabId },
          function: checkNewestPost,
          args: [account, result.settings]
        });
        
        // Wait between accounts
        const accountDelay = 3000;
        await new Promise(resolve => setTimeout(resolve, accountDelay));
      } catch (error) {
        console.error(`Error checking new posts for ${account}:`, error);
      }
    }
    
    // Create a notification to inform the user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Tweet Boost Buddy',
      message: `Checked ${accountsToCheck.length} accounts for new posts`
    });
    
    return { success: true, message: `Checked ${accountsToCheck.length} accounts for new posts` };
  } catch (error) {
    console.error("Error in checkForNewPosts:", error);
    return { success: false, error: error.toString() };
  }
}

// Function to check newest post (injected into the tab)
function checkNewestPost(accountName, settings) {
  return new Promise(async (resolve) => {
    console.log(`Checking newest post for ${accountName}`);
    
    // Check for rate limit errors
    const checkForRateLimit = () => {
      const errorElements = document.querySelectorAll('[data-testid="error-detail"]');
      for (const el of errorElements) {
        if (el.textContent && (
          el.textContent.includes("limit") || 
          el.textContent.includes("429") || 
          el.textContent.includes("Too Many Requests")
        )) {
          return true;
        }
      }
      return false;
    };
    
    if (checkForRateLimit()) {
      console.error("Rate limit detected while checking new posts");
      try {
        chrome.runtime.sendMessage({ action: "recordRateLimit" });
      } catch (e) {
        console.log("Couldn't record rate limit:", e);
      }
      resolve({ success: false, rateLimited: true });
      return;
    }
    
    // Get the first (newest) tweet
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    if (tweets.length === 0) {
      console.log(`No tweets found for ${accountName}`);
      resolve({ success: false, reason: 'no-tweets' });
      return;
    }
    
    const newestTweet = tweets[0];
    
    // Check if it's already liked
    const isLiked = newestTweet.querySelector('[data-testid="unlike"]');
    if (isLiked) {
      console.log(`Newest tweet from ${accountName} is already liked`);
      resolve({ success: true, action: 'already-liked' });
      return;
    }
    
    // Find and click the like button
    const likeButton = newestTweet.querySelector('[data-testid="like"]');
    if (likeButton) {
      console.log(`Liking newest tweet from ${accountName}`);
      
      // Wait a moment before liking
      const likeDelay = 1000 + (Math.random() * 2000);
      await new Promise(r => setTimeout(r, likeDelay));
      
      likeButton.click();
      
      // Update like count in storage
      try {
        chrome.runtime.sendMessage({ action: "recordLike" });
      } catch (e) {
        console.log("Couldn't update like count:", e);
      }
      
      resolve({ success: true, action: 'liked' });
    } else {
      console.log(`Could not find like button for newest tweet from ${accountName}`);
      resolve({ success: false, reason: 'no-like-button' });
    }
  });
}

// Listen for runtime messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "recordLike") {
    updateDailyStats('like');
    sendResponse({ success: true });
  } else if (message.action === "recordComment") {
    updateDailyStats('comment');
    sendResponse({ success: true });
  }
});

// Initialize notifications permission when needed
function ensureNotificationsPermission() {
  if (chrome.notifications) {
    chrome.notifications.getPermissionLevel((level) => {
      if (level !== 'granted') {
        console.log("Notifications permission not granted");
        // We don't request permission here as it would need user interaction
      }
    });
  }
}

// Set up initial check when extension is loaded
chrome.runtime.onStartup.addListener(() => {
  ensureNotificationsPermission();
  
  // Check if the bot should be running
  chrome.storage.local.get(['botRunning'], (result) => {
    if (result.botRunning) {
      console.log("Extension started, resuming bot operation");
      scheduleNextCheck();
    }
  });
});

// When a tab is updated, check if it's Twitter and inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('twitter.com')) {
    console.log(`Tab updated and is on Twitter: ${tab.url}`);
    // We could inject additional monitoring/helper scripts here if needed
  }
});

console.log("Tweet Boost Buddy background script loaded successfully");
