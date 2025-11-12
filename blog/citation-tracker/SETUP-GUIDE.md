# Citation Tracker - Setup Guide

## Overview
This system lets you capture citations from any webpage with one click and stores them in your GitHub repository. Perfect for research workflows!

## Features
✅ One-click citation capture from any webpage
✅ Stores citations as JSON in your GitHub repo
✅ Multiple projects support
✅ Future agents can easily access your citations
✅ Version controlled (every change tracked)
✅ Works across all your devices

---

## Step 1: Create a GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Set these options:
   - **Note**: "Citation Tracker"
   - **Expiration**: Choose your preference (90 days, 1 year, or no expiration)
   - **Scopes**: Check the box for **`repo`** (Full control of private repositories)
3. Click "Generate token"
4. **IMPORTANT**: Copy the token immediately (starts with `ghp_...`)
   - You won't be able to see it again!
   - Store it somewhere safe temporarily

---

## Step 2: Open the Config Page

1. Open `citation-tracker-config.html` in your browser
2. **Bookmark this page** for easy access later

---

## Step 3: Configure GitHub Connection

In the config page:

1. **GitHub Personal Access Token**: Paste the token you created
2. **Repository**: Enter your repo in format `username/repo-name`
   - Example: `michael-kelley/photography-website`
3. Click **"💾 Save GitHub Config"**
4. Click **"🔍 Test Connection"** to verify it works

You should see: ✅ Successfully connected to GitHub!

---

## Step 4: Create Your First Project

1. Click **"➕ New Project"**
2. Fill in:
   - **Project Name**: "Democracy Blog Post" (or whatever you're researching)
   - **File Name**: "democracy-blog.json" (will be stored at `_data/citations/democracy-blog.json`)
3. Click **"Create Project"**

The system will:
- Create the project locally
- Initialize a JSON file in your GitHub repo at `_data/citations/democracy-blog.json`

---

## Step 5: Install the Bookmarklet

1. In the config page, scroll to the bottom
2. Find the **"📎 Save Citation"** link
3. **Drag it to your bookmarks bar**
   - Or right-click and select "Bookmark This Link"

---

## Step 6: Start Capturing Citations!

Now you're ready to use it:

1. Browse to any article you want to cite
2. Click the **"📎 Save Citation"** bookmarklet in your bookmarks bar
3. You'll see a notification: "✓ Saved to [Project Name]"
4. The citation is automatically saved to GitHub!

---

## Switching Between Projects

When you start researching a different topic:

1. Open the config page
2. Click on a different project in the list
3. That project is now active
4. All future bookmarklet clicks save to that project

---

## Your Citation Files

Your citations are stored in your GitHub repo at:
```
your-repo/
└── _data/
    └── citations/
        ├── democracy-blog.json
        ├── ai-ethics-project.json
        └── photography-research.json
```

Each file looks like:
```json
{
  "project": "Democracy Blog Post",
  "created": "2025-11-12T10:30:00.000Z",
  "citations": [
    {
      "timestamp": "2025-11-12T14:30:00.000Z",
      "title": "Democracy in Decline - Analysis",
      "url": "https://example.com/article"
    },
    {
      "timestamp": "2025-11-12T15:45:00.000Z",
      "title": "Newsweek: Political Trends 2025",
      "url": "https://newsweek.com/article"
    }
  ]
}
```

---

## Using with Future Agents

Any agent you build can now easily:

1. Read citations from your GitHub repo
2. Match citations to quotes in your drafts
3. Format them as HTML links
4. Access everything in one place

Example agent workflow:
```
1. Read draft from your computer
2. Fetch citations from GitHub: _data/citations/democracy-blog.json
3. Match quotes to citations
4. Insert HTML links
5. Save formatted draft
```

---

## Tips

### Create Folder Structure First (Optional)
You might want to create the `_data/citations/` folder in your repo first:

```bash
cd your-repo
mkdir -p _data/citations
echo '{"info": "Citation storage"}' > _data/citations/README.json
git add _data/citations/
git commit -m "Add citations folder"
git push
```

But this isn't required - the system will create files as needed.

### View Your Citations
You can always view your citations directly on GitHub:
- Go to your repo on github.com
- Navigate to `_data/citations/`
- Click on any `.json` file

### Edit Citations Manually
Since they're just JSON files in GitHub, you can:
- Edit them directly on GitHub
- Clone your repo and edit locally
- Use any text editor

### Multiple Devices
The config page stores settings in your browser's localStorage, so:
- You'll need to set up the config page on each device/browser
- But all citations go to GitHub, so they're synced automatically

### Security
- Your GitHub token is stored only in your browser's localStorage
- It's never sent anywhere except to GitHub API
- The bookmarklet runs entirely client-side
- Only you can access your token

---

## Troubleshooting

**"Failed to connect" error:**
- Check your token is correct
- Make sure token has `repo` scope
- Verify repository name format: `username/repo`

**"Failed to save citation" error:**
- Make sure you're connected to the internet
- Check the project file exists in GitHub
- Try clicking "Test Connection" in config page

**Bookmarklet does nothing:**
- Make sure you've selected a current project
- Check that you saved GitHub config
- Try refreshing the config page and re-dragging the bookmarklet

---

## Next Steps

Now that you have citation capture working, you can:

1. **Build the Citation Formatter Agent** - Reads citations from GitHub and formats them in your blog posts
2. **Build the Blog Automation Agent** - Handles markdown formatting, image compression, and GitHub uploads
3. **Build the Project Page Builder** - Creates project pages with your citations properly linked

All these agents can now access your centralized citation data in GitHub!

---

## Questions?

The system is designed to be simple and reliable. If you run into issues or want to add features, let me know!
