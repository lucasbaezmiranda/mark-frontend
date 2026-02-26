import json
import uuid
import boto3
import pandas as pd
import numpy as np
import io
import os
import subprocess
from boto3.dynamodb.conditions import Key

# Configuration from Environment Variables (Terraform)
BUCKET_NAME = os.environ.get("BUCKET_NAME", "lukebm-plot-bucket")
REGION = os.environ.get("AWS_REGION", "us-east-1")

dynamodb = boto3.resource('dynamodb', region_name=REGION)
table = dynamodb.Table('stock_prices')

def lambda_handler(event, context):
    # 1. Handle CORS Preflight (OPTIONS)
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
        # 2. Parse Request
        body = json.loads(event["body"])
        tickers = body["tickers"]
        start = body["start_date"]
        end = body["end_date"]
        n_points = 50

        # 3. Fetch Data from DynamoDB
        all_data = []
        for ticker in tickers:
            response = table.query(
                KeyConditionExpression=Key('ticker').eq(ticker) & Key('date').between(start, end)
            )
            items = response.get('Items', [])
            while 'LastEvaluatedKey' in response:
                response = table.query(
                    KeyConditionExpression=Key('ticker').eq(ticker) & Key('date').between(start, end),
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                items.extend(response.get('Items', []))
            all_data.extend(items)

        if not all_data:
            raise ValueError("No data found for the selected tickers and dates.")

        # 4. Prepare DataFrames
        raw_df = pd.DataFrame(all_data)
        raw_df['close'] = raw_df['close'].astype(float)
        df = raw_df.pivot(index='date', columns='ticker', values='close').dropna()

        # 5. Calculate Financial Parameters (Anualized)
        daily_returns = df.pct_change().dropna()
        mu = daily_returns.mean().values * 252
        cov = daily_returns.cov().values * 252
        
        # 6. Call C++ Optimizer via Subprocess
        # We pass data as raw text: N_Assets, Mu_Vector, Cov_Matrix_Flattened, N_Points
        input_str = f"{len(tickers)}\n"
        input_str += " ".join(map(str, mu.tolist())) + "\n"
        for row in cov:
            input_str += " ".join(map(str, row.tolist())) + "\n"
        input_str += f"{n_points}\n"

        # Ensure the binary is executable in the Lambda environment
        optimizer_path = './optimizer'
        if os.path.exists(optimizer_path):
            os.chmod(optimizer_path, 0o755)
        else:
            raise FileNotFoundError("The 'optimizer' binary was not found in the package.")

        process = subprocess.Popen(
            [optimizer_path], 
            stdin=subprocess.PIPE, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=input_str)

        if process.returncode != 0:
            raise RuntimeError(f"C++ Optimizer failed: {stderr}")

        optimizer_results = json.loads(stdout)

        # 7. Monte Carlo Portfolios (calculated in Python)
        portfolios = []
        for _ in range(100):
            w = np.random.dirichlet(np.ones(len(tickers)))
            p_ret = np.dot(w, mu)
            p_risk = np.sqrt(np.dot(w.T, np.dot(cov, w)))
            portfolios.append({"risk": float(p_risk), "return": float(p_ret)})

        # 8. Individual Assets
        single_assets = []
        for i, ticker in enumerate(tickers):
            single_assets.append({
                "ticker": ticker, 
                "risk": float(np.sqrt(cov[i, i])), 
                "return": float(mu[i])
            })

        # 9. Save Historical CSV to S3
        df_csv = df.copy().reset_index()
        csv_buffer = io.StringIO()
        df_csv.to_csv(csv_buffer, index=False)
        filename = f"markowitz_{uuid.uuid4().hex}.csv"
        
        s3 = boto3.client("s3")
        s3.put_object(
            Bucket=BUCKET_NAME, 
            Key=filename, 
            Body=csv_buffer.getvalue(), 
            ContentType="text/csv"
        )
        csv_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{filename}"

        # 10. Final Response
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "https://frontier.lukebm.com",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({
                "frontier": optimizer_results["frontier"],
                "portfolios": portfolios,
                "single_assets": single_assets,
                "csv_url": csv_url
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "https://frontier.lukebm.com"},
            "body": json.dumps({"error": str(e)})
        }