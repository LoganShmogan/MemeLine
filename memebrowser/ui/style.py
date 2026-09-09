# Matches the Save Point / loganyoung.foo brand: black background, lavender
# accent, Chakra Petch for headings, Figtree for body text, a muted pastel
# palette (gold/lavender/green/blue) shared across both sites for tags/icons.

BG = "#000000"
BG_PANEL = "#111111"
BG_TILE = "#1a1a1a"
FG = "#f5f5f5"
FG_DIM = "#a1a1a1"

ACCENT = "#b791c2"       # lavender -- primary accent, matches "Save Point" wordmark
ACCENT_DIM = "#4a3a52"   # darkened lavender for active/hover backgrounds
GOLD = "#eecc67"
GREEN = "#82c88a"
BLUE = "#699fd5"
ERROR = "#c96a5b"  # muted terracotta -- not from the brand palette, used only for failed/error status

FONT_NAV = ("Chakra Petch", 16, "bold")
FONT_TITLE = ("Chakra Petch", 20, "bold")
FONT_BODY = ("Figtree", 14)
FONT_BODY_BOLD = ("Figtree", 14, "bold")
FONT_BODY_LARGE = ("Figtree", 22)

TILE_SIZE = 200
TOUCH_PAD = 14


def nav_button(parent, text, command, active=False, **kw):
    import tkinter as tk

    return tk.Button(
        parent,
        text=text,
        command=command,
        font=FONT_NAV,
        bg=ACCENT if active else BG_PANEL,
        fg=BG if active else FG,
        activebackground=ACCENT_DIM,
        activeforeground=FG,
        relief="flat",
        bd=0,
        padx=TOUCH_PAD,
        pady=TOUCH_PAD // 2,
        cursor="hand2",
        **kw,
    )
