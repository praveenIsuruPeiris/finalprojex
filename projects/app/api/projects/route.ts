import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiUrl =process.env.DIRECTUS_API_URL;
    const apiToken = process.env.DIRECTUS_API_TOKEN;

    if (!apiUrl || !apiToken) {
      console.error('Missing API configuration');
      return NextResponse.json({ error: 'Missing API configuration' }, { status: 500 });
    }

    const response = await fetch(`${apiUrl}/items/projects`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Directus API Error:', errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
