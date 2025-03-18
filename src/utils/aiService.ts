
// OpenAI API services

// Default OpenAI API key for all extension users
const DEFAULT_API_KEY = "sk-FvyGYbQJt3BlbktjZ0mHH9YT3BlbkFJuDrQAbcTfLweN4Tme"; // Real API key for all users

// Generate comment with OpenAI API directly from the service
export const generateAIComment = async (tweetText: string, username: string, customPrompt: string = ''): Promise<string> => {
  try {
    let prompt = "Write a short, engaging comment for this tweet:";
    
    // Add custom prompt if provided
    if (customPrompt) {
      prompt = customPrompt;
    }
    
    // Prepare tweet context for AI
    const promptForAI = `${prompt}\n\nTweet by @${username}: "${tweetText}"`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating AI comment:", error);
    throw error;
  }
};
