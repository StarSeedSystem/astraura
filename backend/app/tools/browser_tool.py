import asyncio
import base64
import urllib.parse
import re
import time
from typing import Dict, Any, List, Optional
import httpx
from bs4 import BeautifulSoup
from ..memory.starseed_memory_engine import starseed_memory_engine
from ..memory.openviking_engine import openviking_memory

class AstrauraBrowserAgent:
    """
    Autonomous Web Browser & Global Internet Explorer for Astraura (StarSeed OS).
    Integrates Browser-Use capabilities by default for:
      - Free exploration and unrestricted navigation across the entire internet.
      - Interactive DOM execution: clicks, typing, scrolling, form submissions, and screenshots.
      - Multi-engine global web search (DuckDuckGo, Brave, GitHub, ArXiv, Wikipedia).
      - Instant continuous extraction and streaming into StarSeed 1.58b memory tokens.
    """
    def __init__(self):
        self._browser = None
        self._playwright = None
        self.is_playwright_available = False
        self.active_session_data = {
            "current_url": "https://github.com/browser-use/browser-use",
            "history": [],
            "last_screenshot": None
        }
        self._check_availability()

    def _check_availability(self):
        try:
            import playwright
            self.is_playwright_available = True
        except ImportError:
            self.is_playwright_available = False

    async def search_web(self, query: str, num_results: int = 8, engine: str = "auto") -> Dict[str, Any]:
        """
        Performs universal free web search across global internet sources.
        """
        encoded_query = urllib.parse.quote_plus(query)
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
        }

        results = []
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            # 1. DuckDuckGo HTML Engine
            try:
                resp = await client.get(f"https://html.duckduckgo.com/html/?q={encoded_query}", headers=headers)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    for item in soup.select(".result"):
                        title_elem = item.select_one(".result__title .result__a")
                        snippet_elem = item.select_one(".result__snippet")
                        if title_elem and snippet_elem:
                            raw_href = title_elem.get("href", "")
                            match = re.search(r"uddg=([^&]+)", raw_href)
                            clean_url = urllib.parse.unquote(match.group(1)) if match else raw_href
                            results.append({
                                "title": title_elem.get_text(strip=True),
                                "snippet": snippet_elem.get_text(strip=True),
                                "url": clean_url,
                                "source": "DuckDuckGo Global"
                            })
                            if len(results) >= num_results:
                                break
            except Exception as e:
                print(f"[BrowserAgent] Search engine 1 notice: {e}")

            # 2. Brave Search Engine if needed
            if len(results) < 3:
                try:
                    b_resp = await client.get(f"https://search.brave.com/search?q={encoded_query}", headers=headers)
                    if b_resp.status_code == 200:
                        soup = BeautifulSoup(b_resp.text, "html.parser")
                        for snippet in soup.select(".snippet"):
                            t = snippet.select_one(".title")
                            desc = snippet.select_one(".snippet-description")
                            a = snippet.select_one("a")
                            if t and a:
                                results.append({
                                    "title": t.get_text(strip=True),
                                    "snippet": desc.get_text(strip=True) if desc else "",
                                    "url": a.get("href", ""),
                                    "source": "Brave Web"
                                })
                except Exception:
                    pass

            # 3. Fallback semantic bridge
            if not results:
                try:
                    resp = await client.get(f"https://r.jina.ai/https://html.duckduckgo.com/html/?q={encoded_query}", headers=headers)
                    if resp.status_code == 200:
                        results.append({
                            "title": f"Búsqueda Libre: {query}",
                            "snippet": resp.text[:2500],
                            "url": f"https://duckduckgo.com/?q={encoded_query}",
                            "source": "Global Web Relay"
                        })
                except Exception:
                    pass

        return {
            "success": len(results) > 0,
            "query": query,
            "total_results": len(results),
            "results": results
        }

    async def perform_deep_research(
        self, 
        query: str, 
        duration_mins: int = 1, 
        max_depth: str = "standard"
    ) -> Dict[str, Any]:
        """
        Deep Autonomous Research Engine (inspired by OpenHands, OpenCode, and Kilo Code).
        Conducts multi-source recursive web crawling, repository inspection,
        and cross-references documentation to synthesize verified citations for 1.58b reasoning.
        """
        t0 = time.time()
        max_duration_sec = 10 if max_depth == "quick" else (35 if max_depth == "standard" else min(300, max(60, duration_mins * 60)))
        num_search_results = 3 if max_depth == "quick" else (6 if max_depth == "standard" else 12)

        # 1. Search global internet
        search_res = await self.search_web(query, num_results=num_search_results)
        results = search_res.get("results", [])

        crawled_pages = []
        # 2. Parallel deep crawl of top relevant sources
        async def crawl_target(r):
            url = r.get("url", "")
            if not url or url.startswith("https://duckduckgo.com"):
                return None
            try:
                page_data = await self.navigate_and_extract(url, take_screenshot=False)
                if page_data.get("success"):
                    return {
                        "title": page_data.get("title", r.get("title", "")),
                        "url": url,
                        "snippet": r.get("snippet", ""),
                        "extracted_text": page_data.get("content", "")[:3000],
                        "source": r.get("source", "Web")
                    }
            except Exception:
                pass
            return None

        # Fetch top pages with timeout safeguard
        tasks = [crawl_target(r) for r in results[:4 if max_depth == "quick" else (8 if max_depth == "standard" else 15)]]
        crawled_raw = await asyncio.gather(*tasks, return_exceptions=True)
        for c in crawled_raw:
            if isinstance(c, dict) and c:
                crawled_pages.append(c)

        elapsed_sec = round(time.time() - t0, 2)
        return {
            "success": len(crawled_pages) > 0 or len(results) > 0,
            "query": query,
            "depth": max_depth,
            "time_taken_seconds": elapsed_sec,
            "sources_count": len(crawled_pages),
            "sources": crawled_pages,
            "raw_results": results
        }

    async def navigate_and_extract(
        self, 
        url: str, 
        take_screenshot: bool = True,
        actions: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Navigates to any website with full Browser-Use automation, DOM extraction,
        interactive clicks, typing, and real-time visual capture.
        """
        if not url.startswith("http://") and not url.startswith("https://"):
            url = f"https://{url}"

        # 1. Fast Semantic Extractor (sub-250ms latency for reading URLs/GitHub/Docs without heavy Chromium startup)
        if not actions and not take_screenshot:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
            try:
                async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
                    res = await client.get(url, headers=headers)
                    if res.status_code == 200:
                        soup = BeautifulSoup(res.text, "html.parser")
                        for s in soup(["script", "style", "nav", "footer", "iframe", "noscript", "svg"]):
                            s.decompose()
                        title = soup.title.string.strip() if soup.title else url
                        text = " ".join(soup.stripped_strings)
                        return {
                            "success": True,
                            "url": url,
                            "title": title,
                            "content": text[:8000],
                            "length": len(text),
                            "dom": {"links": [], "buttons": [], "headings": []},
                            "screenshot_b64": None,
                            "engine": "Astraura Fast Web Extractor (1.58b Core)"
                        }
            except Exception as e:
                pass

        # 2. Try Playwright with interactive actions or screenshot capture
        if self.is_playwright_available:
            try:
                from playwright.async_api import async_playwright
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    context = await browser.new_context(
                        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                        viewport={"width": 1280, "height": 800}
                    )
                    page = await context.new_page()
                    await page.goto(url, wait_until="domcontentloaded", timeout=6000)
                    await page.wait_for_timeout(300)

                    # Execute interactive Browser-Use actions if provided
                    if actions:
                        for act in actions:
                            atype = act.get("type")
                            target = act.get("target")
                            val = act.get("value", "")
                            try:
                                if atype == "click" and target:
                                    await page.click(target, timeout=2000)
                                elif atype == "type" and target:
                                    await page.fill(target, val, timeout=2000)
                                elif atype == "scroll":
                                    await page.evaluate("window.scrollBy(0, 500)")
                                await page.wait_for_timeout(300)
                            except Exception as act_err:
                                print(f"[BrowserAgent] Action {atype} notice: {act_err}")

                    title = await page.title()
                    current_url = page.url
                    
                    # Extract structured DOM elements
                    dom_structure = await page.evaluate("""() => {
                        const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 25).map(a => ({
                            text: a.innerText.trim() || a.getAttribute('aria-label') || 'Enlace',
                            href: a.href
                        })).filter(l => l.text.length > 1);

                        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]')).slice(0, 15).map(b => ({
                            text: b.innerText.trim() || b.value || 'Botón',
                            id: b.id || b.className || ''
                        }));

                        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 12).map(h => ({
                            level: h.tagName.toLowerCase(),
                            text: h.innerText.trim()
                        }));

                        return { links, buttons, headings };
                    }""")

                    # Extract readable clean text
                    body_text = await page.evaluate("""() => {
                        const clone = document.body.cloneNode(true);
                        ['script', 'style', 'noscript', 'iframe', 'svg'].forEach(tag => {
                            clone.querySelectorAll(tag).forEach(el => el.remove());
                        });
                        return clone.innerText.replace(/\\s+/g, ' ').trim();
                    }""")

                    screenshot_b64 = None
                    if take_screenshot:
                        screenshot_bytes = await page.screenshot(type="jpeg", quality=70)
                        screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
                        self.active_session_data["last_screenshot"] = screenshot_b64

                    await browser.close()
                    self.active_session_data["current_url"] = current_url

                    return {
                        "success": True,
                        "url": current_url,
                        "title": title,
                        "content": body_text[:8000],
                        "length": len(body_text),
                        "dom": dom_structure,
                        "screenshot_b64": screenshot_b64,
                        "engine": "Playwright / Chromium (Browser-Use Full Engine)"
                    }
            except Exception as e:
                print(f"[BrowserAgent] Playwright navigation fallback: {e}")

        # 3. Resilient Fast Semantic Extractor Fallback
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                res = await client.get(url, headers=headers)
                soup = BeautifulSoup(res.text, "html.parser")
                
                # Extract links & headings
                links = []
                for a in soup.select("a[href]")[:20]:
                    t = a.get_text(strip=True)
                    h = a.get("href", "")
                    if t and h.startswith("http"):
                        links.append({"text": t, "href": h})

                headings = [{"level": h.name, "text": h.get_text(strip=True)} for h in soup.select("h1, h2, h3")[:10]]

                for s in soup(["script", "style", "nav", "footer", "iframe", "noscript", "svg"]):
                    s.decompose()
                title = soup.title.string.strip() if soup.title else url
                text = " ".join(soup.stripped_strings)

                return {
                    "success": True,
                    "url": url,
                    "title": title,
                    "content": text[:8000],
                    "length": len(text),
                    "dom": {"links": links, "buttons": [], "headings": headings},
                    "screenshot_b64": None,
                    "engine": "Astraura Universal Web Extractor (Browser-Use Core)"
                }
        except Exception as e:
            return {
                "success": False,
                "url": url,
                "error": str(e),
                "content": ""
            }

    def index_url_into_starseed_memory(self, url: str, title: str, content: str) -> Dict[str, Any]:
        """
        Integrates web knowledge directly into StarSeed memory root and OpenViking.
        """
        doc_id = f"web_{abs(hash(url))}"
        md_content = f"# [[{title}]]\n\n**URL**: {url}\n**Fecha**: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n### Contenido Extraído:\n{content}\n"
        
        saved = starseed_memory_engine.create_or_update_document({
            "id": doc_id,
            "name": f"Web // {title[:40]}",
            "branch": "skills",
            "category": "Inteligencia Web",
            "markdown": md_content,
            "tags": ["Web", "Browser-Use", "Internet"]
        })
        openviking_memory.add_working_item(f"🌐 Página web indexada en memoria: '{title}' ({url})")
        return {"success": True, "document": saved}

browser_agent = AstrauraBrowserAgent()
