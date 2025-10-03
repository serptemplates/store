#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseDocument, stringify } from "yaml";

const productsDir = path.resolve("/home/runner/work/store/store/apps/store/data/products");

// Files to exclude
const excludedFiles = [
  "skool-video-downloader.yaml",
  "vimeo-video-downloader.yaml",
  "loom-video-downloader.yaml"
];

// Platform-specific FAQ templates
const faqTemplates = {
  // Video streaming platforms
  youtube: [
    {
      question: "Does this downloader work with YouTube playlists and channels?",
      answer: "Yes, our YouTube downloader supports batch downloading from playlists and entire channels. You can save multiple videos at once, maintaining the original playlist structure and video quality up to 8K resolution."
    },
    {
      question: "Can I download YouTube videos with subtitles and captions?",
      answer: "Absolutely! The downloader automatically extracts available subtitles and closed captions in all available languages. Subtitles are saved as separate SRT files that work with any media player."
    },
    {
      question: "What makes this different from free YouTube downloaders?",
      answer: "Unlike free tools that often break after YouTube updates, our downloader offers reliable lifetime updates, faster download speeds, batch processing, automatic subtitle extraction, and format conversion without quality loss. No ads, no limitations."
    },
    {
      question: "Can I download live streams and premieres from YouTube?",
      answer: "Yes, you can record live streams in real-time or download them after they finish. The tool also works with scheduled premieres once they go live, capturing them in the highest available quality."
    },
    {
      question: "How does the duplicate detection feature work?",
      answer: "Our smart duplicate detection scans your library and prevents re-downloading videos you already have. This saves time and storage space when downloading from channels or playlists you've previously accessed."
    }
  ],
  
  // Social media platforms
  instagram: [
    {
      question: "Can I download Instagram Stories and Highlights before they expire?",
      answer: "Yes! Our Instagram downloader lets you save Stories, Highlights, Reels, and IGTV videos in their original quality. Stories can be archived before they disappear after 24 hours, preserving them permanently."
    },
    {
      question: "Does it work with private Instagram accounts I follow?",
      answer: "Yes, as long as you have access to view the private content through your Instagram account, our downloader can save it. You'll need to be logged in to your account that has permission to view the private profiles."
    },
    {
      question: "Can I download entire Instagram profiles or specific hashtags?",
      answer: "Absolutely! You can batch download all posts from a profile, specific hashtags, or even carousel posts with multiple images. The downloader organizes everything by user and date for easy management."
    },
    {
      question: "What's the maximum quality for Instagram downloads?",
      answer: "The downloader preserves the original upload quality. For photos, this means full resolution images (typically up to 1080x1350 for posts). Videos are downloaded in the highest quality Instagram serves, usually 1080p HD."
    },
    {
      question: "Does it save post captions and comments?",
      answer: "Yes! Along with the media files, you can optionally save post captions, hashtags, and location data. This is perfect for archiving content with its full context and metadata."
    }
  ],
  
  tiktok: [
    {
      question: "Can I download TikTok videos without the watermark?",
      answer: "Yes! Our TikTok downloader removes the watermark automatically, giving you clean HD videos perfect for repurposing or archiving. You get the original quality video as uploaded by the creator."
    },
    {
      question: "Does it support downloading TikTok sounds and music?",
      answer: "Absolutely! You can extract just the audio from TikTok videos or download the full video. Audio is saved in high-quality MP3 format, perfect for using sounds in your own projects."
    },
    {
      question: "Can I download videos from private TikTok accounts?",
      answer: "You can only download videos from accounts you have permission to view. If you're following a private account and can see their videos, the downloader works. We respect creator privacy and TikTok's access controls."
    },
    {
      question: "How do I download an entire TikTok profile or hashtag?",
      answer: "Our batch download feature lets you save all videos from a user's profile or a specific hashtag. Just paste the profile URL or hashtag, and the tool will queue up all videos for automatic downloading."
    },
    {
      question: "What makes this better than online TikTok downloaders?",
      answer: "Unlike web-based tools, our desktop application is faster, more reliable, handles batch downloads, removes watermarks by default, and includes features like profile picture downloads and stats extraction. No daily limits or forced ads."
    }
  ],
  
  // Educational platforms
  udemy: [
    {
      question: "Can I download Udemy courses I've purchased for offline learning?",
      answer: "Yes! Our Udemy downloader lets you download all your purchased courses including videos, resources, quizzes, and subtitles. Everything is organized by section and lecture, making offline learning seamless."
    },
    {
      question: "Does it download course materials like PDFs and attachments?",
      answer: "Absolutely! Along with video lectures, the downloader saves all supplemental materials including PDFs, source code files, attachments, and subtitles in all available languages. You get the complete course package."
    },
    {
      question: "Will this work if Udemy updates their platform?",
      answer: "Yes, we provide lifetime updates to ensure compatibility. Whenever Udemy makes changes, we update the downloader within days. You'll never lose access to your purchased courses due to platform changes."
    },
    {
      question: "Can I download courses in bulk to save time?",
      answer: "Yes! Add multiple courses to the queue and let the downloader work automatically. It handles authentication, organizes files by course structure, and even resumes interrupted downloads if your connection drops."
    },
    {
      question: "What if my Udemy access expires or courses get removed?",
      answer: "That's exactly why our downloader exists. By archiving your purchased courses locally, you maintain permanent access even if Udemy removes content, instructors delete courses, or your subscription ends. Your learning library stays yours forever."
    }
  ],
  
  coursera: [
    {
      question: "Can I download Coursera courses I'm enrolled in?",
      answer: "Yes! Download all video lectures, reading materials, and transcripts from courses you're enrolled in. Perfect for learning offline or keeping course content after your subscription ends."
    },
    {
      question: "Does it save course subtitles and transcripts?",
      answer: "Absolutely! All available subtitles and transcripts are downloaded automatically in multiple languages. This is especially useful for language learners and students who prefer reading along with videos."
    },
    {
      question: "Can I preserve Coursera Specializations and Professional Certificates?",
      answer: "Yes! Download entire Specializations or Professional Certificate programs with all courses, modules, and materials organized exactly as they appear on Coursera. Keep your education investment safe permanently."
    },
    {
      question: "What happens if Coursera removes a course I've taken?",
      answer: "With our downloader, you own a permanent copy. Even if Coursera retires courses, changes content, or your access expires, you'll always have your downloaded materials. Many students wish they'd backed up courses that are no longer available."
    },
    {
      question: "Does it work with Coursera's mobile app or just the website?",
      answer: "Our downloader works with content from the Coursera website. It's actually more powerful than the mobile app because it downloads everything in original quality with all resources, whereas the app has limitations and requires constant connectivity."
    }
  ],
  
  // Stock media platforms
  shutterstock: [
    {
      question: "How does this downloader help manage my Shutterstock subscription?",
      answer: "Our tool streamlines bulk downloads, tracks which images you've already downloaded, and organizes files by collection or project. Perfect for agencies and creators who download hundreds of assets monthly and need efficient workflow management."
    },
    {
      question: "Can I download Shutterstock videos and music, not just images?",
      answer: "Yes! The downloader works with Shutterstock's entire library including images, vectors, videos, and music tracks. You can batch download mixed media types and organize them by project for efficient asset management."
    },
    {
      question: "Does it preserve metadata and licensing information?",
      answer: "Absolutely! All image metadata, keywords, and license details are preserved with each download. This makes it easy to track usage rights, find similar images later, and maintain compliance with licensing terms."
    },
    {
      question: "Can I download images at multiple sizes at once?",
      answer: "Yes! Select multiple resolution options and download the same image in different sizes with one click. Great for having both web-optimized and print-ready versions without manual re-downloads."
    },
    {
      question: "How does it help with client projects and team workflows?",
      answer: "Organize downloads into project folders, share collections with team members, and maintain consistent file naming. The tool integrates with your existing workflow and makes collaborative stock asset management effortless."
    }
  ],
  
  unsplash: [
    {
      question: "Is this downloader necessary if Unsplash images are free?",
      answer: "Yes! While Unsplash is free, our downloader adds bulk download capabilities, collection management, automatic attribution tracking, and organization features. Download entire curated collections instantly instead of one-by-one through the website."
    },
    {
      question: "Can I download entire Unsplash collections or user galleries?",
      answer: "Absolutely! Save entire collections, user portfolios, or curated galleries with one click. All images are downloaded in full resolution and organized by collection name for easy browsing and use in projects."
    },
    {
      question: "Does it track photographer attribution for me?",
      answer: "Yes! The downloader automatically saves photographer credits and creates attribution files for each image. This makes it easy to give proper credit in your projects, which is appreciated even though Unsplash doesn't require it."
    },
    {
      question: "Can I search and download by keywords or themes?",
      answer: "Yes! Use keyword search to find and bulk download all matching images. Perfect for building themed stock libraries for specific projects or creating mood boards without manual searching."
    },
    {
      question: "How does this compare to right-clicking to save images?",
      answer: "Our tool is exponentially faster for multiple images, preserves full resolution (not the web-optimized version), saves metadata, tracks what you've downloaded, and organizes everything automatically. Manual saving becomes tedious after the first few images."
    }
  ],
  
  // Adult content platforms
  pornhub: [
    {
      question: "Can I download private and premium Pornhub content?",
      answer: "If you have a Pornhub Premium account, the downloader works with premium videos and your private playlists. Simply log in through the app, and it will access any content your account can view."
    },
    {
      question: "Does it support downloading full playlists and channels?",
      answer: "Yes! Batch download entire playlists, model channels, or saved favorites. The tool organizes videos by performer or playlist name, making it easy to maintain your personal collection."
    },
    {
      question: "What video quality options are available?",
      answer: "Download in any available quality from 240p up to 1080p HD (or 4K for premium content). You can choose quality per video or set a default preference. Higher quality takes more space but looks better on large screens."
    },
    {
      question: "How does this protect my privacy?",
      answer: "All downloads happen directly on your device with no third-party servers involved. Your browsing history, downloads, and login credentials stay completely private. The tool doesn't collect, store, or share any of your data."
    },
    {
      question: "Can I download videos without watermarks?",
      answer: "The downloader saves videos exactly as they appear on Pornhub. If the source video has a watermark, the download will too. Premium content typically has fewer or no watermarks compared to free content."
    }
  ],
  
  onlyfans: [
    {
      question: "Can I download all content from OnlyFans creators I subscribe to?",
      answer: "Yes! Download all posts, images, videos, and stories from creators you're subscribed to. The tool organizes content by creator and date, making it easy to maintain a personal archive of your subscriptions."
    },
    {
      question: "Does it save OnlyFans messages and private content?",
      answer: "Yes! Download content from direct messages, private posts, and locked messages you've purchased. Everything you've paid to unlock can be archived permanently before subscriptions expire."
    },
    {
      question: "What happens if a creator deletes content or leaves the platform?",
      answer: "This is why our downloader exists. Many creators delete older content or leave OnlyFans entirely. With our tool, you maintain permanent access to content you've paid for, regardless of what creators do later."
    },
    {
      question: "How does bulk downloading work for multiple creators?",
      answer: "Add multiple creators to your download queue and let the tool work automatically. It handles authentication, respects rate limits to avoid account issues, and organizes everything by creator for easy browsing."
    },
    {
      question: "Is my account information and privacy protected?",
      answer: "Absolutely! All downloads are processed locally on your device. We never store or transmit your login credentials, and no one can see what you download. Your OnlyFans activity and downloaded content remain completely private."
    }
  ],
  
  patreon: [
    {
      question: "Can I download all content from Patreon creators I support?",
      answer: "Yes! Download all posts, videos, images, audio files, and attachments from your supported creators. The tool organizes content by creator and tier level, ensuring you have everything you've paid for."
    },
    {
      question: "Does it work with exclusive patron-only content?",
      answer: "Absolutely! Download exclusive content from the creator tiers you're subscribed to. This includes patron-only posts, behind-the-scenes content, early access releases, and members-only downloads."
    },
    {
      question: "What if creators delete posts or leave Patreon?",
      answer: "Our downloader protects your investment. Many creators remove older content or delete their Patreon entirely. By archiving content locally, you keep permanent access to everything you've supported financially."
    },
    {
      question: "Can I download attached files like PDFs, PSD files, and ZIP archives?",
      answer: "Yes! The downloader saves all file types including documents, project files, source materials, and compressed archives. Perfect for patrons of artists, educators, and creators who share digital resources."
    },
    {
      question: "Does it handle Patreon's audio and video podcasts?",
      answer: "Yes! Download podcast episodes, video content, and audio files in their original quality. Great for offline listening and ensuring you don't miss content if you need to pause your subscription temporarily."
    }
  ],
  
  // Learning platforms
  "khan-academy": [
    {
      question: "Can I download Khan Academy videos for offline studying?",
      answer: "Yes! Download video lessons, exercise explanations, and course materials for offline learning. Perfect for students with limited internet access or those who want to study while traveling."
    },
    {
      question: "Does it download practice exercises and problem sets?",
      answer: "While the focus is on video content, the downloader saves all accessible learning materials including transcripts and supplementary PDFs. Practice exercises are best used through Khan Academy's interactive platform."
    },
    {
      question: "Can I download entire course sequences or subject playlists?",
      answer: "Absolutely! Download complete courses, subject playlists, or learning paths with all videos organized by topic and difficulty. This is perfect for structured offline learning or classroom use."
    },
    {
      question: "Is this useful for teachers and homeschool parents?",
      answer: "Very much so! Teachers and parents download Khan Academy content to use in classrooms without reliable internet, create custom learning materials, or ensure continuity when internet is unavailable. Having offline access eliminates connectivity concerns."
    },
    {
      question: "Does it preserve video subtitles in multiple languages?",
      answer: "Yes! All available subtitle languages are downloaded automatically. This is especially valuable for ESL students, language learners, and international users who benefit from translations."
    }
  ],
  
  skillshare: [
    {
      question: "Can I download Skillshare classes I'm enrolled in?",
      answer: "Yes! Download all video lessons, class projects, and resources from classes in your library. Perfect for learning offline or keeping access to valuable classes after your subscription ends."
    },
    {
      question: "Does it save class projects and community resources?",
      answer: "The downloader saves all video content, transcripts, and downloadable resources. While community discussions are best viewed online, you'll have all the core learning materials for offline reference."
    },
    {
      question: "What if Skillshare removes a class I've learned from?",
      answer: "This happens more often than you'd think. Instructors remove classes, content gets updated, or licensing changes occur. Our downloader ensures you keep permanent copies of classes you've invested time in learning."
    },
    {
      question: "Can I download classes in bulk to build a personal learning library?",
      answer: "Yes! Queue multiple classes and download them automatically. Build a curated library of skills and knowledge that's always accessible, even without a Skillshare subscription."
    },
    {
      question: "Does it work with Skillshare Originals and exclusive content?",
      answer: "Absolutely! Download any class you can access through your Skillshare account, including Originals, exclusive content, and classes from top teachers. Your learning investment is protected."
    }
  ],
  
  linkedin: [
    {
      question: "Can I download LinkedIn Learning courses for offline viewing?",
      answer: "Yes! Download entire courses including all chapters, transcripts, and exercise files. Perfect for professionals who want to learn during commutes or when internet access is limited."
    },
    {
      question: "Does it save exercise files and course resources?",
      answer: "Absolutely! All downloadable resources, exercise files, and supplementary materials are saved alongside videos. You get the complete learning experience offline."
    },
    {
      question: "What if my company's LinkedIn Learning access ends?",
      answer: "Many companies provide LinkedIn Learning access that expires when you leave. Our downloader lets you archive courses you've completed or want to reference later, preserving valuable professional development content."
    },
    {
      question: "Can I download certificates of completion?",
      answer: "While certificates are issued by LinkedIn Learning online, you can keep copies of course content to prove your learning. The downloaded materials serve as references for skills you've acquired."
    },
    {
      question: "Does it work with LinkedIn Learning's mobile content?",
      answer: "Our downloader accesses the same content as the website, typically in higher quality than mobile. You'll get full desktop-quality videos that work on any device, not limited by mobile app restrictions."
    }
  ],
  
  // Generic video platforms
  twitter: [
    {
      question: "Can I download Twitter videos and GIFs?",
      answer: "Yes! Download videos, GIFs, and images from tweets in their original quality. Perfect for archiving viral content, saving threads, or keeping references before tweets get deleted."
    },
    {
      question: "Does it work with Twitter Spaces audio recordings?",
      answer: "If Twitter Spaces are available for replay, our downloader can save the audio. This is great for archiving discussions, interviews, or conversations before they expire."
    },
    {
      question: "Can I download entire Twitter threads with media?",
      answer: "Yes! Save all media from a thread at once. The downloader organizes content by thread order, making it easy to archive important Twitter discussions and their visual content."
    },
    {
      question: "What about videos from accounts I follow or private accounts?",
      answer: "You can download videos from any public tweets. For protected accounts, you'll need to be following them and logged in. The downloader respects Twitter's privacy settings."
    },
    {
      question: "How is this better than right-clicking to save?",
      answer: "Twitter serves compressed versions through the web interface. Our downloader fetches the highest quality available, handles batch downloads, and saves videos from tweets that don't show a download option."
    }
  ],
  
  facebook: [
    {
      question: "Can I download videos from Facebook Watch and Reels?",
      answer: "Yes! Download videos from Facebook Watch, Reels, regular posts, and stories. Works with public content and posts from friends or groups you're part of."
    },
    {
      question: "Does it save videos from private groups and pages I'm in?",
      answer: "Yes, as long as you have permission to view the content through your Facebook account. The downloader accesses content just like your browser would while logged in."
    },
    {
      question: "Can I download live streams and recorded broadcasts?",
      answer: "Yes! Record live streams as they happen or download them after they finish. Perfect for saving important broadcasts, events, or content that might not stay available forever."
    },
    {
      question: "What quality options are available for Facebook downloads?",
      answer: "Download in the highest quality available for each video, typically up to 1080p HD. Facebook compresses uploads, but our downloader gets the best version available on the platform."
    },
    {
      question: "How does this help with content archiving?",
      answer: "Facebook content frequently disappears—accounts get deleted, videos are removed, or privacy settings change. Our downloader helps you preserve important memories, educational content, or business assets before they're gone."
    }
  ],
  
  twitch: [
    {
      question: "Can I download past Twitch broadcasts and VODs?",
      answer: "Yes! Download past broadcasts (VODs) before they expire. Twitch deletes VODs after 14-60 days depending on the streamer's status. Our tool archives them permanently in full quality."
    },
    {
      question: "Does it work with Twitch Clips and Highlights?",
      answer: "Absolutely! Download clips, highlights, and full streams. Perfect for content creators who want to edit Twitch content, or fans who want to keep favorite moments."
    },
    {
      question: "Can I download subscriber-only content?",
      answer: "If you're subscribed to a channel, you can download their subscriber-only VODs and content. Just log in with your Twitch account that has the appropriate subscriptions."
    },
    {
      question: "Does it support downloading live streams in real-time?",
      answer: "Yes! Record live streams as they happen in case the streamer doesn't save them as VODs. You'll never miss content from streams that aren't archived."
    },
    {
      question: "How does chat archiving work?",
      answer: "The downloader can optionally save chat logs alongside videos, preserving the full stream experience including viewer reactions and interactions. Great for streamers who want to review audience engagement."
    }
  ],
  
  // Other platforms
  soundcloud: [
    {
      question: "Can I download SoundCloud tracks for offline listening?",
      answer: "Yes! Download tracks, playlists, and albums in high quality. Perfect for DJs, music enthusiasts, and fans who want to listen offline or preserve tracks that might get removed."
    },
    {
      question: "Does it work with SoundCloud Go+ exclusive content?",
      answer: "If you have a SoundCloud Go+ subscription, you can download exclusive tracks you have access to. The downloader works with any content your account can play."
    },
    {
      question: "Can I download entire artist profiles or playlists?",
      answer: "Absolutely! Batch download all tracks from an artist, playlists, or even tracks you've liked. Everything is organized by artist and album for easy library management."
    },
    {
      question: "What audio quality can I download?",
      answer: "Download in the highest quality available, typically 128kbps or higher depending on what the artist uploaded. SoundCloud Go+ content is usually available in better quality."
    },
    {
      question: "Does it preserve metadata like artist name and album art?",
      answer: "Yes! All ID3 tags, album artwork, artist information, and track metadata are preserved. Your downloaded music will display correctly in any music player or library manager."
    }
  ],
  
  spotify: [
    {
      question: "Can I download Spotify playlists for offline use outside the app?",
      answer: "Our tool helps you access Spotify content you have rights to. For DRM-protected content, you'll need an active Spotify Premium subscription. The downloader makes managing your music library easier."
    },
    {
      question: "Does it work with podcasts and audiobooks on Spotify?",
      answer: "Yes! Download podcasts, audiobooks, and other audio content available on Spotify. Great for archiving podcast episodes before they're removed or redistributed."
    },
    {
      question: "Can I keep songs if I cancel my Spotify subscription?",
      answer: "Spotify's DRM restrictions apply to downloaded content. Our tool is best used for backing up playlists, organizing your library, and accessing content you have legitimate rights to offline."
    },
    {
      question: "What format are Spotify downloads saved in?",
      answer: "Downloads are typically in MP3 or OGG format with appropriate quality settings. The exact format depends on what Spotify serves and your quality preferences."
    },
    {
      question: "How does this help with playlist management?",
      answer: "Easily backup playlists, create local copies for mixing or DJing, and organize music outside Spotify's interface. Perfect for DJs and music professionals who need more control over their libraries."
    }
  ],
  
  reddit: [
    {
      question: "Can I download videos and images from Reddit posts?",
      answer: "Yes! Download videos, images, GIFs, and galleries from Reddit posts and comments. Perfect for archiving memes, tutorials, or content before it gets deleted or removed."
    },
    {
      question: "Does it work with NSFW subreddits and content?",
      answer: "Yes, the downloader works with all content types on Reddit, including NSFW subreddits (if you're logged in and have NSFW content enabled). Privacy is maintained throughout."
    },
    {
      question: "Can I download entire subreddit collections or user profiles?",
      answer: "Absolutely! Batch download all media from a subreddit, user profile, or saved posts. Great for archiving communities or creating curated collections from your favorite subreddits."
    },
    {
      question: "What about Reddit videos that don't have a download button?",
      answer: "Reddit's video player is notoriously difficult to download from manually. Our tool handles the technical complexity and downloads Reddit-hosted videos (v.redd.it) with audio properly merged."
    },
    {
      question: "Does it save post context like titles and comments?",
      answer: "Yes! Optionally save post titles, comments, and metadata alongside media files. This preserves context and makes it easier to remember why you saved something."
    }
  ],
  
  // Default template for platforms not specifically listed
  default: [
    {
      question: "How does this downloader work?",
      answer: "Simply install the application, log in to your account (if needed), and browse to the content you want to download. The downloader integrates seamlessly and provides download buttons directly on the platform, or you can paste URLs to queue downloads."
    },
    {
      question: "What makes this downloader reliable?",
      answer: "We provide regular updates to ensure compatibility whenever the platform changes. Our downloader is built specifically for this platform with features like batch downloading, quality selection, and automatic organization that generic tools lack."
    },
    {
      question: "Can I download multiple items at once?",
      answer: "Yes! Our batch download feature lets you queue multiple videos, images, or files and download them automatically. Just add items to the queue, choose your quality settings, and let the downloader work while you focus on other tasks."
    },
    {
      question: "What quality options are available?",
      answer: "You can download in any quality available from the platform, from standard definition up to 4K/8K or original quality depending on the source. The downloader lets you choose quality per item or set a default preference."
    },
    {
      question: "Is my downloaded content organized automatically?",
      answer: "Yes! Files are automatically organized by creator, date, or category based on your preferences. You can also customize folder structures and file naming patterns to match your workflow."
    },
    {
      question: "What if the platform updates and breaks the downloader?",
      answer: "We monitor the platform for changes and release updates quickly to maintain compatibility. With your lifetime license, you'll receive all updates free forever, ensuring your downloader keeps working reliably."
    },
    {
      question: "Can I use this on multiple computers?",
      answer: "Yes! Your license typically covers personal use across your devices. Install the downloader on your desktop, laptop, or multiple computers as long as it's for your personal use."
    },
    {
      question: "How does this protect my privacy?",
      answer: "All downloads happen directly on your device with no third-party servers involved. We don't collect, store, or transmit your data, login credentials, or download history. Your privacy is completely protected."
    }
  ]
};

