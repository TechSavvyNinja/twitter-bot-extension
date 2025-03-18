// Content script for Tweet Boost Buddy Extension
console.log("Tweet Boost Buddy content script loaded on:", window.location.href);

// Default OpenAI API key for all extension users
const DEFAULT_API_KEY = "sk-FvyGYbQJt3BlbktjZ0mHH9YT3BlbkFJuDrQAbcTfLweN4Tme"; // Replace this with your actual API key

// Helper function to wait for an element to appear on the page
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }
    
    const observer = new MutationObserver(mutations => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Set timeout to avoid hanging indefinitely
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "generateComment") {
    generateComment(message.prompt, sendResponse);
    return true; // Indicates async response
  }
  
  else if (message.action === "postComment") {
    postComment(message.comment, sendResponse);
    return true; // Indicates async response
  }
  
  else if (message.action === "likePost") {
    likePost(sendResponse);
    return true; // Indicates async response
  }
});

// Function to analyze a tweet and extract context
async function analyzeTweet() {
  try {
    console.log("Analyzing current tweet...");
    
    // Wait for the tweet text element to be available
    const tweetTextElement = await waitForElement('article[data-testid="tweet"] div[data-testid="tweetText"]')
      .catch(() => null);
    
    const tweetText = tweetTextElement?.textContent || '';
    console.log("Found tweet text:", tweetText);
    
    // Check for media
    const tweetMedia = document.querySelector('article[data-testid="tweet"] div[data-testid="tweetPhoto"]') ? 'Has media' : 'No media';
    
    // Get any links in the tweet
    const tweetLinks = Array.from(document.querySelectorAll('article[data-testid="tweet"] a[href^="https"]')).map(a => a.href);
    
    // Get username if possible
    const usernameElement = document.querySelector('article[data-testid="tweet"] a[role="link"][href^="/"]');
    const username = usernameElement ? usernameElement.textContent : 'Unknown';
    
    console.log("Tweet analysis complete:", { 
      username,
      text: tweetText, 
      hasMedia: tweetMedia, 
      links: tweetLinks 
    });
    
    return {
      username,
      text: tweetText,
      hasMedia: tweetMedia,
      links: tweetLinks
    };
  } catch (error) {
    console.error("Error analyzing tweet:", error);
    return {
      text: "",
      hasMedia: "No media",
      links: []
    };
  }
}

// Function to generate a comment for the current tweet
async function generateComment(prompt, sendResponse) {
  try {
    console.log("Generating comment for current tweet with prompt:", prompt);
    const tweetInfo = await analyzeTweet();
    
    // If we don't have enough tweet content, use fallback comments
    if (!tweetInfo.text || tweetInfo.text.length < 5) {
      // Fallback to sample comments if the tweet text is empty or too short
      const sampleComments = [
        "This is really insightful! Thanks for sharing.",
        "I've been thinking about this a lot lately. Great perspective!",
        "Totally agree with your take on this. 💯",
        "Interesting point! Have you considered the impact of this on other factors?",
        "This is exactly what I needed to read today. Thank you!"
      ];
      
      const comment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
      console.log("Generated fallback comment:", comment);
      sendResponse({ 
        success: true, 
        comment: comment, 
        tweetText: tweetInfo.text 
      });
      return;
    }
    
    // Check if we have settings from storage
    chrome.storage.local.get(['settings'], async function(result) {
      try {
        let aiPrompt = "Write a short, engaging comment for this tweet:";
        
        // If we have custom AI prompt in settings, use that
        if (result.settings && result.settings.aiPrompt) {
          aiPrompt = result.settings.aiPrompt;
        }
        
        // Prepare tweet context for AI
        const promptForAI = `${aiPrompt}\n\nTweet by @${tweetInfo.username}: "${tweetInfo.text}"\n\n${prompt || ""}`;
        console.log("Sending to AI:", promptForAI);
        
        try {
          const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${DEFAULT_API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant that generates short, engaging Twitter comments. Keep responses under 280 characters, conversational, and relevant to the tweet content."
                },
                {
                  role: "user",
                  content: promptForAI
                }
              ],
              max_tokens: 150,
              temperature: 0.7
            })
          });
          
          if (!apiResponse.ok) {
            throw new Error(`API request failed with status ${apiResponse.status}`);
          }
          
          const data = await apiResponse.json();
          const generatedComment = data.choices[0].message.content.trim();
          
          console.log("Generated AI comment:", generatedComment);
          sendResponse({ 
            success: true, 
            comment: generatedComment, 
            tweetText: tweetInfo.text 
          });
        } catch (error) {
          console.error("Error calling OpenAI API:", error);
          // Fallback to a generic comment if API call fails
          sendResponse({ 
            success: true, 
            comment: "Interesting post! Thanks for sharing your thoughts.", 
            tweetText: tweetInfo.text,
            usingFallback: true,
            error: error.toString()
          });
        }
      } catch (error) {
        console.error("Error in settings retrieval:", error);
        sendResponse({ 
          success: false, 
          error: error.toString() 
        });
      }
    });
  } catch (error) {
    console.error("Error generating comment:", error);
    sendResponse({ 
      success: false, 
      error: error.toString() 
    });
  }
}

