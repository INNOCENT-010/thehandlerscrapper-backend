from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncio
import traceback
import os
import html
import httpx

from datetime import datetime, timezone

from .google_places import text_search
from .db import db
from .crawler import crawl
from .scoring import score_school


app = FastAPI(
    title="TheHandler School Lead Worker"
)


# ============================================================
# CONFIG
# ============================================================

POLL_INTERVAL_SECONDS = 2

ENRICH_CONCURRENCY = 5

MAX_DISCOVERY_LIMIT = 100

BROADCAST_BATCH_SIZE = 100

BROADCAST_MAX_ATTEMPTS = 3

MAILROOM_API_URL = os.getenv(
    "MAILROOM_API_URL",
    "http://gateway:8080/api/v1",
).rstrip("/")

MAILROOM_API_KEY = os.getenv("MAILROOM_API_KEY")
MAILROOM_WORKSPACE_ID = os.getenv("MAILROOM_WORKSPACE_ID")
MAILROOM_FROM_EMAIL = os.getenv("MAILROOM_FROM_EMAIL")
MAILROOM_UNSUBSCRIBE_LIST_ID = os.getenv("MAILROOM_UNSUBSCRIBE_LIST_ID")

MAILROOM_FROM_NAME = os.getenv(
    "MAILROOM_FROM_NAME",
    "TheHandler"
)


# ============================================================
# REQUEST MODELS
# ============================================================

class DiscoverRequest(BaseModel):
    state_id: str | None = None
    city_id: str | None = None
    lga_id: str | None = None
    area_id: str | None = None
    area: str | None = None
    school_type: str = "private"
    limit: int = 20


# ============================================================
# HELPERS
# ============================================================

def utc_now():
    return datetime.now(
        timezone.utc
    ).isoformat()


def mailroom_configured():
    return bool(
        MAILROOM_API_KEY
        and MAILROOM_WORKSPACE_ID
        and MAILROOM_FROM_EMAIL
        and MAILROOM_UNSUBSCRIBE_LIST_ID
    )


# ============================================================
# LOCATION
# ============================================================

async def location_names_from_ids(
    state_id: str | None,
    lga_id: str | None,
    city_id: str | None,
    area_id: str | None,
):
    client = db()

    ids = [
        x for x in [
            state_id,
            lga_id,
            city_id,
            area_id,
        ]
        if x
    ]

    result = {
        "state": None,
        "lga": None,
        "city": None,
        "area": None,
    }

    if not ids:
        return result

    rows = (
        client
        .table("locations")
        .select("id,name,type")
        .in_("id", ids)
        .execute()
        .data
        or []
    )

    for row in rows:

        location_type = row.get("type")

        if location_type in result:

            result[location_type] = row.get(
                "name"
            )

    return result


def query_for(
    location_names_result,
    school_type: str,
    typed_area: str | None = None,
):
    school_phrase = (
        "schools"
        if school_type == "any"
        else f"{school_type} schools"
    )

    state = location_names_result.get(
        "state"
    )

    lga = location_names_result.get(
        "lga"
    )

    city = location_names_result.get(
        "city"
    )

    # A typed area takes priority
    # over a structured area.

    area = (
        typed_area.strip()
        if typed_area and typed_area.strip()
        else location_names_result.get(
            "area"
        )
    )

    parts = []

    if area:
        parts.append(area)

    if city:
        parts.append(city)

    if lga:
        parts.append(lga)

    if state:
        parts.append(state)

    parts.append("Nigeria")

    return (
        f"{school_phrase} in "
        f"{', '.join(parts)}"
    )


# ============================================================
# CRAWLER
# ============================================================

async def safe_crawl(
    website: str | None
):

    if not website:

        return {
            "emails": [],
            "phones": [],
            "pages": [],
        }

    try:

        print(
            f"CRAWLING: {website}"
        )

        result = await crawl(
            website
        )

        return result or {
            "emails": [],
            "phones": [],
            "pages": [],
        }

    except Exception as e:

        print(
            f"CRAWL FAILED: {website}"
        )

        print(
            f"CRAWL ERROR: {repr(e)}"
        )

        return {
            "emails": [],
            "phones": [],
            "pages": [],
        }


# ============================================================
# SAVE / UPDATE SCHOOL
# ============================================================

