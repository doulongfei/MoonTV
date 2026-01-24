import React from 'react';

export default function PlayLoading() {
  return (
    <div className='min-h-screen bg-white dark:bg-black'>
      {/* 顶部标题区域骨架 */}
      <div className='px-4 sm:px-10 py-4 border-b border-gray-100 dark:border-gray-800'>
        <div className='h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-2 animate-pulse'></div>
        <div className='h-4 w-32 bg-gray-100 dark:bg-gray-900 rounded-md animate-pulse'></div>
      </div>

      <div className='px-4 sm:px-10 py-6 max-w-[1600px] mx-auto'>
        <div className='flex flex-col lg:flex-row gap-8'>
          {/* 播放器骨架 */}
          <div className='flex-1'>
            <div className='aspect-video w-full bg-gray-200 dark:bg-gray-800 rounded-2xl shadow-lg relative overflow-hidden animate-pulse'>
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='w-16 h-16 rounded-full border-4 border-gray-300 dark:border-gray-700 border-t-green-500 animate-spin'></div>
              </div>
            </div>

            {/* 简介骨架 */}
            <div className='mt-8 space-y-4'>
              <div className='h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse'></div>
              <div className='space-y-2'>
                <div className='h-4 w-full bg-gray-100 dark:bg-gray-900 rounded-md animate-pulse'></div>
                <div className='h-4 w-5/6 bg-gray-100 dark:bg-gray-900 rounded-md animate-pulse'></div>
                <div className='h-4 w-4/6 bg-gray-100 dark:bg-gray-900 rounded-md animate-pulse'></div>
              </div>
            </div>
          </div>

          {/* 选集列表骨架 */}
          <div className='w-full lg:w-80 space-y-6'>
            <div className='h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse'></div>
            <div className='grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2'>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className='aspect-square rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse'
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}