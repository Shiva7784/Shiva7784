const fs = require('fs');
const https = require('https');

const username = 'Shiva7784';
const profileUrl = `https://github.com/${username}`;

https.get(profileUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Regex to match achievements in sidebar
    // We target the d-none d-md-block Achievements section
    const startIdx = data.indexOf('Achievements</a></h2>');
    if (startIdx === -1) {
      console.log("No achievements section found in HTML");
      process.exit(0);
    }
    const endIdx = data.indexOf('</div></div>', startIdx);
    const achievementsHtml = data.substring(startIdx, endIdx);

    // Regex to find all:
    // <a href="/Shiva7784?achievement=ACH_NAME&amp;tab=achievements" ...><img src="IMG_URL" ... alt="Achievement: ALT_NAME" .../>...<span ...>TIER</span></a>
    const badgeRegex = /<a href="[^"]*achievement=([^"&]*)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    const achievements = [];

    while ((match = badgeRegex.exec(achievementsHtml)) !== null) {
      const id = match[1];
      const innerHtml = match[2];

      const imgMatch = /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"/i.exec(innerHtml);
      if (!imgMatch) continue;

      const imgUrl = imgMatch[1];
      const altText = imgMatch[2];

      // Check if there is a span with tier text (like x2, x3, etc.)
      const spanMatch = /<span[^>]*>([\s\S]*?)<\/span>/i.exec(innerHtml);
      const tierText = spanMatch ? spanMatch[1].trim() : '';

      achievements.push({ id, imgUrl, altText, tierText });
    }

    if (achievements.length === 0) {
      console.log("No achievements parsed");
      process.exit(0);
    }

    // Generate markdown for achievements
    let markdown = '<div align="center">\n';
    achievements.forEach(ach => {
      const displayName = ach.tierText ? `${ach.altText.replace('Achievement: ', '')} (${ach.tierText})` : ach.altText.replace('Achievement: ', '');
      
      markdown += `  <a href="https://github.com/${username}?tab=achievements" style="text-decoration: none; margin: 0 10px;">\n`;
      markdown += `    <img src="${ach.imgUrl}" width="80" alt="${displayName}" title="${displayName}" style="vertical-align: middle;" />\n`;
      if (ach.tierText) {
        markdown += `    <sub style="font-size: 14px; font-weight: bold; color: #a78bfa; margin-left: -15px;">${ach.tierText}</sub>\n`;
      }
      markdown += `  </a>\n`;
    });
    markdown += '</div>';

    // Read README.md
    const readmePath = require('path').join(__dirname, 'README.md');
    let readmeContent = fs.readFileSync(readmePath, 'utf8');

    const startAnchor = '<!-- START_SECTION:achievements -->';
    const endAnchor = '<!-- END_SECTION:achievements -->';

    const startPos = readmeContent.indexOf(startAnchor);
    const endPos = readmeContent.indexOf(endAnchor);

    if (startPos !== -1 && endPos !== -1) {
      const before = readmeContent.substring(0, startPos + startAnchor.length);
      const after = readmeContent.substring(endPos);
      const newReadme = `${before}\n\n${markdown}\n\n${after}`;
      fs.writeFileSync(readmePath, newReadme, 'utf8');
      console.log("README.md updated successfully with achievements!");
    } else {
      console.log("Anchors not found in README.md");
    }
  });
}).on('error', (err) => {
  console.error("Error fetching profile page: " + err.message);
});
