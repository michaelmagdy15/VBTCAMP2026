import functions_framework
import os
import tempfile
import urllib.request
import json
import openpyxl
from google.cloud import firestore
import firebase_admin
from firebase_admin import credentials, messaging

# Initialize Firebase Admin SDK if not already done
if not firebase_admin._apps:
    firebase_admin.initialize_app()

def send_push_notifications(title, body, target_url):
    db = firestore.Client(project="faa-test-guide-v2", database="db-vbt")
    tokens_ref = db.collection("vbt_push_tokens")
    docs = tokens_ref.stream()
    tokens = [doc.id for doc in docs]
    
    if not tokens:
        print("No registered push tokens found.")
        return 0
        
    success_count = 0
    # Send in chunks of 500
    for i in range(0, len(tokens), 500):
        chunk = tokens[i:i+500]
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data={
                    "url": target_url
                },
                tokens=chunk
            )
            response = messaging.send_multicast(message)
            success_count += response.success_count
            
            # Clean up bad tokens
            if response.failure_count > 0:
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        bad_token = chunk[idx]
                        print(f"Deleting expired token: {bad_token}")
                        try:
                            db.collection("vbt_push_tokens").document(bad_token).delete()
                        except Exception as e:
                            print(f"Error deleting token: {e}")
        except Exception as e:
            print(f"Multicast send failed: {e}. Falling back to individual sends.")
            # Fallback to individual sends
            for t in chunk:
                try:
                    msg = messaging.Message(
                        notification=messaging.Notification(
                            title=title,
                            body=body
                        ),
                        data={
                            "url": target_url
                        },
                        token=t
                    )
                    messaging.send(msg)
                    success_count += 1
                except Exception as token_err:
                    print(f"Individual send failed for token {t}: {token_err}")
                    try:
                        db.collection("vbt_push_tokens").document(t).delete()
                    except:
                        pass
                        
    return success_count

def normalize_winner(val):
    if not val:
        return 'NA'
    val_str = str(val).strip().lower()
    if val_str == 'shakes':
        return 'shakes'
    elif val_str == 'fries':
        return 'fries'
    elif val_str == 'tie':
        return 'tie'
    return 'NA'

@functions_framework.http
def main(request):
    # Enable CORS
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }

    # API key validation
    api_key = request.headers.get('x-api-key')
    expected_key = os.environ.get('API_KEY', 'vbt_secret_camp_2026_key')
    if not api_key or api_key != expected_key:
        return (json.dumps({"status": "error", "message": "Unauthorized"}), 401, headers)

    # Parse request body/args
    request_json = request.get_json(silent=True) or {}
    action = request.args.get('action') or request_json.get('action')

    if action == 'send_push':
        title = request_json.get('title', 'VBT Sports Camp')
        body = request_json.get('body', 'New update!')
        target_url = request_json.get('url', '/')
        
        try:
            sent_count = send_push_notifications(title, body, target_url)
            return (json.dumps({"status": "success", "sent": sent_count}), 200, headers)
        except Exception as e:
            return (json.dumps({"status": "error", "message": str(e)}), 500, headers)


    return (json.dumps({"status": "error", "message": "Google Sheets Sync functionality has been deprecated and removed."}), 400, headers)

@functions_framework.http
def check_service_mode(request):
    """
    Cron job triggered every 15 minutes.
    Checks upcoming services and activates them 2 hours before kickoff.
    """
    if request.method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
        })
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
    
    api_key = request.headers.get('x-api-key')
    expected_key = os.environ.get('API_KEY', 'vbt_secret_camp_2026_key')
    if not api_key or api_key != expected_key:
        return (json.dumps({"status": "error", "message": "Unauthorized"}), 401, headers)

    try:
        db = firestore.Client(project="faa-test-guide-v2", database="db-vbt")
        services_ref = db.collection("vbt_services")
        import datetime
        now = datetime.datetime.now(datetime.timezone.utc)
        two_hours_from_now = now + datetime.timedelta(hours=2)
        
        upcoming_services = services_ref.where("status", "==", "upcoming").stream()
        activated = 0
        for svc in upcoming_services:
            data = svc.to_dict()
            if 'date' in data and data['date']:
                kickoff = data['date']
                if kickoff <= two_hours_from_now:
                    services_ref.document(svc.id).update({"status": "active"})
                    activated += 1
                    
        return (json.dumps({"status": "success", "activated": activated}), 200, headers)
    except Exception as e:
        print(f"Error checking service mode: {e}")
        return (json.dumps({"status": "error", "message": str(e)}), 500, headers)

@functions_framework.http
def reset_service_timeline(request):
    """
    Callable function to globally adjust all subsequent rounds.
    """
    if request.method == 'OPTIONS':
        return ('', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
        })
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
    
    api_key = request.headers.get('x-api-key')
    expected_key = os.environ.get('API_KEY', 'vbt_secret_camp_2026_key')
    if not api_key or api_key != expected_key:
        return (json.dumps({"status": "error", "message": "Unauthorized"}), 401, headers)

    try:
        req_data = request.get_json(silent=True) or {}
        service_id = req_data.get('service_id')
        offset_ms = req_data.get('offset_ms', 0)
        
        if not service_id:
            return (json.dumps({"error": "service_id required"}), 400, headers)
            
        db = firestore.Client(project="faa-test-guide-v2", database="db-vbt")
        svc_ref = db.collection("vbt_services").document(service_id)
        
        svc_doc = svc_ref.get()
        if not svc_doc.exists:
            return (json.dumps({"error": "Service not found"}), 404, headers)
            
        data = svc_doc.to_dict()
        schedule = data.get('schedule', [])
        
        for round in schedule:
            if 'start_time' in round:
                round['start_time'] += offset_ms
                
        svc_ref.update({"schedule": schedule})
        
        # Also log this as an announcement
        db.collection("vbt_camp_announcements").add({
            "eventCode": service_id.split('_')[-1].upper(),
            "message": "Schedule has been updated by the coordinator.",
            "author": "System",
            "type": "system",
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        
        return (json.dumps({"status": "success"}), 200, headers)
    except Exception as e:
        print(f"Error resetting timeline: {e}")
        return (json.dumps({"status": "error", "message": str(e)}), 500, headers)
