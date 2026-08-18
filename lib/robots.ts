const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Google-Extended',
  'OAI-SearchBot',
] as const;

function removeManagedLines(value: string, removeAiGroups: boolean): string {
  const aiCrawlers = new Set<string>(AI_CRAWLERS.map((crawler) => crawler.toLowerCase()));
  let skipGroup = false;

  return value
    .split(/\r?\n/)
    .filter((line) => {
      if (/^\s*sitemap\s*:/i.test(line)) return false;
      const userAgent = line.match(/^\s*user-agent\s*:\s*(.+?)\s*$/i)?.[1].toLowerCase();
      if (userAgent) skipGroup = removeAiGroups && aiCrawlers.has(userAgent);
      return !skipGroup;
    })
    .join('\n')
    .trim();
}

export function buildRobotsTxt(
  customValue: string,
  enableSitemap: boolean,
  aiSearchVisible: boolean,
  baseUrl: string,
): string {
  const fallback = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/admin/`;
  const base = removeManagedLines(customValue.trim() || fallback, !aiSearchVisible);
  const sections = [base];

  if (!aiSearchVisible) {
    sections.push(
      AI_CRAWLERS.map((crawler) => `User-agent: ${crawler}\nDisallow: /`).join('\n\n'),
    );
  }
  if (enableSitemap) sections.push(`Sitemap: ${baseUrl}/sitemap.xml`);
  return `${sections.filter(Boolean).join('\n\n')}\n`;
}
