import {
  NextRequest,
  NextResponse,
} from 'next/server'

const workerUrl =
  process.env.WORKER_URL ||
  process.env.LEAD_WORKER_URL ||
  'http://127.0.0.1:8000'

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        {
          error: 'Run ID is required',
        },
        {
          status: 400,
        }
      )
    }

    const response = await fetch(
      `${workerUrl}/runs/${id}`,
      {
        method: 'GET',
        cache: 'no-store',
      }
    )

    const text = await response.text()

    let data: any

    try {
      data = JSON.parse(text)
    } catch {
      data = {
        error:
          text ||
          'Worker returned an invalid response',
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.detail ||
            data?.error ||
            `Worker returned ${response.status}`,
        },
        {
          status: response.status,
        }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(
      'DISCOVERY RUN API ERROR:',
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load discovery run',
      },
      {
        status: 500,
      }
    )
  }
}