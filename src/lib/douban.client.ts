import { DoubanItem, DoubanResult } from './types';

interface DoubanCategoriesParams {
  kind: 'tv' | 'movie';
  category: string;
  type: string;
  genre?: string; // 新增：电影类型（动作、喜剧、爱情等）
  pageLimit?: number;
  pageStart?: number;
}

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

/**
 * 带超时的 fetch 请求
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  // 检查是否使用代理
  const proxyUrl = getDoubanProxyUrl();
  const finalUrl = proxyUrl ? `${proxyUrl}${encodeURIComponent(url)}` : url;

  const fetchOptions: RequestInit = {
    ...options,
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(finalUrl, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 获取豆瓣代理 URL 设置
 */
export function getDoubanProxyUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const doubanProxyUrl = localStorage.getItem('doubanProxyUrl');
  return doubanProxyUrl && doubanProxyUrl.trim() ? doubanProxyUrl.trim() : null;
}

/**
 * 检查是否应该使用客户端获取豆瓣数据
 */
export function shouldUseDoubanClient(): boolean {
  return getDoubanProxyUrl() !== null;
}

/**
 * 浏览器端豆瓣分类数据获取函数
 */
export async function fetchDoubanCategories(
  params: DoubanCategoriesParams
): Promise<DoubanResult> {
  const {
    kind,
    category,
    type,
    genre = '',
    pageLimit = 20,
    pageStart = 0,
  } = params;

  // 验证参数
  if (!['tv', 'movie'].includes(kind)) {
    throw new Error('kind 参数必须是 tv 或 movie');
  }

  if (pageLimit < 1 || pageLimit > 100) {
    throw new Error('pageLimit 必须在 1-100 之间');
  }

  if (pageStart < 0) {
    throw new Error('pageStart 不能小于 0');
  }

  try {
    // 当指定了具体类型（非"全部"）时，使用 search_subjects API
    if (genre && genre !== '全部') {
      const target = `https://movie.douban.com/j/search_subjects?type=${kind}&tag=${encodeURIComponent(genre)}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`;

      const response = await fetchWithTimeout(target);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data: DoubanSearchSubjectsResponse = await response.json();

      const list: DoubanItem[] = (data.subjects || []).map((item) => ({
        id: item.id,
        title: item.title,
        poster: item.cover || '',
        rate: item.rate || '',
        year: '',
      }));

      return { code: 200, message: '获取成功', list };
    }

    // 原有的 recent_hot 逻辑
    if (!category || !type) {
      throw new Error('category 和 type 参数不能为空');
    }

    const target = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`;

    const response = await fetchWithTimeout(target);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const doubanData: DoubanCategoryApiResponse = await response.json();

    // 转换数据格式
    const list: DoubanItem[] = doubanData.items.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.pic?.normal || item.pic?.large || '',
      rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    }));

    return {
      code: 200,
      message: '获取成功',
      list: list,
    };
  } catch (error) {
    throw new Error(`获取豆瓣分类数据失败: ${(error as Error).message}`);
  }
}

/**
 * 统一的豆瓣分类数据获取函数，根据代理设置选择使用服务端 API 或客户端代理获取
 */
export async function getDoubanCategories(
  params: DoubanCategoriesParams
): Promise<DoubanResult> {
  if (shouldUseDoubanClient()) {
    // 使用客户端代理获取（当设置了代理 URL 时）
    return fetchDoubanCategories(params);
  } else {
    // 使用服务端 API（当没有设置代理 URL 时）
    const {
      kind,
      category,
      type,
      genre = '',
      pageLimit = 20,
      pageStart = 0,
    } = params;

    const queryParams = new URLSearchParams({
      kind,
      category,
      type,
      limit: pageLimit.toString(),
      start: pageStart.toString(),
    });

    // 只在有具体类型时传递 genre 参数
    if (genre && genre !== '全部') {
      queryParams.set('genre', genre);
    }

    const response = await fetch(`/api/douban/categories?${queryParams}`);
    if (!response.ok) {
      throw new Error('获取豆瓣分类数据失败');
    }
    return response.json();
  }
}
