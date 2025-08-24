const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const glob = require('fast-glob');

// Configuration
const DOMAIN = 'https://www.mjkelleyphoto.com';
const OUTPUT_DIR = './';

// Page priorities and change frequencies
const PAGE_CONFIG = {
  'index.html': { priority: 1.0, changefreq: 'weekly' },
  'architecture-photography.html': { priority: 0.9, changefreq: 'monthly' },
  'automotive-photography.html': { priority: 0.9, changefreq: 'monthly' },
  'headshot-photography.html': { priority: 0.9, changefreq: 'monthly' },
  'landscape-photography.html': { priority: 0.9, changefreq: 'monthly' },
  'portraits.html': { priority: 0.9, changefreq: 'monthly' },
  'real-estate.html': { priority: 0.9, changefreq: 'monthly' },
  'engagement-couples-photography.html': { priority: 0.8, changefreq: 'monthly' },
  'video.html': { priority: 0.8, changefreq: 'monthly' },
  'projects.html': { priority: 0.8, changefreq: 'weekly' },
  'contact.html': { priority: 0.8, changefreq: 'monthly' },
  'about-michael-j-kelley-photography.html': { priority: 0.7, changefreq: 'monthly' }
};

// Get file last modified date from Git
function getGitLastModified(filePath) {
  try {
    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return new Date().toISOString().split('T')[0];
    }
    
    const timestamp = execSync(`git log -1 --format="%ct" -- "${filePath}"`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    
    if (timestamp && timestamp !== '') {
      return new Date(parseInt(timestamp) * 1000).toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn(`Could not get git date for ${filePath}: ${error.message}`);
  }
  
  // Fallback to file system date
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString().split('T')[0];
  } catch (error) {
    console.warn(`Could not get file date for ${filePath}: ${error.message}`);
    return new Date().toISOString().split('T')[0];
  }
}

// Generate main sitemap
function generateMainSitemap() {
  console.log('Generating main sitemap...');
  
  const htmlFiles = glob.sync('*.html', { 
    ignore: ['project-template.html'],
    onlyFiles: true 
  });
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Add homepage
  if (fs.existsSync('index.html')) {
    const indexLastMod = getGitLastModified('index.html');
    sitemap += `  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${indexLastMod}</lastmod>
    <changefreq>${PAGE_CONFIG['index.html'].changefreq}</changefreq>
    <priority>${PAGE_CONFIG['index.html'].priority}</priority>
  </url>
`;
  }

  // Add other pages
  htmlFiles
    .filter(file => file !== 'index.html')
    .sort()
    .forEach(file => {
      const config = PAGE_CONFIG[file] || { priority: 0.6, changefreq: 'monthly' };
      const lastMod = getGitLastModified(file);
      
      sitemap += `  <url>
    <loc>${DOMAIN}/${file}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${config.changefreq}</changefreq>
    <priority>${config.priority}</priority>
  </url>
`;
    });

  sitemap += '</urlset>';
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemap);
  console.log(`Main sitemap generated with ${htmlFiles.length} pages`);
}

