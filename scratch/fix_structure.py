with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

print(f"Loaded {len(src)} chars")

# The file ends with:
# ...[modals]...
#       )}        <- this is the settings conditional close (misplaced)
#       )}        <- duplicate / wrong  
#     </>
#   );
# }

# We need to find the insertion point of the modals block
# The modals should be AFTER the settings close ')}'
# and BEFORE the final closing of the JSX fragment

# Current (wrong): 
#   [settings content]
#   </div>
#   [MODALS BLOCK]
#   )}    <- settings close (misplaced - should be before modals)
#   )}    <- extra/wrong
#   </>

# We need to move the two ')}' to be BEFORE the modals block

# Find where the modals start
modals_start_marker = "\r\n      {/* ═══ ROTATE NOW OVERLAY ══════════════════════════════ */}\r\n"
modals_end_marker = "      )}\r\n      )}\r\n    </>\r\n  );\r\n}\r\n"

if modals_start_marker in src and modals_end_marker in src:
    # Extract everything from modals start to where the errant )} sits
    modal_start_idx = src.find(modals_start_marker)
    modal_end_idx = src.find(modals_end_marker)
    
    # The content before modals (including the misplaced settings close)
    before_modals = src[:modal_start_idx]
    modals_content = src[modal_start_idx:modal_end_idx]
    
    print(f"Before modals ends with: {repr(before_modals[-60:])}")
    print(f"Modals end (last 40): {repr(modals_content[-40:])}")
    
    # Before modals should end with the settings block closing
    # i.e.: "         </div>\r\n        </div>\r\n      \r\n"
    # We need to fix by inserting the closing )} where it belongs
    # Strategy: strip any trailing '\r\n      )}\r\n' from before_modals
    # then prepend '      )}\r\n' to modals, then use )\r\n    </>\r\n  );\r\n}\r\n as end
    
    # The correct structure should be:
    #   [settings conditional JSX]
    #   )}  <- closes settings conditional 
    #   [MODALS]
    #   </>
    #   );
    # }
    
    # Check if before_modals already has the settings close
    # Let's look at the 200 chars before modals_start
    print("\n200 chars before modals:")
    print(repr(before_modals[-200:]))
    
    # Check actual end marker content
    print("\nEnd section:")
    print(repr(src[modal_end_idx:modal_end_idx+60]))
else:
    print("Markers not found")
    if modals_start_marker not in src:
        print("Missing: modals_start_marker")
    if modals_end_marker not in src:
        print("Missing: modals_end_marker")
        # Try to find close pattern
        end_idx = src.rfind("    </>\r\n  );\r\n}\r\n")
        print(f"</> close at: {end_idx}")
        if end_idx != -1:
            print(repr(src[end_idx-100:end_idx+30]))
