# Railway pre-deploy validation
# Add this to your Railway project settings:
# Build Command: chmod +x backend/validate.sh && backend/validate.sh && npm install && npm start

# Or add to package.json scripts:
# "prestart": "npm run validate"

echo "🔍 Validating backend code..."

cd backend || exit 1

# Install ESLint if not present
if [ ! -d "node_modules/eslint" ]; then
  echo "📦 Installing ESLint..."
  npm install --save-dev eslint
fi

# Run validation
npm run validate

if [ $? -ne 0 ]; then
  echo "❌ Validation failed. Deployment aborted."
  exit 1
fi

echo "✅ Validation passed!"