// Determine platform from slug
function getPlatform(slug) {
  // Remove 'downloader' and clean up
  let platform = slug
    .replace(/-?(video-)?downloader$/, '')
    .replace(/-?(clip-)?downloader$/, '')
    .replace(/-downloader$/, '');
  
  // Handle special cases
  if (platform.includes('youtube')) return 'youtube';
  if (platform.includes('instagram')) return 'instagram';
  if (platform.includes('tiktok')) return 'tiktok';
  if (platform.includes('facebook')) return 'facebook';
  if (platform.includes('twitter')) return 'twitter';
  if (platform.includes('twitch')) return 'twitch';
  if (platform.includes('soundcloud')) return 'soundcloud';
  if (platform.includes('spotify')) return 'spotify';
  if (platform.includes('reddit')) return 'reddit';
  if (platform.includes('pornhub')) return 'pornhub';
  if (platform.includes('onlyfans')) return 'onlyfans';
  if (platform.includes('patreon')) return 'patreon';
  if (platform.includes('udemy')) return 'udemy';
  if (platform.includes('coursera')) return 'coursera';
  if (platform.includes('khan')) return 'khan-academy';
  if (platform.includes('skillshare')) return 'skillshare';
  if (platform.includes('linkedin')) return 'linkedin';
  if (platform.includes('shutterstock')) return 'shutterstock';
  if (platform.includes('unsplash')) return 'unsplash';
  
  return platform;
}

