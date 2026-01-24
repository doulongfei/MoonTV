/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import JSON5 from 'json5';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig, invalidateConfigCache } from '@/lib/config';
import { getStorage } from '@/lib/db';
import { IStorage } from '@/lib/types';

// export const runtime = 'edge';

// 支持的操作类型
type Action =
  | 'add'
  | 'disable'
  | 'enable'
  | 'delete'
  | 'sort'
  | 'test'
  | 'parse_subscription';

interface BaseBody {
  action?: Action;
}

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  // ... (省略前面的 localstorage 检查，保持原样)

  try {
    const body = (await request.json()) as BaseBody & Record<string, any>;
    const { action } = body;

    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = authInfo.username;

    // 基础校验
    const ACTIONS: Action[] = [
      'add',
      'disable',
      'enable',
      'delete',
      'sort',
      'test',
      'parse_subscription',
    ];
    if (!username || !action || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
    }

    // 获取配置与存储
    const adminConfig = await getConfig();
    const storage: IStorage | null = getStorage();

    // 权限与身份校验
    if (username !== process.env.USERNAME) {
      const userEntry = adminConfig.UserConfig.Users.find(
        (u) => u.username === username
      );
      if (!userEntry || userEntry.role !== 'admin') {
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }
    }

    switch (action) {
      case 'parse_subscription': {
        const { url } = body as { url?: string };
        if (!url) {
          return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
        }

        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
            next: { revalidate: 60 }, // 缓存 1 分钟
          });

          if (!res.ok) {
            return NextResponse.json(
              { error: `请求失败: ${res.status}` },
              { status: 400 }
            );
          }

          // 获取文本并去除注释 (支持 JSON5 风格的注释)
          let rawText = await res.text();

          // 去除 BOM 头 (如果存在)
          if (rawText.charCodeAt(0) === 0xfeff) {
            rawText = rawText.slice(1);
          }

          let data: any;
          try {
            // 使用 JSON5 解析，完美支持注释、尾部逗号、单引号等非标准 JSON 格式
            data = JSON5.parse(rawText);
          } catch (e) {
            console.error('JSON5 Parse Error:', (e as Error).message);
            throw new Error('无效的 JSON 格式: ' + (e as Error).message);
          }

          let sites: any[] = [];

          // 智能解析逻辑
          if (Array.isArray(data)) {
            // 直接是数组
            sites = data;
          } else if (data.sites && Array.isArray(data.sites)) {
            // TVBox 标准格式 { sites: [...] }
            sites = data.sites;
          } else if (data.list && Array.isArray(data.list)) {
            // 其他常见格式 { list: [...] }
            sites = data.list;
          }

          // 过滤并标准化数据
          const parsedSources = sites
            .filter((s: any) => {
              // 必须包含 name 和 api/url，且 type 通常为 1 (xml/json cms)
              // TVBox type: 0=xml, 1=json. MoonTV 支持两者 (取决于 fetch 后的处理，目前主要是 JSON)
              // 这里我们放宽限制，只要有 API URL 就行
              return (s.name || s.key) && (s.api || s.url);
            })
            .map((s: any) => ({
              name: s.name || s.key,
              key: s.key || s.name, // 如果没有 key，用 name 代替
              api: s.api || s.url,
              // 如果 type 存在且不是 0 或 1，可能需要注意，但先都返回让前端展示
            }));

          return NextResponse.json({
            ok: true,
            sources: parsedSources,
            total: parsedSources.length,
          });
        } catch (e) {
          return NextResponse.json(
            { error: `解析订阅失败: ${(e as Error).message}` },
            { status: 500 }
          );
        }
      }
      case 'test': {
        const { url } = body as { url?: string };
        if (!url)
          return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
        const start = Date.now();
        try {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
            next: { revalidate: 0 },
          });
          const duration = Date.now() - start;
          if (res.ok) {
            return NextResponse.json({ ok: true, latency: duration });
          }
          return NextResponse.json({
            ok: false,
            latency: duration,
            status: res.status,
          });
        } catch (e) {
          return NextResponse.json({
            ok: false,
            latency: Date.now() - start,
            error: (e as Error).message,
          });
        }
      }
      case 'add': {
        const { key, name, api, detail } = body as {
          key?: string;
          name?: string;
          api?: string;
          detail?: string;
        };
        if (!key || !name || !api) {
          return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
        }
        if (adminConfig.SourceConfig.some((s) => s.key === key)) {
          return NextResponse.json({ error: '该源已存在' }, { status: 400 });
        }
        adminConfig.SourceConfig.push({
          key,
          name,
          api,
          detail,
          from: 'custom',
          disabled: false,
        });
        break;
      }
      case 'disable': {
        const { key } = body as { key?: string };
        if (!key)
          return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry)
          return NextResponse.json({ error: '源不存在' }, { status: 404 });
        entry.disabled = true;
        break;
      }
      case 'enable': {
        const { key } = body as { key?: string };
        if (!key)
          return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
        const entry = adminConfig.SourceConfig.find((s) => s.key === key);
        if (!entry)
          return NextResponse.json({ error: '源不存在' }, { status: 404 });
        entry.disabled = false;
        break;
      }
      case 'delete': {
        const { key } = body as { key?: string };
        if (!key)
          return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
        const idx = adminConfig.SourceConfig.findIndex((s) => s.key === key);
        if (idx === -1)
          return NextResponse.json({ error: '源不存在' }, { status: 404 });
        const entry = adminConfig.SourceConfig[idx];
        if (entry.from === 'config') {
          return NextResponse.json({ error: '该源不可删除' }, { status: 400 });
        }
        adminConfig.SourceConfig.splice(idx, 1);
        break;
      }
      case 'sort': {
        const { order } = body as { order?: string[] };
        if (!Array.isArray(order)) {
          return NextResponse.json(
            { error: '排序列表格式错误' },
            { status: 400 }
          );
        }
        const map = new Map(adminConfig.SourceConfig.map((s) => [s.key, s]));
        const newList: typeof adminConfig.SourceConfig = [];
        order.forEach((k) => {
          const item = map.get(k);
          if (item) {
            newList.push(item);
            map.delete(k);
          }
        });
        // 未在 order 中的保持原顺序
        adminConfig.SourceConfig.forEach((item) => {
          if (map.has(item.key)) newList.push(item);
        });
        adminConfig.SourceConfig = newList;
        break;
      }
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }

    // 持久化到存储
    if (storage && typeof (storage as any).setAdminConfig === 'function') {
      await (storage as any).setAdminConfig(adminConfig);
    }

    // 清除内存缓存
    invalidateConfigCache();

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('视频源管理操作失败:', error);
    return NextResponse.json(
      {
        error: '视频源管理操作失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
