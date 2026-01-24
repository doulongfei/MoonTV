import { getAvailableApiSites, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';

export const runtime = 'edge';

/**
 * 流式聚合搜索接口 V2
 * 采用 ReadableStream 实时返回每个源的搜索结果
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return new Response('Missing query', { status: 400 });
  }

  const config = await getConfig();
  const apiSites = await getAvailableApiSites();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const CONCURRENCY_LIMIT = config.SiteConfig.SearchConcurrencyLimit || 20; // 限制同时并发请求数
      let currentIndex = 0;
      let completedCount = 0;
      const total = apiSites.length;

      // 如果没有源，直接结束
      if (total === 0) {
        controller.enqueue(encoder.encode('event: end\ndata: {}\n\n'));
        controller.close();
        return;
      }

      const runNext = async () => {
        if (currentIndex >= total) return;

        const site = apiSites[currentIndex++];
        
        try {
          // 每个源设置 10 秒硬超时，防止永久挂起
          const searchPromise = searchFromApi(site, query);
          const timeoutPromise = new Promise<any[]>((resolve) =>
            setTimeout(() => resolve([]), 10000)
          );

          const results = await Promise.race([searchPromise, timeoutPromise]);

          if (results && results.length > 0) {
            const data = JSON.stringify({
              source: site.name,
              results: results,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (err) {
          console.error(`Search error for ${site.name}:`, err);
        } finally {
          completedCount++;
          if (completedCount === total) {
            controller.enqueue(encoder.encode('event: end\ndata: {}\n\n'));
            controller.close();
          } else {
            // 当前任务结束，立即启动下一个
            runNext();
          }
        }
      };

      // 启动初始批次
      const initialBatch = Math.min(CONCURRENCY_LIMIT, total);
      for (let i = 0; i < initialBatch; i++) {
        runNext();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
