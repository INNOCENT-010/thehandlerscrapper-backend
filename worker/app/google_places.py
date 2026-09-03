import asyncio
import httpx

from .config import settings


BASE = "https://places.googleapis.com/v1/places:searchText"

FIELDS = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.websiteUri",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.primaryType",
    "places.types",
    "nextPageToken",
])


async def text_search(
    query: str,
    page_size: int = 20,
):
    if not settings.google_key:
        raise RuntimeError(
            "GOOGLE_MAPS_API_KEY is not configured"
        )

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_key,
        "X-Goog-FieldMask": FIELDS,
    }

    payload = {
        "textQuery": query,
        "pageSize": min(page_size, 20),
        "languageCode": "en",
    }

    last_error = None

    for attempt in range(1, 4):
        try:
            print(
                f"GOOGLE PLACES REQUEST "
                f"(attempt {attempt}/3): {query}"
            )

            timeout = httpx.Timeout(
                connect=20.0,
                read=60.0,
                write=30.0,
                pool=20.0,
            )

            async with httpx.AsyncClient(
                timeout=timeout,
                follow_redirects=True,
                trust_env=False,
                http2=False,
            ) as client:

                response = await client.post(
                    BASE,
                    headers=headers,
                    json=payload,
                )

                print(
                    "GOOGLE RESPONSE:",
                    response.status_code,
                )

                if response.status_code >= 400:
                    print(
                        "GOOGLE ERROR:",
                        response.text[:1000],
                    )

                response.raise_for_status()

                return response.json()

        except (
            httpx.ConnectError,
            httpx.ConnectTimeout,
            httpx.ReadTimeout,
            httpx.RemoteProtocolError,
        ) as error:

            last_error = error

            print(
                f"GOOGLE CONNECTION FAILED "
                f"(attempt {attempt}/3):",
                repr(error),
            )

            if attempt < 3:
                await asyncio.sleep(attempt * 2)

        except httpx.HTTPStatusError as error:
            print(
                "GOOGLE HTTP ERROR:",
                error.response.status_code,
                error.response.text[:1000],
            )
            raise

        except Exception as error:
            print(
                "GOOGLE REQUEST ERROR:",
                repr(error),
            )
            raise

    raise RuntimeError(
        f"Google Places connection failed after 3 attempts: "
        f"{repr(last_error)}"
    )


async def place_details(place_id: str):
    if not settings.google_key:
        raise RuntimeError(
            "GOOGLE_MAPS_API_KEY is not configured"
        )

    headers = {
        "X-Goog-Api-Key": settings.google_key,
        "X-Goog-FieldMask": FIELDS.replace(
            "places.",
            "",
        ),
    }

    timeout = httpx.Timeout(
        connect=20.0,
        read=60.0,
        write=30.0,
        pool=20.0,
    )

    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        trust_env=False,
        http2=False,
    ) as client:

        response = await client.get(
            f"https://places.googleapis.com/v1/places/{place_id}",
            headers=headers,
        )

        response.raise_for_status()

        return response.json()