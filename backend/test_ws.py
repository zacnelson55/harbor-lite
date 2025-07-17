import websockets
print("websockets version:", websockets.__version__)

import asyncio

async def test():
    try:
        async with websockets.connect(
            "wss://echo.websocket.org",
            extra_headers=[("Test", "Value")]
        ) as ws:
            await ws.send("hello")
            print(await ws.recv())
    except Exception as e:
        print("Error with extra_headers:", e)

    try:
        async with websockets.connect(
            "wss://echo.websocket.org",
            headers=[("Test", "Value")]
        ) as ws:
            await ws.send("hello")
            print(await ws.recv())
    except Exception as e:
        print("Error with headers:", e)

asyncio.run(test())