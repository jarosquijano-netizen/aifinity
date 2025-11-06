# Railway pre-deploy validation script
# This runs before deployment to catch errors early

echo "🔍 Validating backend code before deployment..."

cd backend

# Check if ESLint is installed
if [ ! -d "node_modules/eslint" ]; then
  echo "📦 Installing ESLint..."
  npm install --save-dev eslint
fi

# Run ESLint
echo "📋 Running ESLint..."
npm run lint

if [ $? -ne 0 ]; then
  echo "❌ ESLint found errors. Deployment aborted."
  exit 1
fi

# Check for syntax errors
echo "🔍 Checking for syntax errors..."
node -c server.js
if [ $? -ne 0 ]; then
  echo "❌ Syntax errors found. Deployment aborted."
  exit 1
fi

echo "✅ Validation passed! Proceeding with deployment..."
exit 0

