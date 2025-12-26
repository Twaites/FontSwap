import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOOGLE_FONT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Fonts API Key is not set' }, { status: 500 });
  }

  const baseUrl = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}`;

  try {
    // Parallel fetch for efficiency
    // Cache for 24 hours since Google Fonts lists don't change that often
    const fetchOptions = { next: { revalidate: 86400 } };
    
    const [popRes, trendRes, dateRes] = await Promise.all([
        fetch(`${baseUrl}&sort=popularity`, fetchOptions),
        fetch(`${baseUrl}&sort=trending`, fetchOptions),
        fetch(`${baseUrl}&sort=date`, fetchOptions)
    ]);

    if (!popRes.ok || !trendRes.ok || !dateRes.ok) {
      throw new Error('Failed to fetch from Google Fonts API');
    }

    const [popData, trendData, dateData] = await Promise.all([
        popRes.json(),
        trendRes.json(),
        dateRes.json()
    ]);

    // Create Rank Maps
    const trendingMap = new Map(trendData.items.map((item: any, index: number) => [item.family, index]));
    const dateMap = new Map(dateData.items.map((item: any, index: number) => [item.family, index]));

    // Merge Ranks into the main list (Popularity default)
    const enrichedFonts = popData.items.map((font: any, index: number) => ({
        ...font,
        popularityRank: index,
        trendingRank: trendingMap.get(font.family) ?? 9999, // Fallback if missing
        dateRank: dateMap.get(font.family) ?? 9999
    }));

    return NextResponse.json(enrichedFonts);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch fonts' }, { status: 500 });
  }
}