async def save_school(
    client,
    run_id: str,
    state_id: str | None,
    lga_id: str | None,
    city_id: str | None,
    area_id: str | None,
    school_type: str,
    place: dict,
):

    place_id = place.get("id")

    if not place_id:
        raise Exception(
            "Google place has no ID"
        )

    existing = (
        client
        .table("schools")
        .select(
            "id,discovery_count"
        )
        .eq(
            "google_place_id",
            place_id
        )
        .limit(1)
        .execute()
        .data
        or []
    )

    school_name = (
        place
        .get("displayName", {})
        .get(
            "text",
            "Unknown school"
        )
    )

    school_data = {
        "school_name": school_name,

        "google_place_id": place_id,

        "website": place.get(
            "websiteUri"
        ),

        "phone": (
            place.get(
                "nationalPhoneNumber"
            )
            or place.get(
                "internationalPhoneNumber"
            )
        ),

        "address": place.get(
            "formattedAddress"
        ),

        "latitude": (
            place.get("location")
            or {}
        ).get("latitude"),

        "longitude": (
            place.get("location")
            or {}
        ).get("longitude"),

        "school_type": (
            None
            if school_type == "any"
            else school_type
        ),

        "state_id": state_id,

        "lga_id": lga_id,

        "city_id": city_id,

        "area_id": area_id,

        "last_discovery_run_id": run_id,

        # This gives Distribution /
        # Discover a useful discovery timestamp.
        "updated_at": utc_now(),
    }

    # --------------------------------------------------------
    # EXISTING SCHOOL
    # --------------------------------------------------------

    if existing:

        school_id = existing[0]["id"]

        old_count = (
            existing[0].get(
                "discovery_count"
            )
            or 0
        )

        school_data[
            "discovery_count"
        ] = old_count + 1

        (
            client
            .table("schools")
            .update(school_data)
            .eq(
                "id",
                school_id
            )
            .execute()
        )

        print(
            f"UPDATED SCHOOL: "
            f"{school_name}"
        )

        is_new = False

    # --------------------------------------------------------
    # NEW SCHOOL
    # --------------------------------------------------------

    else:

        school_data[
            "discovery_count"
        ] = 1

        school_data[
            "status"
        ] = "NEW"

        school_data[
            "enrichment_status"
        ] = "PENDING"

        school_data[
            "enrichment_attempts"
        ] = 0

        school = (
            client
            .table("schools")
            .insert(school_data)
            .execute()
            .data
        )

        if not school:

            raise Exception(
                "School insert returned no data"
            )

        school_id = school[0]["id"]

        print(
            f"NEW SCHOOL: "
            f"{school_name}"
        )

        is_new = True

    # --------------------------------------------------------
    # CONNECT SCHOOL TO THIS DISCOVERY RUN
    # --------------------------------------------------------

    try:

        (
            client
            .table(
                "discovery_run_schools"
            )
            .upsert(
                {
                    "discovery_run_id":
                        run_id,

                    "school_id":
                        school_id,
                },
                on_conflict=(
                    "discovery_run_id,"
                    "school_id"
                )
            )
            .execute()
        )

    except Exception as e:

        print(
            "RUN-SCHOOL LINK FAILED:",
            repr(e)
        )

    return (
        school_id,
        is_new
    )


# ============================================================
# ENRICH SCHOOL
# ============================================================

