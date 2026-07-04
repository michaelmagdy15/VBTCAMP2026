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
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }

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

    try:
        url = "https://docs.google.com/spreadsheets/d/106n37V38hEdy9Mto0kXS4aipAQDNi5uNh7kR9IWrbME/export?format=xlsx"
        
        # Download XLSX to a temp file
        temp_dir = tempfile.gettempdir()
        xlsx_path = os.path.join(temp_dir, "sheet.xlsx")
        
        print("Downloading spreadsheet...")
        urllib.request.urlretrieve(url, xlsx_path)
        print("Download complete.")
        
        # Load workbook
        wb = openpyxl.load_workbook(xlsx_path, data_only=True)
        
        # Mapping logic (exact same as parse_xlsx_to_json.py)
        leader_to_team = {
            "Karine": "S5.1",
            "Marla": "S5.2",
            "Youssef": "S5.3",
            "Jason": "S6.1",
            "Philo": "S6.2",
            "Maria": "S6.3",
            "Karen": "F5.1",
            "Shady": "F5.2",
            "Kirmina": "F5.3",
            "Sherry": "F6.1",
            "Roberto": "F6.2",
            "Gin": "F6.3"
        }
        
        team_details = {
            "S5.1": {"code": "S5.1", "name": "S5.1", "leaders": "Karine Kastour / Maria N.", "side": "Shakes", "grade": 5},
            "S5.2": {"code": "S5.2", "name": "S5.2", "leaders": "Marla Isaac / Mark E.", "side": "Shakes", "grade": 5},
            "S5.3": {"code": "S5.3", "name": "S5.3", "leaders": "Youssef Sadek / Marina A.", "side": "Shakes", "grade": 5},
            "S6.1": {"code": "S6.1", "name": "S6.1", "leaders": "Jason", "side": "Shakes", "grade": 6},
            "S6.2": {"code": "S6.2", "name": "S6.2", "leaders": "Philo Ehab / Mark", "side": "Shakes", "grade": 6},
            "S6.3": {"code": "S6.3", "name": "S6.3", "leaders": "Maria Ehab / John E.", "side": "Shakes", "grade": 6},
            "F5.1": {"code": "F5.1", "name": "F5.1", "leaders": "Karen Tadrous / Madonna H.", "side": "Fries", "grade": 5},
            "F5.2": {"code": "F5.2", "name": "F5.2", "leaders": "Shady Shahir / Mary F.", "side": "Fries", "grade": 5},
            "F5.3": {"code": "F5.3", "name": "F5.3", "leaders": "Kirmina Sadek / John A.", "side": "Fries", "grade": 5},
            "F6.1": {"code": "F6.1", "name": "F6.1", "leaders": "Sherry Wael", "side": "Fries", "grade": 6},
            "F6.2": {"code": "F6.2", "name": "F6.2", "leaders": "Roberto", "side": "Fries", "grade": 6},
            "F6.3": {"code": "F6.3", "name": "F6.3", "leaders": "Ginevra", "side": "Fries", "grade": 6}
        }
        
        game_points = {
            "Big Mac": 30,
            "Cone Memory": 15,
            "Scale": 15,
            "Chubby Bunny": 15,
            "Cheesy Strings": 30,
            "Lift": 15,
            "Bible Whispers": 15,
            "Puzzle": 15,
            "Big Bucket 1": 30,
            "Big Bucket 2": 30,
            "Nadala+ 1": 15,
            "Balloon Darts 1": 15,
            "Golden Snitch 1": 15,
            "Nadala+ 2": 15,
            "Balloon Darts 2": 15,
            "Golden Snitch 2": 15
        }
        
        team_schedules = {}
        team_names = list(team_details.keys())
        
        for team in team_names:
            sheet = wb[team]
            schedule = []
            current_block = None
            for r in range(1, sheet.max_row + 1):
                v_cell = sheet.cell(row=r, column=2).value
                if not v_cell:
                    continue
                v_str = str(v_cell).strip()
                if "Block" in v_str:
                    current_block = v_str
                    continue
                if v_str in ["Time", "END OF BLOCK", "Total Deduction:"]:
                    continue
                    
                time_val = sheet.cell(row=r, column=2).value
                if hasattr(time_val, "strftime"):
                    time_str = time_val.strftime("%I:%M %p")
                else:
                    time_str = str(time_val)
                    
                game_val = sheet.cell(row=r, column=3).value
                loc_val = sheet.cell(row=r, column=5).value
                deduct_val = sheet.cell(row=r, column=6).value
                game_val_extra = sheet.cell(row=r, column=4).value
                
                schedule.append({
                    "block": current_block,
                    "time": time_str,
                    "game": game_val,
                    "gameExtra": game_val_extra,
                    "location": loc_val,
                    "defaultDeduction": deduct_val or 0
                })
            team_schedules[team] = schedule
            
        matchups = []
        gs_sheet = wb["Game Schedule"]
        block_rows = {
            1: range(5, 11),
            2: range(15, 21),
            3: range(25, 27),
            4: range(31, 35)
        }
        block_4_g6_rows = range(37, 41)
        
        def parse_block_1_2(block_num, row_range):
            block_matchups = []
            round_idx = 1
            for r in row_range:
                t_left = gs_sheet.cell(row=r, column=1).value
                if t_left:
                    t_left_str = t_left.strftime("%I:%M %p") if hasattr(t_left, "strftime") else str(t_left)
                    s_team = gs_sheet.cell(row=r, column=2).value
                    f_team = gs_sheet.cell(row=r, column=3).value
                    if s_team and f_team and s_team != "NA" and f_team != "NA":
                        block_matchups.append({
                            "block": block_num,
                            "round": round_idx,
                            "game": "Big Mac" if block_num == 1 else "Cheesy Strings",
                            "time": t_left_str,
                            "shakes": leader_to_team.get(s_team, s_team),
                            "fries": leader_to_team.get(f_team, f_team),
                            "location": "Football Field"
                        })
                    s_team = gs_sheet.cell(row=r, column=4).value
                    f_team = gs_sheet.cell(row=r, column=5).value
                    if s_team and f_team and s_team != "NA" and f_team != "NA":
                        block_matchups.append({
                            "block": block_num,
                            "round": round_idx,
                            "game": "Talk",
                            "time": t_left_str,
                            "shakes": leader_to_team.get(s_team, s_team),
                            "fries": leader_to_team.get(f_team, f_team),
                            "location": "Main Hall"
                        })
                    s_team = gs_sheet.cell(row=r, column=6).value
                    f_team = gs_sheet.cell(row=r, column=7).value
                    if s_team and f_team and s_team != "NA" and f_team != "NA":
                        block_matchups.append({
                            "block": block_num,
                            "round": round_idx,
                            "game": "SPLIT",
                            "time": t_left_str,
                            "shakes": leader_to_team.get(s_team, s_team),
                            "fries": leader_to_team.get(f_team, f_team),
                            "location": "Main Hall / Football Field"
                        })
                t_right = gs_sheet.cell(row=r, column=8).value
                if t_right:
                    t_right_str = t_right.strftime("%I:%M %p") if hasattr(t_right, "strftime") else str(t_right)
                    s_team = gs_sheet.cell(row=r, column=9).value
                    f_team = gs_sheet.cell(row=r, column=10).value
                    if s_team and f_team and s_team != "NA" and f_team != "NA":
                        block_matchups.append({
                            "block": block_num,
                            "round": round_idx,
                            "game": "Cone Memory" if block_num == 1 else "Lift",
                            "time": t_right_str,
                            "shakes": leader_to_team.get(s_team, s_team),
                            "fries": leader_to_team.get(f_team, f_team),
                            "location": "Court" if block_num == 1 else "Terrace"
                        })
                    s_team = gs_sheet.cell(row=r, column=11).value
                    f_team = gs_sheet.cell(row=r, column=12).value
                    if s_team and f_team and s_team != "NA" and f_team != "NA":
                        block_matchups.append({
                            "block": block_num,
                            "round": round_idx,
                            "game": "Scale" if block_num == 1 else "Bible Whispers",
                            "time": t_right_str,
                            "shakes": leader_to_team.get(s_team, s_team),
                            "fries": leader_to_team.get(f_team, f_team),
                            "location": "Terrace" if block_num == 1 else "Pool"
                        })
                    s_team = gs_sheet.cell(row=r, column=13).value
                    f_team = gs_sheet.cell(row=r, column=14).value
                    if s_team and f_team and s_team != "NA" and f_team != "NA":
                        block_matchups.append({
                            "block": block_num,
                            "round": round_idx,
                            "game": "Chubby Bunny" if block_num == 1 else "Puzzle",
                            "time": t_right_str,
                            "shakes": leader_to_team.get(s_team, s_team),
                            "fries": leader_to_team.get(f_team, f_team),
                            "location": "Pool" if block_num == 1 else "Court"
                        })
                round_idx += 1
            return block_matchups
            
        matchups.extend(parse_block_1_2(1, block_rows[1]))
        matchups.extend(parse_block_1_2(2, block_rows[2]))
        
        # Block 3
        round_idx = 1
        for r in block_rows[3]:
            t_left = gs_sheet.cell(row=r, column=1).value
            t_left_str = t_left.strftime("%I:%M %p") if hasattr(t_left, "strftime") else str(t_left)
            
            # 1. Talk 1 (Columns 2/3)
            s_team = gs_sheet.cell(row=r, column=2).value
            f_team = gs_sheet.cell(row=r, column=3).value
            if s_team and f_team and s_team != "NA" and f_team != "NA":
                matchups.append({
                    "block": 3,
                    "round": round_idx,
                    "game": "Talk 1",
                    "time": t_left_str,
                    "shakes": leader_to_team.get(s_team, s_team),
                    "fries": leader_to_team.get(f_team, f_team),
                    "location": "Main Hall"
                })
                
            # 2. Big Bucket 1 (Columns 4/5)
            s_team = gs_sheet.cell(row=r, column=4).value
            f_team = gs_sheet.cell(row=r, column=5).value
            if s_team and f_team and s_team != "NA" and f_team != "NA":
                matchups.append({
                    "block": 3,
                    "round": round_idx,
                    "game": "Big Bucket 1",
                    "time": t_left_str,
                    "shakes": leader_to_team.get(s_team, s_team),
                    "fries": leader_to_team.get(f_team, f_team),
                    "location": "Football Field"
                })
                
            # 3. Split 1 (Columns 6/7)
            s_team = gs_sheet.cell(row=r, column=6).value
            f_team = gs_sheet.cell(row=r, column=7).value
            if s_team and f_team and s_team != "NA" and f_team != "NA":
                matchups.append({
                    "block": 3,
                    "round": round_idx,
                    "game": "Split 1",
                    "time": t_left_str,
                    "shakes": leader_to_team.get(s_team, s_team),
                    "fries": leader_to_team.get(f_team, f_team),
                    "location": "Main Hall / Football Field"
                })
                
            t_right = gs_sheet.cell(row=r, column=8).value
            t_right_str = t_right.strftime("%I:%M %p") if hasattr(t_right, "strftime") else str(t_right)
            
            # 4. Talk 2 (Columns 9/10)
            s_team = gs_sheet.cell(row=r, column=9).value
            f_team = gs_sheet.cell(row=r, column=10).value
            if s_team and f_team and s_team != "NA" and f_team != "NA":
                matchups.append({
                    "block": 3,
                    "round": round_idx,
                    "game": "Talk 2",
                    "time": t_right_str,
                    "shakes": leader_to_team.get(s_team, s_team),
                    "fries": leader_to_team.get(f_team, f_team),
                    "location": "Main Hall"
                })
                
            # 5. Big Bucket 2 (Columns 11/12)
            s_team = gs_sheet.cell(row=r, column=11).value
            f_team = gs_sheet.cell(row=r, column=12).value
            if s_team and f_team and s_team != "NA" and f_team != "NA":
                matchups.append({
                    "block": 3,
                    "round": round_idx,
                    "game": "Big Bucket 2",
                    "time": t_right_str,
                    "shakes": leader_to_team.get(s_team, s_team),
                    "fries": leader_to_team.get(f_team, f_team),
                    "location": "Football Field"
                })
                
            # 6. Split 2 (Columns 13/14)
            s_team = gs_sheet.cell(row=r, column=13).value
            f_team = gs_sheet.cell(row=r, column=14).value
            if s_team and f_team and s_team != "NA" and f_team != "NA":
                matchups.append({
                    "block": 3,
                    "round": round_idx,
                    "game": "Split 2",
                    "time": t_right_str,
                    "shakes": leader_to_team.get(s_team, s_team),
                    "fries": leader_to_team.get(f_team, f_team),
                    "location": "Main Hall / Football Field"
                })
                
            round_idx += 1
            
        def parse_block_4(row_range, is_grade_6):
            suffix = " 2" if is_grade_6 else " 1"
            block_matchups = []
            game_round_counts = {
                "Balloon Darts" + suffix: 1,
                "Golden Snitch" + suffix: 1,
                "Nadala+" + suffix: 1,
                "Talk" + suffix: 1
            }
            for r in row_range:
                t_cell = gs_sheet.cell(row=r, column=4).value
                if not t_cell:
                    continue
                t_str = t_cell.strftime("%I:%M %p") if hasattr(t_cell, "strftime") else str(t_cell)
                
                s_team = gs_sheet.cell(row=r, column=5).value
                f_team = gs_sheet.cell(row=r, column=6).value
                if s_team and f_team and s_team != "NA" and f_team != "NA":
                    g_name = "Balloon Darts" + suffix
                    block_matchups.append({
                        "block": 4,
                        "round": game_round_counts[g_name],
                        "game": g_name,
                        "time": t_str,
                        "shakes": leader_to_team.get(s_team, s_team),
                        "fries": leader_to_team.get(f_team, f_team),
                        "location": "Court"
                    })
                    game_round_counts[g_name] += 1
                    
                s_team = gs_sheet.cell(row=r, column=7).value
                f_team = gs_sheet.cell(row=r, column=8).value
                if s_team and f_team and s_team != "NA" and f_team != "NA":
                    g_name = "Golden Snitch" + suffix
                    block_matchups.append({
                        "block": 4,
                        "round": game_round_counts[g_name],
                        "game": g_name,
                        "time": t_str,
                        "shakes": leader_to_team.get(s_team, s_team),
                        "fries": leader_to_team.get(f_team, f_team),
                        "location": "Football Field"
                    })
                    game_round_counts[g_name] += 1
                    
                s_team = gs_sheet.cell(row=r, column=9).value
                f_team = gs_sheet.cell(row=r, column=10).value
                if s_team and f_team and s_team != "NA" and f_team != "NA":
                    g_name = "Nadala+" + suffix
                    block_matchups.append({
                        "block": 4,
                        "round": game_round_counts[g_name],
                        "game": g_name,
                        "time": t_str,
                        "shakes": leader_to_team.get(s_team, s_team),
                        "fries": leader_to_team.get(f_team, f_team),
                        "location": "Roof"
                    })
                    game_round_counts[g_name] += 1

                s_team = gs_sheet.cell(row=r, column=11).value
                f_team = gs_sheet.cell(row=r, column=12).value
                if s_team and f_team and s_team != "NA" and f_team != "NA":
                    g_name = "Talk" + suffix
                    block_matchups.append({
                        "block": 4,
                        "round": game_round_counts[g_name],
                        "game": g_name,
                        "time": t_str,
                        "shakes": leader_to_team.get(s_team, s_team),
                        "fries": leader_to_team.get(f_team, f_team),
                        "location": "Main Hall"
                    })
                    game_round_counts[g_name] += 1
            return block_matchups
            
        matchups.extend(parse_block_4(block_rows[4], False))
        matchups.extend(parse_block_4(block_4_g6_rows, True))
        
        parsed_data = {
            "teams": team_details,
            "gamePoints": game_points,
            "teamSchedules": team_schedules,
            "matchups": matchups
        }
        
        # Sum deductions per team from the parsed schedule
        team_deductions_from_sheet = {}
        for team, schedule in team_schedules.items():
            total_deduct = 0.0
            for item in schedule:
                try:
                    total_deduct += float(item.get("defaultDeduction", 0))
                except (ValueError, TypeError):
                    pass
            # Capped at 10 max, minimum 0
            team_deductions_from_sheet[team] = int(min(10, max(0, total_deduct)))

        # Save to Firestore in faa-test-guide-v2
        print("Saving parsed data to Firestore...")
        db = firestore.Client(project="faa-test-guide-v2")
        doc_ref = db.collection("vbt_camp").document("schedule_data")
        doc_ref.set(parsed_data)
        print("Schedule data successfully synced in Firestore!")
        
        # Parse winners from "Score Calculator" sheet
        calc_sheet = wb["Score Calculator"]
        block_scores_from_sheet = {}

        # Block 1
        for r in range(1, 7):
            for game, col in [("Big Mac", 3), ("Cone Memory", 4), ("Scale", 5), ("Chubby Bunny", 6)]:
                row = 4 + r
                val = calc_sheet.cell(row=row, column=col).value
                block_scores_from_sheet[f"1_{r}_{game}"] = normalize_winner(val)

        # Block 2
        for r in range(1, 7):
            for game, col in [("Cheesy Strings", 3), ("Lift", 4), ("Bible Whispers", 5), ("Puzzle", 6)]:
                row = 15 + r
                val = calc_sheet.cell(row=row, column=col).value
                block_scores_from_sheet[f"2_{r}_{game}"] = normalize_winner(val)

        # Block 3
        for r in range(1, 3):
            for game, col in [("Big Bucket 1", 4), ("Big Bucket 2", 5)]:
                row = 26 + r
                val = calc_sheet.cell(row=row, column=col).value
                block_scores_from_sheet[f"3_{r}_{game}"] = normalize_winner(val)

        # Block 4
        for r in range(1, 4):
            for game, col in [
                ("Nadala+ 1", 2), ("Balloon Darts 1", 3), ("Golden Snitch 1", 4),
                ("Nadala+ 2", 5), ("Balloon Darts 2", 6), ("Golden Snitch 2", 7)
            ]:
                row = 33 + r
                val = calc_sheet.cell(row=row, column=col).value
                block_scores_from_sheet[f"4_{r}_{game}"] = normalize_winner(val)

        # Parse tokens
        shakes_tokens = 0
        fries_tokens = 0
        try:
            val_shakes = calc_sheet.cell(row=48, column=8).value
            shakes_tokens = int(val_shakes) if val_shakes is not None else 0
        except:
            pass
        try:
            val_fries = calc_sheet.cell(row=48, column=9).value
            fries_tokens = int(val_fries) if val_fries is not None else 0
        except:
            pass

        # Sync to live_scores document
        print("Syncing deductions, block scores, and tokens to live_scores...")
        live_scores_ref = db.collection("vbt_camp").document("live_scores")
        
        live_scores_payload = {
            "teamDeductions": team_deductions_from_sheet,
            "blockScores": block_scores_from_sheet,
            "tokens": {
                "shakes": shakes_tokens,
                "fries": fries_tokens
            }
        }
        
        # Write back to live_scores (merge=True preserves other fields like timeShiftMinutes, isTimerPaused, and appsScriptWebappUrl!)
        live_scores_ref.set(live_scores_payload, merge=True)
        print("Scores, deductions, and tokens successfully synced in live_scores!")
        
        return (json.dumps({"status": "success", "matchups": len(matchups)}), 200, headers)
        
    except Exception as e:
        print(f"Error occurred: {e}")
        return (json.dumps({"status": "error", "message": str(e)}), 500, headers)

@functions_framework.http
def check_service_mode(request):
    """
    Cron job triggered every 15 minutes.
    Checks upcoming services and activates them 2 hours before kickoff.
    """
    if request.method == 'OPTIONS':
        return ('', 204, {'Access-Control-Allow-Origin': '*'})
    headers = {'Access-Control-Allow-Origin': '*'}
    
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
        return ('', 204, {'Access-Control-Allow-Origin': '*'})
    headers = {'Access-Control-Allow-Origin': '*'}
    
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
