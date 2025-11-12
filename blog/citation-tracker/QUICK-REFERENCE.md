# Citation Tracker - Quick Reference

## Daily Workflow

### Starting Research on a New Topic
1. Open config page (bookmark it!)
2. Click "➕ New Project"
3. Enter project name and file name
4. Project is now active ✓

### Starting Research on Existing Topic
1. Open config page
2. Click on the project name
3. Project is now active ✓

### Capturing Citations
While reading any article:
- Click **📎 Save Citation** bookmarklet
- Green notification confirms it's saved
- Continue reading and citing!

### Checking Your Citations
- Go to GitHub: `your-repo/_data/citations/`
- Open your project's JSON file
- All citations are listed there

---

## Bookmarklet Behavior

**Green notification** = Success ✓
**Red notification** = Error (check config)
**No notification** = Bookmarklet not installed properly

---

## File Structure

```
your-github-repo/
└── _data/
    └── citations/
        ├── democracy-blog.json       ← Your citations
        ├── ai-ethics-project.json    ← More citations
        └── photography-research.json ← Even more!
```

---

## Citation JSON Format

```json
{
  "project": "Project Name",
  "created": "2025-11-12T10:30:00.000Z",
  "citations": [
    {
      "timestamp": "2025-11-12T14:30:00.000Z",
      "title": "Article Title",
      "url": "https://example.com/article"
    }
  ]
}
```

---

## Common Tasks

### Switch Projects
Config page → Click different project

### Add New Project
Config page → "➕ New Project" → Fill form → Create

### Delete Project
Config page → Find project → "🗑️ Delete"
(Note: Doesn't delete the GitHub file, only removes from your list)

### Update GitHub Token
Config page → Paste new token → "💾 Save GitHub Config"

### Test Connection
Config page → "🔍 Test Connection"
Should see: "✅ Successfully connected to GitHub!"

---

## Troubleshooting Quick Fixes

**Bookmarklet not working?**
→ Refresh config page, re-drag bookmarklet

**Can't connect to GitHub?**
→ Check token has 'repo' scope
→ Verify repo name format: `username/repo`

**Citation not saving?**
→ Make sure a project is selected (should be highlighted)
→ Check you're connected to internet

---

## For Future Agents

Your citations are now in a standardized format that any agent can read:

```javascript
// Agent can fetch and parse citations like this:
const response = await fetch(
  'https://api.github.com/repos/user/repo/contents/_data/citations/project.json'
);
const fileData = await response.json();
const content = JSON.parse(atob(fileData.content));
// content.citations is now an array of all citations!
```

---

## What's Next?

Now that you have citation capture working, you're ready to build:

1. **Citation Formatter Agent** - Matches citations to quotes in your drafts
2. **Blog Automation Agent** - Formats and publishes your posts
3. **Project Page Builder** - Creates project pages with proper citations

All can access your centralized GitHub citation data!

---

## Bookmarks to Keep

📌 **Citation Tracker Config** - Open this to manage projects
📎 **Save Citation** - Drag this to bookmarks bar (installed once)

---

## Tips

- Keep config page bookmarked for quick access
- Create projects before starting research
- Citations are version-controlled in Git
- Can edit JSON files directly on GitHub if needed
- Works on any device (just set up config page on each)

---

That's it! Simple, streamlined citation capture. 🎉