async def enrich_school(
    client,
    school_id: str
):

    school_result = (
        client
        .table("schools")
        .select("*")
        .eq(
            "id",
            school_id
        )
        .single()
        .execute()
    )

    school = school_result.data

    if not school:
        return

    school_name = school.get(
        "school_name",
        "Unknown school"
    )

    try:

        client.table(
            "schools"
        ).update({

            "enrichment_status":
                "PROCESSING",

            "enrichment_started_at":
                utc_now(),

            "enrichment_attempts": (
                school.get(
                    "enrichment_attempts"
                )
                or 0
            ) + 1,

            "enrichment_error":
                None,

        }).eq(
            "id",
            school_id
        ).execute()

        print(
            f"ENRICHING: "
            f"{school_name}"
        )

        # ----------------------------------------------------
        # CRAWL
        # ----------------------------------------------------

        crawl_result = (
            await safe_crawl(
                school.get(
                    "website"
                )
            )
        )

        # ----------------------------------------------------
        # SCORE
        # ----------------------------------------------------

        try:

            score, priority, signals = (
                score_school(
                    {
                        "website_uri":
                            school.get(
                                "website"
                            ),

                        "national_phone_number":
                            school.get(
                                "phone"
                            ),
                    },

                    crawl_result
                )
            )

        except Exception as e:

            print(
                f"SCORING FAILED: "
                f"{school_name}"
            )

            print(
                repr(e)
            )

            score = (
                school.get(
                    "lead_score"
                )
                or 0
            )

            priority = (
                school.get(
                    "priority"
                )
                or "low"
            )

            signals = []

        # ----------------------------------------------------
        # SCHOOL UPDATE
        # ----------------------------------------------------

        (
            client
            .table("schools")
            .update({

                "lead_score":
                    score,

                "priority":
                    priority,

                "last_enriched_at":
                    utc_now(),

                "enrichment_status":
                    "COMPLETED",

                "enrichment_completed_at":
                    utc_now(),

                "enrichment_error":
                    None,

            })
            .eq(
                "id",
                school_id
            )
            .execute()
        )

        # ----------------------------------------------------
        # CONTACTS
        # ----------------------------------------------------

        for email in crawl_result.get(
            "emails",
            []
        ):

            email = (
                email
                .strip()
                .lower()
            )

            if not email:
                continue

            username = (
                email
                .split("@")[0]
            )

            generic_names = [
                "info",
                "admin",
                "admissions",
                "office",
                "contact",
                "hello",
            ]

            contact_type = (
                "generic"
                if username in generic_names
                else "professional"
            )

            try:

                (
                    client
                    .table(
                        "school_contacts"
                    )
                    .upsert(
                        {
                            "school_id":
                                school_id,

                            "email":
                                email,

                            "contact_type":
                                contact_type,
                        },
                        on_conflict=(
                            "school_id,email"
                        )
                    )
                    .execute()
                )

                # ------------------------------------------------
                # IMPORTANT:
                # Put the best discovered email into
                # schools.email so Distribution can immediately
                # use it.
                # ------------------------------------------------

                current_email = (
                    school.get(
                        "email"
                    )
                )

                if not current_email:

                    (
                        client
                        .table("schools")
                        .update({
                            "email":
                                email
                        })
                        .eq(
                            "id",
                            school_id
                        )
                        .execute()
                    )

                    school["email"] = email

            except Exception as e:

                print(
                    "CONTACT SAVE FAILED:",
                    email,
                    repr(e)
                )

        # ----------------------------------------------------
        # SIGNALS
        # ----------------------------------------------------

        for signal in signals:

            try:

                (
                    client
                    .table(
                        "lead_signals"
                    )
                    .insert({
                        "school_id":
                            school_id,

                        **signal,
                    })
                    .execute()
                )

            except Exception as e:

                print(
                    "SIGNAL SAVE FAILED:",
                    school_id,
                    repr(e)
                )

        print(
            f"ENRICHED: "
            f"{school_name}"
        )

    except Exception as e:

        print(
            f"ENRICHMENT FAILED: "
            f"{school_name}"
        )

        print(
            repr(e)
        )

        try:

            (
                client
                .table("schools")
                .update({

                    "enrichment_status":
                        "FAILED",

                    "enrichment_error":
                        str(e),

                })
                .eq(
                    "id",
                    school_id
                )
                .execute()
            )

        except Exception as update_error:

            print(
                "FAILED STATUS UPDATE ERROR:",
                repr(update_error)
            )


# ============================================================
# DISCOVERY RUN PROCESSOR
# ============================================================

