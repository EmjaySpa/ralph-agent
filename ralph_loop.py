import time
while True:
    try:
        exec(open("agent_ralph_flexible.py").read())
    except Exception as e:
        print("Error running Ralph:", e)
    time.sleep(300)  # 5 minutes
