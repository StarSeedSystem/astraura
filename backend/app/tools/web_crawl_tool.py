import re
import httpx
from typing import Dict, Any, Optional

class WebCrawlTool:
    """
    Lightweight, fast web fetcher & scraper implementing Crawl4AI principles.
    Fetches real URLs, cleans HTML, extracts text and markdown, and returns clean content.
    """
    async def fetch_url(self, url: str, max_length: int = 25000) -> Dict[str, Any]:
        if not url.startswith("http://") and not url.startswith("https://"):
            url = "https://" + url

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                res = await client.get(url, headers=headers)
                
            if res.status_code != 200:
                return {
                    "success": False,
                    "url": url,
                    "status_code": res.status_code,
                    "error": f"HTTP Error {res.status_code}"
                }

            html = res.text
            clean_text = self._html_to_clean_text(html)
            title = self._extract_title(html)

            return {
                "success": True,
                "url": url,
                "status_code": res.status_code,
                "title": title,
                "content": clean_text[:max_length],
                "total_chars": len(clean_text)
            }
        except Exception as e:
            return {
                "success": False,
                "url": url,
                "error": str(e)
            }

    def _extract_title(self, html: str) -> str:
        m = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        return m.group(1).strip() if m else ""

    def _html_to_clean_text(self, html: str) -> str:
        # Remove script and style elements
        text = re.sub(r"<(script|style).*?>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
        # Convert links
        text = re.sub(r'<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)</a>', r"[\2](\1)", text, flags=re.DOTALL | re.IGNORECASE)
        # Convert headings
        text = re.sub(r'<h[1-6][^>]*>(.*?)</h[1-6]>', r"\n### \1\n", text, flags=re.DOTALL | re.IGNORECASE)
        # Convert paragraph/div to newlines
        text = re.sub(r'<(p|div|li|tr)[^>]*>', "\n", text, flags=re.IGNORECASE)
        # Strip all other HTML tags
        text = re.sub(r"<[^>]+>", " ", text)
        # Clean whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines)

web_crawl_tool = WebCrawlTool()