async def process_discovery_run(
    run
):

    client = db()

    run_id = run["id"]

    print("")
    print(
        "========================================"
    )
    print(
        "STARTING DISCOVERY RUN"
    )
    print(run_id)
    print(
        "========================================"
    )

    # --------------------------------------------------------
    # MARK RUNNING
    # --------------------------------------------------------

    (
        client
        .table("discovery_runs")
        .update({
            "status":
                "RUNNING",

            "started_at":
                utc_now(),

        })
        .eq(
            "id",
            run_id
        )
        .eq(
            "status",
            "QUEUED"
        )
        .execute()
    )

    try:

        locations = (
            await location_names_from_ids(
                run.get("state_id"),
                run.get("lga_id"),
                run.get("city_id"),
                run.get("area_id"),
            )
        )

        query = query_for(
            locations,
            run.get(
                "school_type"
            )
            or "private",

            run.get("area"),
        )

        limit = min(
            max(
                int(
                    run.get(
                        "requested_count"
                    )
                    or 20
                ),
                1
            ),
            MAX_DISCOVERY_LIMIT
        )

        print(
            "DISCOVERY QUERY:",
            query
        )

        print(
            "REQUESTED:",
            limit
        )

        # ----------------------------------------------------
        # GOOGLE DISCOVERY
        # ----------------------------------------------------

        raw = await text_search(
            query,
            limit
        )

        places = (
            raw.get(
                "places",
                []
            )
            or []
        )[:limit]

        print(
            "GOOGLE PLACES FOUND:",
            len(places)
        )

        # ----------------------------------------------------
        # SAVE EVERY SCHOOL IMMEDIATELY
        # ----------------------------------------------------

        found_count = 0
        new_count = 0
        updated_count = 0
        failed_count = 0

        for index, place in enumerate(
            places,
            start=1
        ):

            school_name = (
                place
                .get("displayName", {})
                .get(
                    "text",
                    "Unknown school"
                )
            )

            print(
                f"[{index}/{len(places)}] "
                f"SAVING: "
                f"{school_name}"
            )

            try:

                school_id, is_new = (
                    await save_school(
                        client=client,
                        run_id=run_id,
                        state_id=run.get(
                            "state_id"
                        ),
                        lga_id=run.get(
                            "lga_id"
                        ),
                        city_id=run.get(
                            "city_id"
                        ),
                        area_id=run.get(
                            "area_id"
                        ),
                        school_type=(
                            run.get(
                                "school_type"
                            )
                            or "private"
                        ),
                        place=place,
                    )
                )

                found_count += 1

                if is_new:
                    new_count += 1
                else:
                    updated_count += 1

                (
                    client
                    .table(
                        "discovery_runs"
                    )
                    .update({

                        "found_count":
                            found_count,

                        "new_count":
                            new_count,

                        "updated_count":
                            updated_count,

                        "failed_count":
                            failed_count,

                    })
                    .eq(
                        "id",
                        run_id
                    )
                    .execute()
                )

            except Exception as e:

                failed_count += 1

                print(
                    f"SAVE FAILED: "
                    f"{school_name}"
                )

                print(
                    repr(e)
                )

                try:

                    (
                        client
                        .table(
                            "discovery_runs"
                        )
                        .update({

                            "found_count":
                                found_count,

                            "new_count":
                                new_count,

                            "updated_count":
                                updated_count,

                            "failed_count":
                                failed_count,

                        })
                        .eq(
                            "id",
                            run_id
                        )
                        .execute()
                    )

                except Exception as progress_error:

                    print(
                        "PROGRESS UPDATE FAILED:",
                        repr(progress_error)
                    )

        # ----------------------------------------------------
        # FINISH DISCOVERY
        # ----------------------------------------------------

        final_status = (
            "COMPLETED"
            if failed_count == 0
            else "PARTIAL"
        )

        (
            client
            .table(
                "discovery_runs"
            )
            .update({

                "status":
                    final_status,

                "found_count":
                    found_count,

                "new_count":
                    new_count,

                "updated_count":
                    updated_count,

                "failed_count":
                    failed_count,

                "completed_at":
                    utc_now(),

            })
            .eq(
                "id",
                run_id
            )
            .execute()
        )

        print("")

        print(
            f"DISCOVERY COMPLETE: "
            f"{found_count} found | "
            f"{new_count} new | "
            f"{updated_count} updated | "
            f"{failed_count} failed"
        )

    except Exception as e:

        print(
            "DISCOVERY RUN FAILED:",
            repr(e)
        )

        traceback.print_exc()

        try:

            (
                client
                .table(
                    "discovery_runs"
                )
                .update({

                    "status":
                        "FAILED",

                    "error_message":
                        str(e),

                    "completed_at":
                        utc_now(),

                })
                .eq(
                    "id",
                    run_id
                )
                .execute()
            )

        except Exception as update_error:

            print(
                "DISCOVERY FAILURE UPDATE ERROR:",
                repr(update_error)
            )


# ============================================================
# BROADCAST PERSONALIZATION
# ============================================================