// Function to post a comment on the current tweet
async function postComment(comment, sendResponse) {
  try {
    console.log("Attempting to post comment:", comment);
    
    // Wait for the reply button to be available and click it to open reply box
    const replyButton = await waitForElement('article[data-testid="tweet"] div[data-testid="reply"]')
      .catch(() => null);
    
    if (!replyButton) {
      throw new Error("Reply button not found");
    }
    
    console.log("Found reply button, clicking to open reply form...");
    replyButton.click();
    
    // Wait for the comment input field to appear
    const commentInput = await waitForElement('[data-testid="tweetTextarea_0"]', 5000)
      .catch(() => null);
    
    if (!commentInput) {
      throw new Error("Comment input not found after clicking reply");
    }
    
    console.log("Found comment input, focusing and typing...");
    
    // Focus the input
    commentInput.focus();
    
    // Use a more reliable method to set text in contentEditable elements
    if (typeof commentInput.textContent !== 'undefined') {
      commentInput.textContent = comment;
      
      // Create and dispatch an input event to ensure Twitter registers the text change
      const inputEvent = new Event('input', { bubbles: true });
      commentInput.dispatchEvent(inputEvent);
      
      console.log("Text inserted into comment field");
      
      // Wait a moment for Twitter to register the input
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find and click the reply button
      const submitButton = await waitForElement('[data-testid="tweetButton"]', 5000)
        .catch(() => null);
      
      if (!submitButton) {
        throw new Error("Tweet/Reply button not found");
      }
      
      console.log("Found tweet button, clicking to submit reply...");
      submitButton.click();
      
      // Wait a moment to see if the submission completes
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log("Comment posted successfully");
      sendResponse({ success: true });
    } else {
      throw new Error("Could not set text content on the comment input");
    }
  } catch (error) {
    console.error("Error posting comment:", error);
    sendResponse({ success: false, error: error.toString() });
  }
}

// Function to like the current post/tweet
async function likePost(sendResponse) {
  try {
    console.log("Attempting to like post...");
    
    // Wait for the like button if not already liked
    const likeButton = await waitForElement('article[data-testid="tweet"] [data-testid="like"]', 5000)
      .catch(() => null);
    
    if (!likeButton) {
      // Check if it might already be liked
      const unlikeButton = document.querySelector('article[data-testid="tweet"] [data-testid="unlike"]');
      if (unlikeButton) {
        console.log("Post already liked");
        sendResponse({ success: true, alreadyLiked: true });
        return;
      }
      
      throw new Error("Like button not found");
    }
    
    console.log("Found like button, clicking...");
    likeButton.click();
    
    // Wait a moment to confirm the like registered
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify like was successful by checking for unlike button
    const unlikeButton = document.querySelector('article[data-testid="tweet"] [data-testid="unlike"]');
    if (unlikeButton) {
      console.log("Liked post successfully");
      sendResponse({ success: true });
    } else {
      throw new Error("Like action did not register");
    }
  } catch (error) {
    console.error("Error liking post:", error);
    sendResponse({ success: false, error: error.toString() });
  }
}

// Run initial analysis when content script loads on tweet pages
if (window.location.pathname.includes('/status/')) {
  console.log("Content script loaded on a tweet page, analyzing...");
  analyzeTweet().then(tweetInfo => {
    console.log("Initial tweet analysis complete:", tweetInfo);
  });
}
