import httpx
import os

KHAYA_API_KEY = os.getenv("KHAYA_API_KEY")
KHAYA_URL = "https://translation-api.ghananlp.org/v2/translate"

SUPPORTED_LANGUAGES = {
    "eng": "English",
    "twi": "Twi",
    "ewe": "Ewe",
    "gaa": "Ga",
    "fat": "Fante",
    "dag": "Dagbani",
    "gur": "Gurene",
    "kus": "Kusaal"
}

async def translate_text(text: str, target_lang: str) -> str:
    if target_lang == "eng" or not KHAYA_API_KEY:
        return text
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                KHAYA_URL,
                json={"in": text, "lang": f"eng-{target_lang}"},
                headers={"Ocp-Apim-Subscription-Key": KHAYA_API_KEY},
                timeout=10.0
            )
            if response.status_code == 200:
                return response.text.strip('"')
            return text
    except Exception:
        return text