def personalize_body(
    body: str,
    school: dict
):

    school_name = (
        school.get(
            "school_name"
        )
        or "School"
    )

    status = (
        school.get(
            "status"
        )
        or "NEW"
    )

    lead = (
        "Yes"
        if school.get("is_lead")
        else "No"
    )

    replacements = {

        "{{school_name}}":
            html.escape(
                school_name
            ),

        "{{status}}":
            html.escape(
                status
            ),

        "{{lead}}":
            lead,

    }

    result = body

    for key, value in replacements.items():

        result = result.replace(
            key,
            value
        )

    return result


# ============================================================
# SEND SINGLE EMAIL
# ============================================================

async def send_mailroom_email(
    email: str,
    subject: str,
    body_html: str,
    sender_name: str,
    idempotency_key: str,
):

    if not mailroom_configured():

        raise Exception(
            "Mailroom is not configured"
        )

    from_address = (
        f"{sender_name} "
        f"<{MAILROOM_FROM_EMAIL}>"
    )

    payload = {

        "from":
            from_address,

        "to":
            [email],

        "subject":
            subject,

        "html":
            body_html,

        "unsubscribe": {
            "list_id": int(MAILROOM_UNSUBSCRIBE_LIST_ID),
        },
    }

    headers = {

        "Authorization":
            f"Bearer {MAILROOM_API_KEY}",

        "Content-Type":
            "application/json",

        "X-Posta-Workspace-Id":
            MAILROOM_WORKSPACE_ID,

        "Idempotency-Key":
            idempotency_key,
    }

    async with httpx.AsyncClient(
        timeout=30
    ) as http:

        response = await http.post(
            f"{MAILROOM_API_URL}/emails/send",
            headers=headers,
            json=payload,
        )

        if response.status_code >= 400:

            raise Exception(
                f"Mailroom {response.status_code}: "
                f"{response.text}"
            )

        return response.json()


# ============================================================
# BROADCAST PROCESSOR
# ============================================================

