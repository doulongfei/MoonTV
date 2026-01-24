'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';

import { AdminConfig, AdminConfigResult } from '@/lib/admin.types';

import { VideoSourceConfig } from '@/components/admin/VideoSourceConfig';
import PageLayout from '@/components/PageLayout';

function SourcesPageClient() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);

      const response = await fetch(`/api/admin/config`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '获取配置失败');
      }

      const data = (await response.json()) as AdminConfigResult;
      setConfig(data.Config);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: '错误',
        text: err instanceof Error ? err.message : '获取配置失败',
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig(true);
  }, [fetchConfig]);

  if (loading) {
    return (
      <PageLayout activePath='/admin/sources'>
        <div className='px-4 sm:px-10 py-4 sm:py-8'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8'>
            视频源管理
          </h1>
          <div className='space-y-4 animate-pulse'>
            <div className='h-12 bg-gray-200 dark:bg-gray-700 rounded-lg' />
            <div className='h-64 bg-gray-200 dark:bg-gray-700 rounded-lg' />
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePath='/admin/sources'>
      <div className='px-4 sm:px-10 py-4 sm:py-8'>
        <div className='max-w-[95%] mx-auto'>
          <div className='mb-8'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
              视频源管理
            </h1>
            <p className='text-gray-500 dark:text-gray-400'>
              添加、编辑或删除视频资源接口。支持 MacCMS (苹果CMS) 标准 XML/JSON
              接口。
            </p>
          </div>

          <div className='bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
            <VideoSourceConfig config={config} refreshConfig={fetchConfig} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function SourcesPage() {
  return (
    <Suspense>
      <SourcesPageClient />
    </Suspense>
  );
}
