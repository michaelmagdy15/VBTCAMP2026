with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

# Current structure at end:
#   ...Log Out button...
#   </div>
#   </div>
#   </div>    <- closes settings div
#   [MODALS BLOCK]
#   )}        <- closes settings conditional '('
#   )}        <- closes outer conditional '('
#   </>
#   );
# }

# Correct structure should be:
#   ...Log Out button...
#   </div>
#   </div>
#   </div>    <- closes settings div
#   )}        <- closes settings conditional
#   )}        <- closes outer conditional
#   [MODALS BLOCK]
#   </>
#   );
# }

modals_start = "\r\n      {/* ═══ ROTATE NOW OVERLAY ══════════════════════════════ */}\r\n"
wrong_end = "      )}\r\n      )}\r\n    </>\r\n  );\r\n}\r\n"

if modals_start in src and wrong_end in src:
    modal_start_idx = src.find(modals_start)
    modal_end_idx = src.find(wrong_end)
    
    # Extract the modals block
    modals_content = src[modal_start_idx:modal_end_idx]
    
    # Build the corrected tail:
    # [before modals] + )} + )} + [modals] + </> + ); + }
    before_modals = src[:modal_start_idx]
    
    new_end = (
        "\r\n"
        "      )}\r\n"        # closes settings conditional
        "      )}\r\n"        # closes outer conditional  
        + modals_content +    # all modals
        "    </>\r\n"
        "  );\r\n"
        "}\r\n"
    )
    
    new_src = before_modals + new_end
    with open('src/App.jsx', 'wb') as f:
        f.write(new_src.encode('utf-8'))
    print(f"[OK] Structure fixed: {len(new_src.encode('utf-8'))} bytes")
    print(f"Last 80 chars: {repr(new_src[-80:])}")
else:
    print("Markers not found")
    print(f"  modals_start: {modals_start in src}")
    print(f"  wrong_end: {wrong_end in src}")
