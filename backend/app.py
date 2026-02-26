import json
import uuid
import boto3
import pandas as pd
import numpy as np
import itertools
import io
from boto3.dynamodb.conditions import Key

BUCKET_NAME = "lukebm-plot-bucket"
# Inicializamos el recurso fuera del handler para reutilizar conexiones
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('stock_prices')

def lambda_handler(event, context):
    # Soporte para preflight OPTIONS (CORS)
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "https://frontier.lukebm.com",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps("OK")
        }

    try:
        body = json.loads(event["body"])
        tickers = body["tickers"]
        start = body["start_date"]
        end = body["end_date"]

        # ---------------- CAMBIO: Obtención de datos desde DynamoDB ----------------
        all_data = []
        for ticker in tickers:
            # Usamos Query asumiendo que 'ticker' es la Partition Key 
            # y 'date' es la Sort Key (común en tablas financieras)
            response = table.query(
                KeyConditionExpression=Key('ticker').eq(ticker) & Key('date').between(start, end)
            )
            items = response.get('Items', [])
            
            # Manejar paginación si hay muchos datos por ticker
            while 'LastEvaluatedKey' in response:
                response = table.query(
                    KeyConditionExpression=Key('ticker').eq(ticker) & Key('date').between(start, end),
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                items.extend(response.get('Items', []))
            
            all_data.extend(items)

        if not all_data:
            raise ValueError("No se encontraron datos para los tickers y fechas seleccionadas.")

        # Convertir a DataFrame y pivotar para que tenga formato [Date x Ticker]
        raw_df = pd.DataFrame(all_data)
        
        # Convertir precios a float (DynamoDB devuelve Decimal)
        raw_df['close'] = raw_df['close'].astype(float)
        
        # Transformar a formato serie temporal: Filas = Date, Columnas = Ticker
        df = raw_df.pivot(index='date', columns='ticker', values='close').dropna()
        # --------------------------------------------------------------------------

        # Calcular retornos diarios
        daily_returns = df.pct_change().dropna()
        mean_returns = daily_returns.mean()
        cov_matrix = daily_returns.cov()
        num_portfolios = 100

        # ---------------- Monte Carlo portfolios ----------------
        portfolios = []
        for _ in range(num_portfolios):
            weights = np.random.dirichlet(np.ones(len(tickers)), size=1)[0]
            port_return = np.sum(weights * mean_returns) * 252
            port_std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix * 252, weights)))
            portfolios.append({"risk": float(port_std), "return": float(port_return)})

        # ---------------- Combinaciones por pares ----------------
        pairs_data = []
        for i, j in itertools.combinations(range(len(tickers)), 2):
            w_range = np.linspace(0, 1, 50)
            r_vals = []
            s_vals = []
            for w in w_range:
                w_vec = np.zeros(len(tickers))
                w_vec[i] = w
                w_vec[j] = 1 - w
                ret = np.sum(w_vec * mean_returns) * 252
                std = np.sqrt(np.dot(w_vec.T, np.dot(cov_matrix * 252, w_vec)))
                r_vals.append(float(ret))
                s_vals.append(float(std))
            pairs_data.append({
                "tickers": [tickers[i], tickers[j]],
                "risks": s_vals,
                "returns": r_vals
            })

        # ---------------- Activos individuales ----------------
        single_assets = []
        for i, ticker in enumerate(tickers):
            if ticker in mean_returns:
                w_vec = np.zeros(len(tickers))
                w_vec[i] = 1.0
                ret = np.sum(w_vec * mean_returns) * 252
                std = np.sqrt(np.dot(w_vec.T, np.dot(cov_matrix * 252, w_vec)))
                single_assets.append({"ticker": ticker, "risk": float(std), "return": float(ret)})

        # ---------------- CSV con precios históricos ----------------
        df_csv = df.copy()
        df_csv.reset_index(inplace=True)
        csv_buffer = io.StringIO()
        df_csv.to_csv(csv_buffer, index=False)

        filename = f"markowitz_prices_{uuid.uuid4().hex}.csv"
        s3 = boto3.client("s3")
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=filename,
            Body=csv_buffer.getvalue(),
            ContentType="text/csv"
        )

        csv_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{filename}"

        # ---------------- Respuesta final ----------------
        response = {
            "portfolios": portfolios,
            "pairs": pairs_data,
            "single_assets": single_assets,
            "csv_url": csv_url
        }

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "https://frontier.lukebm.com",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps(response)
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "https://frontier.lukebm.com",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"error": str(e)})
        }