/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { LayoutDashboard, LogOut, Settings, User } from 'lucide-react';

import { useSite } from '@/components/SiteProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getAuthInfoFromBrowserCookie } from '@/lib/auth';

function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [currentUser, setCurrentUser] = useState<{username: string, role: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { siteName } = useSite();

  // 初始化检查登录状态
  useEffect(() => {
    const info = getAuthInfoFromBrowserCookie();
    if (info?.username) {
      setCurrentUser({
        username: info.username,
        role: (info as any).role || 'user'
      });
    }
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await fetch('/api/logout', { method: 'POST' });
      setCurrentUser(null);
      window.location.reload();
    } catch (e) {
      setError('注销失败');
    } finally {
      setLoading(false);
    }
  };

  // 当 STORAGE_TYPE 不为空且不为 localstorage 时，要求输入用户名
  const shouldAskUsername =
    typeof window !== 'undefined' &&
    (window as any).RUNTIME_CONFIG?.STORAGE_TYPE &&
    (window as any).RUNTIME_CONFIG?.STORAGE_TYPE !== 'localstorage';

  // 是否允许注册
  const enableRegister =
    typeof window !== 'undefined' &&
    Boolean((window as any).RUNTIME_CONFIG?.ENABLE_REGISTER);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!password || (shouldAskUsername && !username)) return;

    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          ...(shouldAskUsername ? { username } : {}),
        }),
      });

      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/';
        window.location.href = redirect; // 使用 window.location 强制刷新以更新侧边栏状态
      } else if (res.status === 401) {
        setError('密码错误');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '服务器错误');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理注册逻辑
  const handleRegister = async () => {
    setError(null);
    if (!password || !username) return;

    try {
      setLoading(true);
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/';
        window.location.href = redirect;
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '服务器错误');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  return (
    <div className='relative min-h-screen flex items-center justify-center px-4 overflow-hidden'>
      <div className='absolute top-4 right-4'>
        <ThemeToggle />
      </div>
      <div className='relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-b from-white/90 via-white/70 to-white/40 dark:from-zinc-900/90 dark:via-zinc-900/70 dark:to-zinc-900/40 backdrop-blur-xl shadow-2xl p-8 sm:p-10 dark:border dark:border-zinc-800'>
        
        {currentUser ? (
          /* 已登录：个人中心视图 */
          <div className='space-y-8'>
            <div className='text-center space-y-4'>
              <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500 text-white shadow-lg'>
                <User size={40} />
              </div>
              <div>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>{currentUser.username}</h2>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  {currentUser.role === 'owner' ? '站长' : currentUser.role === 'admin' ? '管理员' : '普通用户'}
                </p>
              </div>
            </div>

            <div className='grid gap-3'>
              {isAdmin && (
                <>
                  <button
                    onClick={() => router.push('/admin')}
                    className='flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors text-gray-700 dark:text-gray-200 font-medium'
                  >
                    <Settings size={20} className='text-blue-500' />
                    系统设置
                  </button>
                  <button
                    onClick={() => router.push('/admin/sources')}
                    className='flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors text-gray-700 dark:text-gray-200 font-medium'
                  >
                    <LayoutDashboard size={20} className='text-purple-500' />
                    视频源管理
                  </button>
                </>
              )}
              
              <button
                onClick={handleLogout}
                disabled={loading}
                className='flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-red-600 dark:text-red-400 font-medium disabled:opacity-50'
              >
                <LogOut size={20} />
                {loading ? '注销中...' : '注销登录'}
              </button>
            </div>
          </div>
        ) : (
          /* 未登录：登录表单 */
          <>
            <h1 className='text-green-600 tracking-tight text-center text-3xl font-extrabold mb-8 bg-clip-text drop-shadow-sm'>
              {siteName}
            </h1>
            <form onSubmit={handleSubmit} className='space-y-8'>
              {shouldAskUsername && (
                <div>
                  <label htmlFor='username' className='sr-only'>
                    用户名
                  </label>
                  <input
                    id='username'
                    type='text'
                    autoComplete='username'
                    className='block w-full rounded-lg border-0 py-3 px-4 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-white/60 dark:ring-white/20 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none sm:text-base bg-white/60 dark:bg-zinc-800/60 backdrop-blur'
                    placeholder='输入用户名'
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label htmlFor='password' className='sr-only'>
                  密码
                </label>
                <input
                  id='password'
                  type='password'
                  autoComplete='current-password'
                  className='block w-full rounded-lg border-0 py-3 px-4 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-white/60 dark:ring-white/20 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none sm:text-base bg-white/60 dark:bg-zinc-800/60 backdrop-blur'
                  placeholder='输入访问密码'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
              )}

              {/* 登录 / 注册按钮 */}
              {shouldAskUsername && enableRegister ? (
                <div className='flex gap-4'>
                  <button
                    type='button'
                    onClick={handleRegister}
                    disabled={!password || !username || loading}
                    className='flex-1 inline-flex justify-center rounded-lg bg-blue-600 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {loading ? '注册中...' : '注册'}
                  </button>
                  <button
                    type='submit'
                    disabled={
                      !password || loading || (shouldAskUsername && !username)
                    }
                    className='flex-1 inline-flex justify-center rounded-lg bg-green-600 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {loading ? '登录中...' : '登录'}
                  </button>
                </div>
              ) : (
                <button
                  type='submit'
                  disabled={
                    !password || loading || (shouldAskUsername && !username)
                  }
                  className='inline-flex w-full justify-center rounded-lg bg-green-600 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:from-green-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {loading ? '登录中...' : '登录'}
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
