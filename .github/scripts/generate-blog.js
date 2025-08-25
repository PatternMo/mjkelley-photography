const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

// Adjust paths to be relative to the repository root
const baseDir = path.resolve(__dirname, '..', '..');
const blogDir = path.join(baseDir, 'blog');
const templateDir = path.join(blogDir, 'template');
const postsDir = path.join(blogDir, 'posts');
const generateDir = path.join(blogDir, 'generate');
const indexTemplatePath = path.join(templateDir, 'blog-index-template.html');
const postTemplatePath = path.join(templateDir, 'blog-post-template.html');

const postTemplate = fs.readFileSync(postTemplatePath, 'utf8');
const indexTemplate = fs.readFileSync(indexTemplatePath, 'utf8');

// Ensure output directories exist
if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir);

async function generatePosts() {
    const markdownFiles = fs.readdirSync(generateDir).filter(file => file.endsWith('.md'));
    const allPostsData = [];

    // Process each markdown file
    for (const file of markdownFiles) {
        const filePath = path.join(generateDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContent);
    // Generate slug from title instead of filename
        const slug = data.title 
            ? data.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
                .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
            : path.basename(file, '.md');    // Fallback to filename if no title

        const postHtml = marked(content);

        // Fill in the post template
        const finalPostHtml = postTemplate
            .replace(/{{title}}/g, data.title)
            .replace(/{{description}}/g, data.description)
            .replace(/{{image}}/g, data.image)
            .replace(/{{url}}/g, `/blog/posts/${slug}.html`)
            .replace(/{{slug}}/g, slug)
            .replace(/{{content}}/g, postHtml);

        fs.writeFileSync(path.join(postsDir, `${slug}.html`), finalPostHtml);

        allPostsData.push({
            ...data,
            slug,
            url: `/blog/posts/${slug}.html`,
        });
    }

    // Sort posts by date, descending
    allPostsData.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generate the index page
    let featuredPostHtml = '';
    let previousPostsHtml = '';

    if (allPostsData.length > 0) {
        const featuredPost = allPostsData[0];
        const featuredMarkdownContent = matter(fs.readFileSync(path.join(generateDir, `${featuredPost.slug}.md`), 'utf8')).content;
        featuredPostHtml = marked(featuredMarkdownContent);

        // Generate previews for the remaining posts
        previousPostsHtml = allPostsData.slice(1).map(post => {
            const tags = post.tags.map(tag => `#${tag}`).join(' ');
            return `
                <div class="post-preview">
                    <h3><a href="${post.url}">${post.title}</a></h3>
                    <p class="post-meta">
                        <span class="post-date">${post.date}</span>
                        <span class="post-tags">${tags}</span>
                    </p>
                    <p>${post.description}</p>
                </div>
            `;
        }).join('');
    }

    const finalIndexHtml = indexTemplate
        .replace(/{{featured_post}}/g, featuredPostHtml)
        .replace(/{{previous_posts}}/g, previousPostsHtml);
        
    fs.writeFileSync(path.join(blogDir, 'index.html'), finalIndexHtml);
}

generatePosts().catch(console.error);