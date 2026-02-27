import boto3
import pandas as pd
import numpy as np
import subprocess
import os
import matplotlib.pyplot as plt
from boto3.dynamodb.conditions import Key

# ── Config ────────────────────────────────────────────────────────────────────
TICKERS    = ["GGAL", "YPF", "MELI"]
START_DATE = "2024-01-01"
END_DATE   = "2024-12-31"
N_POINTS   = 200      # puntos en la frontera
N_MC       = 1000     # portfolios Monte Carlo de fondo

SOLVER_SRC = os.path.join(os.path.dirname(__file__), "portfolio_solver.cpp")
SOLVER_BIN = os.path.join(os.path.dirname(__file__), "portfolio_solver")

# ── 0. Compilar solver si hace falta ─────────────────────────────────────────
if not os.path.exists(SOLVER_BIN) or \
   os.path.getmtime(SOLVER_SRC) > os.path.getmtime(SOLVER_BIN):
    print("Compilando portfolio_solver.cpp ...")
    result = subprocess.run(
        ["g++", "-O2", "-o", SOLVER_BIN, SOLVER_SRC],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"Error de compilación:\n{result.stderr}")
    print("Compilado OK")

# ── 1. Bajar datos de DynamoDB ────────────────────────────────────────────────
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
table    = dynamodb.Table("stock_prices")

all_data = []
for ticker in TICKERS:
    response = table.query(
        KeyConditionExpression=Key("ticker").eq(ticker) & Key("date").between(START_DATE, END_DATE)
    )
    items = response.get("Items", [])
    while "LastEvaluatedKey" in response:
        response = table.query(
            KeyConditionExpression=Key("ticker").eq(ticker) & Key("date").between(START_DATE, END_DATE),
            ExclusiveStartKey=response["LastEvaluatedKey"]
        )
        items.extend(response.get("Items", []))
    all_data.extend(items)

raw_df = pd.DataFrame(all_data)
raw_df["close"] = raw_df["close"].astype(float)
df = raw_df.pivot(index="date", columns="ticker", values="close").dropna()
print(f"Datos: {len(df)} filas × {len(df.columns)} tickers")

# ── 2. Parámetros anualizados ─────────────────────────────────────────────────
daily_returns = df.pct_change().dropna()
mu  = daily_returns.mean().values * 252
cov = daily_returns.cov().values * 252
n   = len(TICKERS)

# ── 3. Monte Carlo ────────────────────────────────────────────────────────────
mc_risks, mc_returns = [], []
for _ in range(N_MC):
    w = np.random.dirichlet(np.ones(n))
    mc_returns.append(float(w @ mu))
    mc_risks.append(float(np.sqrt(w @ cov @ w)))

# ── 4. Frontera eficiente vía binario C++ ─────────────────────────────────────
target_returns = np.linspace(mu.min(), mu.max(), N_POINTS)

# Construir input para el solver
lines = [str(n)]
lines.append(" ".join(f"{x:.10f}" for x in mu))
for row in cov:
    lines.append(" ".join(f"{x:.10f}" for x in row))
lines.append(str(N_POINTS))
lines.append(" ".join(f"{x:.10f}" for x in target_returns))
solver_input = "\n".join(lines)

result = subprocess.run(
    [SOLVER_BIN],
    input=solver_input,
    capture_output=True, text=True
)
if result.returncode != 0:
    raise RuntimeError(f"Error del solver:\n{result.stderr}")

frontier_risks, frontier_returns = [], []
for line in result.stdout.strip().split("\n"):
    if line.strip():
        risk, ret = map(float, line.split())
        frontier_risks.append(risk)
        frontier_returns.append(ret)

print(f"Frontera: {len(frontier_risks)} puntos")

# ── 5. Activos individuales ───────────────────────────────────────────────────
asset_risks   = [float(np.sqrt(cov[i, i])) for i in range(n)]
asset_returns = list(mu)

# ── 6. Plot ───────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 7))

ax.scatter(mc_risks, mc_returns, c="lightsteelblue", alpha=0.3, s=12, label="Monte Carlo")
ax.plot(frontier_risks, frontier_returns, "r-", linewidth=2.5, label="Frontera eficiente (C++)")
for i, ticker in enumerate(TICKERS):
    ax.scatter(asset_risks[i], asset_returns[i], s=120, zorder=5)
    ax.annotate(ticker, (asset_risks[i], asset_returns[i]),
                textcoords="offset points", xytext=(8, 4), fontsize=11, fontweight="bold")

ax.set_xlabel("Riesgo (desvío estándar anualizado)", fontsize=12)
ax.set_ylabel("Retorno esperado anualizado", fontsize=12)
ax.set_title(f"Frontera de Markowitz — {', '.join(TICKERS)}  ({START_DATE} / {END_DATE})", fontsize=13)
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig("frontier_test.png", dpi=150)
plt.show()
print("Gráfico guardado en frontier_test.png")
