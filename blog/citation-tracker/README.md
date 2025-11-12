# 📎 Citation Tracker System

A streamlined system for capturing and managing research citations using GitHub as your central data store.

## What This Does

**One-click citation capture** → **Automatic GitHub storage** → **Ready for future agents**

### The Problem It Solves
You're researching articles in NotebookLM, pulling quotes into your blog drafts, but NotebookLM doesn't preserve the original URLs. You end up having to find all those sources again when it's time to add citations.

### The Solution
- Click a bookmarklet while reading any article
- Citation (title + URL) is automatically saved to GitHub
- Stored in organized JSON files by project
- Future agents can read these files to format citations in your blog posts

---

## Files Included

| File | Purpose |
|------|---------|
| `citation-tracker-config.html` | Main config page - manage projects and GitHub connection |
| `SETUP-GUIDE.md` | Complete setup instructions (start here!) |
| `QUICK-REFERENCE.md` | Daily workflow cheat sheet |
| `test-article.html` | Test page to verify bookmarklet works |

---

## Quick Start

### 1. Setup (10 minutes, one time)
1. Create GitHub Personal Access Token (with `repo` scope)
2. Open `citation-tracker-config.html` and bookmark it
3. Enter your token and repository name
4. Create your first project
5. Drag the bookmarklet to your bookmarks bar

**→ See SETUP-GUIDE.md for detailed instructions**

### 2. Daily Use
1. Select your current project (if switching)
2. Read articles and click the bookmarklet when you want to save a citation
3. That's it!

**→ See QUICK-REFERENCE.md for workflow details**

---

## Architecture

```
┌─────────────────┐
│  Your Browser   │
│                 │
│  [Config Page]  │ ← Manage projects
│  [Bookmarklet]  │ ← Capture citations
└────────┬────────┘
         │
         ↓ GitHub API
┌─────────────────┐
│  GitHub Repo    │
│                 │
│  _data/         │
│  └── citations/ │
│      ├── democracy-blog.json
│      ├── ai-ethics.json
│      └── photography.json
└─────────────────┘
         ↑
         │ Future agents read from here
┌─────────────────┐
│ Citation Agent  │ ← Formats citations in your posts
│ Blog Agent      │ ← Publishes your content
│ Project Builder │ ← Creates project pages
└─────────────────┘
```

---

## Citation File Format

Each project gets a JSON file in your repo at `_data/citations/[project-name].json`:

```json
{
  "project": "Democracy Blog Post",
  "created": "2025-11-12T10:30:00.000Z",
  "citations": [
    {
      "timestamp": "2025-11-12T14:30:00.000Z",
      "title": "Democracy in Decline - NYT Analysis",
      "url": "https://nytimes.com/article"
    },
    {
      "timestamp": "2025-11-12T15:45:00.000Z",
      "title": "Political Trends 2025 - Newsweek",
      "url": "https://newsweek.com/politics/2025"
    }
  ]
}
```

---

## Why GitHub?

1. **Centralized** - All your research data in one place
2. **Version controlled** - Every change is tracked
3. **API accessible** - Future agents can easily read/write
4. **Cross-device** - Syncs automatically
5. **Already using it** - Your blog/website is already in GitHub

---

## What's Next?

Now that you have citation capture working, you can build:

### Citation Formatter Agent
- Reads your draft blog post
- Fetches citations from GitHub
- Matches quotes/references to URLs
- Formats them as HTML links
- Outputs the final formatted post

### Blog Automation Agent
- Formats markdown properly
- Compresses images
- Uploads to GitHub
- Pushes to your website

### Project Page Builder
- Takes your content and images
- Uses a template
- Inserts proper citations
- Builds complete project page

**All these agents can now access your centralized citation data in GitHub!**

---

## Technical Details

### Security
- GitHub token stored in browser localStorage (client-side only)
- Token never sent anywhere except GitHub API
- Bookmarklet runs entirely in your browser
- Token scoped to one repo only

### Browser Compatibility
- Works in all modern browsers (Chrome, Brave, Firefox, Safari, Edge)
- Uses standard web APIs
- No external dependencies
- No server required

### GitHub API Usage
- Uses GitHub Contents API
- Each citation save = 2 API calls (read + update)
- Well within GitHub's rate limits for normal use
- Authenticated requests: 5,000/hour per user

---

## Troubleshooting

**Connection fails?**
- Check token has `repo` scope
- Verify repository name format: `username/repo-name`
- Token must not be expired

**Bookmarklet does nothing?**
- Ensure a project is selected
- Re-drag bookmarklet after updating config
- Check browser console for errors (F12)

**Citation not appearing in GitHub?**
- Verify you're connected to internet
- Check the file exists (project creation should create it)
- Visit GitHub repo and look for `_data/citations/` folder

---

## Advanced Usage

### Multiple Devices
Set up the config page on each device/browser. The bookmarklet will work everywhere because data is stored in GitHub.

### Manual Editing
You can edit citation files directly:
- On GitHub web interface
- Clone repo and edit locally
- Any text editor (they're just JSON)

### Bulk Import
To import existing citations, just edit the JSON file and add them to the `citations` array.

### Export
Citations are already in an easily exportable format (JSON). Any tool can read them.

---

## Future Enhancements (Optional)

Ideas for extending this system:
- Add tags/categories to citations
- Add notes/excerpts along with URL
- Build a search interface
- Generate bibliography in various formats
- Auto-detect duplicate URLs
- Chrome extension for keyboard shortcuts

---

## Support

This is a simple, self-contained system designed to be reliable and maintainable. All the code is included and can be modified to fit your needs.

The system is intentionally minimal to avoid complexity - it does one thing well: captures citations and stores them in GitHub.

---

## License

This system is built for your personal use. Modify it however you like!

---

**Created: November 2025**
**Built with: HTML, JavaScript, GitHub API**
**Purpose: Streamline research citation workflow**