// Get FAQs for a specific platform
function getFaqsForPlatform(slug, platformName) {
  const platform = getPlatform(slug);
  
  // Check if we have specific FAQs for this platform
  if (faqTemplates[platform]) {
    return faqTemplates[platform];
  }
  
  // Otherwise, use default FAQs but customize them
  return faqTemplates.default;
}

// Process a single YAML file
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const doc = parseDocument(content);
  
  const slug = doc.get('slug');
  const platformName = doc.get('platform') || doc.get('name') || slug;
  
  if (!slug) {
    console.warn(`  ⚠ Skipping ${path.basename(filePath)}: no slug found`);
    return false;
  }
  
  // Get appropriate FAQs for this platform
  const newFaqs = getFaqsForPlatform(slug, platformName);
  
  // Update the faqs in the document
  doc.set('faqs', newFaqs);
  
  // Write back to file
  fs.writeFileSync(filePath, doc.toString(), 'utf-8');
  
  return true;
}

// Main execution
console.log(`\nProcessing product YAML files in ${productsDir}...\n`);

const files = fs.readdirSync(productsDir)
  .filter(f => f.endsWith('.yaml') && !excludedFiles.includes(f))
  .sort();

let processedCount = 0;
let skippedCount = 0;

for (const file of files) {
  const filePath = path.join(productsDir, file);
  try {
    if (processFile(filePath)) {
      processedCount++;
      console.log(`✓ ${file}`);
    } else {
      skippedCount++;
    }
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
    skippedCount++;
  }
}

console.log(`\n✅ Completed: ${processedCount} files processed, ${skippedCount} skipped, ${excludedFiles.length} excluded`);
console.log(`Total files in directory: ${files.length + excludedFiles.length}\n`);
