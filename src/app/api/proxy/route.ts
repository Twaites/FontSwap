import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createUrlRewriter, getInjectorScript, rewriteCssIds } from './proxyUtils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch: ${response.statusText}` }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');
    const isCss = contentType.includes('text/css');

    // CORS Headers for all responses
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*'); 
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Content-Type', contentType);

    // Rewrite Utility
    const baseUrl = new URL(targetUrl);
    const rewriteUrl = createUrlRewriter(baseUrl);

    // If NOT HTML and NOT CSS, pipe through directly
    if (!isHtml && !isCss) {
        return new NextResponse(response.body, {
            status: response.status,
            headers
        });
    }

    // Process CSS
    if (isCss) {
        const css = await response.text();
        const rewrittenCss = rewriteCssIds(css, rewriteUrl);
        
        return new NextResponse(rewrittenCss, {
             status: 200, 
             headers 
        });
    }

    // Process HTML
    const html = await response.text();
    const $ = cheerio.load(html);

    // Rewrite standard attributes
    $('link[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) $(el).attr('href', rewriteUrl(href));
    });
    $('script[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) $(el).attr('src', rewriteUrl(src));
    });
    $('img[src]').each((_, el) => {
         const src = $(el).attr('src');
         if (src) $(el).attr('src', rewriteUrl(src));
         
         // Handle srcset for responsive images
         const srcset = $(el).attr('srcset');
         if (srcset) {
             const newSrcset = srcset.split(',').map(part => {
                 const [url, ...descriptors] = part.trim().split(/\s+/);
                 return `${rewriteUrl(url)} ${descriptors.join(' ')}`;
             }).join(', ');
             $(el).attr('srcset', newSrcset);
         }
    });
    // Handle picture sources
    $('source[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) $(el).attr('src', rewriteUrl(src));
        
        const srcset = $(el).attr('srcset');
        if (srcset) {
             const newSrcset = srcset.split(',').map(part => {
                 const [url, ...descriptors] = part.trim().split(/\s+/);
                 return `${rewriteUrl(url)} ${descriptors.join(' ')}`;
             }).join(', ');
             $(el).attr('srcset', newSrcset);
         }
    });

    // 2. Inject our client-side interaction script (with base URL for SPA fetch support)
    $('body').append(getInjectorScript(targetUrl));

    return new NextResponse($.html(), {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to proxy URL' }, { status: 500 });
  }
}
