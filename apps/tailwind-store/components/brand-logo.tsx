'use client'

import React from 'react'
import Image from 'next/image'

interface BrandLogoProps {
  slug: string
  className?: string
}

const getBrandLogoUrl = (slug: string): string => {
  const cleanSlug = slug.toLowerCase().replace(/-downloader$|-video-downloader$/, '')

  // Using higher resolution logos from CDNs and official sources

  // Social Media Platforms - Higher res versions
  if (cleanSlug.includes('youtube')) return 'https://www.youtube.com/s/desktop/01530da7/img/logos/favicon_144x144.png'
  if (cleanSlug.includes('facebook')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1200px-Facebook_Logo_%282019%29.png'
  if (cleanSlug.includes('instagram')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/2048px-Instagram_icon.png'
  if (cleanSlug.includes('tiktok')) return 'https://sf-tb-sg.ibytedtos.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png'
  if (cleanSlug.includes('twitter')) return 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png'
  if (cleanSlug.includes('linkedin')) return 'https://content.linkedin.com/content/dam/me/business/en-us/amp/brand-site/v2/bg/LI-Bug.svg.original.svg'
  if (cleanSlug.includes('pinterest')) return 'https://s.pinimg.com/webapp/logo_trans_144x144-5e37c0c6.png'
  if (cleanSlug.includes('reddit')) return 'https://www.redditstatic.com/desktop2x/img/favicon/apple-icon-180x180.png'
  if (cleanSlug.includes('snapchat')) return 'https://accounts.snapchat.com/accounts/static/images/ghost/snapchat-app-icon.svg'
  if (cleanSlug.includes('telegram')) return 'https://telegram.org/img/apple-touch-icon.png'
  if (cleanSlug.includes('whatsapp')) return 'https://static.whatsapp.net/rsrc.php/v3/y7/r/DSxOAUB0raA.png'

  // Video Platforms - Higher res
  if (cleanSlug.includes('vimeo')) return 'https://f.vimeocdn.com/images_v6/favicon/favicon_196x196.png'
  if (cleanSlug.includes('dailymotion')) return 'https://static1.dmcdn.net/images/dailymotion-logo-ogtag.png'
  if (cleanSlug.includes('twitch')) return 'https://assets.twitch.tv/assets/mobile_iphone-f8c15f5f839bb8eceb43.png'

  // Streaming Services - Higher res
  if (cleanSlug.includes('netflix')) return 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2016.png'
  if (cleanSlug.includes('amazon')) return 'https://m.media-amazon.com/images/G/01/digital/video/acquisition/amazon_video_light._SY150_SX150_.png'
  if (cleanSlug.includes('hulu')) return 'https://assetshuluimcom-a.akamaihd.net/h3o/icons/favicon.ico.png'
  if (cleanSlug.includes('disney')) return 'https://cnbl-cdn.bamgrid.com/assets/7ecc8bcb60ad77193058d63e321bd21cbac2fc67281dbd9927676ea4a4c83594/original'
  if (cleanSlug.includes('hbo')) return 'https://play.hbomax.com/assets/images/branding/desktop/hbomax/dt-hbomax-logo-150.png'

  // Music/Audio Platforms - Higher res
  if (cleanSlug.includes('spotify')) return 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png'
  if (cleanSlug.includes('soundcloud')) return 'https://a-v2.sndcdn.com/assets/images/sc-icons/ios-a62dfc8fe7.png'
  if (cleanSlug.includes('apple-music')) return 'https://www.apple.com/v/apple-music/v/images/overview/apple_music_icon__c13wqiw80kiy_large.png'

  // Learning Platforms - Higher res
  if (cleanSlug.includes('udemy')) return 'https://www.udemy.com/staticx/udemy/images/v7/apple-touch-icon.png'
  if (cleanSlug.includes('coursera')) return 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/apple-touch-icon-144x144.png'
  if (cleanSlug.includes('skillshare')) return 'https://static.skillshare.com/assets/images/apple-touch-icon.png'
  if (cleanSlug.includes('khan')) return 'https://cdn.kastatic.org/images/khan-logo-dark-background-2.png'

  // Creative/Design Tools - Higher res
  if (cleanSlug.includes('adobe')) return 'https://www.adobe.com/content/dam/cc/icons/Adobe_Corporate_Horizontal_Red_HEX.svg'
  if (cleanSlug.includes('canva')) return 'https://static.canva.com/web/images/12487a1e0770d29351bd4ce4f87ec8fe.svg'
  if (cleanSlug.includes('figma')) return 'https://cdn.sanity.io/images/599r6htc/localized/46a76c802176eb17b04e12108de7e7e0f3736dc6-1024x1024.png?w=670&q=75&fit=max&auto=format'

  // Stock Photo Sites - Higher res
  if (cleanSlug.includes('shutterstock')) return 'https://www.shutterstock.com/shutterstock/photos/image-photo-260nw-2334080343.jpg'
  if (cleanSlug.includes('getty')) return 'https://media.gettyimages.com/id/1330080843/vector/getty-images-logo.jpg?s=612x612&w=gi&k=20&c=WJl_VJwKz5f7bLOlZ_9jXdOzf7cFlxvx0VnCc8iD_QQ='
  if (cleanSlug.includes('istock')) return 'https://marketing.istockphoto.com/blog/wp-content/uploads/2023/04/iStock-Logo_S_RGB-Red-e1681925819291.png'
  if (cleanSlug.includes('depositphotos')) return 'https://blog.depositphotos.com/wp-content/uploads/2023/10/dp-logo-2023.svg'
  if (cleanSlug.includes('123rf')) return 'https://images.123rf.com/assets/static_assets/images/logos/123rf_logo_dark_original.png'
  if (cleanSlug.includes('pexels')) return 'https://images.pexels.com/lib/api/pexels.png'
  if (cleanSlug.includes('pixabay')) return 'https://pixabay.com/static/img/public/leaderboard_a.png'
  if (cleanSlug.includes('unsplash')) return 'https://unsplash.com/apple-touch-icon.png'
  if (cleanSlug.includes('freepik')) return 'https://media.freepik.com/media-platform/freepik-logo.svg'

  // Dev Tools - Higher res
  if (cleanSlug.includes('github')) return 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
  if (cleanSlug.includes('gitlab')) return 'https://about.gitlab.com/images/press/logo/png/gitlab-logo-500.png'

  // Other Tools - Higher res
  if (cleanSlug.includes('google')) return 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png'
  if (cleanSlug.includes('microsoft')) return 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31'
  if (cleanSlug.includes('apple')) return 'https://www.apple.com/ac/structured-data/images/knowledge_graph_logo.png'
  if (cleanSlug.includes('dropbox')) return 'https://cfl.dropboxstatic.com/static/images/logo_catalog/dropbox_webclip_200.png'
  if (cleanSlug.includes('notion')) return 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png'
  if (cleanSlug.includes('slack')) return 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png'
  if (cleanSlug.includes('discord')) return 'https://discord.com/assets/847541504914fd33810e70a0ea73177e.ico'
  if (cleanSlug.includes('zoom')) return 'https://st1.zoom.us/zoom.ico'
  if (cleanSlug.includes('wordpress')) return 'https://s.w.org/style/images/about/WordPress-logotype-standard.png'

  // Adult platforms - Higher res generic icons
  if (cleanSlug.includes('onlyfans')) return 'https://cdn.iconscout.com/icon/free/png-256/free-onlyfans-3521768-2945204.png'
  if (cleanSlug.includes('patreon')) return 'https://c5.patreon.com/external/logo/become_a_patron_button.png'

  // Default fallback - generic download icon
  return 'https://cdn-icons-png.flaticon.com/512/724/724933.png'
}

export default function BrandLogo({ slug, className = "h-8 w-8" }: BrandLogoProps) {
  const logoUrl = getBrandLogoUrl(slug)
  const brandName = slug.replace(/-downloader$|-video-downloader$/, '').replace(/-/g, ' ')

  return (
    <div className={`${className} relative`}>
      <Image
        src={logoUrl}
        alt={`${brandName} logo`}
        width={50}
        height={50}
        className="object-contain"
        unoptimized
      />
    </div>
  )
}