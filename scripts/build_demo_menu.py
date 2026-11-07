"""Build the fictional customer menu used by the restaurant workflow demo."""

from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "switchflow-bakery-demo-menu.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

W, H = A4
forest = HexColor("#203a2b")
orange = HexColor("#cf6b2d")
cream = HexColor("#fff8e9")
muted = HexColor("#5f6c5b")
line = HexColor("#e1d5b9")

sections = [
    ("COOKIES & BARS", [
        ("Chocolate chip cookies", "Rs 80", "Classic soft-centre cookies"),
        ("Oat raisin cookies", "Rs 70", "Oats, raisins and cinnamon"),
        ("Fudge brownies", "Rs 120", "Rich chocolate squares"),
    ]),
    ("PASTRIES", [
        ("Butter croissants", "Rs 110", "Flaky butter pastry"),
        ("Almond croissants", "Rs 145", "Almond cream and toasted nuts"),
        ("Cinnamon rolls", "Rs 130", "Warm spice and vanilla glaze"),
    ]),
    ("MUFFINS", [
        ("Blueberry muffins", "Rs 100", "Blueberries and lemon zest"),
        ("Banana muffins", "Rs 90", "Banana and brown sugar"),
    ]),
    ("BREADS", [
        ("Sourdough loaves", "Rs 260", "Slow-fermented crusty loaf"),
        ("Garlic focaccia", "Rs 220", "Rosemary, garlic and olive oil"),
    ]),
    ("CAKES", [
        ("Lemon tea cakes", "Rs 180", "Light citrus sponge"),
        ("Mini chocolate cakes", "Rs 240", "Chocolate sponge and ganache"),
    ]),
]

c = canvas.Canvas(str(OUTPUT), pagesize=A4)
c.setTitle("SwitchFlow Bakery - Demo Menu")
c.setAuthor("SwitchFlow")
c.setFillColor(cream)
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(forest)
c.rect(0, H - 190, W, 190, fill=1, stroke=0)
c.setFillColor(HexColor("#e7af67"))
c.roundRect(42, H - 57, 28, 5, 2, fill=1, stroke=0)
c.setFillColor(orange)
c.roundRect(42, H - 67, 19, 5, 2, fill=1, stroke=0)
c.setFillColor(cream)
c.roundRect(42, H - 77, 11, 5, 2, fill=1, stroke=0)
c.setFont("Helvetica-Bold", 14)
c.drawString(81, H - 69, "SwitchFlow Bakery")
c.setFont("Helvetica-Bold", 32)
c.drawString(42, H - 123, "The demo menu")
c.setFont("Helvetica", 11)
c.drawString(43, H - 148, "Fresh bakery favourites for a customer order workflow")
c.setFillColor(HexColor("#e7af67"))
c.setFont("Helvetica-Bold", 8)
c.drawString(43, H - 171, "FICTIONAL MENU  |  PRICES IN INR  |  OWNER CONFIRMS EVERY ORDER")

left_x, right_x = 42, 312
column_width = 239

def section(x, y, heading, items):
    c.setFillColor(orange)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x, y, heading)
    y -= 14
    c.setStrokeColor(line)
    c.line(x, y, x + column_width, y)
    y -= 22
    for name, price, description in items:
        c.setFillColor(forest)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x, y, name)
        c.setFillColor(orange)
        c.setFont("Helvetica-Bold", 10)
        c.drawRightString(x + column_width, y, price)
        c.setFillColor(muted)
        c.setFont("Helvetica", 9)
        c.drawString(x, y - 15, description)
        y -= 48
    return y - 9

y_left = H - 214
for heading, items in (sections[0], sections[2], sections[4]):
    y_left = section(left_x, y_left, heading, items)

y_right = H - 214
for heading, items in (sections[1], sections[3]):
    y_right = section(right_x, y_right, heading, items)

c.setFillColor(forest)
c.roundRect(42, 75, W - 84, 100, 12, fill=1, stroke=0)
c.setFillColor(cream)
c.setFont("Helvetica-Bold", 13)
c.drawString(60, 146, "How to order in the demo")
c.setFont("Helvetica", 10)
c.drawString(60, 125, 'Send: "I want 2 butter croissants" in the connected customer chat.')
c.drawString(60, 108, "Choose any item above. Send one item per message.")
c.drawString(60, 91, "The owner checks availability and accepts or declines before confirmation.")
c.setFillColor(muted)
c.setFont("Helvetica", 8)
c.drawString(42, 49, "Demo data only. Prices are examples; no payment, delivery or supplier purchase is connected.")
c.drawRightString(W - 42, 49, "01 / 01")
c.showPage()
c.save()
print(OUTPUT)
