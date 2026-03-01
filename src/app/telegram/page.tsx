/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
'use client';

import { Film, Play, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import PageLayout from '@/components/PageLayout';

interface TelegramVideo {
  message_id: number;
  chat_id: number;
  file_id: string;
  file_name: string;
  duration?: number;
  width?: number;
  height?: number;
  file_size?: number;
  caption?: string;
  date: number;
  thumb_file_id?: string | null;
}

function formatDuration(seconds?: number) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const TOKEN_KEY = 'tg_bot_token';

export default function TelegramPage() {
  const [token, setToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [videos, setVideos] = useState<TelegramVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState<TelegramVideo | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY) || '';
    if (stored) {
      setToken(stored);
      setSavedToken(stored);
    }
  }, []);

  useEffect(() => {
    if (savedToken) fetchVideos(savedToken);
  }, [savedToken]);

  async function fetchVideos(t: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/telegram/videos?token=${encodeURIComponent(t)}`,
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setVideos(data.videos || []);
      if ((data.videos || []).length === 0) {
        setError('沒有找到影片。請將影片傳送給您的 Bot，再重新整理。');
      }
    } catch (e: any) {
      setError(e.message || '無法取得影片');
    } finally {
      setLoading(false);
    }
  }

  function handleSaveToken() {
    if (!token.trim()) return;
    localStorage.setItem(TOKEN_KEY, token.trim());
    setSavedToken(token.trim());
  }

  function handleClearToken() {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setSavedToken('');
    setVideos([]);
    setError('');
  }

  function playVideo(video: TelegramVideo) {
    setPlaying(video);
  }

  function closePlayer() {
    if (videoRef.current) videoRef.current.pause();
    setPlaying(null);
  }

  const videoSrc = playing
    ? `/api/telegram/file?token=${encodeURIComponent(savedToken)}&file_id=${playing.file_id}`
    : '';

  return (
    <PageLayout activePath='/telegram'>
      <div className='p-4 md:p-6 max-w-5xl'>
        <h1 className='text-2xl font-bold mb-6 flex items-center gap-2'>
          <Film className='w-6 h-6' />
          Telegram 影片
        </h1>

        {/* Token 設定 */}
        <div className='mb-6 rounded-xl border border-white/10 bg-white/5 p-4'>
          <p className='text-sm text-gray-400 mb-3'>
            請輸入您的 Telegram Bot Token，並將影片傳送給該 Bot 即可觀看。
            <a
              href='https://t.me/BotFather'
              target='_blank'
              rel='noopener noreferrer'
              className='ml-1 text-blue-400 hover:underline'
            >
              如何取得 Token？
            </a>
          </p>
          <div className='flex gap-2'>
            <input
              type='password'
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder='123456789:ABCDefgh...'
              className='flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500'
              onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
            />
            <button
              onClick={handleSaveToken}
              className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 transition-colors'
            >
              儲存
            </button>
            {savedToken && (
              <button
                onClick={handleClearToken}
                className='rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20 transition-colors'
                title='清除 Token'
              >
                <X className='w-4 h-4' />
              </button>
            )}
          </div>
          {savedToken && (
            <p className='mt-2 text-xs text-green-400'>Token 已設定</p>
          )}
        </div>

        {/* 重新整理按鈕 */}
        {savedToken && (
          <div className='mb-4 flex items-center gap-3'>
            <button
              onClick={() => fetchVideos(savedToken)}
              disabled={loading}
              className='flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 transition-colors disabled:opacity-50'
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              重新整理
            </button>
            {videos.length > 0 && (
              <span className='text-sm text-gray-400'>
                共 {videos.length} 部影片
              </span>
            )}
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className='mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400'>
            {error}
          </div>
        )}

        {/* 影片清單 */}
        {videos.length > 0 && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {videos.map((v) => (
              <div
                key={v.file_id}
                onClick={() => playVideo(v)}
                className='group cursor-pointer rounded-xl border border-white/10 bg-white/5 overflow-hidden hover:border-blue-500/50 hover:bg-white/10 transition-all'
              >
                {/* 縮圖 / 佔位 */}
                <div className='relative aspect-video bg-black/40 flex items-center justify-center'>
                  {v.thumb_file_id ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/telegram/file?token=${encodeURIComponent(savedToken)}&file_id=${v.thumb_file_id}`}
                      alt=''
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <Film className='w-10 h-10 text-gray-600' />
                  )}
                  <div className='absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <Play className='w-12 h-12 text-white drop-shadow-lg' />
                  </div>
                  {v.duration && (
                    <span className='absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs'>
                      {formatDuration(v.duration)}
                    </span>
                  )}
                </div>
                <div className='p-3'>
                  <p className='text-sm font-medium truncate'>{v.file_name}</p>
                  <p className='text-xs text-gray-400 mt-0.5'>
                    {new Date(v.date * 1000).toLocaleString('zh-TW')}
                    {v.file_size ? ` · ${formatSize(v.file_size)}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 播放器 Modal */}
        {playing && (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'
            onClick={closePlayer}
          >
            <div
              className='w-full max-w-3xl rounded-xl overflow-hidden bg-black'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-center justify-between px-4 py-2 bg-white/5'>
                <span className='text-sm font-medium truncate'>
                  {playing.file_name}
                </span>
                <button
                  onClick={closePlayer}
                  className='ml-2 rounded-lg p-1 hover:bg-white/10 transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
              <video
                ref={videoRef}
                src={videoSrc}
                controls
                autoPlay
                className='w-full aspect-video bg-black'
              />
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
