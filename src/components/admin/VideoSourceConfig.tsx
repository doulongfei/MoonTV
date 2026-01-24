/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
'use client';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ClipboardPaste,
  Globe,
  GripVertical,
  RotateCcw,
  Trash2,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

import { AdminConfig } from '@/lib/admin.types';
import { RECOMMENDED_SOURCES } from '@/lib/recommended_sources';

// 视频源数据类型
interface DataSource {
  name: string;
  key: string;
  api: string;
  detail?: string;
  disabled?: boolean;
  from: 'config' | 'custom';
}

interface TestResult {
  loading: boolean;
  latency?: number;
  error?: string;
  status?: number;
}

const showError = (message: string) =>
  Swal.fire({ icon: 'error', title: '错误', text: message });

// 提取 DraggableRow 组件
interface DraggableRowProps {
  source: DataSource;
  testResult?: TestResult;
  onTest: (key: string, url: string) => void;
  onToggleEnable: (key: string) => void;
  onDelete: (key: string) => void;
}

const DraggableRow = ({
  source,
  testResult,
  onTest,
  onToggleEnable,
  onDelete,
}: DraggableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: source.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors select-none group'
    >
      <td
        className='px-2 py-4 cursor-grab text-gray-400'
        style={{ touchAction: 'none' }}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100'>
        {source.name}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
        <code className='bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs'>
          {source.key}
        </code>
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 max-w-[12rem] truncate'>
        <span title={source.api}>{source.api}</span>
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
        {testResult?.loading ? (
          <div className='animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full' />
        ) : testResult?.latency !== undefined ? (
          <span
            className={`text-xs font-bold ${ 
              testResult.latency < 500
                ? 'text-green-500'
                : testResult.latency < 1500
                ? 'text-yellow-500'
                : 'text-red-500'
            }`}
          >
            {testResult.ok
              ? `${testResult.latency}ms`
              : `失败 (${testResult.status || 'ERR'})`}
          </span>
        ) : (
          <button
            onClick={() => onTest(source.key, source.api)}
            className='opacity-0 group-hover:opacity-100 text-gray-400 hover:text-green-500 transition-opacity'
            title='测速'
          >
            <Zap size={14} />
          </button>
        )}
      </td>
      <td className='px-6 py-4 whitespace-nowrap'>
        <button
          onClick={() => onToggleEnable(source.key)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${ 
            !source.disabled
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {!source.disabled ? '启用中' : '已禁用'}
        </button>
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3'>
        <button
          onClick={() => onTest(source.key, source.api)}
          className='text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300'
        >
          <RotateCcw size={16} className='inline' />
        </button>
        {source.from !== 'config' && (
          <button
            onClick={() => onDelete(source.key)}
            className='text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
          >
            <Trash2 size={16} className='inline' />
          </button>
        )}
      </td>
    </tr>
  );
};

export const VideoSourceConfig = ({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [discoveryTab, setDiscoveryTab] = useState<'recommend' | 'cloud'>(
    'recommend'
  );
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudSources, setCloudSources] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);

  const [orderChanged, setOrderChanged] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  const [newSource, setNewSource] = useState<DataSource>({
    name: '',
    key: '',
    api: '',
    detail: '',
    disabled: false,
    from: 'custom',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    if (config?.SourceConfig) {
      setSources(config.SourceConfig);
      setOrderChanged(false);
    }
  }, [config]);

  const callSourceApi = async (body: Record<string, any>) => {
    const resp = await fetch('/api/admin/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || `操作失败: ${resp.status}`);
    }

    await refreshConfig();
  };

  const handleParseSubscription = async () => {
    if (!cloudUrl) return;
    setParsing(true);
    setCloudSources([]);
    try {
      const resp = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse_subscription', url: cloudUrl }),
      });
      const data = await resp.json();
      if (data.ok) {
        setCloudSources(data.sources);
        if (data.sources.length === 0) {
          Swal.fire({
            icon: 'warning',
            title: '未找到有效源',
            text: '该订阅链接中似乎不包含标准视频源',
          });
        }
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : '解析失败');
    } finally {
      setParsing(false);
    }
  };

  const handleToggleEnable = (key: string) => {
    const target = sources.find((s) => s.key === key);
    if (!target) return;
    const action = target.disabled ? 'enable' : 'disable';
    callSourceApi({ action, key }).catch((err) => {
      showError(err.message);
    });
  };

  const handleDelete = (key: string) => {
    Swal.fire({
      title: '确认删除?',
      text: '删除后无法恢复',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (result.isConfirmed) {
        callSourceApi({ action: 'delete', key }).catch((err) => {
          showError(err.message);
        });
      }
    });
  };

  const handleAddSource = () => {
    if (!newSource.name || !newSource.key || !newSource.api) return;
    callSourceApi({
      action: 'add',
      key: newSource.key,
      name: newSource.name,
      api: newSource.api,
      detail: newSource.detail,
    })
      .then(() => {
        setNewSource({
          name: '',
          key: '',
          api: '',
          detail: '',
          disabled: false,
          from: 'custom',
        });
        setShowAddForm(false);
      })
      .catch((err) => {
        showError(err.message);
      });
  };

  const handleAddDiscoverySource = async (
    item: (typeof RECOMMENDED_SOURCES)[0]
  ) => {
    // 检查是否已存在
    const exists = sources.some(
      (s) => s.key === item.key || s.api === item.api
    );
    if (exists) {
      Swal.fire({
        icon: 'info',
        title: '提示',
        text: '该源已存在，无需重复添加',
      });
      return;
    }

    try {
      await callSourceApi({
        action: 'add',
        key: item.key,
        name: item.name,
        api: item.api,
      });
      Swal.fire({
        icon: 'success',
        title: '添加成功',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : '添加失败');
    }
  };

  const handleBatchImport = async () => {
    const { value: text } = await Swal.fire({
      title: '批量导入视频源',
      input: 'textarea',
      inputLabel: '每行一个源，格式：名称,接口地址',
      inputPlaceholder:
        '例如:\n极速资源,https://api.jisu.com/api.php/provide/vod/\n卧龙资源,https://api.wolong.com/xml.php',
      inputAttributes: {
        autocapitalize: 'off',
        rows: '10',
      },
      showCancelButton: true,
      confirmButtonText: '导入',
      cancelButtonText: '取消',
      width: '600px',
    });

    if (text) {
      const lines = text.split('\n').filter((l: string) => l.trim());
      let successCount = 0;
      let failCount = 0;

      Swal.fire({
        title: '正在导入...', 
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      for (const line of lines) {
        const parts = line.split(/[，,]/);
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const api = parts[1].trim();
          const key = Math.random().toString(36).substring(2, 8); // 随机 key

          try {
            await callSourceApi({ action: 'add', name, api, key });
            successCount++;
          } catch (e) {
            console.error('导入失败:', line, e);
            failCount++;
          }
        } else {
          failCount++;
        }
      }

      Swal.fire({
        icon: successCount > 0 ? 'success' : 'error',
        title: '导入完成',
        text: `成功: ${successCount}, 失败: ${failCount}`,
      });
    }
  };

  const handleTest = async (key: string, url: string) => {
    setTestResults((prev) => ({
      ...prev,
      [key]: { loading: true },
    }));

    try {
      const resp = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', url }),
      });
      const data = await resp.json();
      setTestResults((prev) => ({
        ...prev,
        [key]: {
          loading: false,
          latency: data.latency,
          ok: data.ok,
          status: data.status,
          error: data.error,
        },
      }));
    } catch (e) {
      setTestResults((prev) => ({
        ...prev,
        [key]: { loading: false, error: '请求失败' },
      }));
    }
  };

  const handleTestAll = async () => {
    if (isTestingAll) return;
    setIsTestingAll(true);

    // 并发限制 (浏览器通常对同一域名限制 6 个连接，我们保守设为 5)
    const CONCURRENCY_LIMIT = 5;
    const queue = [...sources];
    const activePromises: Promise<void>[] = [];

    const runNext = async (): Promise<void> => {
      if (queue.length === 0) return;
      
      const source = queue.shift();
      if (!source) return;

      try {
        await handleTest(source.key, source.api);
      } catch (err) {
        console.error(`Test failed for ${source.name}`, err);
      } finally {
        // 递归调用，任务完成后立即补位
        await runNext();
      }
    };

    // 初始化并发池
    for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, sources.length); i++) {
      activePromises.push(runNext());
    }

    await Promise.all(activePromises);
    setIsTestingAll(false);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sources.findIndex((s) => s.key === active.id);
    const newIndex = sources.findIndex((s) => s.key === over.id);
    setSources((prev) => arrayMove(prev, oldIndex, newIndex));
    setOrderChanged(true);
  };

  const handleSaveOrder = () => {
    const order = sources.map((s) => s.key);
    callSourceApi({ action: 'sort', order })
      .then(() => {
        setOrderChanged(false);
        Swal.fire({
          icon: 'success',
          title: '排序已保存',
          toast: true,
          position: 'top-end',
          timer: 2000,
          showConfirmButton: false,
        });
      })
      .catch((err) => {
        showError(err.message);
      });
  };

  const handleSortBySpeed = () => {
    const hasResults = Object.keys(testResults).length > 0;
    if (!hasResults) {
      Swal.fire({ icon: 'info', title: '提示', text: '请先点击“一键测速”获取数据' });
      return;
    }

    const sorted = [...sources].sort((a, b) => {
      const resA = testResults[a.key];
      const resB = testResults[b.key];
      
      const isAOk = resA?.ok;
      const isBOk = resB?.ok;

      if (isAOk && !isBOk) return -1;
      if (!isAOk && isBOk) return 1;
      
      if (isAOk && isBOk) {
        return (resA.latency || 99999) - (resB.latency || 99999);
      }
      return 0;
    });

    setSources(sorted);
    setOrderChanged(true);
    
    Swal.fire({
      icon: 'success',
      title: '已按速度重排',
      text: '响应最快的源已排到前面，请点击底部按钮保存生效。',
      timer: 2000,
      showConfirmButton: false
    });
  };

  if (!config) {
    return (
      <div className='text-center py-12'>
        <div className='animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4' />
        <p className='text-gray-500'>正在加载配置...</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 头部操作栏 */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className='inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm'
          >
            {showAddForm ? '取消' : '添加视频源'}
          </button>
          <button
            onClick={() => setShowDiscovery(true)}
            className='inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm'
          >
            <Globe size={16} className='mr-2' />
            资源发现
          </button>
          <button
            onClick={handleBatchImport}
            className='inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors shadow-sm'
          >
            <ClipboardPaste size={16} className='mr-2' />
            批量导入
          </button>
        </div>
        <button
          onClick={handleSortBySpeed}
          className='inline-flex items-center px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-sm font-medium rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800'
        >
          <Zap size={16} className='mr-2' />
          按速度排序
        </button>
        <button
          onClick={handleTestAll}
          disabled={isTestingAll}
          className='inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-sm font-medium rounded-lg transition-colors border border-blue-200 dark:border-blue-800 disabled:opacity-50'
        >
          <Zap size={16} className={`mr-2 ${isTestingAll ? 'animate-pulse' : ''}`} />
          {isTestingAll ? '正在测速...' : '一键测速'}
        </button>
      </div>

      {showDiscovery && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                <Globe size={20} className='text-purple-500' />
                资源发现
              </h3>
              <button 
                onClick={() => setShowDiscovery(false)}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              >
                ✕
              </button>
            </div>

            {/* Tab 切换 */}
            <div className='flex border-b border-gray-200 dark:border-gray-700'>
              <button
                onClick={() => setDiscoveryTab('recommend')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${ 
                  discoveryTab === 'recommend'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50 dark:bg-purple-900/10'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                🔥 热门推荐
              </button>
              <button
                onClick={() => setDiscoveryTab('cloud')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${ 
                  discoveryTab === 'cloud'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50 dark:bg-purple-900/10'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                ☁️ 云端搜索 (TVBox)
              </button>
            </div>

            <div className='flex-1 overflow-y-auto p-4'>
              {discoveryTab === 'recommend' ? (
                /* 热门推荐列表 */
                <div className='grid gap-2'>
                  {RECOMMENDED_SOURCES.map((source) => {
                    const isAdded = sources.some(s => s.key === source.key);
                    return (
                      <div key={source.key} className='flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'>
                        <div>
                          <div className='font-bold text-gray-900 dark:text-gray-100'>{source.name}</div>
                          <div className='text-xs text-gray-500 dark:text-gray-400 break-all'>{source.api}</div>
                        </div>
                        {isAdded ? (
                          <span className='px-3 py-1 text-xs font-medium text-gray-500 bg-gray-200 dark:bg-gray-700 rounded-full'>已添加</span>
                        ) : (
                          <button
                            onClick={() => handleAddDiscoverySource(source)}
                            className='px-3 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-full transition-colors'
                          >
                            添加
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 云端搜索面板 */
                <div className='space-y-4'>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      placeholder='粘贴 TVBox 接口 / JSON 订阅链接...'
                      value={cloudUrl}
                      onChange={(e) => setCloudUrl(e.target.value)}
                      className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none'
                    />
                    <button
                      onClick={handleParseSubscription}
                      disabled={parsing || !cloudUrl}
                      className='px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg whitespace-nowrap transition-colors'
                    >
                      {parsing ? '解析中...' : '解析'}
                    </button>
                  </div>

                  {/* 解析结果列表 */}
                  {cloudSources.length > 0 && (
                    <div className='grid gap-2 animate-in fade-in slide-in-from-bottom-2'>
                      <div className='flex items-center justify-between pb-2'>
                        <div className='text-xs text-gray-500'>
                          共发现 {cloudSources.length} 个资源
                        </div>
                        <button
                          onClick={async () => {
                            const newSources = cloudSources.filter(source => 
                              !sources.some(s => s.api === source.api || s.key === source.key)
                            );
                            
                            if (newSources.length === 0) {
                              Swal.fire({ icon: 'info', title: '提示', text: '所有源均已存在，无需添加' });
                              return;
                            }

                            const { isConfirmed } = await Swal.fire({
                              title: '确认添加?',
                              text: `将批量添加 ${newSources.length} 个新资源 (已自动跳过 ${cloudSources.length - newSources.length} 个重复项)`,
                              icon: 'question',
                              showCancelButton: true,
                              confirmButtonText: '全部添加',
                              cancelButtonText: '取消'
                            });

                            if (!isConfirmed) return;

                            let successCount = 0;
                            let failCount = 0;
                            
                            Swal.fire({
                              title: '正在批量添加...',
                              html: '请稍候，正在逐个写入配置...',
                              allowOutsideClick: false,
                              didOpen: () => {
                                Swal.showLoading();
                              }
                            });

                            // 串行添加以避免数据库锁冲突或请求风暴
                            for (const source of newSources) {
                              try {
                                await callSourceApi({
                                  action: 'add',
                                  key: source.key, // 确保 key 唯一性可能需要后端或前端额外处理，这里假设源自带的 key 是可用的
                                  name: source.name,
                                  api: source.api,
                                });
                                successCount++;
                              } catch (e) {
                                console.error('添加失败', source.name, e);
                                failCount++;
                              }
                            }

                            Swal.fire({
                              icon: successCount > 0 ? 'success' : 'error',
                              title: '批量添加完成',
                              text: `成功: ${successCount}, 失败: ${failCount}`,
                            });
                          }}
                          className='px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm'
                        >
                          一键添加全部 ({cloudSources.length})
                        </button>
                      </div>
                      {cloudSources.map((source, idx) => {
                        // 智能判断是否已添加 (根据 API URL)
                        const isAdded = sources.some(
                          (s) => s.api === source.api
                        );
                        return (
                          <div
                            key={idx}
                            className='flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700'
                          >
                            <div className='min-w-0 pr-4'>
                              <div className='font-bold text-gray-900 dark:text-gray-100 truncate'>
                                {source.name}
                              </div>
                              <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                                {source.api}
                              </div>
                            </div>
                            {isAdded ? (
                              <span className='flex-shrink-0 px-3 py-1 text-xs font-medium text-gray-500 bg-gray-200 dark:bg-gray-700 rounded-full'>
                                已添加
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAddDiscoverySource(source)}
                                className='flex-shrink-0 px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-full transition-colors'
                              >
                                添加
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 空状态提示 */}
                  {!parsing && cloudSources.length === 0 && (
                    <div className='text-center py-8 text-gray-400 text-sm'>
                      <p>支持解析标准 TVBox 接口 JSON</p>
                      <p className='mt-1'>
                        试试搜索 &quot;TVBox 接口&quot; 并粘贴地址
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className='p-4 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500'>
              列表来源于网络公开收集，请遵守当地法律法规
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className='p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4 shadow-inner'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                名称
              </label>
              <input
                type='text'
                placeholder='如: 极速资源'
                value={newSource.name}
                onChange={(e) =>
                  setNewSource((prev) => ({ ...prev, name: e.target.value }))
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none'
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                Key (唯一标识)
              </label>
              <input
                type='text'
                placeholder='如: jisu'
                value={newSource.key}
                onChange={(e) =>
                  setNewSource((prev) => ({ ...prev, key: e.target.value }))
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none'
              />
            </div>
            <div className='sm:col-span-2 space-y-1.5'>
              <label className='text-xs font-semibold text-gray-500 uppercase px-1'>
                API 地址
              </label>
              <input
                type='text'
                placeholder='支持 MacCMS 接口地址 (XML/JSON)'
                value={newSource.api}
                onChange={(e) =>
                  setNewSource((prev) => ({ ...prev, api: e.target.value }))
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 outline-none'
              />
            </div>
          </div>
          <div className='flex justify-end pt-2'>
            <button
              onClick={handleAddSource}
              disabled={!newSource.name || !newSource.key || !newSource.api}
              className='px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors'
            >
              确认添加
            </button>
          </div>
        </div>
      )}

      <div className='border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-transparent'>
        <div className='overflow-x-auto max-h-[calc(100vh-350px)]'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
            <thead className='bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10'>
              <tr>
                <th className='w-10' />
                <th className='px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  名称
                </th>
                <th className='px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Key
                </th>
                <th className='px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  API 接口
                </th>
                <th className='px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  延迟
                </th>
                <th className='px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  状态
                </th>
                <th className='px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  操作
                </th>
              </tr>
            </thead>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              autoScroll={false}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext
                items={sources.map((s) => s.key)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-transparent'>
                  {sources.map((source) => (
                    <DraggableRow
                      key={source.key}
                      source={source}
                      testResult={testResults[source.key]}
                      onTest={handleTest}
                      onToggleEnable={handleToggleEnable}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>
      </div>

      {orderChanged && (
        <div className='flex justify-end p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-bottom-2'>
          <button
            onClick={handleSaveOrder}
            className='px-6 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md active:scale-95'
          >
            保存排序更改
          </button>
        </div>
      )}
    </div>
  );
};