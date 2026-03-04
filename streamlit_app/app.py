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

    page = st.radio(
        "Navigation",
        ["Dashboard", "Transactions", "AI Chat", "Budget", "Savings", "Profile"],
        index=["Dashboard", "Transactions", "AI Chat", "Budget", "Savings", "Profile"].index(st.session_state.page),
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
    st.caption("v1.0.0 • AI-Powered Finance")


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

    # Add transaction form
    with st.expander("➕ Add Transaction", expanded=False):
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

    # Filter
    month = st.session_state.current_month
    transactions = get_monthly_transactions(month)

    if not transactions.empty:
        active_cats = transactions["category"].unique().tolist()
        filter_options = ["All"] + [f"{cat_icon(c)} {cat_name(c)}" for c in active_cats]
        selected_filter = st.selectbox("Filter by category", filter_options, label_visibility="collapsed")

        if selected_filter != "All":
            # Find the category id from the display name
            for c in active_cats:
                if f"{cat_icon(c)} {cat_name(c)}" == selected_filter:
                    transactions = transactions[transactions["category"] == c]
                    break

        # Transaction table
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
        st.download_button(
            "📥 Export to CSV",
            csv_data,
            f"moneymind-{month}.csv",
            "text/csv",
        )
    else:
        st.info("No transactions this month. Click '➕ Add Transaction' above to get started.")


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
