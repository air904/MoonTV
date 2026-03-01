/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Bot token required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?limit=100&allowed_updates=["message"]`,
    );
    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json({ error: data.description }, { status: 400 });
    }

    const videos = data.result
      .filter(
        (update: any) =>
          update.message?.video ||
          (update.message?.document &&
            update.message.document.mime_type?.startsWith('video/')),
      )
      .map((update: any) => {
        const msg = update.message;
        const video = msg.video || msg.document;
        return {
          message_id: msg.message_id,
          chat_id: msg.chat.id,
          file_id: video.file_id,
          file_name:
            video.file_name ||
            msg.caption ||
            `影片_${msg.message_id}`,
          duration: video.duration,
          width: video.width,
          height: video.height,
          file_size: video.file_size,
          caption: msg.caption,
          date: msg.date,
          thumb_file_id: msg.video?.thumbnail?.file_id || null,
        };
      });

    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 },
    );
  }
}