async def process_broadcast(
    broadcast
):

    client = db()

    broadcast_id = broadcast["id"]

    print("")
    print(
        "========================================"
    )
    print(
        "STARTING BROADCAST"
    )
    print(
        broadcast_id
    )
    print(
        "========================================"
    )

    if not mailroom_configured():

        print(
            "MAILROOM NOT CONFIGURED."
        )

        print(
            "Broadcast remains QUEUED."
        )

        return

    # --------------------------------------------------------
    # MARK SENDING
    # --------------------------------------------------------

    try:

        (
            client
            .table("broadcasts")
            .update({

                "status":
                    "SENDING",

                "started_at":
                    utc_now(),

            })
            .eq(
                "id",
                broadcast_id
            )
            .eq(
                "status",
                "QUEUED"
            )
            .execute()
        )

    except Exception as e:

        print(
            "BROADCAST STATUS ERROR:",
            repr(e)
        )

        return

    # --------------------------------------------------------
    # LOAD RECIPIENTS
    # --------------------------------------------------------

    recipients_result = (
        client
        .table(
            "broadcast_recipients"
        )
        .select(
            """
            id,
            school_id,
            email,
            status,
            attempts
            """
        )
        .eq(
            "broadcast_id",
            broadcast_id
        )
        .eq(
            "status",
            "QUEUED"
        )
        .order(
            "queued_at",
            desc=False
        )
        .limit(
            BROADCAST_BATCH_SIZE
        )
        .execute()
    )

    recipients = (
        recipients_result.data
        or []
    )

    if not recipients:

        print(
            "NO QUEUED RECIPIENTS."
        )

        await finish_broadcast(
            client,
            broadcast_id
        )

        return

    # --------------------------------------------------------
    # --------------------------------------------------------
    # LOAD SCHOOL DATA
    # --------------------------------------------------------

    school_ids = [
        recipient["school_id"]
        for recipient in recipients
    ]

    schools_result = (
        client
        .table("schools")
        .select(
            """
            id,
            school_name,
            email,
            status,
            is_lead,
            email_status
            """
        )
        .in_(
            "id",
            school_ids
        )
        .execute()
    )

    schools = (
        schools_result.data
        or []
    )

    school_map = {
        school["id"]: school
        for school in schools
    }

    broadcast_result = (
        client
        .table("broadcasts")
        .select(
            """
            id,
            subject,
            body_html,
            sender_name
            """
        )
        .eq(
            "id",
            broadcast_id
        )
        .single()
        .execute()
    )

    campaign = broadcast_result.data

    if not campaign:

        print(
            "BROADCAST RECORD NOT FOUND."
        )

        return

    broadcast_result = (
        client
        .table("broadcasts")
        .select(
            """
            id,
            subject,
            body_html,
            sender_name
            """
        )
        .eq(
            "id",
            broadcast_id
        )
        .single()
        .execute()
    )

    campaign = broadcast_result.data

    if not campaign:

        print(
            "BROADCAST RECORD NOT FOUND."
        )

        return

    # --------------------------------------------------------
    # SEND RECIPIENTS
    # --------------------------------------------------------

    sent_this_batch = 0
    failed_this_batch = 0

    for recipient in recipients:

        recipient_id = recipient["id"]

        school = school_map.get(
            recipient["school_id"]
        )

        if not school:

            (
                client
                .table(
                    "broadcast_recipients"
                )
                .update({

                    "status":
                        "FAILED",

                    "error":
                        "School record not found",

                })
                .eq(
                    "id",
                    recipient_id
                )
                .execute()
            )

            failed_this_batch += 1

            continue

        # ----------------------------------------------------
        # DO NOT CONTACT PROTECTION
        # ----------------------------------------------------

        if (
            school.get("status")
            == "DO_NOT_CONTACT"
        ):

            (
                client
                .table(
                    "broadcast_recipients"
                )
                .update({

                    "status":
                        "SKIPPED",

                    "error":
                        "School is marked DO_NOT_CONTACT",

                })
                .eq(
                    "id",
                    recipient_id
                )
                .execute()
            )

            continue

        # ----------------------------------------------------
        # EMAIL SUPPRESSION PROTECTION
        # ----------------------------------------------------

        email_status = (
            school.get(
                "email_status"
            )
            or "ACTIVE"
        )

        if email_status in {
            "UNSUBSCRIBED",
            "SUPPRESSED",
            "BOUNCED",
            "COMPLAINED",
        }:

            (
                client
                .table(
                    "broadcast_recipients"
                )
                .update({

                    "status":
                        "SKIPPED",

                    "error":
                        (
                            f"Email excluded because "
                            f"email_status={email_status}"
                        ),

                })
                .eq(
                    "id",
                    recipient_id
                )
                .execute()
            )

            print(
                f"BROADCAST SKIPPED: "
                f"{recipient['email']} "
                f"({email_status})"
            )

            continue

            (
                client
                .table(
                    "broadcast_recipients"
                )
                .update({

                    "status":
                        "SKIPPED",

                    "error":
                        "School is marked DO_NOT_CONTACT",

                })
                .eq(
                    "id",
                    recipient_id
                )
                .execute()
            )

            continue

        # ----------------------------------------------------
        # MARK SENDING
        # ----------------------------------------------------

        attempts = (
            recipient.get(
                "attempts"
            )
            or 0
        ) + 1

        (
            client
            .table(
                "broadcast_recipients"
            )
            .update({

                "status":
                    "SENDING",

                "attempts":
                    attempts,

            })
            .eq(
                "id",
                recipient_id
            )
            .execute()
        )

        # ----------------------------------------------------
        # PERSONALIZE
        # ----------------------------------------------------

        personalized_html = (
            personalize_body(
                campaign[
                    "body_html"
                ],
                school
            )
        )

        # ----------------------------------------------------
        # SEND
        # ----------------------------------------------------

        try:

            response = (
                await send_mailroom_email(
                    email=recipient[
                        "email"
                    ],

                    subject=campaign[
                        "subject"
                    ],

                    body_html=
                        personalized_html,

                    sender_name=
                        campaign[
                            "sender_name"
                        ],

                    idempotency_key=(
                        f"broadcast:{broadcast_id}:"
                        f"recipient:{recipient_id}"
                    ),
                )
            )

            provider_message_id = (
                response.get("data", {}).get("id")
                or response.get("id")
            )

            (
                client
                .table(
                    "broadcast_recipients"
                )
                .update({

                    "status":
                        "SUBMITTED",

                    "provider_message_id":
                        provider_message_id,

                    "sent_at":
                        utc_now(),

                    "error":
                        None,

                })
                .eq(
                    "id",
                    recipient_id
                )
                .execute()
            )

            sent_this_batch += 1

            print(
                f"BROADCAST SUBMITTED: "
                f"{recipient['email']}"
            )

        except Exception as e:

            error_message = str(e)

            print(
                f"BROADCAST SEND FAILED: "
                f"{recipient['email']}"
            )

            print(
                error_message
            )

            # Retry later if attempts remain.
            if attempts < BROADCAST_MAX_ATTEMPTS:

                (
                    client
                    .table(
                        "broadcast_recipients"
                    )
                    .update({

                        "status":
                            "QUEUED",

                        "error":
                            error_message,

                    })
                    .eq(
                        "id",
                        recipient_id
                    )
                    .execute()
                )

            else:

                (
                    client
                    .table(
                        "broadcast_recipients"
                    )
                    .update({

                        "status":
                            "FAILED",

                        "error":
                            error_message,

                    })
                    .eq(
                        "id",
                        recipient_id
                    )
                    .execute()
                )

                failed_this_batch += 1

        # Small delay protects against
        # aggressive provider throttling.
        await asyncio.sleep(
            0.05
        )

    # --------------------------------------------------------
    # UPDATE CAMPAIGN COUNTERS
    # --------------------------------------------------------

    stats_result = (
        client
        .table(
            "broadcast_recipients"
        )
        .select(
            "status"
        )
        .eq(
            "broadcast_id",
            broadcast_id
        )
        .execute()
    )

    stats = (
        stats_result.data
        or []
    )

    sent_count = sum(
        1
        for row in stats
        if row["status"] == "SUBMITTED"
    )

    failed_count = sum(
        1
        for row in stats
        if row["status"] == "FAILED"
    )

    queued_count = sum(
        1
        for row in stats
        if row["status"] in (
            "QUEUED",
            "SENDING"
        )
    )

    (
        client
        .table("broadcasts")
        .update({

            "sent_count":
                sent_count,

            "failed_count":
                failed_count,

        })
        .eq(
            "id",
            broadcast_id
        )
        .execute()
    )

    print(
        f"BROADCAST BATCH COMPLETE: "
        f"{sent_this_batch} submitted | "
        f"{failed_this_batch} failed | "
        f"{queued_count} remaining"
    )

    # --------------------------------------------------------
    # FINISH IF NOTHING REMAINS
    # --------------------------------------------------------

    if queued_count == 0:

        await finish_broadcast(
            client,
            broadcast_id
        )


