
import sqlite3
import pandas as pd
import matplotlib.pyplot as plt

# ============================================================
# SHIPTIVITAS - TASK 3: KANBAN FEATURE ANALYTICS
# Feature release date: June 2, 2018
# ============================================================

connection = sqlite3.connect("shiptivity.db")
release_date = pd.Timestamp("2018-06-02")

# ------------------------------------------------------------
# GRAPH 1: DAILY ACTIVE USERS OVER TIME
# ------------------------------------------------------------

daily_users = pd.read_sql_query("""
    SELECT
        date(login_timestamp, 'unixepoch') AS day,
        COUNT(DISTINCT user_id) AS active_users
    FROM login_history
    GROUP BY date(login_timestamp, 'unixepoch')
    ORDER BY day
""", connection)

daily_users["day"] = pd.to_datetime(daily_users["day"])

# Include dates with zero logins
all_dates = pd.date_range(
    daily_users["day"].min(),
    daily_users["day"].max()
)

daily_users = (
    daily_users.set_index("day")
    .reindex(all_dates, fill_value=0)
    .rename_axis("day")
    .reset_index()
)

before = daily_users[daily_users["day"] < release_date]
after = daily_users[daily_users["day"] >= release_date]

avg_before = before["active_users"].mean()
avg_after = after["active_users"].mean()

increase = (
    ((avg_after - avg_before) / avg_before) * 100
    if avg_before > 0 else 0
)

plt.figure(figsize=(13, 6))

plt.plot(
    daily_users["day"],
    daily_users["active_users"],
    color="steelblue",
    linewidth=1.5,
    label="Daily Active Users"
)

plt.axvline(
    release_date,
    color="red",
    linestyle="--",
    linewidth=2,
    label="Kanban Release (June 2, 2018)"
)

plt.axhline(
    avg_before,
    color="orange",
    linestyle=":",
    label=f"Before Average: {avg_before:.2f}"
)

plt.axhline(
    avg_after,
    color="green",
    linestyle=":",
    label=f"After Average: {avg_after:.2f}"
)

plt.title(
    "Daily Active Users Before and After Kanban Release",
    fontsize=15,
    fontweight="bold"
)

plt.xlabel("Date")
plt.ylabel("Number of Active Users")
plt.legend()
plt.grid(alpha=0.2)
plt.tight_layout()

plt.savefig("daily_active_users.png", dpi=200)
plt.close()

# ------------------------------------------------------------
# GRAPH 2: AVERAGE DAILY ACTIVE USERS COMPARISON
# ------------------------------------------------------------

periods = ["Before Release", "After Release"]
averages = [avg_before, avg_after]

plt.figure(figsize=(8, 6))

bars = plt.bar(
    periods,
    averages,
    color=["#e59b40", "#31876d"],
    width=0.5
)

for bar, value in zip(bars, averages):
    plt.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 0.2,
        f"{value:.2f}",
        ha="center",
        fontsize=13,
        fontweight="bold"
    )

plt.title(
    "Average Daily Active Users: Before vs After Release",
    fontsize=14,
    fontweight="bold"
)

plt.ylabel("Average Daily Active Users")
plt.ylim(0, max(averages) * 1.25)
plt.grid(axis="y", alpha=0.2)
plt.tight_layout()

plt.savefig("average_daily_users.png", dpi=200)
plt.close()

# ------------------------------------------------------------
# GRAPH 3: TOP 20 CARDS BY STATUS CHANGES
# ------------------------------------------------------------

card_changes = pd.read_sql_query("""
    SELECT
        cardID AS card_id,
        COUNT(*) AS status_changes
    FROM card_change_history
    WHERE oldStatus IS NOT newStatus
    GROUP BY cardID
    ORDER BY status_changes DESC, card_id ASC
""", connection)

top_cards = card_changes.head(20).sort_values(
    "status_changes",
    ascending=True
)

plt.figure(figsize=(11, 7))

bars = plt.barh(
    top_cards["card_id"].astype(str),
    top_cards["status_changes"],
    color="steelblue"
)

for bar in bars:
    plt.text(
        bar.get_width() + 0.05,
        bar.get_y() + bar.get_height() / 2,
        str(int(bar.get_width())),
        va="center",
        fontsize=10
    )

plt.title(
    "Top 20 Cards by Number of Status Changes",
    fontsize=14,
    fontweight="bold"
)

plt.xlabel("Number of Status Changes")
plt.ylabel("Card ID")
plt.xlim(0, top_cards["status_changes"].max() + 1)
plt.grid(axis="x", alpha=0.2)
plt.tight_layout()

plt.savefig("card_status_changes.png", dpi=200)
plt.close()

# ------------------------------------------------------------
# SUMMARY
# ------------------------------------------------------------

connection.close()

print("\nSHIPTIVITAS - KANBAN FEATURE ANALYTICS")
print("--------------------------------------")
print("Release date: June 2, 2018")
print(f"Average DAU before release: {avg_before:.2f}")
print(f"Average DAU after release:  {avg_after:.2f}")
print(f"DAU increase: {increase:.2f}%")
print(f"Total cards with status changes: {len(card_changes)}")

print("\nGraphs created successfully:")
print("1. daily_active_users.png")
print("2. average_daily_users.png")
print("3. card_status_changes.png")
