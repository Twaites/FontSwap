import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createUrlRewriter, INJECTOR_SCRIPT, rewriteCssIds } from './proxyUtils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

    // 2. Inject our client-side interaction script
    $('body').append(INJECTOR_SCRIPT);

    return new NextResponse($.html(), {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Failed to proxy URL' }, { status: 500 });
  }
}