# ============================================================
# FINISH BROADCAST
# ============================================================

async def finish_broadcast(
    client,
    broadcast_id: str
):

    result = (
        client
        .table(
            "broadcast_recipients"
        )
        .select(
            "status"
        )
        .eq(
            "broadcast_id",
            broadcast_id
        )
        .execute()
    )

    rows = (
        result.data
        or []
    )

    sent = sum(
        1
        for row in rows
        if row["status"] == "SUBMITTED"
    )

    failed = sum(
        1
        for row in rows
        if row["status"] == "FAILED"
    )

    skipped = sum(
        1
        for row in rows
        if row["status"] == "SKIPPED"
    )

    total = len(rows)

    if failed > 0:

        final_status = (
            "PARTIAL"
            if sent > 0
            else "FAILED"
        )

    elif skipped > 0 and sent > 0:

        final_status = "PARTIAL"

    elif sent == total:

        final_status = "SUBMITTED"

    else:

        final_status = "FAILED"

    (
        client
        .table("broadcasts")
        .update({

            "status":
                final_status,

            "sent_count":
                sent,

            "failed_count":
                failed,

            "completed_at":
                utc_now(),

        })
        .eq(
            "id",
            broadcast_id
        )
        .execute()
    )

    print(
        f"BROADCAST COMPLETE: "
        f"{sent} sent | "
        f"{failed} failed | "
        f"{skipped} skipped"
    )


# ============================================================
# QUEUED BROADCAST WORKER
# ============================================================

async def process_next_broadcast():

    if not mailroom_configured():

        return False

    client = db()

    result = (
        client
        .table("broadcasts")
        .select("*")
        .eq(
            "status",
            "QUEUED"
        )
        .order(
            "created_at",
            desc=False
        )
        .limit(1)
        .execute()
    )

    broadcasts = (
        result.data
        or []
    )

    if not broadcasts:

        return False

    broadcast = broadcasts[0]

    await process_broadcast(
        broadcast
    )

    return True


# ============================================================
# QUEUED DISCOVERY WORKER
# ============================================================

