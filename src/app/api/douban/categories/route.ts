import { NextResponse } from 'next/server';
import { getCacheTime } from '@/lib/config';
import { DoubanItem, DoubanResult } from '@/lib/types';

interface DoubanCategoryApiResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    card_subtitle: string;
    pic: {
      large: string;
      normal: string;
    };
    rating: {
      value: number;
    };
  }>;
}

interface DoubanSearchSubjectsResponse {
  subjects: Array<{
    id: string;
    title: string;
    cover: string;
    rate: string;
    url: string;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchDoubanData(url: string): Promise<any> {
  // 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  // 设置请求选项，包括信号和头部
  const fetchOptions = {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://movie.douban.com',
    },
  };

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 获取参数
  const kind = searchParams.get('kind') || 'movie';
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  const genre = searchParams.get('genre') || ''; // 新增：电影类型/风格
  const pageLimit = parseInt(searchParams.get('limit') || '20');
  const pageStart = parseInt(searchParams.get('start') || '0');

  // 验证通用参数
  if (!['tv', 'movie'].includes(kind)) {
    return NextResponse.json(
      { error: 'kind 参数必须是 tv 或 movie' },
      { status: 400 }
    );
  }

  if (pageLimit < 1 || pageLimit > 100) {
    return NextResponse.json(
      { error: 'pageSize 必须在 1-100 之间' },
      { status: 400 }
    );
  }

  if (pageStart < 0) {
    return NextResponse.json(
      { error: 'pageStart 不能小于 0' },
      { status: 400 }
    );
  }

  try {
    let list: DoubanItem[];
    const cacheTime = await getCacheTime();

    // 当指定了具体类型（非"全部"）时，使用 search_subjects API 进行类型筛选
    if (genre && genre !== '全部') {
      const target = `https://movie.douban.com/j/search_subjects?type=${kind}&tag=${encodeURIComponent(genre)}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`;

      const data: DoubanSearchSubjectsResponse = await fetchDoubanData(target);
      list = (data.subjects || []).map((item) => ({
        id: item.id,
        title: item.title,
        poster: item.cover || '',
        rate: item.rate || '',
        year: '',
      }));
    } else {
      // 使用原有的 recent_hot API
      if (!category || !type) {
        return NextResponse.json(
          { error: '缺少必要参数: kind 或 category 或 type' },
          { status: 400 }
        );
      }

      const target = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`;

      const doubanData: DoubanCategoryApiResponse =
        await fetchDoubanData(target);

      list = doubanData.items.map((item) => ({
        id: item.id,
        title: item.title,
        poster: item.pic?.normal || item.pic?.large || '',
        rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
        year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
      }));
    }

    const response: DoubanResult = {
      code: 200,
      message: '获取成功',
      list,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取豆瓣数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
