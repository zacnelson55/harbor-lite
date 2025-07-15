from fastapi import FastAPI, Request, HTTPException
import hmac, hashlib
from pydantic import BaseModel
from supabase import create_client, Client
import os
from dotenv import load_dotenv

app = FastAPI()

load_dotenv()

# Load environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")
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

def validate_hmac(body, signature):
    computed = hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, signature.replace("sha256=", ""))
