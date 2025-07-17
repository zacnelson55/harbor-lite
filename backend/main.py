from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
import hmac, hashlib
from pydantic import BaseModel
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import httpx
import asyncio
import websockets
import json
import traceback
from elevenlabs import stream
from elevenlabs.client import ElevenLabs

print("websockets module path:", websockets.__file__)

app = FastAPI()

load_dotenv()

# Load environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")
ELEVENLABS_API_KEY = "sk_ed2ae1d7a7fa8005dda00af0f89e2a46c233ab86804b5dad"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Define the expected structure of the POST data
class WebhookData(BaseModel):
    policy_number: str
    first_name: str
    last_name: str
    transcript: str

@app.post("/webhook/elevenlabs")
async def receive_webhook(data: WebhookData, request: Request):
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature", "")

    # Temporarily comment out the validation if still testing
    # if not validate_hmac(body, signature):
    #     raise HTTPException(status_code=401, detail="Invalid signature")

    # You can now access fields like object attributes (Pydantic magic)
    claim = {
        "policy_number": data.policy_number,
        "first_name": data.first_name,
        "last_name": data.last_name,
        "call_transcript": data.transcript,
    }

    print("Using Supabase URL:", SUPABASE_URL)
    print("Supabase Key starts with:", SUPABASE_KEY[:8])



    supabase.table("claims").insert(claim).execute()
    return {"status": "received"}

@app.get("/claims")
def get_claims():
    return supabase.table("claims").select("*").execute()

@app.websocket("/ws/voice-agent")
async def voice_agent_ws(websocket: WebSocket):
    await websocket.accept()
    elevenlabs = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    transcript = ""
    try:
        while True:
            # Receive text from frontend (user's message)
            data = await websocket.receive_text()
            transcript += data + "\n"
            # Stream TTS audio from ElevenLabs
            audio_stream = elevenlabs.text_to_speech.stream(
                text=data,
                voice_id="JBFqnCBsd6RMkjVDRZzb",  # Replace with your desired voice_id
                model_id="eleven_multilingual_v2"
            )
            for chunk in audio_stream:
                if isinstance(chunk, bytes):
                    await websocket.send_bytes(chunk)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.close(code=1011)
        import traceback; traceback.print_exc()
    # When done, store transcript in Supabase
    claim = {
        "policy_number": "VOICE-AGENT",
        "first_name": "Voice",
        "last_name": "User",
        "call_transcript": transcript,
    }
    supabase.table("claims").insert(claim).execute()

def validate_hmac(body, signature):
    computed = hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, signature.replace("sha256=", ""))
