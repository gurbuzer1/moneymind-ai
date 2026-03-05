import streamlit as st
import sqlite3
import os
import uuid
import json
from datetime import datetime, date, timedelta
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="MoneyMind AI",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded",
)

DB_PATH = Path(__file__).parent / "moneymind.db"

# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
CATEGORIES = {
    "food": {"name": "Food & Dining", "icon": "🍽️", "color": "#6C63FF"},
    "transport": {"name": "Transportation", "icon": "🚗", "color": "#00D09C"},
    "shopping": {"name": "Shopping", "icon": "🛍️", "color": "#FF6B6B"},
    "entertainment": {"name": "Entertainment", "icon": "🎬", "color": "#FFB020"},
    "bills": {"name": "Bills & Utilities", "icon": "🧾", "color": "#3B82F6"},
    "health": {"name": "Health & Fitness", "icon": "💪", "color": "#EC4899"},
    "education": {"name": "Education", "icon": "🎓", "color": "#8B5CF6"},
    "groceries": {"name": "Groceries", "icon": "🛒", "color": "#F97316"},
    "rent": {"name": "Rent & Housing", "icon": "🏠", "color": "#14B8A6"},
    "insurance": {"name": "Insurance", "icon": "🛡️", "color": "#EF4444"},
    "subscriptions": {"name": "Subscriptions", "icon": "📺", "color": "#06B6D4"},
    "travel": {"name": "Travel", "icon": "✈️", "color": "#84CC16"},
    "gifts": {"name": "Gifts & Donations", "icon": "🎁", "color": "#A855F7"},
    "personal": {"name": "Personal Care", "icon": "💆", "color": "#F43F5E"},
    "pets": {"name": "Pets", "icon": "🐾", "color": "#22D3EE"},
    "investments": {"name": "Investments", "icon": "📈", "color": "#FB923C"},
    "salary": {"name": "Salary", "icon": "💰", "color": "#4ADE80"},
    "other": {"name": "Other", "icon": "📌", "color": "#E879F9"},
}

EXPENSE_CATEGORIES = {k: v for k, v in CATEGORIES.items() if k != "salary"}
INCOME_CATEGORIES = {k: v for k, v in CATEGORIES.items() if k in ["salary", "investments", "gifts", "other"]}


def cat_name(cat_id: str) -> str:
    return CATEGORIES.get(cat_id, CATEGORIES["other"])["name"]


def cat_icon(cat_id: str) -> str:
    return CATEGORIES.get(cat_id, CATEGORIES["other"])["icon"]