// Generate image sitemap
function generateImageSitemap() {
  console.log('Generating image sitemap...');
  
  // Check if images directory exists
  if (!fs.existsSync('images')) {
    console.log('Images directory not found, skipping image sitemap');
    return;
  }
  
  const imageFiles = glob.sync('images/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { 
    ignore: ['**/thumbs/**', '**/thumb/**'],
    onlyFiles: true
  });
  
  if (imageFiles.length === 0) {
    console.log('No images found, skipping image sitemap');
    return;
  }

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  // Group images by category/page
  const categories = {
    architecture: { page: 'architecture-photography.html', images: [] },
    automotive: { page: 'automotive-photography.html', images: [] },
    headshots: { page: 'headshot-photography.html', images: [] },
    landscape: { page: 'landscape-photography.html', images: [] },
    portraits: { page: 'portraits.html', images: [] },
    'real-estate': { page: 'real-estate.html', images: [] },
    'engagement-couples': { page: 'engagement-couples-photography.html', images: [] }
  };

  imageFiles.forEach(file => {
    const pathParts = file.split('/');
    if (pathParts.length >= 2) {
      const category = pathParts[1]; // images/category/file.jpg
      if (categories[category]) {
        categories[category].images.push(file);
      }
    }
  });

  // Generate entries for each category page
  Object.entries(categories).forEach(([category, data]) => {
    if (data.images.length === 0) return;
    
    const pageFile = data.page;
    if (!fs.existsSync(pageFile)) {
      console.warn(`Page file not found: ${pageFile}`);
      return;
    }

    const lastMod = getGitLastModified(pageFile);
    
    sitemap += `  <url>
    <loc>${DOMAIN}/${pageFile}</loc>
    <lastmod>${lastMod}</lastmod>
`;

    // Limit to 10 images per page for performance
    data.images.slice(0, 10).forEach(imagePath => {
      const imageUrl = `${DOMAIN}/${imagePath}`;
      const imageName = path.basename(imagePath, path.extname(imagePath))
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      sitemap += `    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${imageName} | Michael J. Kelley Photography</image:title>
      <image:caption>Professional ${category.replace('-', ' ')} photography by Michael J. Kelley in the San Francisco Bay Area</image:caption>
    </image:image>
`;
    });

    sitemap += '  </url>\n';
  });

  sitemap += '</urlset>';
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'image-sitemap.xml'), sitemap);
  console.log(`Image sitemap generated with ${imageFiles.length} images across ${Object.keys(categories).length} categories`);
}

// Generate video sitemap
function generateVideoSitemap() {
  console.log('Generating video sitemap...');
  
  const videoFiles = ['video.html']; // Will expand to include project pages later
  const allVideoIds = [];
  let hasVideos = false;

  videoFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      console.log(`${file} not found, skipping`);
      return;
    }

    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Enhanced regex to catch different YouTube embed formats
      const youtubePatterns = [
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/g,
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g
      ];
      
      youtubePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (!allVideoIds.includes(match[1])) {
            allVideoIds.push(match[1]);
            hasVideos = true;
          }
        }
      });
    } catch (error) {
      console.warn(`Error reading ${file}: ${error.message}`);
    }
  });

  if (!hasVideos || allVideoIds.length === 0) {
    console.log('No videos found, skipping video sitemap');
    return;
  }

  const lastMod = getGitLastModified('video.html');
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>${DOMAIN}/video.html</loc>
    <lastmod>${lastMod}</lastmod>
`;

  allVideoIds.forEach((videoId, index) => {
    sitemap += `    <video:video>
      <video:thumbnail_loc>https://img.youtube.com/vi/${videoId}/maxresdefault.jpg</video:thumbnail_loc>
      <video:title>Professional Video Production | Michael J. Kelley Photography</video:title>
      <video:description>Professional video and drone cinematography services in the San Francisco Bay Area by Michael J. Kelley Photography.</video:description>
      <video:player_loc>https://www.youtube.com/embed/${videoId}</video:player_loc>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>
`;
  });

  sitemap += `  </url>
</urlset>`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'video-sitemap.xml'), sitemap);
  console.log(`Video sitemap generated with ${allVideoIds.length} videos`);
}

// Generate blog sitemap (future)
function generateBlogSitemap() {
  const blogDir = 'blog';
  
  if (!fs.existsSync(blogDir)) {
    console.log('Blog directory not found, skipping blog sitemap');
    return;
  }
  
  console.log('Generating blog sitemap...');
  
  const blogFiles = glob.sync('blog/**/*.html', { onlyFiles: true });
  
  if (blogFiles.length === 0) {
    console.log('No blog posts found');
    return;
  }

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  blogFiles
    .sort()
    .forEach(file => {
      const lastMod = getGitLastModified(file);
      const url = file.replace(/^blog\//, '');
      
      sitemap += `  <url>
    <loc>${DOMAIN}/blog/${url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    });

  sitemap += '</urlset>';
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'blog-sitemap.xml'), sitemap);
  console.log(`Blog sitemap generated with ${blogFiles.length} posts`);
}

// Main execution
function main() {
  console.log('Starting sitemap generation...');
  console.log(`Working directory: ${process.cwd()}`);
  
  try {
    generateMainSitemap();
    generateImageSitemap();
    generateVideoSitemap();
    generateBlogSitemap();
    
    console.log('All sitemaps generated successfully!');
  } catch (error) {
    console.error('Error generating sitemaps:', error);
    process.exit(1);
  }
}

main();