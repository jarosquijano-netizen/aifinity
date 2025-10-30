# 🔍 How to See the Full Error Details

## Method 1: Network Tab (Recommended)

1. Open **Developer Tools** (F12)
2. Go to **Network** tab
3. Upload your CSV file
4. Click on the **failed request** (`upload` with status 500)
5. Click on **Response** tab
6. You'll see the detailed error message like:
   ```json
   {
     "error": "Failed to upload transactions",
     "message": "column xyz does not exist",
     "details": "..."
   }
   ```

## Method 2: Expand Console Error

1. In **Console** tab
2. Find the error: `Processing error: AxiosError$1`
3. Click the **arrow** to expand it
4. Look for: `response` → `data` → `message`

## What to Send Me

Copy the **entire response** from the Network tab and send it to me!

