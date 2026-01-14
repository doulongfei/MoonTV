import { NextResponse } from 'next/server';

import { getAvailableApiSites, getCacheTime } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { SearchResult } from '@/lib/types';

// export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    const cacheTime = await getCacheTime();
    return NextResponse.json(
      { results: [] },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}`,
        },
      }
    );
  }

  const apiSites = await getAvailableApiSites();
  const searchPromises = apiSites.map((site) => searchFromApi(site, query));

  try {
    // 增加总体搜索超时控制，防止个别慢源拖累整体响应速度
    // 设置 4.5s 的软超时，超过时间的源将被跳过
    const SEARCH_TIMEOUT = 4500;
    const results = await Promise.all(
      searchPromises.map((p) =>
        Promise.race([
          p,
          new Promise<SearchResult[]>((resolve) =>
            setTimeout(() => resolve([]), SEARCH_TIMEOUT)
          ),
        ])
      )
    );

    const flattenedResults = results.flat();
    const cacheTime = await getCacheTime();

    return NextResponse.json(
      { results: flattenedResults },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}`,
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}