async def process_next_discovery():

    client = db()

    result = (
        client
        .table("discovery_runs")
        .select("*")
        .eq(
            "status",
            "QUEUED"
        )
        .order(
            "created_at",
            desc=False
        )
        .limit(1)
        .execute()
    )

    runs = (
        result.data
        or []
    )

    if not runs:

        return False

    run = runs[0]

    await process_discovery_run(
        run
    )

    return True


# ============================================================
# ENRICHMENT QUEUE
# ============================================================

async def process_enrichment_queue():

    client = db()

    result = (
        client
        .table("schools")
        .select(
            """
            id,
            school_name,
            enrichment_status
            """
        )
        .eq(
            "enrichment_status",
            "PENDING"
        )
        .order(
            "created_at",
            desc=False
        )
        .limit(
            ENRICH_CONCURRENCY
        )
        .execute()
    )

    schools = (
        result.data
        or []
    )

    if not schools:

        return False

    print(
        f"ENRICHMENT QUEUE: "
        f"{len(schools)} schools"
    )

    tasks = []

    for school in schools:

        tasks.append(
            enrich_school(
                client,
                school["id"]
            )
        )

    await asyncio.gather(
        *tasks,
        return_exceptions=True
    )

    return True


# ============================================================
# BACKGROUND WORKER LOOP
# ============================================================

async def worker_loop():

    print("")
    print(
        "========================================"
    )
    print(
        "THEHANDLER WORKER STARTED"
    )
    print(
        "========================================"
    )

    print(
        "Mailroom configured:",
        mailroom_configured()
    )

    while True:

        try:

            # ------------------------------------------------
            # 1. DISCOVERY
            # ------------------------------------------------

            discovery_processed = (
                await process_next_discovery()
            )

            if discovery_processed:

                continue

            # ------------------------------------------------
            # 2. BROADCAST
            # ------------------------------------------------

            broadcast_processed = (
                await process_next_broadcast()
            )

            if broadcast_processed:

                continue

            # ------------------------------------------------
            # 3. ENRICHMENT
            # ------------------------------------------------

            enrichment_processed = (
                await process_enrichment_queue()
            )

            if enrichment_processed:

                continue

        except Exception as e:

            print(
                "WORKER LOOP ERROR:",
                repr(e)
            )

            traceback.print_exc()

            # Important:
            # One temporary Supabase/HTTP/TLS
            # failure must NOT kill the worker.

            await asyncio.sleep(3)

        await asyncio.sleep(
            POLL_INTERVAL_SECONDS
        )


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup_event():

    asyncio.create_task(
        worker_loop()
    )


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "ok": True,

        "worker":
            "running",

        "mailroom_configured":
            mailroom_configured(),
    }


# ============================================================
# QUEUE DISCOVERY
# ============================================================

@app.post("/discover")
async def discover(
    req: DiscoverRequest
):

    if req.limit < 1:

        raise HTTPException(
            status_code=400,
            detail=(
                "limit must be "
                "at least 1"
            )
        )

    if req.limit > MAX_DISCOVERY_LIMIT:

        raise HTTPException(
            status_code=400,
            detail=(
                f"limit cannot exceed "
                f"{MAX_DISCOVERY_LIMIT}"
            )
        )

    try:

        client = db()

        row = (
            client
            .table(
                "discovery_runs"
            )
            .insert({

                "state_id":
                    req.state_id,

                "lga_id":
                    req.lga_id,

                "city_id":
                    req.city_id,

                "area_id":
                    req.area_id,

                "area":
                    req.area,

                "school_type":
                    req.school_type,

                "requested_count":
                    req.limit,

                "status":
                    "QUEUED",

            })
            .execute()
            .data
        )

        if not row:

            raise Exception(
                "Failed to create discovery run"
            )

        run = row[0]

        print(
            "DISCOVERY QUEUED:",
            run["id"]
        )

        return {

            "run_id":
                run["id"],

            "status":
                "QUEUED",

            "message":
                "Discovery queued successfully.",

        }

    except Exception as e:

        print(
            "QUEUE ERROR:",
            repr(e)
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# RUN STATUS
# ============================================================

@app.get("/runs/{run_id}")
async def run_status(
    run_id: str
):

    try:

        client = db()

        result = (
            client
            .table(
                "discovery_runs"
            )
            .select("*")
            .eq(
                "id",
                run_id
            )
            .single()
            .execute()
        )

        if not result.data:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Discovery run "
                    "not found"
                )
            )

        return {
            "run":
                result.data
        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
