import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const fileId = request.nextUrl.searchParams.get('file_id');

  if (!token || !fileId) {
    return NextResponse.json(
      { error: 'token and file_id are required' },
      { status: 400 },
    );
  }

  // Get file path from Telegram
  const fileRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
  );
  const fileData = await fileRes.json();

  if (!fileData.ok) {
    return NextResponse.json({ error: fileData.description }, { status: 400 });
  }

  const filePath = fileData.result.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  // Support Range requests for video seeking
  const rangeHeader = request.headers.get('range');
  const fetchHeaders: HeadersInit = {};
  if (rangeHeader) {
    fetchHeaders['Range'] = rangeHeader;
  }

  const videoRes = await fetch(fileUrl, { headers: fetchHeaders });

  const headers = new Headers();
  const contentType =
    videoRes.headers.get('content-type') || 'video/mp4';
  const contentLength = videoRes.headers.get('content-length');
  const contentRange = videoRes.headers.get('content-range');

  headers.set('Content-Type', contentType);
  headers.set('Accept-Ranges', 'bytes');
  if (contentLength) headers.set('Content-Length', contentLength);
  if (contentRange) headers.set('Content-Range', contentRange);

  return new NextResponse(videoRes.body, {
    status: videoRes.status,
    headers,
  });
}