def cat_color(cat_id: str) -> str:
    return CATEGORIES.get(cat_id, CATEGORIES["other"])["color"]


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK(type IN ('income','expense')),
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            date TEXT NOT NULL,
            is_recurring INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            monthly_limit REAL NOT NULL,
            month TEXT NOT NULL,
            UNIQUE(category, month)
        );
        CREATE TABLE IF NOT EXISTS savings_goals (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL NOT NULL DEFAULT 0,
            target_date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS user_profile (
            id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL DEFAULT '',
            currency TEXT NOT NULL DEFAULT 'USD',
            monthly_income REAL NOT NULL DEFAULT 0,
            subscription_tier TEXT NOT NULL DEFAULT 'free'
        );
        CREATE TABLE IF NOT EXISTS recurring_bills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL DEFAULT 'bills',
            frequency TEXT NOT NULL DEFAULT 'monthly' CHECK(frequency IN ('weekly','biweekly','monthly','quarterly','yearly')),
            due_day INTEGER NOT NULL DEFAULT 1,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('asset','liability')),
            balance REAL NOT NULL DEFAULT 0,
            icon TEXT NOT NULL DEFAULT '🏦',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS net_worth_snapshots (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            total_assets REAL NOT NULL DEFAULT 0,
            total_liabilities REAL NOT NULL DEFAULT 0,
            net_worth REAL NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS debts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            total_amount REAL NOT NULL,
            remaining_amount REAL NOT NULL,
            interest_rate REAL NOT NULL DEFAULT 0,
            min_payment REAL NOT NULL DEFAULT 0,
            due_day INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """)
    # Ensure default profile
    existing = conn.execute("SELECT id FROM user_profile LIMIT 1").fetchone()
    if not existing:
        conn.execute("INSERT INTO user_profile (id) VALUES ('default')")
    conn.commit()
    conn.close()


init_db()

# ---------------------------------------------------------------------------
# Session state defaults
# ---------------------------------------------------------------------------
if "current_month" not in st.session_state:
    st.session_state.current_month = date.today().strftime("%Y-%m")
if "chat_messages" not in st.session_state:
    st.session_state.chat_messages = []
if "page" not in st.session_state:
    st.session_state.page = "Dashboard"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def get_monthly_transactions(month: str) -> pd.DataFrame:
    conn = get_db()
    df = pd.read_sql_query(
        "SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC",
        conn, params=[f"{month}%"],
    )
    conn.close()
    return df


def get_monthly_summary(month: str) -> dict:
    conn = get_db()
    row = conn.execute(
        """SELECT
            COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expenses
        FROM transactions WHERE date LIKE ?""",
        [f"{month}%"],
    ).fetchone()
    conn.close()
    return {"income": row["income"], "expenses": row["expenses"]}


def get_category_totals(month: str) -> pd.DataFrame:
    conn = get_db()
    df = pd.read_sql_query(
        """SELECT category, SUM(amount) as total
        FROM transactions WHERE date LIKE ? AND type='expense'
        GROUP BY category ORDER BY total DESC""",
        conn, params=[f"{month}%"],
    )
    conn.close()
    return df


def get_profile() -> dict:
    conn = get_db()
    row = conn.execute("SELECT * FROM user_profile LIMIT 1").fetchone()
    conn.close()
    return dict(row) if row else {}


def format_currency(amount: float, currency: str = "USD") -> str:
    return f"${amount:,.2f}"


# ---------------------------------------------------------------------------
# Custom CSS
# ---------------------------------------------------------------------------
st.markdown("""
<style>
    .metric-card {
        background: linear-gradient(135deg, #6C63FF, #8B85FF);
        border-radius: 16px;
        padding: 20px;
        color: white;
        text-align: center;
    }
    .metric-card.expense {
        background: linear-gradient(135deg, #FF6B6B, #FF8E8E);
    }
    .metric-card.savings {
        background: white;
        color: #1A1A2E;
        border: 1px solid #E5E7EB;
    }
    .metric-card h3 {
        margin: 0;
        font-size: 14px;
        opacity: 0.85;
    }
    .metric-card h1 {
        margin: 5px 0 0 0;
        font-size: 28px;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
    }
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Sidebar navigation
# ---------------------------------------------------------------------------
with st.sidebar:
    st.markdown("## 💰 MoneyMind AI")
    st.markdown("---")

    NAV_PAGES = [
        "Dashboard", "Transactions", "AI Chat", "Budget", "Savings",
        "Recurring Bills", "Cash Flow", "Net Worth", "Insights", "Debt Payoff",
        "Profile",
    ]
    page = st.radio(
        "Navigation",
        NAV_PAGES,
        index=NAV_PAGES.index(st.session_state.page) if st.session_state.page in NAV_PAGES else 0,
        label_visibility="collapsed",
    )
    st.session_state.page = page

    st.markdown("---")
    # Month selector
    month_str = st.session_state.current_month
    month_date = datetime.strptime(month_str + "-01", "%Y-%m-%d").date()
    col1, col2, col3 = st.columns([1, 2, 1])
    with col1:
        if st.button("◀", key="prev_month"):
            prev = month_date - timedelta(days=1)
            st.session_state.current_month = prev.strftime("%Y-%m")
            st.rerun()
    with col2:
        st.markdown(f"**{month_date.strftime('%B %Y')}**")
    with col3:
        if month_date.month < date.today().month or month_date.year < date.today().year:
            if st.button("▶", key="next_month"):
                next_m = month_date.replace(day=28) + timedelta(days=4)
                st.session_state.current_month = next_m.strftime("%Y-%m")
                st.rerun()

    st.markdown("---")
    st.caption("v2.0.0 • AI-Powered Finance")


# ═══════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════
if page == "Dashboard":
    st.title("📊 Dashboard")

    month = st.session_state.current_month
    summary = get_monthly_summary(month)
    cat_totals = get_category_totals(month)
    transactions = get_monthly_transactions(month)

    income = summary["income"]
    expenses = summary["expenses"]
    savings = income - expenses
    savings_rate = (savings / income * 100) if income > 0 else 0

    # Summary cards
    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown(f"""
        <div class="metric-card">
            <h3>⬇️ Income</h3>
            <h1>{format_currency(income)}</h1>
        </div>""", unsafe_allow_html=True)
    with c2:
        st.markdown(f"""
        <div class="metric-card expense">
            <h3>⬆️ Expenses</h3>
            <h1>{format_currency(expenses)}</h1>
        </div>""", unsafe_allow_html=True)
    with c3:
        color = "#00D09C" if savings >= 0 else "#FF6B6B"
        st.markdown(f"""
        <div class="metric-card savings">
            <h3>Net Savings ({savings_rate:.0f}%)</h3>
            <h1 style="color:{color}">{format_currency(savings)}</h1>
        </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Charts
    col_chart, col_list = st.columns([3, 2])

    with col_chart:
        st.subheader("Spending Breakdown")
        if not cat_totals.empty:
            cat_totals["name"] = cat_totals["category"].apply(cat_name)
            cat_totals["color"] = cat_totals["category"].apply(cat_color)

            fig = px.pie(
                cat_totals,
                values="total",
                names="name",
                color="name",
                color_discrete_map={row["name"]: row["color"] for _, row in cat_totals.iterrows()},
                hole=0.5,
            )
            fig.update_layout(
                margin=dict(t=0, b=0, l=0, r=0),
                height=350,
                showlegend=True,
                legend=dict(orientation="h", y=-0.1),
            )
            fig.update_traces(textposition="inside", textinfo="percent+label")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No expenses this month. Add transactions to see your spending breakdown.")

    with col_list:
        st.subheader("Recent Transactions")
        if not transactions.empty:
            for _, row in transactions.head(8).iterrows():
                icon = cat_icon(row["category"])
                sign = "+" if row["type"] == "income" else "-"
                color = "#00D09C" if row["type"] == "income" else "#FF6B6B"
                desc = row["description"] or cat_name(row["category"])
                st.markdown(
                    f"{icon} **{desc}** &nbsp; "
                    f"<span style='color:{color};font-weight:600'>{sign}{format_currency(row['amount'])}</span> "
                    f"&nbsp; <small style='color:#9CA3AF'>{row['date']}</small>",
                    unsafe_allow_html=True,
                )
                st.markdown("<hr style='margin:4px 0;border:none;border-top:1px solid #F0F0F0'>", unsafe_allow_html=True)
        else:
            st.info("No transactions yet.")


# ═══════════════════════════════════════════════════════════════════════════
# TRANSACTIONS
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Transactions":
    st.title("💳 Transactions")

    # --- View toggle: Monthly vs Yearly ---
    view_mode = st.radio(
        "View",
        ["Monthly", "Yearly"],
        horizontal=True,
        key="txn_view_mode",
    )

    if view_mode == "Yearly":
        current_year = int(st.session_state.current_month[:4])
        year_options = list(range(date.today().year, date.today().year - 5, -1))
        selected_year = st.selectbox("Year", year_options, index=year_options.index(current_year) if current_year in year_options else 0)
        date_filter = f"{selected_year}"
    else:
        date_filter = st.session_state.current_month

    # --- Input method tabs ---
    st.markdown("### Add Data")
    input_tab1, input_tab2, input_tab3 = st.tabs([
        "✏️ Quick Summary",
        "📝 Single Transaction",
        "📂 Import File",
    ])

    # ---- TAB 1: Quick Summary (bulk monthly/yearly income vs expense) ----
    with input_tab1:
        st.markdown(
            "<p style='color:#6B7280;margin-bottom:16px'>"
            "Quickly log your total income and expenses for a period — no need to itemize every transaction."
            "</p>",
            unsafe_allow_html=True,
        )
        with st.form("quick_summary_form", clear_on_submit=True):
            qs_period = st.radio("Period type", ["Single Month", "Full Year"], horizontal=True, key="qs_period")

            if qs_period == "Single Month":
                qs_col1, qs_col2 = st.columns(2)
                with qs_col1:
                    qs_year = st.selectbox("Year", list(range(date.today().year, date.today().year - 5, -1)), key="qs_year")
                with qs_col2:
                    qs_month_names = ["January", "February", "March", "April", "May", "June",
                                      "July", "August", "September", "October", "November", "December"]
                    qs_month = st.selectbox("Month", qs_month_names, index=date.today().month - 1, key="qs_month")
            else:
                qs_year = st.selectbox("Year", list(range(date.today().year, date.today().year - 5, -1)), key="qs_year_full")

            qs_col_a, qs_col_b = st.columns(2)
            with qs_col_a:
                qs_income = st.number_input("💰 Total Income", min_value=0.0, step=100.0, format="%.2f", key="qs_income")
            with qs_col_b:
                qs_expense = st.number_input("💸 Total Expenses", min_value=0.0, step=100.0, format="%.2f", key="qs_expense")

            # Optional: let user split expenses into categories
            qs_split = st.checkbox("Split expenses by category", key="qs_split")
            qs_category_amounts = {}
            if qs_split:
                st.markdown("*Enter amounts for each category (leave 0 to skip):*")
                qs_cat_cols = st.columns(3)
                for idx, (cat_id, cat_info) in enumerate(EXPENSE_CATEGORIES.items()):
                    with qs_cat_cols[idx % 3]:
                        amt = st.number_input(
                            f"{cat_info['icon']} {cat_info['name']}",
                            min_value=0.0, step=10.0, format="%.2f",
                            key=f"qs_cat_{cat_id}",
                        )
                        if amt > 0:
                            qs_category_amounts[cat_id] = amt

            if st.form_submit_button("💾 Save Summary", type="primary"):
                conn = get_db()
                saved = 0

                if qs_period == "Single Month":
                    month_num = qs_month_names.index(qs_month) + 1
                    months_to_save = [f"{qs_year}-{month_num:02d}"]
                else:
                    months_to_save = [f"{qs_year}-{m:02d}" for m in range(1, 13)]

                for m in months_to_save:
                    target_date = f"{m}-15"

                    # Income entry
                    inc_amt = qs_income if qs_period == "Single Month" else round(qs_income / 12, 2)
                    if inc_amt > 0:
                        conn.execute(
                            "INSERT INTO transactions (id,type,amount,category,description,date,is_recurring) VALUES (?,?,?,?,?,?,?)",
                            [str(uuid.uuid4()), "income", inc_amt, "salary", f"Summary income ({m})", target_date, 0],
                        )
                        saved += 1

                    # Expense entries
                    if qs_split and qs_category_amounts:
                        for cat_id, cat_amt in qs_category_amounts.items():
                            entry_amt = cat_amt if qs_period == "Single Month" else round(cat_amt / 12, 2)
                            if entry_amt > 0:
                                conn.execute(
                                    "INSERT INTO transactions (id,type,amount,category,description,date,is_recurring) VALUES (?,?,?,?,?,?,?)",
                                    [str(uuid.uuid4()), "expense", entry_amt, cat_id, f"Summary expense ({m})", target_date, 0],
                                )
                                saved += 1
                    else:
                        exp_amt = qs_expense if qs_period == "Single Month" else round(qs_expense / 12, 2)
                        if exp_amt > 0:
                            conn.execute(
                                "INSERT INTO transactions (id,type,amount,category,description,date,is_recurring) VALUES (?,?,?,?,?,?,?)",
                                [str(uuid.uuid4()), "expense", exp_amt, "other", f"Summary expense ({m})", target_date, 0],
                            )
                            saved += 1

                conn.commit()
                conn.close()
                st.success(f"Saved {saved} entries!")
                st.rerun()

    # ---- TAB 2: Single transaction (original form) ----
    with input_tab2:
        with st.form("add_transaction", clear_on_submit=True):
            col1, col2 = st.columns(2)
            with col1:
                txn_type = st.selectbox("Type", ["expense", "income"])
            with col2:
                amount = st.number_input("Amount", min_value=0.01, step=0.01, format="%.2f")

            cats = EXPENSE_CATEGORIES if txn_type == "expense" else INCOME_CATEGORIES
            cat_options = {f"{v['icon']} {v['name']}": k for k, v in cats.items()}
            selected_cat = st.selectbox("Category", list(cat_options.keys()))
            category = cat_options[selected_cat]

            col3, col4 = st.columns(2)
            with col3:
                txn_date = st.date_input("Date", value=date.today(), max_value=date.today())
            with col4:
                description = st.text_input("Description (optional)")

            is_recurring = st.checkbox("Recurring transaction")

            if st.form_submit_button("Save Transaction", type="primary"):
                conn = get_db()
                conn.execute(
                    "INSERT INTO transactions (id,type,amount,category,description,date,is_recurring) VALUES (?,?,?,?,?,?,?)",
                    [str(uuid.uuid4()), txn_type, amount, category, description, txn_date.isoformat(), int(is_recurring)],
                )
                conn.commit()
                conn.close()
                st.success("Transaction saved!")
                st.rerun()

    # ---- TAB 3: File import (CSV / Excel) ----
    with input_tab3:
        st.markdown(
            "<p style='color:#6B7280;margin-bottom:8px'>"
            "Upload a bank export or spreadsheet. We'll map the columns and import your transactions."
            "</p>",
            unsafe_allow_html=True,
        )
        uploaded_file = st.file_uploader(
            "Drop your file here",
            type=["csv", "xlsx", "xls"],
            key="txn_file_upload",
        )
        if uploaded_file is not None:
            try:
                if uploaded_file.name.endswith((".xlsx", ".xls")):
                    raw_df = pd.read_excel(uploaded_file)
                else:
                    raw_df = pd.read_csv(uploaded_file)

                st.markdown(f"**Preview** — {len(raw_df)} rows detected")
                st.dataframe(raw_df.head(10), use_container_width=True)

                st.markdown("#### Map your columns")
                cols_list = ["-- not mapped --"] + list(raw_df.columns)

                map_col1, map_col2 = st.columns(2)
                with map_col1:
                    date_col = st.selectbox("Date column", cols_list, key="map_date")
                    amount_col = st.selectbox("Amount column", cols_list, key="map_amount")
                    desc_col = st.selectbox("Description column", cols_list, key="map_desc")
                with map_col2:
                    type_col = st.selectbox(
                        "Type column (income/expense)",
                        cols_list,
                        help="If not mapped, positive amounts → income, negative → expense",
                        key="map_type",
                    )
                    category_col = st.selectbox(
                        "Category column",
                        cols_list,
                        help="If not mapped, all will be set to 'Other'",
                        key="map_category",
                    )

                # Known category mapping (fuzzy match common bank labels)
                CATEGORY_KEYWORDS = {
                    "food": ["food", "restaurant", "dining", "cafe", "coffee", "lunch", "dinner", "breakfast", "mcdonald", "starbucks", "uber eats", "doordash"],
                    "transport": ["transport", "uber", "lyft", "taxi", "gas", "fuel", "parking", "toll", "transit", "metro", "bus"],
                    "shopping": ["shopping", "amazon", "walmart", "target", "store", "retail", "mall", "clothing", "apparel"],
                    "entertainment": ["entertainment", "netflix", "spotify", "movie", "cinema", "game", "hulu", "disney"],
                    "bills": ["bill", "utility", "electric", "water", "phone", "internet", "cable", "mobile"],
                    "health": ["health", "medical", "doctor", "pharmacy", "gym", "fitness", "hospital", "dental"],
                    "education": ["education", "school", "university", "course", "tuition", "book", "udemy"],
                    "groceries": ["grocery", "groceries", "supermarket", "whole foods", "costco", "trader joe"],
                    "rent": ["rent", "mortgage", "housing", "lease", "apartment"],
                    "insurance": ["insurance", "premium", "policy"],
                    "subscriptions": ["subscription", "membership", "monthly fee", "annual fee"],
                    "travel": ["travel", "hotel", "flight", "airline", "airbnb", "booking", "vacation"],
                    "gifts": ["gift", "donation", "charity", "tip"],
                    "personal": ["personal", "salon", "barber", "spa", "beauty"],
                    "pets": ["pet", "vet", "veterinary", "animal"],
                    "investments": ["investment", "stock", "dividend", "interest", "brokerage", "401k", "ira"],
                    "salary": ["salary", "payroll", "wage", "deposit", "direct deposit", "income", "paycheck"],
                }

                def guess_category(text: str) -> str:
                    if not isinstance(text, str):
                        return "other"
                    text_lower = text.lower()
                    for cat_id, keywords in CATEGORY_KEYWORDS.items():
                        for kw in keywords:
                            if kw in text_lower:
                                return cat_id
                    return "other"

                if st.button("🚀 Import Transactions", type="primary", key="import_btn"):
                    if date_col == "-- not mapped --" or amount_col == "-- not mapped --":
                        st.error("Please map at least the Date and Amount columns.")
                    else:
                        conn = get_db()
                        imported = 0
                        skipped = 0

                        for _, row in raw_df.iterrows():
                            try:
                                # Parse date
                                raw_date = row[date_col]
                                if isinstance(raw_date, str):
                                    for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%m-%d-%Y", "%d-%m-%Y"]:
                                        try:
                                            parsed_date = datetime.strptime(raw_date, fmt).date()
                                            break
                                        except ValueError:
                                            continue
                                    else:
                                        parsed_date = pd.to_datetime(raw_date).date()
                                else:
                                    parsed_date = pd.to_datetime(raw_date).date()

                                # Parse amount
                                raw_amount = row[amount_col]
                                if isinstance(raw_amount, str):
                                    raw_amount = float(raw_amount.replace(",", "").replace("$", "").replace("€", "").replace("£", "").strip())
                                else:
                                    raw_amount = float(raw_amount)

                                # Determine type
                                if type_col != "-- not mapped --":
                                    raw_type = str(row[type_col]).lower().strip()
                                    txn_type = "income" if raw_type in ["income", "credit", "cr", "deposit", "in"] else "expense"
                                else:
                                    txn_type = "income" if raw_amount > 0 else "expense"

                                final_amount = abs(raw_amount)
                                if final_amount == 0:
                                    skipped += 1
                                    continue

                                # Determine category
                                if category_col != "-- not mapped --":
                                    raw_cat = str(row[category_col]).lower().strip()
                                    cat = raw_cat if raw_cat in CATEGORIES else guess_category(raw_cat)
                                elif desc_col != "-- not mapped --":
                                    cat = guess_category(str(row[desc_col]))
                                else:
                                    cat = "salary" if txn_type == "income" else "other"

                                # Description
                                desc_text = str(row[desc_col]) if desc_col != "-- not mapped --" and pd.notna(row[desc_col]) else ""

                                conn.execute(
                                    "INSERT INTO transactions (id,type,amount,category,description,date,is_recurring) VALUES (?,?,?,?,?,?,?)",
                                    [str(uuid.uuid4()), txn_type, final_amount, cat, desc_text, parsed_date.isoformat(), 0],
                                )
                                imported += 1
                            except Exception:
                                skipped += 1

                        conn.commit()
                        conn.close()

                        if imported > 0:
                            st.success(f"Successfully imported {imported} transactions!" + (f" ({skipped} rows skipped)" if skipped else ""))
                        else:
                            st.error(f"No transactions imported. {skipped} rows could not be parsed. Check your column mapping.")
                        st.rerun()

            except Exception as e:
                st.error(f"Could not read file: {str(e)}")

    # --- Transaction list ---
    st.markdown("---")
    st.markdown("### Transaction History")

    if view_mode == "Yearly":
        conn = get_db()
        transactions = pd.read_sql_query(
            "SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC",
            conn, params=[f"{selected_year}%"],
        )
        conn.close()
    else:
        month = st.session_state.current_month
        transactions = get_monthly_transactions(month)

    if not transactions.empty:
        # Summary bar for the current view
        total_inc = transactions[transactions["type"] == "income"]["amount"].sum()
        total_exp = transactions[transactions["type"] == "expense"]["amount"].sum()
        net = total_inc - total_exp

        sc1, sc2, sc3, sc4 = st.columns(4)
        sc1.metric("Transactions", f"{len(transactions)}")
        sc2.metric("Income", format_currency(total_inc))
        sc3.metric("Expenses", format_currency(total_exp))
        net_color = "normal" if net >= 0 else "inverse"
        sc4.metric("Net", format_currency(net), delta=f"{'+' if net >= 0 else ''}{format_currency(net)}", delta_color=net_color)

        # Yearly view: show monthly breakdown chart
        if view_mode == "Yearly" and len(transactions) > 0:
            transactions["month"] = transactions["date"].str[:7]
            monthly_agg = transactions.groupby(["month", "type"])["amount"].sum().reset_index()
            monthly_pivot = monthly_agg.pivot(index="month", columns="type", values="amount").fillna(0).reset_index()

            fig_bar = go.Figure()
            if "income" in monthly_pivot.columns:
                fig_bar.add_trace(go.Bar(
                    x=monthly_pivot["month"], y=monthly_pivot["income"],
                    name="Income", marker_color="#6C63FF",
                ))
            if "expense" in monthly_pivot.columns:
                fig_bar.add_trace(go.Bar(
                    x=monthly_pivot["month"], y=monthly_pivot["expense"],
                    name="Expenses", marker_color="#FF6B6B",
                ))
            fig_bar.update_layout(
                barmode="group", height=300,
                margin=dict(t=10, b=40, l=40, r=10),
                legend=dict(orientation="h", y=1.1),
                xaxis_title="", yaxis_title="Amount ($)",
            )
            st.plotly_chart(fig_bar, use_container_width=True)
            # Remove temp column before display
            transactions = transactions.drop(columns=["month"], errors="ignore")

        # Category filter
        active_cats = transactions["category"].unique().tolist()
        filter_options = ["All"] + [f"{cat_icon(c)} {cat_name(c)}" for c in active_cats]
        selected_filter = st.selectbox("Filter by category", filter_options, label_visibility="collapsed")

        if selected_filter != "All":
            for c in active_cats:
                if f"{cat_icon(c)} {cat_name(c)}" == selected_filter:
                    transactions = transactions[transactions["category"] == c]
                    break

        # Transaction rows
        for _, row in transactions.iterrows():
            icon = cat_icon(row["category"])
            sign = "+" if row["type"] == "income" else "-"
            color = "#00D09C" if row["type"] == "income" else "#FF6B6B"
            desc = row["description"] or cat_name(row["category"])

            col1, col2, col3, col4 = st.columns([0.5, 3, 2, 0.5])
            with col1:
                st.markdown(f"<span style='font-size:24px'>{icon}</span>", unsafe_allow_html=True)
            with col2:
                st.markdown(f"**{desc}**<br><small style='color:#9CA3AF'>{row['date']}</small>", unsafe_allow_html=True)
            with col3:
                st.markdown(
                    f"<span style='color:{color};font-weight:700;font-size:18px'>{sign}{format_currency(row['amount'])}</span>",
                    unsafe_allow_html=True,
                )
            with col4:
                if st.button("🗑️", key=f"del_{row['id']}"):
                    conn = get_db()
                    conn.execute("DELETE FROM transactions WHERE id=?", [row["id"]])
                    conn.commit()
                    conn.close()
                    st.rerun()
            st.divider()

        # Export CSV
        st.markdown("---")
        csv_data = transactions.to_csv(index=False)
        label_period = date_filter if view_mode == "Monthly" else str(selected_year)
        st.download_button(
            "📥 Export to CSV",
            csv_data,
            f"moneymind-{label_period}.csv",
            "text/csv",
        )
    else:
        period_label = f"in {selected_year}" if view_mode == "Yearly" else "this month"
        st.info(f"No transactions {period_label}. Use the tabs above to add data.")


# ═══════════════════════════════════════════════════════════════════════════
# AI CHAT
# ═══════════════════════════════════════════════════════════════════════════
elif page == "AI Chat":
    st.title("🤖 MoneyMind AI Chat")

    api_key = os.environ.get("ANTHROPIC_API_KEY", "") or st.session_state.get("api_key", "")

    if not api_key:
        st.info("Enter your Anthropic API key to start chatting with MoneyMind AI.")
        key_input = st.text_input("Anthropic API Key", type="password")
        if key_input:
            st.session_state.api_key = key_input
            st.rerun()
    else:
        # Build financial context
        month = st.session_state.current_month
        summary = get_monthly_summary(month)
        cat_totals = get_category_totals(month)
        profile = get_profile()

        context_lines = [
            f"Monthly Income: ${summary['income']:.2f}",
            f"Monthly Expenses: ${summary['expenses']:.2f}",
            f"Savings Rate: {((summary['income']-summary['expenses'])/summary['income']*100) if summary['income']>0 else 0:.1f}%",
        ]
        if not cat_totals.empty:
            context_lines.append("Top Spending Categories:")
            for _, r in cat_totals.head(5).iterrows():
                pct = (r["total"] / summary["expenses"] * 100) if summary["expenses"] > 0 else 0
                context_lines.append(f"  - {cat_name(r['category'])}: ${r['total']:.2f} ({pct:.0f}%)")

        financial_context = "\n".join(context_lines)

        system_prompt = f"""You are MoneyMind AI, a friendly personal financial advisor for working professionals (ages 25-40).
You help users manage money better with spending analysis, budget suggestions, and savings strategies.
Be concise, use bullet points for advice, celebrate wins, and gently highlight improvements.
Never recommend specific stocks. Use encouraging language.

--- User's Financial Snapshot ---
{financial_context}"""

        # Display chat
        for msg in st.session_state.chat_messages:
            with st.chat_message(msg["role"]):
                st.markdown(msg["content"])

        # Suggestions if no messages
        if not st.session_state.chat_messages:
            st.markdown("**Try asking:**")
            suggestions = [
                "How am I spending this month?",
                "Where can I cut costs?",
                "Help me make a budget",
            ]
            cols = st.columns(3)
            for i, s in enumerate(suggestions):
                with cols[i]:
                    if st.button(s, key=f"suggest_{i}"):
                        st.session_state.chat_messages.append({"role": "user", "content": s})
                        st.rerun()

        # Chat input
        if prompt := st.chat_input("Ask about your finances..."):
            st.session_state.chat_messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)

            with st.chat_message("assistant"):
                with st.spinner("MoneyMind is thinking..."):
                    try:
                        import anthropic
                        client = anthropic.Anthropic(api_key=api_key)
                        messages = [{"role": m["role"], "content": m["content"]} for m in st.session_state.chat_messages[-10:]]
                        response = client.messages.create(
                            model="claude-sonnet-4-5-20250514",
                            max_tokens=1024,
                            system=system_prompt,
                            messages=messages,
                        )
                        reply = response.content[0].text
                    except Exception as e:
                        reply = f"Sorry, I encountered an error: {str(e)}"

                st.markdown(reply)
                st.session_state.chat_messages.append({"role": "assistant", "content": reply})

        # Clear chat button
        if st.session_state.chat_messages:
            if st.button("🗑️ Clear Chat"):
                st.session_state.chat_messages = []
                st.rerun()


# ═══════════════════════════════════════════════════════════════════════════
# BUDGET
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Budget":
    st.title("📊 Budget Planner")

    month = st.session_state.current_month
    cat_totals = get_category_totals(month)
    spent_map = {}
    if not cat_totals.empty:
        spent_map = dict(zip(cat_totals["category"], cat_totals["total"]))

    # Add budget
    with st.expander("➕ Set Budget", expanded=False):
        with st.form("add_budget", clear_on_submit=True):
            cat_options = {f"{v['icon']} {v['name']}": k for k, v in EXPENSE_CATEGORIES.items()}
            selected = st.selectbox("Category", list(cat_options.keys()))
            category = cat_options[selected]
            limit_val = st.number_input("Monthly Limit", min_value=1.0, step=50.0, format="%.2f")

            if st.form_submit_button("Save Budget", type="primary"):
                conn = get_db()
                bid = str(uuid.uuid4())
                conn.execute(
                    """INSERT INTO budgets (id,category,monthly_limit,month) VALUES (?,?,?,?)
                    ON CONFLICT(category,month) DO UPDATE SET monthly_limit=excluded.monthly_limit""",
                    [bid, category, limit_val, month],
                )
                conn.commit()
                conn.close()
                st.success("Budget saved!")
                st.rerun()

    # Display budgets
    conn = get_db()
    budgets = conn.execute("SELECT * FROM budgets WHERE month=?", [month]).fetchall()
    conn.close()

    if budgets:
        for b in budgets:
            cat_id = b["category"]
            limit_amt = b["monthly_limit"]
            spent = spent_map.get(cat_id, 0)
            pct = min(spent / limit_amt, 1.0) if limit_amt > 0 else 0
            remaining = limit_amt - spent

            icon = cat_icon(cat_id)
            name = cat_name(cat_id)

            if pct >= 1:
                bar_color = "#FF6B6B"
                status = "🔴 Over budget!"
            elif pct >= 0.8:
                bar_color = "#FFB020"
                status = "🟡 Almost there"
            else:
                bar_color = "#00D09C"
                status = "🟢 On track"

            col1, col2, col3 = st.columns([3, 1, 0.5])
            with col1:
                st.markdown(f"{icon} **{name}** &nbsp; {status}")
                st.progress(pct)
                st.caption(f"{format_currency(spent)} / {format_currency(limit_amt)} ({pct*100:.0f}%)")
            with col2:
                if remaining > 0:
                    st.metric("Remaining", format_currency(remaining))
                else:
                    st.metric("Over by", format_currency(abs(remaining)), delta=f"-{format_currency(abs(remaining))}", delta_color="inverse")
            with col3:
                if st.button("🗑️", key=f"del_budget_{b['id']}"):
                    conn = get_db()
                    conn.execute("DELETE FROM budgets WHERE id=?", [b["id"]])
                    conn.commit()
                    conn.close()
                    st.rerun()
            st.divider()
    else:
        st.info("No budgets set. Click '➕ Set Budget' above to create spending limits.")


# ═══════════════════════════════════════════════════════════════════════════
# SAVINGS
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Savings":
    st.title("🎯 Savings Goals")

    # Add goal
    with st.expander("➕ New Savings Goal", expanded=False):
        with st.form("add_goal", clear_on_submit=True):
            goal_name = st.text_input("Goal Name", placeholder="e.g. Emergency Fund")
            col1, col2 = st.columns(2)
            with col1:
                target_amt = st.number_input("Target Amount", min_value=1.0, step=100.0, format="%.2f")
            with col2:
                target_date = st.date_input("Target Date", value=date.today() + timedelta(days=90))

            if st.form_submit_button("Create Goal", type="primary"):
                if goal_name:
                    conn = get_db()
                    conn.execute(
                        "INSERT INTO savings_goals (id,name,target_amount,current_amount,target_date) VALUES (?,?,?,0,?)",
                        [str(uuid.uuid4()), goal_name, target_amt, target_date.isoformat()],
                    )
                    conn.commit()
                    conn.close()
                    st.success("Goal created!")
                    st.rerun()

    # Display goals
    conn = get_db()
    goals = conn.execute("SELECT * FROM savings_goals ORDER BY target_date ASC").fetchall()
    conn.close()

    if goals:
        for g in goals:
            pct = min(g["current_amount"] / g["target_amount"], 1.0) if g["target_amount"] > 0 else 0
            is_complete = pct >= 1

            col1, col2 = st.columns([4, 1])
            with col1:
                badge = " ✅" if is_complete else ""
                st.markdown(f"### {g['name']}{badge}")
                st.progress(pct)
                st.markdown(
                    f"**{format_currency(g['current_amount'])}** / {format_currency(g['target_amount'])} "
                    f"({pct*100:.0f}%) &nbsp; | &nbsp; Target: {g['target_date']}"
                )
            with col2:
                # Add / withdraw funds
                with st.popover("💵 Update"):
                    fund_amount = st.number_input("Amount", min_value=0.01, step=10.0, key=f"fund_{g['id']}", format="%.2f")
                    fc1, fc2 = st.columns(2)
                    with fc1:
                        if st.button("Add", key=f"add_{g['id']}", type="primary"):
                            new_amt = min(g["current_amount"] + fund_amount, g["target_amount"])
                            conn = get_db()
                            conn.execute("UPDATE savings_goals SET current_amount=? WHERE id=?", [new_amt, g["id"]])
                            conn.commit()
                            conn.close()
                            st.rerun()
                    with fc2:
                        if st.button("Withdraw", key=f"withdraw_{g['id']}"):
                            new_amt = max(g["current_amount"] - fund_amount, 0)
                            conn = get_db()
                            conn.execute("UPDATE savings_goals SET current_amount=? WHERE id=?", [new_amt, g["id"]])
                            conn.commit()
                            conn.close()
                            st.rerun()

                if st.button("🗑️ Delete", key=f"del_goal_{g['id']}"):
                    conn = get_db()
                    conn.execute("DELETE FROM savings_goals WHERE id=?", [g["id"]])
                    conn.commit()
                    conn.close()
                    st.rerun()
            st.divider()
    else:
        st.info("No savings goals yet. Click '➕ New Savings Goal' to get started.")


# ═══════════════════════════════════════════════════════════════════════════
# RECURRING BILLS
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Recurring Bills":
    st.title("🔄 Recurring Bills & Subscriptions")

    # Add bill
    with st.expander("➕ Add Recurring Bill", expanded=False):
        with st.form("add_bill", clear_on_submit=True):
            bill_name = st.text_input("Name", placeholder="e.g. Netflix, Rent, Electricity")
            bc1, bc2, bc3 = st.columns(3)
            with bc1:
                bill_amount = st.number_input("Amount", min_value=0.01, step=1.0, format="%.2f", key="bill_amt")
            with bc2:
                bill_freq = st.selectbox("Frequency", ["monthly", "weekly", "biweekly", "quarterly", "yearly"])
            with bc3:
                bill_due = st.number_input("Due Day", min_value=1, max_value=31, value=1, key="bill_due")

            bill_cat_opts = {f"{v['icon']} {v['name']}": k for k, v in EXPENSE_CATEGORIES.items()}
            bill_cat_sel = st.selectbox("Category", list(bill_cat_opts.keys()), key="bill_cat")
            bill_category = bill_cat_opts[bill_cat_sel]

            if st.form_submit_button("Add Bill", type="primary"):
                if bill_name:
                    conn = get_db()
                    conn.execute(
                        "INSERT INTO recurring_bills (id,name,amount,category,frequency,due_day) VALUES (?,?,?,?,?,?)",
                        [str(uuid.uuid4()), bill_name, bill_amount, bill_category, bill_freq, bill_due],
                    )
                    conn.commit()
                    conn.close()
                    st.success("Bill added!")
                    st.rerun()

    conn = get_db()
    bills = conn.execute("SELECT * FROM recurring_bills WHERE is_active=1 ORDER BY due_day ASC").fetchall()
    conn.close()

    if bills:
        # Monthly cost summary
        total_monthly = 0
        for b in bills:
            amt = b["amount"]
            freq = b["frequency"]
            if freq == "weekly":
                total_monthly += amt * 4.33
            elif freq == "biweekly":
                total_monthly += amt * 2.17
            elif freq == "monthly":
                total_monthly += amt
            elif freq == "quarterly":
                total_monthly += amt / 3
            elif freq == "yearly":
                total_monthly += amt / 12

        total_yearly = total_monthly * 12

        mc1, mc2, mc3 = st.columns(3)
        mc1.metric("Active Bills", f"{len(bills)}")
        mc2.metric("Monthly Cost", format_currency(total_monthly))
        mc3.metric("Yearly Cost", format_currency(total_yearly))

        st.markdown("---")

        # Calendar view — show bills for current month
        st.subheader("📅 This Month's Calendar")
        month_str = st.session_state.current_month
        month_date_obj = datetime.strptime(month_str + "-01", "%Y-%m-%d").date()

        import calendar
        cal = calendar.Calendar(firstweekday=6)
        month_days = cal.monthdayscalendar(month_date_obj.year, month_date_obj.month)

        # Build bill due dates map
        bill_due_map = {}
        for b in bills:
            freq = b["frequency"]
            if freq in ["monthly", "quarterly", "yearly"]:
                day = min(b["due_day"], calendar.monthrange(month_date_obj.year, month_date_obj.month)[1])
                if freq == "quarterly" and month_date_obj.month % 3 != 0:
                    continue
                if freq == "yearly" and month_date_obj.month != 1:
                    continue
                bill_due_map.setdefault(day, []).append(b)
            elif freq == "weekly":
                for week in month_days:
                    for d in week:
                        if d != 0 and datetime(month_date_obj.year, month_date_obj.month, d).weekday() == (b["due_day"] - 1) % 7:
                            bill_due_map.setdefault(d, []).append(b)
            elif freq == "biweekly":
                for week_idx, week in enumerate(month_days):
                    if week_idx % 2 == 0:
                        for d in week:
                            if d != 0 and datetime(month_date_obj.year, month_date_obj.month, d).weekday() == (b["due_day"] - 1) % 7:
                                bill_due_map.setdefault(d, []).append(b)

        # Render calendar grid
        cal_cols = st.columns(7)
        for i, day_name in enumerate(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]):
            cal_cols[i].markdown(f"**{day_name}**")

        for week in month_days:
            cols = st.columns(7)
            for i, day in enumerate(week):
                with cols[i]:
                    if day == 0:
                        st.markdown("&nbsp;", unsafe_allow_html=True)
                    else:
                        day_bills = bill_due_map.get(day, [])
                        if day_bills:
                            bill_names = ", ".join([b["name"] for b in day_bills])
                            bill_total = sum(b["amount"] for b in day_bills)
                            st.markdown(
                                f"<div style='background:#FEE2E2;border-radius:8px;padding:4px;text-align:center'>"
                                f"<b>{day}</b><br>"
                                f"<small style='color:#EF4444'>${bill_total:.0f}</small>"
                                f"</div>",
                                unsafe_allow_html=True,
                            )
                        elif day == date.today().day and month_str == date.today().strftime("%Y-%m"):
                            st.markdown(
                                f"<div style='background:#6C63FF;color:white;border-radius:8px;padding:4px;text-align:center'>"
                                f"<b>{day}</b></div>",
                                unsafe_allow_html=True,
                            )
                        else:
                            st.markdown(f"<div style='text-align:center;padding:4px'>{day}</div>", unsafe_allow_html=True)

        st.markdown("---")

        # Bill list
        st.subheader("All Recurring Bills")
        for b in bills:
            icon = cat_icon(b["category"])
            freq_label = {"weekly": "/wk", "biweekly": "/2wk", "monthly": "/mo", "quarterly": "/qtr", "yearly": "/yr"}
            bc1, bc2, bc3, bc4 = st.columns([0.5, 3, 2, 0.5])
            with bc1:
                st.markdown(f"<span style='font-size:24px'>{icon}</span>", unsafe_allow_html=True)
            with bc2:
                st.markdown(f"**{b['name']}**<br><small style='color:#9CA3AF'>Due day {b['due_day']} • {b['frequency'].title()}</small>", unsafe_allow_html=True)
            with bc3:
                st.markdown(f"<span style='color:#FF6B6B;font-weight:700;font-size:18px'>{format_currency(b['amount'])}{freq_label[b['frequency']]}</span>", unsafe_allow_html=True)
            with bc4:
                if st.button("🗑️", key=f"del_bill_{b['id']}"):
                    conn = get_db()
                    conn.execute("DELETE FROM recurring_bills WHERE id=?", [b["id"]])
                    conn.commit()
                    conn.close()
                    st.rerun()
            st.divider()

        # Subscription detection from transactions
        st.markdown("---")
        st.subheader("🔍 Detected Subscriptions")
        st.caption("Auto-detected from your recurring transactions")
        conn = get_db()
        detected = pd.read_sql_query(
            """SELECT description, amount, COUNT(*) as count
            FROM transactions WHERE is_recurring=1 AND type='expense' AND description != ''
            GROUP BY description, amount HAVING count >= 2
            ORDER BY amount DESC""",
            conn,
        )
        conn.close()
        if not detected.empty:
            for _, d in detected.iterrows():
                st.markdown(f"💡 **{d['description']}** — {format_currency(d['amount'])} × {d['count']} times")
        else:
            st.info("No recurring patterns detected yet. Mark transactions as recurring to enable detection.")
    else:
        st.info("No recurring bills yet. Click '➕ Add Recurring Bill' to start tracking.")


# ═══════════════════════════════════════════════════════════════════════════
# CASH FLOW FORECAST
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Cash Flow":
    st.title("📈 Cash Flow Forecast")

    # Gather data
    conn = get_db()
    profile = dict(conn.execute("SELECT * FROM user_profile LIMIT 1").fetchone())
    bills = conn.execute("SELECT * FROM recurring_bills WHERE is_active=1").fetchall()

    # Get last 6 months of transaction data for averages
    six_months_ago = (date.today() - timedelta(days=180)).strftime("%Y-%m-%d")
    hist_df = pd.read_sql_query(
        "SELECT type, amount, date FROM transactions WHERE date >= ? ORDER BY date",
        conn, params=[six_months_ago],
    )
    conn.close()

    # Calculate monthly averages
    if not hist_df.empty:
        hist_df["month"] = hist_df["date"].str[:7]
        monthly_hist = hist_df.groupby(["month", "type"])["amount"].sum().reset_index()
        monthly_pivot = monthly_hist.pivot(index="month", columns="type", values="amount").fillna(0)
        avg_income = monthly_pivot.get("income", pd.Series([0])).mean()
        avg_expense = monthly_pivot.get("expense", pd.Series([0])).mean()
    else:
        avg_income = profile.get("monthly_income", 0)
        avg_expense = 0

    # Calculate recurring bills monthly total
    bills_monthly = 0
    for b in bills:
        amt = b["amount"]
        freq = b["frequency"]
        if freq == "weekly":
            bills_monthly += amt * 4.33
        elif freq == "biweekly":
            bills_monthly += amt * 2.17
        elif freq == "monthly":
            bills_monthly += amt
        elif freq == "quarterly":
            bills_monthly += amt / 3
        elif freq == "yearly":
            bills_monthly += amt / 12

    # User overrides
    st.markdown("### Forecast Parameters")
    fp1, fp2, fp3 = st.columns(3)
    with fp1:
        forecast_income = st.number_input("Expected Monthly Income", value=round(avg_income, 2), min_value=0.0, step=100.0, format="%.2f")
    with fp2:
        forecast_expense = st.number_input("Expected Monthly Expenses", value=round(avg_expense, 2), min_value=0.0, step=100.0, format="%.2f")
    with fp3:
        forecast_months = st.slider("Forecast Period (months)", min_value=1, max_value=24, value=6)

    starting_balance = st.number_input("Current Balance", value=0.0, step=100.0, format="%.2f", key="cf_balance")

    # Generate forecast
    forecast_dates = []
    forecast_balances = []
    forecast_income_series = []
    forecast_expense_series = []
    balance = starting_balance

    today = date.today()
    for i in range(forecast_months):
        m = today.month + i
        y = today.year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        month_label = f"{y}-{m:02d}"

        inc = forecast_income
        exp = forecast_expense
        balance += inc - exp

        forecast_dates.append(month_label)
        forecast_balances.append(balance)
        forecast_income_series.append(inc)
        forecast_expense_series.append(exp)

    # Chart
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=forecast_dates, y=forecast_balances,
        mode="lines+markers", name="Projected Balance",
        line=dict(color="#6C63FF", width=3),
        fill="tozeroy", fillcolor="rgba(108,99,255,0.1)",
    ))
    fig.add_trace(go.Bar(
        x=forecast_dates, y=forecast_income_series,
        name="Income", marker_color="rgba(0,208,156,0.6)",
    ))
    fig.add_trace(go.Bar(
        x=forecast_dates, y=[-e for e in forecast_expense_series],
        name="Expenses", marker_color="rgba(255,107,107,0.6)",
    ))
    fig.update_layout(
        height=400,
        margin=dict(t=10, b=40, l=40, r=10),
        legend=dict(orientation="h", y=1.15),
        xaxis_title="", yaxis_title="Amount ($)",
        barmode="overlay",
    )
    st.plotly_chart(fig, use_container_width=True)

    # Summary cards
    net_monthly = forecast_income - forecast_expense
    end_balance = forecast_balances[-1] if forecast_balances else starting_balance
    savings_rate = (net_monthly / forecast_income * 100) if forecast_income > 0 else 0

    cf1, cf2, cf3, cf4 = st.columns(4)
    cf1.metric("Monthly Net", format_currency(net_monthly), delta=f"{'+'if net_monthly>=0 else ''}{format_currency(net_monthly)}")
    cf2.metric("End Balance", format_currency(end_balance))
    cf3.metric("Savings Rate", f"{savings_rate:.1f}%")
    cf4.metric("Bills (Monthly)", format_currency(bills_monthly))

    # Breakdown
    st.markdown("---")
    st.subheader("Monthly Breakdown")
    breakdown_df = pd.DataFrame({
        "Month": forecast_dates,
        "Income": [format_currency(i) for i in forecast_income_series],
        "Expenses": [format_currency(e) for e in forecast_expense_series],
        "Net": [format_currency(forecast_income - forecast_expense) for _ in forecast_dates],
        "Balance": [format_currency(b) for b in forecast_balances],
    })
    st.dataframe(breakdown_df, use_container_width=True, hide_index=True)

    # Warnings
    if net_monthly < 0:
        st.error(f"⚠️ You're projected to lose {format_currency(abs(net_monthly))} per month. Review your expenses!")
    elif savings_rate < 10:
        st.warning(f"💡 Your savings rate is only {savings_rate:.1f}%. Aim for at least 20% for financial health.")
    else:
        st.success(f"✅ Great! You're saving {savings_rate:.1f}% of your income each month.")


# ═══════════════════════════════════════════════════════════════════════════
# NET WORTH TRACKER
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Net Worth":
    st.title("🏦 Net Worth Tracker")

    # Add account
    with st.expander("➕ Add Account", expanded=False):
        with st.form("add_account", clear_on_submit=True):
            acc_name = st.text_input("Account Name", placeholder="e.g. Checking Account, Student Loan")
            ac1, ac2, ac3 = st.columns(3)
            with ac1:
                acc_type = st.selectbox("Type", ["asset", "liability"])
            with ac2:
                acc_balance = st.number_input("Current Balance", min_value=0.0, step=100.0, format="%.2f", key="acc_bal")
            with ac3:
                acc_icon_options = {"🏦 Bank": "🏦", "💳 Credit Card": "💳", "🏠 Property": "🏠", "🚗 Vehicle": "🚗",
                                     "📈 Investment": "📈", "💰 Cash": "💰", "🎓 Student Loan": "🎓", "🏥 Medical": "🏥"}
                acc_icon_sel = st.selectbox("Icon", list(acc_icon_options.keys()))
                acc_icon = acc_icon_options[acc_icon_sel]

            if st.form_submit_button("Add Account", type="primary"):
                if acc_name:
                    conn = get_db()
                    conn.execute(
                        "INSERT INTO accounts (id,name,type,balance,icon) VALUES (?,?,?,?,?)",
                        [str(uuid.uuid4()), acc_name, acc_type, acc_balance, acc_icon],
                    )
                    conn.commit()
                    conn.close()
                    st.success("Account added!")
                    st.rerun()

    conn = get_db()
    accounts = conn.execute("SELECT * FROM accounts ORDER BY type, name").fetchall()
    snapshots = pd.read_sql_query("SELECT * FROM net_worth_snapshots ORDER BY date", conn)
    conn.close()

    if accounts:
        # Calculate current totals
        total_assets = sum(a["balance"] for a in accounts if a["type"] == "asset")
        total_liabilities = sum(a["balance"] for a in accounts if a["type"] == "liability")
        net_worth = total_assets - total_liabilities

        # Summary
        nw1, nw2, nw3 = st.columns(3)
        nw1.markdown(f"""
        <div class="metric-card">
            <h3>Total Assets</h3>
            <h1>{format_currency(total_assets)}</h1>
        </div>""", unsafe_allow_html=True)
        nw2.markdown(f"""
        <div class="metric-card expense">
            <h3>Total Liabilities</h3>
            <h1>{format_currency(total_liabilities)}</h1>
        </div>""", unsafe_allow_html=True)
        nw_color = "#00D09C" if net_worth >= 0 else "#FF6B6B"
        nw3.markdown(f"""
        <div class="metric-card savings">
            <h3>Net Worth</h3>
            <h1 style="color:{nw_color}">{format_currency(net_worth)}</h1>
        </div>""", unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # Save snapshot button
        if st.button("📸 Save Today's Snapshot", type="primary"):
            conn = get_db()
            snap_date = date.today().isoformat()
            # Upsert by date
            existing = conn.execute("SELECT id FROM net_worth_snapshots WHERE date=?", [snap_date]).fetchone()
            if existing:
                conn.execute(
                    "UPDATE net_worth_snapshots SET total_assets=?, total_liabilities=?, net_worth=? WHERE date=?",
                    [total_assets, total_liabilities, net_worth, snap_date],
                )
            else:
                conn.execute(
                    "INSERT INTO net_worth_snapshots (id,date,total_assets,total_liabilities,net_worth) VALUES (?,?,?,?,?)",
                    [str(uuid.uuid4()), snap_date, total_assets, total_liabilities, net_worth],
                )
            conn.commit()
            conn.close()
            st.success("Snapshot saved!")
            st.rerun()

        # Net worth over time chart
        if not snapshots.empty and len(snapshots) >= 2:
            st.markdown("---")
            st.subheader("Net Worth Over Time")
            fig_nw = go.Figure()
            fig_nw.add_trace(go.Scatter(
                x=snapshots["date"], y=snapshots["net_worth"],
                mode="lines+markers", name="Net Worth",
                line=dict(color="#6C63FF", width=3),
                fill="tozeroy", fillcolor="rgba(108,99,255,0.1)",
            ))
            fig_nw.add_trace(go.Scatter(
                x=snapshots["date"], y=snapshots["total_assets"],
                mode="lines", name="Assets",
                line=dict(color="#00D09C", width=2, dash="dot"),
            ))
            fig_nw.add_trace(go.Scatter(
                x=snapshots["date"], y=snapshots["total_liabilities"],
                mode="lines", name="Liabilities",
                line=dict(color="#FF6B6B", width=2, dash="dot"),
            ))
            fig_nw.update_layout(
                height=350, margin=dict(t=10, b=40, l=40, r=10),
                legend=dict(orientation="h", y=1.1),
            )
            st.plotly_chart(fig_nw, use_container_width=True)

        # Account lists
        st.markdown("---")
        assets = [a for a in accounts if a["type"] == "asset"]
        liabilities = [a for a in accounts if a["type"] == "liability"]

        acol1, acol2 = st.columns(2)
        with acol1:
            st.subheader("💚 Assets")
            for a in assets:
                c1, c2, c3 = st.columns([0.5, 3, 1])
                with c1:
                    st.markdown(f"<span style='font-size:24px'>{a['icon']}</span>", unsafe_allow_html=True)
                with c2:
                    st.markdown(f"**{a['name']}**")
                    with st.popover("✏️ Update"):
                        new_bal = st.number_input("Balance", value=float(a["balance"]), key=f"upd_a_{a['id']}", format="%.2f")
                        if st.button("Save", key=f"save_a_{a['id']}"):
                            conn = get_db()
                            conn.execute("UPDATE accounts SET balance=? WHERE id=?", [new_bal, a["id"]])
                            conn.commit()
                            conn.close()
                            st.rerun()
                with c3:
                    st.markdown(f"<span style='color:#00D09C;font-weight:700'>{format_currency(a['balance'])}</span>", unsafe_allow_html=True)
                if st.button("🗑️", key=f"del_acc_{a['id']}"):
                    conn = get_db()
                    conn.execute("DELETE FROM accounts WHERE id=?", [a["id"]])
                    conn.commit()
                    conn.close()
                    st.rerun()
                st.divider()

        with acol2:
            st.subheader("🔴 Liabilities")
            for l in liabilities:
                c1, c2, c3 = st.columns([0.5, 3, 1])
                with c1:
                    st.markdown(f"<span style='font-size:24px'>{l['icon']}</span>", unsafe_allow_html=True)
                with c2:
                    st.markdown(f"**{l['name']}**")
                    with st.popover("✏️ Update"):
                        new_bal = st.number_input("Balance", value=float(l["balance"]), key=f"upd_l_{l['id']}", format="%.2f")
                        if st.button("Save", key=f"save_l_{l['id']}"):
                            conn = get_db()
                            conn.execute("UPDATE accounts SET balance=? WHERE id=?", [new_bal, l["id"]])
                            conn.commit()
                            conn.close()
                            st.rerun()
                with c3:
                    st.markdown(f"<span style='color:#FF6B6B;font-weight:700'>{format_currency(l['balance'])}</span>", unsafe_allow_html=True)
                if st.button("🗑️", key=f"del_acc_{l['id']}"):
                    conn = get_db()
                    conn.execute("DELETE FROM accounts WHERE id=?", [l["id"]])
                    conn.commit()
                    conn.close()
                    st.rerun()
                st.divider()

            if not liabilities:
                st.success("No liabilities! 🎉")
    else:
        st.info("No accounts yet. Click '➕ Add Account' to start tracking your net worth.")


# ═══════════════════════════════════════════════════════════════════════════
# INSIGHTS
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Insights":
    st.title("🔍 Spending Insights")

    conn = get_db()

    # Get data for last 6 months
    six_months_ago = (date.today().replace(day=1) - timedelta(days=180)).strftime("%Y-%m-%d")
    all_txns = pd.read_sql_query(
        "SELECT * FROM transactions WHERE date >= ? ORDER BY date DESC",
        conn, params=[six_months_ago],
    )
    conn.close()

    if all_txns.empty:
        st.info("Not enough data for insights. Add at least 1-2 months of transactions.")
    else:
        all_txns["month"] = all_txns["date"].str[:7]
        current_month = st.session_state.current_month
        prev_month_date = datetime.strptime(current_month + "-01", "%Y-%m-%d").date() - timedelta(days=1)
        prev_month = prev_month_date.strftime("%Y-%m")

        cur_data = all_txns[all_txns["month"] == current_month]
        prev_data = all_txns[all_txns["month"] == prev_month]

        cur_expenses = cur_data[cur_data["type"] == "expense"]["amount"].sum()
        prev_expenses = prev_data[prev_data["type"] == "expense"]["amount"].sum()
        cur_income = cur_data[cur_data["type"] == "income"]["amount"].sum()
        prev_income = prev_data[prev_data["type"] == "income"]["amount"].sum()

        # Month-over-month comparison
        st.subheader("📊 Month-over-Month")
        m1, m2, m3 = st.columns(3)
        exp_delta = cur_expenses - prev_expenses
        inc_delta = cur_income - prev_income
        m1.metric("Income", format_currency(cur_income), delta=f"{'+' if inc_delta>=0 else ''}{format_currency(inc_delta)} vs last month")
        m2.metric("Expenses", format_currency(cur_expenses), delta=f"{'+' if exp_delta>=0 else ''}{format_currency(exp_delta)} vs last month", delta_color="inverse")
        net = cur_income - cur_expenses
        m3.metric("Net", format_currency(net))

        st.markdown("---")

        # Spending trend (6 months)
        st.subheader("📈 6-Month Spending Trend")
        expenses_only = all_txns[all_txns["type"] == "expense"]
        if not expenses_only.empty:
            monthly_spend = expenses_only.groupby("month")["amount"].sum().reset_index()
            monthly_spend = monthly_spend.sort_values("month")
            avg_spend = monthly_spend["amount"].mean()

            fig_trend = go.Figure()
            fig_trend.add_trace(go.Scatter(
                x=monthly_spend["month"], y=monthly_spend["amount"],
                mode="lines+markers+text", name="Spending",
                line=dict(color="#FF6B6B", width=3),
                text=[format_currency(a) for a in monthly_spend["amount"]],
                textposition="top center",
            ))
            fig_trend.add_hline(y=avg_spend, line_dash="dash", line_color="#9CA3AF",
                                annotation_text=f"Avg: {format_currency(avg_spend)}")
            fig_trend.update_layout(
                height=300, margin=dict(t=30, b=40, l=40, r=10),
                showlegend=False, yaxis_title="Expenses ($)",
            )
            st.plotly_chart(fig_trend, use_container_width=True)

        st.markdown("---")

        # Category comparison: this month vs last month
        st.subheader("🏷️ Category Changes")
        cur_cats = cur_data[cur_data["type"] == "expense"].groupby("category")["amount"].sum()
        prev_cats = prev_data[prev_data["type"] == "expense"].groupby("category")["amount"].sum()
        all_cats_set = set(cur_cats.index) | set(prev_cats.index)

        if all_cats_set:
            changes = []
            for c in all_cats_set:
                cur_val = cur_cats.get(c, 0)
                prev_val = prev_cats.get(c, 0)
                diff = cur_val - prev_val
                pct_change = (diff / prev_val * 100) if prev_val > 0 else (100 if cur_val > 0 else 0)
                changes.append({"category": c, "current": cur_val, "previous": prev_val, "change": diff, "pct": pct_change})

            changes.sort(key=lambda x: abs(x["change"]), reverse=True)

            for ch in changes[:8]:
                icon = cat_icon(ch["category"])
                name = cat_name(ch["category"])
                arrow = "🔺" if ch["change"] > 0 else ("🔻" if ch["change"] < 0 else "➡️")
                color = "#FF6B6B" if ch["change"] > 0 else "#00D09C" if ch["change"] < 0 else "#9CA3AF"

                cc1, cc2, cc3, cc4 = st.columns([0.5, 2.5, 1.5, 1.5])
                with cc1:
                    st.markdown(f"{icon}")
                with cc2:
                    st.markdown(f"**{name}**")
                with cc3:
                    st.markdown(f"{format_currency(ch['previous'])} → {format_currency(ch['current'])}")
                with cc4:
                    st.markdown(f"<span style='color:{color}'>{arrow} {ch['pct']:+.0f}%</span>", unsafe_allow_html=True)
                st.divider()

        st.markdown("---")

        # Anomaly detection — unusually large transactions
        st.subheader("⚡ Unusual Transactions")
        cur_expenses_df = cur_data[cur_data["type"] == "expense"].copy()
        if len(cur_expenses_df) >= 3:
            mean_amt = cur_expenses_df["amount"].mean()
            std_amt = cur_expenses_df["amount"].std()
            threshold = mean_amt + 2 * std_amt if std_amt > 0 else mean_amt * 2

            anomalies = cur_expenses_df[cur_expenses_df["amount"] > threshold]
            if not anomalies.empty:
                for _, a in anomalies.iterrows():
                    desc = a["description"] or cat_name(a["category"])
                    st.warning(f"🚨 **{desc}** — {format_currency(a['amount'])} on {a['date']} (avg is {format_currency(mean_amt)})")
            else:
                st.success("No unusual spending detected this month. 👍")
        else:
            st.info("Need more transactions this month to detect anomalies.")

        st.markdown("---")

        # Top merchants/descriptions
        st.subheader("🏪 Top Spending Descriptions")
        if not expenses_only.empty:
            top_desc = expenses_only[expenses_only["description"] != ""].groupby("description")["amount"].agg(["sum", "count"]).reset_index()
            top_desc.columns = ["Description", "Total", "Count"]
            top_desc = top_desc.sort_values("Total", ascending=False).head(10)

            if not top_desc.empty:
                fig_bar = px.bar(
                    top_desc, x="Total", y="Description", orientation="h",
                    color="Total", color_continuous_scale=["#6C63FF", "#FF6B6B"],
                    text=[format_currency(t) for t in top_desc["Total"]],
                )
                fig_bar.update_layout(
                    height=max(250, len(top_desc) * 35),
                    margin=dict(t=10, b=10, l=10, r=10),
                    showlegend=False, coloraxis_showscale=False,
                    yaxis=dict(autorange="reversed"),
                )
                st.plotly_chart(fig_bar, use_container_width=True)
            else:
                st.info("Add descriptions to your transactions for merchant insights.")


# ═══════════════════════════════════════════════════════════════════════════
# DEBT PAYOFF PLANNER
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Debt Payoff":
    st.title("💳 Debt Payoff Planner")

    # Add debt
    with st.expander("➕ Add Debt", expanded=False):
        with st.form("add_debt", clear_on_submit=True):
            debt_name = st.text_input("Debt Name", placeholder="e.g. Credit Card, Student Loan")
            dc1, dc2 = st.columns(2)
            with dc1:
                debt_total = st.number_input("Total Amount", min_value=0.01, step=100.0, format="%.2f", key="debt_total")
                debt_rate = st.number_input("Interest Rate (%)", min_value=0.0, max_value=100.0, step=0.1, format="%.2f", key="debt_rate")
            with dc2:
                debt_remaining = st.number_input("Remaining Balance", min_value=0.01, step=100.0, format="%.2f", key="debt_remain")
                debt_min = st.number_input("Minimum Payment", min_value=0.0, step=10.0, format="%.2f", key="debt_min")

            if st.form_submit_button("Add Debt", type="primary"):
                if debt_name:
                    conn = get_db()
                    conn.execute(
                        "INSERT INTO debts (id,name,total_amount,remaining_amount,interest_rate,min_payment) VALUES (?,?,?,?,?,?)",
                        [str(uuid.uuid4()), debt_name, debt_total, debt_remaining, debt_rate, debt_min],
                    )
                    conn.commit()
                    conn.close()
                    st.success("Debt added!")
                    st.rerun()

    conn = get_db()
    debts = conn.execute("SELECT * FROM debts ORDER BY interest_rate DESC").fetchall()
    conn.close()

    if debts:
        total_debt = sum(d["remaining_amount"] for d in debts)
        total_min = sum(d["min_payment"] for d in debts)
        avg_rate = sum(d["interest_rate"] * d["remaining_amount"] for d in debts) / total_debt if total_debt > 0 else 0

        # Summary
        ds1, ds2, ds3 = st.columns(3)
        ds1.metric("Total Debt", format_currency(total_debt))
        ds2.metric("Monthly Minimums", format_currency(total_min))
        ds3.metric("Avg Interest Rate", f"{avg_rate:.1f}%")

        st.markdown("---")

        # Strategy selector
        st.subheader("Choose Your Strategy")
        strategy = st.radio(
            "Payoff Strategy",
            ["Avalanche (Highest Interest First)", "Snowball (Smallest Balance First)"],
            horizontal=True,
            key="debt_strategy",
        )
        extra_payment = st.number_input(
            "Extra Monthly Payment (beyond minimums)",
            min_value=0.0, step=50.0, format="%.2f", key="extra_pay",
        )

        # Calculate payoff schedule
        if strategy.startswith("Avalanche"):
            sorted_debts = sorted(debts, key=lambda d: -d["interest_rate"])
        else:
            sorted_debts = sorted(debts, key=lambda d: d["remaining_amount"])

        # Simulate payoff
        debt_balances = {d["id"]: float(d["remaining_amount"]) for d in sorted_debts}
        debt_info = {d["id"]: d for d in sorted_debts}
        monthly_budget = total_min + extra_payment

        month_count = 0
        total_interest_paid = 0
        payoff_timeline = []  # (month, total_remaining, interest_this_month)
        max_months = 360  # 30 year cap

        while sum(debt_balances.values()) > 0.01 and month_count < max_months:
            month_count += 1
            month_interest = 0
            remaining_budget = monthly_budget

            # Apply interest to all debts
            for did in debt_balances:
                if debt_balances[did] > 0:
                    monthly_rate = debt_info[did]["interest_rate"] / 100 / 12
                    interest = debt_balances[did] * monthly_rate
                    debt_balances[did] += interest
                    month_interest += interest
                    total_interest_paid += interest

            # Pay minimums first
            for did in debt_balances:
                if debt_balances[did] > 0:
                    min_pay = min(debt_info[did]["min_payment"], debt_balances[did])
                    payment = min(min_pay, remaining_budget)
                    debt_balances[did] -= payment
                    remaining_budget -= payment

            # Apply extra to priority debt
            for did in [d["id"] for d in sorted_debts]:
                if debt_balances[did] > 0 and remaining_budget > 0:
                    payment = min(debt_balances[did], remaining_budget)
                    debt_balances[did] -= payment
                    remaining_budget -= payment

            total_remaining = sum(max(0, b) for b in debt_balances.values())
            payoff_timeline.append((month_count, total_remaining, month_interest))

        # Results
        st.markdown("---")
        st.subheader("📊 Payoff Timeline")

        years = month_count // 12
        months_rem = month_count % 12
        time_str = f"{years}y {months_rem}m" if years > 0 else f"{months_rem} months"

        r1, r2, r3 = st.columns(3)
        r1.metric("Debt-Free In", time_str)
        r2.metric("Total Interest", format_currency(total_interest_paid))
        r3.metric("Total Paid", format_currency(total_debt + total_interest_paid))

        # Payoff chart
        if payoff_timeline:
            tl_df = pd.DataFrame(payoff_timeline, columns=["Month", "Remaining", "Interest"])

            fig_debt = go.Figure()
            fig_debt.add_trace(go.Scatter(
                x=tl_df["Month"], y=tl_df["Remaining"],
                mode="lines", name="Remaining Debt",
                line=dict(color="#FF6B6B", width=3),
                fill="tozeroy", fillcolor="rgba(255,107,107,0.15)",
            ))
            fig_debt.update_layout(
                height=350, margin=dict(t=10, b=40, l=40, r=10),
                xaxis_title="Months", yaxis_title="Remaining Balance ($)",
                showlegend=False,
            )
            st.plotly_chart(fig_debt, use_container_width=True)

        # Individual debt cards
        st.markdown("---")
        st.subheader("Your Debts")
        for d in debts:
            paid_pct = 1 - (d["remaining_amount"] / d["total_amount"]) if d["total_amount"] > 0 else 0
            paid_pct = max(0, min(1, paid_pct))

            dc1, dc2, dc3 = st.columns([3, 1.5, 0.5])
            with dc1:
                st.markdown(f"**{d['name']}** &nbsp; <small style='color:#9CA3AF'>{d['interest_rate']}% APR</small>", unsafe_allow_html=True)
                st.progress(paid_pct)
                st.caption(f"{format_currency(d['remaining_amount'])} remaining of {format_currency(d['total_amount'])} ({paid_pct*100:.0f}% paid)")
            with dc2:
                st.metric("Min Payment", format_currency(d["min_payment"]))
            with dc3:
                if st.button("🗑️", key=f"del_debt_{d['id']}"):
                    conn = get_db()
                    conn.execute("DELETE FROM debts WHERE id=?", [d["id"]])
                    conn.commit()
                    conn.close()
                    st.rerun()
            st.divider()

        # Tips
        st.markdown("---")
        st.subheader("💡 Tips")
        if extra_payment == 0:
            st.info("Add extra monthly payments above to see how much faster you can become debt-free!")
        else:
            # Compare with minimum-only
            min_only_months = 0
            min_only_interest = 0
            min_balances = {d["id"]: float(d["remaining_amount"]) for d in debts}
            while sum(min_balances.values()) > 0.01 and min_only_months < max_months:
                min_only_months += 1
                for did in min_balances:
                    if min_balances[did] > 0:
                        monthly_rate = debt_info[did]["interest_rate"] / 100 / 12
                        interest = min_balances[did] * monthly_rate
                        min_balances[did] += interest
                        min_only_interest += interest
                        payment = min(debt_info[did]["min_payment"], min_balances[did])
                        min_balances[did] -= payment

            months_saved = min_only_months - month_count
            interest_saved = min_only_interest - total_interest_paid
            if months_saved > 0:
                st.success(f"🎉 Your extra {format_currency(extra_payment)}/month saves you **{months_saved} months** and **{format_currency(interest_saved)}** in interest!")
    else:
        st.info("No debts tracked. Click '➕ Add Debt' to start your payoff plan.")
        st.markdown("""
        **How it works:**
        1. Add your debts with their balances, interest rates, and minimum payments
        2. Choose a payoff strategy:
           - **Avalanche** — Pay highest interest first (saves the most money)
           - **Snowball** — Pay smallest balance first (quicker wins for motivation)
        3. Add extra monthly payments to see how much faster you can be debt-free
        """)


# ═══════════════════════════════════════════════════════════════════════════
# PROFILE
# ═══════════════════════════════════════════════════════════════════════════
elif page == "Profile":
    st.title("👤 Profile")

    profile = get_profile()

    with st.form("profile_form"):
        name = st.text_input("Display Name", value=profile.get("display_name", ""))
        col1, col2 = st.columns(2)
        with col1:
            income = st.number_input("Monthly Income", value=float(profile.get("monthly_income", 0)), min_value=0.0, step=100.0, format="%.2f")
        with col2:
            currency = st.selectbox("Currency", ["USD", "EUR", "GBP", "CAD", "AUD", "INR"], index=0)

        if st.form_submit_button("Save Profile", type="primary"):
            conn = get_db()
            conn.execute(
                "UPDATE user_profile SET display_name=?, monthly_income=?, currency=? WHERE id='default'",
                [name, income, currency],
            )
            conn.commit()
            conn.close()
            st.success("Profile updated!")
            st.rerun()

    st.markdown("---")

    # Stats
    month = st.session_state.current_month
    summary = get_monthly_summary(month)
    conn = get_db()
    total_txns = conn.execute("SELECT COUNT(*) as c FROM transactions").fetchone()["c"]
    conn.close()

    c1, c2, c3 = st.columns(3)
    c1.metric("Total Transactions", total_txns)
    c2.metric("This Month Income", format_currency(summary["income"]))
    c3.metric("This Month Expenses", format_currency(summary["expenses"]))

    st.markdown("---")

    # API Key setting
    st.subheader("AI Settings")
    current_key = st.session_state.get("api_key", os.environ.get("ANTHROPIC_API_KEY", ""))
    new_key = st.text_input("Anthropic API Key", value=current_key, type="password")
    if new_key != current_key:
        st.session_state.api_key = new_key
        st.success("API key updated!")
